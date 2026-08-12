# SPEC-AGENT-REACTIF.md : l'agent réagit aux actions du user, le collègue qui surveille (12/08/2026)

> Spec de l'« agent réactif », X100 chantier 1 (le plus transformateur selon la
> carte t_c57fda84). Aujourd'hui l'agent ne réagit qu'aux messages du chat.
> Objectif : des déclencheurs événementiels sur les ACTIONS du user dans
> l'interface : changement de statut, édition de légende, ouverture de la vue.
> Cette spec répond aux 3 questions de la carte : **quels événements**, **quel
> contexte est envoyé à l'agent**, **garde-fous** (ne jamais être intrusif,
> max 1 suggestion par vue). Elle s'appuie sur le worker asynchrone
> (SPEC-WORKER-ASYNCHRONE.md, carte t_75229918), le journal d'activité existant
> (GET /api/journal), les suggestions workflow (SPEC-TUNNEL.md) et le moteur
> de conformité charte (SPEC-CONFORMITE.md).

---

## 1. Contexte et vision

### 1.1 Le problème

L'agent réactif existe déjà en partie : le user écrit dans le chat, le worker
asynchrone répond (SPEC-WORKER-ASYNCHRONE). Mais la plupart des actions de
Victor dans Atelier ne passent PAS par le chat : il change un statut, il édite
une légende, il ouvre une vue. Sur ces actions, l'agent est muet.

Résultat : le « collègue qui surveille » n'existe pas. Personne ne signale à
Victor qu'il passe en « À valider » un contenu qui porte une couleur hors
charte. Personne ne lui dit que sa légende Instagram fait 2 450 caractères
(max 2 200). La promesse produit (VISION.md : « le complément d'agent »)
reste incomplète : l'agent complète, mais il ne prévient pas.

### 1.2 La décision (cadrage)

1. **Le réactif est une extension du worker asynchrone, pas un nouveau
   service** : même cron Hermes, même monitor_script (zéro LLM sur les ticks
   sans événement), même MCP `atelier-prod`, mêmes garde-fous. Le monitor
   surveille en plus le journal d'activité (source de vérité des actions) et
   ne déclenche le LLM que quand un événement pertinent apparaît.
2. **Le journal est la file d'événements** : chaque action du user est déjà
   journalisée (changement_statut, depot_source, programmation, message_user,
   reponse_chat...). Il manque un type : `legende_modifiee`. Pas de nouvelle
   table, pas de flag : le pattern « état dérivé + watermark » du worker
   (SPEC-WORKER §3.2) s'applique tel quel au journal.
3. **Déterministe d'abord, LLM seulement quand il apporte un jugement** :
   les compteurs de longueur de légende existent DÉJÀ côté web (X/2200,
   SPEC-TUNNEL et DraftDetail RESEAU_CONTRAINTES) et sont instantanés. La
   suggestion « prêt à programmer ? » existe DÉJÀ côté web (S2 de
   SPEC-TUNNEL). L'agent LLM n'intervient que là où un compteur ne suffit
   pas : alerte de conformité charte argumentée, proposition de
   reformulation d'une légende trop longue, message contextuel à
   l'ouverture. Ne jamais dupliquer un contrôle instantané avec un LLM
   lent et coûteux.
4. **E3 (ouverture de vue) = déterministe en v1** : la suggestion proactive
   « prêt à programmer ? » est déjà produite par la règle S2 du tunnel. Le
   LLM ne s'invite PAS à l'ouverture d'une vue en v1. C'est le garde-fou
   « ne jamais être intrusif » appliqué à l'endroit le plus sensible : la
   vue s'ouvre à chaque clic, un LLM qui s'annonce à chaque ouverture
   devient un harcèlement. Enrichissement agentique (v1.5) uniquement si le
   web le déclenche volontairement (section 6.3).

### 1.3 Périmètre v1

| Événement | Déclencheur | Détection | Action agent |
|---|---|---|---|
| E1 | changement de statut | journal `changement_statut` (existe) | vérifier conformité charte, alerter si écart |
| E2 | légende modifiée | journal `legende_modifiee` (à ajouter) | alerter si dépassement, proposer une version raccourcie |
| E3 | ouverture de la vue | déterministe web (S2 existant) | aucune en v1 (bandeau existant) |

Hors périmètre v1 : notifications push (Slack), réaction aux dépôts de source,
aux checklist complétées, aux programmations (candidats v2), multi-agents.

---

## 2. Où vit le réactif

### 2.1 Architecture retenue

```
┌─ Atelier (prod, Vercel) ─────────────────────────────┐
│  actions user → journal (changement_statut,          │
│  legende_modifiee, ...) + GET /api/journal?after=id  │
└──────────────────────────────────────────────────────┘
        ▲  (détection : watermark local + hash)    ▲ (exécution MCP)
┌───────┴──────────────────────────┐   ┌─────┴─────────────────────────┐
│ cron `atelier-worker` (Hermes)   │   │ MCP `atelier-prod`            │
│ tick ~30-60s :                   │──▶│ lire_brouillon, get_charte,   │
│ 1. monitor lit journal after=WM  │   │ repondre_brouillon,           │
│ 2. inchangé → run supprimé       │   │ set_legende, set_notes,       │
│ 3. événement neuf → agent (LLM)  │   │ set_source, regenerer_slides  │
│    avec contexte (section 4)     │   └───────────────────────────────┘
└──────────────────────────────────┘
        (même cron que le worker : la sortie du monitor agrège
         conversations en attente + événements réactifs)
```

### 2.2 Le watermark (anti-double-traitement, pattern du worker)

- Le cron garde `last_seen_journal_id` dans son état local (fichier d'état du
  monitor, PAS dans la base Atelier).
- Le monitor appelle `GET /api/journal?after=<watermark>&limit=100` (le
  paramètre `after` est à ajouter, cf. section 7), ne retient que les types
  pertinents (changement_statut, legende_modifiee), et ajoute à sa sortie les
  événements neufs non encore traités.
- La sortie du monitor est hachée : si elle est inchangée entre deux ticks,
  pas de run LLM. Elle ne change QUE quand un événement neuf apparaît (ou
  quand un bucket d'âge est franchi, cf. 2.3).
- **Le watermark n'avance QUE si le run LLM a réussi** : en cas d'échec, les
  mêmes événements sont re-proposés au tick suivant (avec le label d'âge, cf.
  2.3) — pas d'orphelin, pas de perte.
- **Boucle impossible** : le monitor ignore les événements dont `auteur` est
  `agent` ou `system` (le journal stocke l'auteur). Un changement de statut
  fait par l'agent (via MCP set_statut) ne déclenche JAMAIS l'agent.

### 2.3 Retry & backoff

Mêmes buckets d'âge que le worker (SPEC-WORKER §5) : `recent` < 2 min, `moyen`
2-5 min, `long` 5-15 min, `tres-long` 15-30 min, `bloque` > 30 min. Le label
change quand le bucket est franchi → la sortie change → un run de retry part.
Borné : ≤ 4 retries par événement, puis stable (pas de boucle infinie).

---

## 3. Événement E1 : changement de statut → conformité charte

### 3.1 Déclencheur

Entrée journal `changement_statut` (déjà créée par POST /api/brouillon/:id,
avec `details: { de, vers }`), auteur `user`. Candidats : passage vers
`a-valider` ou `valide` (le moment où la conformité compte le plus).

### 3.2 Contexte envoyé à l'agent (contrat)

```
EVENEMENT: changement_statut
BROUILLON: {id, titre, type, statut: "a-valider", slides: 9, checklist: "4/4",
            programme: null}
CHANGEMENT: {de: "brouillon", vers: "a-valider", auteur: "user", at: "..."}
CHARTE: {nom, couleurs: {...}, polices: {titre, texte}, motsEviter: [...]}
ECARTS_CONFORMITE: [  # résultat PRÉCALCULÉ par le moteur F-33 (SPEC-CONFORMITE)
  {axe: "couleur", valeur: "#22D3EE", attendu: "couleur de la charte", severite: "critique"},
  {axe: "mot", valeur: "ultra", severite: "mineur"}
]
CONVERSATION_RECENTE: [≤ 8 derniers messages]
REGLE: réponds dans la conversation via repondre_brouillon ; silence si
conforme ; jamais de changement de statut ; max 1 alerte par événement.
```

L'agent ne recalcule PAS la conformité : il reçoit les écarts précalculés par
le moteur déterministe F-33 (couleurs/polices/mots à éviter, SPEC-CONFORMITE).
Son travail = formuler l'alerte, la contextualiser (quelle slide, quel axe),
et proposer une action de correction si pertinent.

### 3.3 Comportement de l'agent

- **Conforme** : SILENCE. Ne jamais écrire « tout est bon » : le silence est
  la confirmation. (Garde-fou « ne pas féliciter pour la normale ».)
- **Écart(s)** : un message unique dans la conversation, ton factuel :
  « Vérification charte avant validation : 2 écarts. Couleur #22D3EE
  (bouton CTA) hors charte. Le mot "ultra" figure dans la slide 4 (liste
  des mots à éviter). Veux-tu que je corrige le mot et je remplace la
  couleur par la plus proche de la charte ? »
- **Action possible** : l'agent peut proposer la correction, JAMAIS
  l'appliquer sans accord (garde-fou 5.4). La correction passe par le chat :
  le user répond, le worker exécute (set_source / set_legende).

### 3.4 Déduplication

Une alerte par (brouillon, événement). Si Victor passe brouillon →
a-valider, corrige, repasse en brouillon, puis re-a-valider : c'est un
nouvel événement, une nouvelle alerte (l'état réel a changé). Mais deux
passages successifs sans correction entre les deux → le watermark a avancé,
le second passage déclenche une alerte identique. Acceptable en v1 (rare) ;
v2 : l'agent relit la conversation avant d'écrire et s'abstient si une alerte
conformité existe déjà pour le même brouillon.

---

## 4. Événement E2 : légende modifiée → vérification longueur

### 4.1 Déclencheur

**Ajout API requis** : dans POST /api/brouillon/:id, quand `patch.reseaux`
change, journaliser une entrée `legende_modifiee` avec
`details: { reseau, caption_len, hashtags_count, maxChars, maxHashtags,
depasse: bool }` (les contraintes existent côté web dans RESEAU_CONTRAINTES
de DraftDetail.tsx ; les extraire dans un module partagé ou les dupliquer
côté API, décision d'implémentation).

### 4.2 Ce que fait l'agent (et ce qu'il ne fait PAS)

- **Les compteurs web existent déjà** (X / maxChars en rouge si dépassé,
  compteur de hashtags) : ils sont instantanés, zéro latence, zéro coût.
  L'agent ne les duplique PAS.
- L'agent n'intervient QUE si `depasse: true` ET si la modification est
  réelle (le web sauvegarde à chaque frappe avec debounce 400 ms côté notes ;
  pour les légendes, ne journaliser que les changements de valeur effective,
  pas chaque frappe intermédiaire — la route POST ne crée une entrée que si
  la valeur diffère, même règle que changement_statut).
- Comportement : un message unique dans la conversation, avec une
  proposition de reformulation :
  « La légende Instagram fait 2 450/2 200 caractères et 31 hashtags
  (max 30). Je peux la raccourcir à 2 100 en gardant le sens et retirer
  un hashtag doublon. Je m'en occupe ? »
- L'agent ne modifie la légende QUE si le user répond « oui » (garde-fou
  5.4). La correction passe par set_legende via MCP.

### 4.3 Déduplication

Une alerte par (brouillon, reseau). Tant que la légende ne change pas, le
watermark a avancé → pas de re-alerte. Si Victor réduit à 2 100 puis
re-dépasse : nouvel événement, nouvelle alerte (l'état a changé).

---

## 5. Événement E3 : ouverture de la vue → suggestion proactive

### 5.1 La suggestion « prêt à programmer ? » existe déjà

La règle S2 de SPEC-TUNNEL (implémentée) : statut `valide` + `programme` null
+ type dans TYPES_CONTENUS → bandeau « Contenu validé. Il ne manque que la
programmation. [Programmer →] ». C'est exactement le « prêt à programmer ? »
de la carte, produit de façon déterministe, instantanée, fermable, avec la
règle « une seule suggestion visible à la fois » (S1 > S2 > S0, SPEC-TUNNEL
§4.1). **Le v1 du réactif acte ce mécanisme comme l'événement E3.** Aucun
LLM n'est nécessaire : la suggestion est un calcul, pas un jugement.

### 5.2 La règle d'or « max 1 suggestion par vue »

Quelle que soit la source (bandeau S0/S1/S2, alerte du réactif, future
suggestion agentique), **une vue n'affiche JAMAIS plus d'une suggestion à la
fois**. Ordre de priorité : bandeau workflow (S1 > S2 > S0) > alerte agent.
L'alerte agent n'apparaît que si aucun bandeau n'est affiché (ou se substitue
au bandeau S0, jamais à S1/S2). Fermeture : bouton ✕, état par session
(SPEC-TUNNEL §4.6). Une suggestion fermée ne réapparaît pas dans la session.

### 5.3 Enrichissement agentique (v1.5, pas en v1)

Si un jour on veut une suggestion agentique à l'ouverture (« vu ta charte,
ce carrousel est prêt à programmer ; le calendrier a un créneau libre jeudi
10h »), le web DOIT la déclencher volontairement : un appel explicite du
client (ex. `POST /api/brouillon/:id/check` au chargement, une seule fois par
session par brouillon, jamais par clic) qui crée un événement `check_demande`
dans le journal. Le monitor le voit, le LLM répond, le web affiche le
résultat dans le bandeau. C'est le user qui autorise l'intrusion, pas
l'agent qui s'auto-invite.

---

## 6. Garde-fous transverses (ne jamais être intrusif)

1. **Canal unique : la conversation du brouillon (onglet Agent) + les
   bandeaux déterministes existants.** Jamais de notification push, jamais
   de modale, jamais de toast système en v1.
2. **Silence par défaut.** L'agent ne parle QUE s'il a quelque chose d'utile
   (écart, dépassement, blocage). Zéro message de confirmation, zéro
   félicitation, zéro bavardage. Le « tout va bien » n'existe pas.
3. **Max 1 suggestion par vue** (section 5.2) et **max 1 alerte par
   événement** (sections 3.4, 4.3).
4. **Jamais d'action sans accord.** L'agent propose, le user dispose. Les
   corrections (reformuler une légende, corriger une couleur) s'exécutent
   seulement après un « oui » dans le chat.
5. **Mêmes garde-fous que le worker** (SPEC-WORKER §7) : jamais de statut
   `valide`/`publie` posé par l'agent, jamais de publication Postiz, jamais
   de suppression, périmètre d'action limité aux brouillons concernés, pas
   de modification de la charte, réponse honnête (pas d'invention),
   auteur tracé (x-atelier-auteur: agent → tout est journalisé, page
   Activité IA).
6. **Pas de boucle** : événements d'auteur `agent`/`system` ignorés par le
   monitor (section 2.2).
7. **Coût borné** : LLM uniquement quand le monitor détecte un événement
   neuf ; ≤ 2 événements traités par run (même borne que le worker) ;
   interruption dure 3 min ; le monitor a un `--max-time 10` (API down ne
   bloque pas le tick).
8. **L'agent réactif n'écrit pas dans le journal** : il répond via
   repondre_brouillon (conversation) et agit via MCP (actions journalisées
   par l'API avec auteur agent). Le journal reste la trace des faits.

---

## 7. Travaux API requis (pour l'implémentation, hors périmètre de cette spec)

1. **Journaliser `legende_modifiee`** dans POST /api/brouillon/:id quand
   `patch.reseaux` change et diffère de l'existant (details : reseau,
   longueurs, contraintes, depasse). Pas de nouvelle table.
2. **Paramètre `after` sur GET /api/journal** : `?after=<journal_id>&limit=N`
   renvoie les entrées dont l'id > after (le watermark du monitor).
3. (v1.5) Route `POST /api/brouillon/:id/check` pour l'enrichissement
   agentique d'E3 (section 5.3).
4. (implémentation) Extraire RESEAU_CONTRAINTES (DraftDetail.tsx) dans un
   module partagé consommable par l'API pour calculer `depasse` côté serveur
   (ou dupliquer les constantes, au choix de l'implémenteur, avec un test de
   parité).

---

## 8. Test de bout en bout (acceptance)

1. **E1** : brouillon jetable en prod, source avec une couleur hors charte ;
   passer le statut à `a-valider` (auteur user) → le monitor montre
   l'événement + écarts précalculés ; le run LLM écrit l'alerte dans la
   conversation ; `GET /api/brouillon/:id` la montre ; le watermark avance.
2. **E1 conforme** : même flux avec une source conforme → AUCUN message,
   watermark avancé quand même.
3. **E1 boucle** : un changement de statut fait par l'agent (auteur agent)
   ne déclenche rien.
4. **E2** : légende Instagram > 2200 → entrée `legende_modifiee` avec
   depasse:true → alerte + proposition dans la conversation. Sous la limite :
   silence.
5. **E3** : brouillon valide non programmé → bandeau S2 visible à
   l'ouverture, une seule suggestion, pas d'appel LLM (vérifier le journal :
   aucun événement créé).
6. **Retry** : tuer le run pendant le traitement → le tick suivant re-propose
   l'événement (bucket d'âge), pas de perte ; après ≤ 4 retries, stable.
7. **Stabilité** : relancer le monitor deux fois sans changement → sorties
   identiques (hash stable).
8. Nettoyer le brouillon jetable. Aucune donnée réelle modifiée sans accord.

Critère produit : « quand je change un statut ou je dépasse une limite,
l'agent me prévient dans le chat ; quand j'ouvre une vue, une seule
suggestion au plus, jamais plus. »

---

## 9. Limites connues & évolutions

- **Latence** : la réaction est asynchrone (tick ≤ 60 s + run ≤ 3 min). Pour
  un retour instantané, les compteurs web restent la première ligne ; le
  réactif est la seconde ligne (jugement, reformulation).
- **Le réactif ne tourne que si le Mac de Victor est allumé** (gateway
  launchd), même limite que le worker. À terme : webhook Hermes → run.
- **E3 agentique** (v1.5) : suggestion contextuelle à l'ouverture déclenchée
  par le web (section 5.3), utile une fois la charte vivante (F-14) et
  l'historique disponibles.
- **Événements futurs** : dépôt de source, checklist complétée, programmation
  posée/annulée, publication CMS. Même mécanisme : nouveau type de journal +
  règle dans le monitor.
- **Multi-agents** : si un user connecte Claude Code/Codex (page
  Integrations), le déclencheur événementiel se généralise (chaque agent
  reçoit ses événements) — hors périmètre v1.
