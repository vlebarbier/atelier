# SPEC-WORKER-ASYNCHRONE.md : l'agent surveille les conversations et répond seul (11/08/2026)

> Spec du « worker asynchrone » — le maillon manquant du chat avec l'agent
> (Phase 6f, PR #26) : aujourd'hui personne ne lit les conversations en attente.
> Le user écrit dans le chat d'Atelier, le message attend qu'un agent pense à
> vérifier (« l'agent est très lent, aucun agent connecté » — retour Victor).
> Cette spec répond aux 4 questions de la carte : **où vit le worker** (cron
> Hermes + service launchd, pas un démon custom), **anti-double-traitement**
> (état dérivé, pas de flag), **timeout** (interruption dure 3 min du cron +
> bornes dans le prompt), **garde-fous** (jamais publier sans validation
> humaine). Reliée à : chat async (PR #26), page Integrations (t_ee80a155),
> SPEC-CREATION.md (« En attente de l'agent »).

---

## 1. Contexte et vision

### 1.1 Le problème

Le chat avec l'agent (Phase 6f) est **asynchrone par conception** : le user
écrit, l'agent répond quand il passe. Mais rien ne déclenche l'agent : le
message reste « en attente » (SPEC-CREATION.md 7.3) jusqu'à ce qu'un agent
tourne de lui-même. Résultat : des heures d'attente, des demandes orphelines,
et l'impression que « l'agent n'est pas connecté » — alors que le MCP l'est
(page Integrations).

Objectif produit : **le user écrit, l'agent répond seul, en quelques secondes
à quelques minutes** — sans que personne n'ait à penser à vérifier. C'est le
« complément d'agent » de VISION.md rendu autonome : Atelier ne se contente
plus de recevoir, il **pousse** la demande à l'agent.

### 1.2 La décision (cadrage)

1. **Le worker est un cron Hermes** (profil hephaistos), pas un service custom
   : l'« agent » qui répond EST Hermes (raisonnement + outils MCP). Un service
   Node dédié ne ferait que ré-invoquer Hermes par-dessus (indirection
   inutile). Le cron fournit gratuitement : scheduler durable, `.tick.lock`
   anti-chevauchement, interruption dure par run, logs, retry au réveil.
2. **La détection est un script bon marché** (monitor_script du cron) : il
   tourne à chaque tick sans LLM ; le LLM ne tourne QUE quand l'état change
   (nouveau message en attente). Coût : ~0 token la plupart des ticks.
3. **« En attente » = état dérivé, pas un flag** : un brouillon est en attente
   tant que le dernier message de sa conversation a `role: 'user'`. Dès que
   l'agent répond (`repondre_brouillon`, `role: 'agent'`), l'état bascule
   atomiquement. Pas de colonne `traite`, pas de migration — et surtout pas
   d'orphelin possible : si l'agent crashe avant de répondre, le message reste
   en attente et le worker retente (section 5).
4. **Le worker opère sur la PROD** (atelier-api-three.vercel.app) via un MCP
   dédié `atelier-prod` : c'est l'app déployée que Victor utilise. Le MCP
   `atelier` existant (localhost:4310) reste réservé au dev interactif.

### 1.3 Périmètre v1

- Détection des brouillons dont le dernier message est `role: 'user'`.
- Déclenchement de l'agent avec le contexte (message + brouillon + charte).
- Exécution via MCP et réponse via `repondre_brouillon`.
- Hors périmètre : notifications push (Slack), file de priorité, multi-agents,
  worker côté serveur (l'API Vercel est serverless, pas de process long).

---

## 2. Où vit le worker

### 2.1 Architecture retenue

```
┌─ Atelier (prod, Vercel) ─────────────────────────────┐
│  POST /message (user)  →  conversation en attente     │
│  GET /api/conversations/en-attente  ← source de vérité│
└───────────────────────────────────────────────────────┘
        ▲  (détection, sortie stable)        ▲ (exécution, MCP)
┌───────┴──────────────────────────┐   ┌─────┴─────────────────────────┐
│ cron `atelier-worker` (Hermes)   │   │ MCP `atelier-prod`            │
│ tick ~30-60s :                   │   │ ATELIER_API_URL = prod        │
│ 1. monitor_script (Python,       │   │ outils : lire_brouillon,      │
│    zéro LLM) → hash de l'état    │   │ get_charte, set_source,       │
│ 2. inchangé → run supprimé       │──▶│ deposer_slides, set_legende,  │
│ 3. changé → agent (LLM) avec le  │   │ set_notes, repondre_brouillon │
│    diff + nouvel état en contexte│   └───────────────────────────────┘
└──────────────────────────────────┘
        (scheduler = gateway Hermes du profil hephaistos,
         installé en service launchd « ai.hermes.gateway.hephaistos »)
```

### 2.2 Alternatives écartées

| Alternative | Pourquoi non |
|---|---|
| Service Node dédié (polling + exécution) | Il ne peut pas raisonner : il ré-invoquerait Hermes par-dessus. Double indirection, zéro bénéfice. |
| Cron classique sans monitor (run agent toutes les 30s) | Un run LLM par tick = coût énorme pour rien (99 % des ticks n'ont rien à faire). |
| Watchdog dans le serveur MCP | Le MCP est stdio, spawné par session : pas de boucle de vie longue fiable. |
| Polling côté web (JS) qui appelle l'agent | Le navigateur ne peut pas déclencher un LLM (pas de clé, pas de session). Le polling 8s existant sert à AFFICHER la réponse, pas à la produire. |

### 2.3 Prérequis système : le scheduler doit tourner

Le cron n'est schedulé que si le **gateway Hermes du profil hephaistos**
tourne (le scheduler vit dans le gateway). Or seul le gateway du profil
`default` est installé (launchd `ai.hermes.gateway`). Action : installer le
gateway hephaistos en service launchd
(`HERMES_PROFILE=hephaistos hermes gateway install --start-now --start-on-login`)
→ le worker survit aux reboots et tourne sans aucune session de chat ouverte.

---

## 3. Détection : GET /api/conversations/en-attente

### 3.1 Règle de détection (source de vérité, côté API)

Un brouillon est **en attente** ssi :

- sa conversation n'est pas vide, ET
- le **dernier message** a `role: 'user'` (pas de réponse agent après).

Règle unique implémentée **côté API** (nouvelle route
`GET /api/conversations/en-attente`) : le script du worker et la future UI
consomment la même définition — pas de logique dupliquée.

Réponse : `[{ id, titre, statut, type, updated, messages: [derniers ≤ 8 messages] }]`
(`messages` = la queue de la conversation, pour donner le contexte au worker
sans fetch supplémentaire). L'ordre est stable (tri par id) pour que la sortie
du monitor soit déterministe.

### 3.2 Pourquoi pas un flag « traité »

Deux options existaient :

- **A. Flag sur le message** (`traite: true` posé au début du traitement) :
  protège contre le double traitement MAIS crée l'orphelin inverse — si
  l'agent crashe après le flag, le message n'est plus détecté et personne ne
  répondra jamais. Il faut un TTL de récupération, un nettoyage… de la
  complexité pour un problème que l'état dérivé ne pose pas.
- **B. État dérivé** (retenu) : « dernier message = user ». Crash-safe par
  construction : pas de réponse → toujours en attente → le worker retente
  (section 5). Le double traitement est géré par les 3 verrous de la section 4.

---

## 4. Anti-double-traitement (3 verrous, aucun flag)

1. **`.tick.lock` du cron Hermes** (framework) : deux ticks ne peuvent pas
   tourner en même temps sur le même job — un chevauchement de runs est
   impossible par construction.
2. **Hash du monitor_script** : la sortie du script est hachée ; si elle est
   inchangée, le run LLM est supprimé. Tant qu'un message est en attente et
   qu'aucune réponse n'est arrivée, la sortie est identique → pas de run
   dupliqué pendant que l'agent travaille. La sortie ne change QUE quand
   l'état change (nouveau message, réponse posée, bucket de retry franchi).
3. **Re-check par l'agent avant de répondre** : l'agent relit la conversation
   (`lire_brouillon`) juste avant de répondre et ne répond que si le dernier
   message est ENCORE `role: 'user'`. La réponse (`role: 'agent'`) bascule
   l'état : tout run concurrent/retardataire relit et voit « déjà répondu »
   → skip.

Conséquence mesurable : un message = au plus un run actif + éventuellement un
run no-op (celui qui constate la réponse) — mesuré au test E2E (section 9).

---

## 5. Retry & backoff (auto-réparation)

Si l'agent échoue (crash, timeout, erreur outil) SANS répondre, le message
reste en attente — mais la sortie du monitor ne change pas → pas de
re-déclenchement. Pour réparer, le monitor ajoute à sa sortie un **bucket
d'âge grossier** du message le plus ancien en attente :

| Âge du message | Label sortie | Effet |
|---|---|---|
| < 2 min | `recent` | run initial (le message vient d'arriver) |
| 2-5 min | `moyen` | 1er retry |
| 5-15 min | `long` | 2e retry |
| 15-30 min | `tres-long` | 3e retry |
| > 30 min | `bloque` | 4e retry, puis stable (pas de boucle infinie) |

Le label change quand le bucket est franchi → la sortie change → un run de
retry part. Borné : ≤ 4 retries par message, puis la demande reste visible
« En attente » dans l'UI (SPEC-CREATION 8 : l'utilisateur peut relancer).
Les buckets sont des valeurs discrètes (pas de timestamp brut) : la sortie
reste stable à l'intérieur d'un bucket — le contrat « sortie stable » du
monitor est respecté.

---

## 6. Timeout & budget

- **Interruption dure : 3 minutes par run** (invariant du cron Hermes). Le
  run ne peut pas pendre indéfiniment : pire cas de réponse = tick (≤ 60 s)
  + 3 min de run ≈ 4 min.
- **Bornes dans le prompt du worker** :
  - traiter au plus **2 brouillons en attente par run** (le backlog se draine
    sur les ticks suivants — pas de run géant) ;
  - si une demande est lourde (produire un carrousel complet), l'agent fait
    l'essentiel dans le budget et répond avec ce qui est fait + ce qui reste
    (jamais de silence) ;
  - le script monitor lui-même a un `--max-time 10` (un API down ne bloque
    pas le tick).

---

## 7. Garde-fous (jamais publier sans validation)

Le worker est un agent avec des outils — le garde-fou est dans le prompt ET
dans le choix des outils :

1. **Jamais `statut: 'valide'` ni `'publie'`** : la validation est un acte
   humain (le user clique Valider dans Atelier). L'agent peut mettre à jour
   le contenu (source, slides, légendes, notes), jamais l'état de validation.
2. **Jamais Postiz** : l'outil `creer_brouillon_postiz` et la route
   `/postiz` sont interdits au worker. Un post ne part vers Postiz que par le
   bouton humain « Envoyer vers Postiz » (Sprint 4, F-45) — et il reste en
   draft (la publication finale est un acte humain dans Postiz).
3. **Jamais de suppression** (brouillon, ressource, slide).
4. **Périmètre d'action** : uniquement sur les brouillons listés en attente
   (pas de « balade » dans le produit : pas de création de brouillon, pas de
   modification de la charte).
5. **Réponse honnête** : si la demande est ambiguë, hors compétence ou
   impossible (ressource introuvable, charte incomplète), l'agent le dit et
   pose une question — jamais d'invention (règle Bordeluche : pas de faux
   chiffres, pas de contenu halluciné).
6. **Auteur tracé** : le client MCP envoie `x-atelier-auteur: agent` → chaque
   action du worker est journalisée (journal d'activité, page Activité IA) —
   tout ce que fait le worker est auditable.

---

## 8. Observabilité

- **Journal Atelier** : chaque réponse (type `reponse_chat`, auteur `agent`)
  et chaque action (dépôt source, régénération) est inscrite au journal → la
  page Activité IA montre ce que le worker a fait, horodaté.
- **Logs cron Hermes** : `hermes cron list` (last_status, next_run_at) +
  sortie du run (le run LLM journalise ses étapes).
- **Intégration page Integrations** (t_ee80a155) : l'état « agent connecté »
  (action < 1h au journal) devient vrai par défaut dès que le worker tourne —
  la page reflète enfin la réalité.

---

## 9. Test de bout en bout (acceptance)

1. Créer un **brouillon jetable** en PROD avec un message user réel
   (« corrige la note du brouillon pour écrire TEST WORKER OK ») via
   `POST /api/brouillons` + `POST /message`.
2. Lancer le monitor à la main : sa sortie montre `PENDING` (id, message).
3. Relancer le monitor : sortie identique (stabilité du hash).
4. Déclencher le cron (`cronjob run`) : l'agent répond via
   `repondre_brouillon`, exécute la demande (set_notes), vérifie au passage
   que le dernier message est encore user (verrou 3).
5. Vérifier : `GET /api/brouillon/:id` → notes mises à jour + dernier
   message `role: 'agent'` ; `GET /api/conversations/en-attente` → le
   brouillon n'y figure plus.
6. Relancer le monitor : sortie `OK` (stable).
7. Supprimer le brouillon jetable. Aucune donnée réelle touchée (le vrai
   carrousel n'est jamais modifié).

Critère produit : un message user dans le chat d'Atelier reçoit une réponse
agent en quelques minutes, sans aucune intervention.

---

## 10. Limites connues & évolutions

- **Le worker répond via le modèle du profil hephaistos** (flash) : qualité
  adaptée aux éditions/retouches ; les grosses productions restent pilotables
  en session interactive.
- **Pas de notification push** quand l'agent a répondu : le polling 8s du
  chat l'affiche. Évolution possible : notification Slack (canal Bordeluche)
  à chaque réponse.
- **Le worker ne tourne que si le Mac de Victor est allumé** (gateway
  launchd) : c'est la limite du cron local. À terme, un worker serverless
  (webhook Hermes → run) enlèverait cette dépendance (section webhooks du
  skill hermes-agent).
- **Multi-agents** : aujourd'hui le worker EST l'agent Hermes de Victor. Si
  un user connecte Claude Code/Codex (page Integrations), le pattern se
  généralise : chaque agent expose son propre endpoint de trigger — hors
  périmètre v1.
