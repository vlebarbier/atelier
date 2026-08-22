# SPEC-PLAN-VALIDATION.md : l'agent annonce son plan AVANT d'agir, le user valide ou annule (12/08/2026)

> Spec du « plan de validation », le human-in-the-loop pour les actions
> destructrices (carte t_29efa3ee, complément du diff visuel t_625fe5a9).
> Aujourd'hui, quand l'agent reçoit « change le texte de la slide 3 » ou
> « régénère », il exécute directement : modifier la source HTML, régénérer
> les slides, c'est irréversible côté perception du user (le diff visuel
> montre APRÈS ce qui a changé, mais rien ne montre AVANT ce qui va changer).
> Cette spec introduit l'**annonce de plan** : l'agent dit dans le chat
> « Je vais : 1) modifier la source 2) régénérer les slides 3) vérifier la
> charte », le user clique **Valider** ou **Annuler** avant toute exécution.
> Cette spec répond aux 4 axes de la carte : **format de l'annonce**
> (message `type: 'plan'`, PAS une part : justification §1.2 point 2),
> **bouton valider/annuler dans le chat** (PlanCard pinnée, §5),
> **timeout** (expiration et refus d'exécution, §7), **intégration avec le
> worker asynchrone** (l'agent annonce puis s'arrête, la décision le
> réveille, §6). Reliée à : ask_user (SPEC-ASK-USER.md, t_cef95a58 : le
> pattern question/réponse dont le plan est le miroir pour l'approbation),
> parts (SPEC-PARTS.md, t_c12d18c1 : les cartes d'action émises APRÈS
> validation pendant l'exécution), worker asynchrone (SPEC-WORKER-ASYNCHRONE.md,
> t_75229918), diff visuel (t_625fe5a9 : l'« après » de la confiance),
> versioning (t_11b44de9 : le rollback APRÈS exécution, chantier 5, hors
> périmètre ici).

---

## 1. Contexte et vision

### 1.1 Le problème

Le chat avec l'agent (Phase 6f, PR #26) donne à l'agent des outils de
mutation puissants : `set_source` (remplace le HTML source du document),
`regenerer_slides` (remplace les 9 PNG dérivés), `deposer_slides` /
`POST /slides` (remplace TOUTES les slides d'un coup), `POST /order`
(réordonne). Le worker asynchrone (SPEC-WORKER-ASYNCHRONE) exécute ces
actions dès qu'un message user arrive. Or :

1. **L'exécution est immédiate et silencieuse.** « Change le texte de la
   slide 3 » → l'agent modifie la source, régénère, répond « C'est fait ».
   Le user n'a jamais eu l'occasion de dire non : la modification a déjà
   écrasé la source, les slides ont été régénérées. Si l'agent a mal
   interprété, c'est perdu (ou nécessite un aller-retour de plus).
2. **Le diff visuel (t_625fe5a9) montre APRÈS, pas AVANT.** Le chantier 3
   (« Diff visuel avant/après ») résout la visibilité post-hoc : on voit
   ce qui a changé. Mais la confiance a deux moitiés : voir ce qui VA
   changer et pouvoir dire non AVANT, c'est l'autre moitié. Sans elle, le
   diff n'est qu'une vitrine sur une action déjà faite.
3. **Le user n'a aucun moyen d'approuver.** Aucun message ne représente
   « je valide ce que tu vas faire ». Le seul point d'approbation
   existant est le statut « À valider » (validation du résultat), trop
   tard : la source est déjà écrasée.
4. **Les actions destructrices ne sont pas marquées.** Le chat ne
   distingue pas « j'ai mis à jour la légende » (réversible, légère) de
   « j'ai remplacé la source HTML et régénéré les 9 slides » (écrasante).
   Le user traite tout pareil, donc il ne surveille rien.

Le pattern d'approbation est connu : dans les outils de génération (Cursor,
Claude Code, Codex), une action destructrice (git push --force, rm -rf,
overwrite d'un fichier) déclenche une **confirmation avant exécution**. Le
chat d'Atelier doit faire pareil pour les actions qui écrasent la donnée :
l'agent annonce, le user approuve ou refuse, l'agent exécute ou s'arrête.

### 1.2 La décision (cadrage)

1. **Le plan est un message de conversation, pas un flag ni une table.**
   On étend le format `MessageChat` avec deux types de messages :
   `type: 'plan'` (rôle agent : l'annonce, avec la liste structurée des
   actions) et `type: 'decision'` (rôle user : valider ou annuler).
   Pas de colonne, pas de migration : la conversation reste un JSON TEXT
   sur `brouillons` (Phase 6f). Même philosophie que SPEC-ASK-USER §1.2
   (la question est un message, pas un flag) et SPEC-PARTS §1.2 (les
   parts sont un champ du message).
2. **PAS une part `plan` : c'est un message `type: 'plan'`.** La carte
   posait la question « part type 'plan' ? ». Réponse : non. Une part
   (SPEC-PARTS) décrit une action EN COURS ou TERMINÉE (`en_cours` →
   `fait`/`erreur`, avec durée) : elle naît pendant l'exécution et rend
   le travail fait. Un plan décrit une action À VENIR en attente d'une
   décision humaine : son cycle de vie est `en_attente` → `valide` /
   `annule` / `expire`, pas `en_cours` → `fait`. C'est exactement la
   même distinction qui a fait de la question un message `type:
   'question'` et non une part (SPEC-PARTS §3.2 : « une question n'est
   pas une part »). Le plan est le miroir de la question pour
   l'approbation : la question demande une INFORMATION, le plan demande
   une AUTORISATION. Les deux sont des messages typés, les deux sont
   rendus en cartes pinnées (même composant visuel, même mécanique).
   Les parts restent le rendu du travail PENDANT/APRÈS l'exécution : une
   fois le plan validé, l'agent exécute et émet ses parts
   (`slide_modifiee`, `source_deposee`...) exactement comme SPEC-PARTS
   §6 le décrit.
3. **« En attente » vs « décidé » = état dérivé, pas un champ.** Un plan
   est *en attente* ssi il est le **dernier message** de la conversation.
   Dès que le user répond (`type: 'decision'` ou message libre), il
   bascule en *décidé* (validé, annulé ou abandonné) atomiquement. Même
   règle de dérivation que la question (SPEC-ASK-USER §3.3) et que le
   worker (SPEC-WORKER-ASYNCHRONE §3.2) : état dérivé > flag, crash-safe,
   zéro orphelin. Si l'agent crashe après l'annonce, le plan reste en
   attente, le user peut décider quand même.
4. **Liste d'actions risquées, figée pour v1.** Le plan est OBLIGATOIRE
   pour les actions qui écrasent ou réordonnent la donnée existante :
   `modifier_source`, `regenerer_slides`, `deposer_slides`,
   `reordonner_slides` (§3.4). Les mutations légères et réversibles
   (`set_notes`, `set_legende`, `set_statut`) restent sans plan pour v1 :
   elles ne détruisent rien (l'agent réactif t_c57fda84 les surveille
   déjà). Le user peut AUSSI demander explicitement une confirmation
   (« confirme avant de toucher à la légende ») : l'agent annonce alors
   un plan pour toute action, même non listée (§6.1 règle 3).
5. **Timeout = refus d'exécution, pas simple affichage.** Un plan sans
   réponse expire après `PLAN_TIMEOUT_MS` (2 h, même valeur que la
   question, §7) : la carte passe « Expiré » et **l'agent n'exécutera
   JAMAIS** une action couverte par un plan expiré, même si une décision
   `valider` arrive ensuite (la défense en profondeur est côté worker,
   §7.2). Contrairement à la question (où répondre après expiration est
   permis, SPEC-ASK-USER §7.2), un plan expiré ne peut PAS être approuvé
   tardivement : le user doit relancer sa demande, l'agent re-annoncera
   un plan frais. C'est le choix produit : une autorisation périmée ne
   vaut rien sur une action destructrice.
6. **UI : PlanCard pinnée au bas du fil** (même placement que la
   question-card, SPEC-ASK-USER §5.1) : quand le dernier message est un
   plan en attente, une carte sticky s'affiche au-dessus de l'input avec
   la liste numérotée des actions et deux boutons, **Valider** (primary)
   et **Annuler** (ghost danger). Les plans décidés s'affichent inline
   dans le fil (validé = vert, annulé = rouge, abandonné = grisé).

### 1.3 Périmètre v1

- Message `type: 'plan'` (rôle agent) : 1..5 actions structurées par
  plan, chacune avec un type (enum §3.4), une cible et un détail.
- Message `type: 'decision'` (rôle user) : `valider` ou `annuler`,
  pointant le plan décidé (`decideA`).
- Annonce automatique côté worker : l'agent appelle l'outil MCP
  `annoncer_plan` AVANT toute action risquée, puis s'ARRÊTE (le
  brouillon sort de « en attente », la décision le réveille).
- PlanCard pinnée (Valider/Annuler), rendu inline des plans décidés,
  état Expiré après timeout.
- Garde-fou worker : jamais d'exécution d'une action risquée sans
  décision `valider` sur un plan non expiré (vérifié au réveil, verrou 3
  du worker).
- Hors périmètre : rollback APRÈS exécution (versioning, chantier 5,
  t_11b44de9 : « annuler » ici, c'est AVANT, pas une restauration
  d'état) ; notifications push ; plan multi-tours (wizard) ; annulation
  par le user d'une action DÉJÀ en cours d'exécution (le worker est
  synchrone dans son run, §6.4).

---

## 2. Vocabulaire (figé)

| Terme | Sens |
|---|---|
| Plan | Message de conversation `type: 'plan'` (rôle agent) : l'annonce structurée de ce que l'agent va faire, avec 1..5 actions |
| Décision | Message de conversation `type: 'decision'` (rôle user) : `valider` ou `annuler`, `decideA` pointe le plan décidé |
| Action risquée | Une action de l'enum §3.4 (`modifier_source`, `regenerer_slides`, `deposer_slides`, `reordonner_slides`) : elle écrase ou réordonne la donnée existante et exige un plan |
| En attente | Un plan dont le message est le DERNIER de la conversation (le user doit décider) |
| Validé | Un plan suivi d'une décision `valider` qui le pointe |
| Annulé | Un plan suivi d'une décision `annuler` qui le pointe |
| Abandonné | Un plan suivi d'un message LIBRE (ni valider ni annuler) |
| Expiré | Un plan en attente dont l'âge dépasse `PLAN_TIMEOUT_MS` |
| PlanCard | La carte sticky pinnée au bas du fil qui rend le plan en attente (Valider/Annuler) |
| Demande risquée | Une demande user qui implique au moins une action risquée (ou que le user demande explicitement de confirmer) |

Règle de dérivation de l'état d'un plan (source de vérité, §3.3) :

| État | Condition |
|---|---|
| En attente | `type === 'plan'` ET c'est le dernier message de la conversation |
| Validé | `type === 'plan'` ET une décision `valider` avec `decideA === plan.id` le suit |
| Annulé | `type === 'plan'` ET une décision `annuler` avec `decideA === plan.id` le suit |
| Abandonné | `type === 'plan'` ET un message user libre (ni décision) le suit |
| Expiré | En attente ET `now - at > PLAN_TIMEOUT_MS` (2 h) |

---

## 3. Format des messages (v4, rétro-compatible)

### 3.1 Le format actuel (inchangé pour les messages existants)

```ts
interface MessageChat {
  role: 'user' | 'agent';
  texte: string;
  at: string; // ISO
}
```

Les messages existants restent valides tels quels : les champs v2
(question/réponse, SPEC-ASK-USER), v3 (parts, SPEC-PARTS) et v4 (plan /
décision, cette spec) sont optionnels ; l'API stocke le JSON brut,
`slice(-200)` inchangé.

### 3.2 Le format étendu (v4 = v3 + plan/décision)

```ts
type ActionRisquee =
  | 'modifier_source'      // set_source : remplace le HTML source du document
  | 'regenerer_slides'     // regenerer_slides : régénère les PNG depuis la source
  | 'deposer_slides'       // POST /slides : remplace TOUTES les slides
  | 'reordonner_slides';   // POST /order : réordonne les slides existantes

type ActionPlan = {
  action: ActionRisquee;
  cible?: string;          // ex. 'source HTML' ou '9 slides'
  detail?: string;         // ex. 'remplace le document actuel' ou 'régénérées depuis la source'
};

type MessageChat = {
  role: 'user' | 'agent';
  texte: string;            // obligatoire pour les messages sans plan/parts, optionnel sinon
  at: string;
  // v2 (SPEC-ASK-USER, optionnels) :
  type?: 'question' | 'reponse' | 'plan' | 'decision';
  id?: string;
  questions?: { question: string; choix: string[] }[];
  repondA?: string;
  reponses?: { question: string; reponse: string }[];
  // v3 (SPEC-PARTS, optionnels) :
  parts?: PartChat[];
  // v4 (cette spec, optionnels) :
  actions?: ActionPlan[];   // type === 'plan' : 1..5 actions
  decideA?: string;         // type === 'decision' : id du plan décidé
  decision?: 'valider' | 'annuler';
};
```

Règles du format :

1. `type: 'plan'` ne peut être porté QUE par un message `role: 'agent'`
   (l'agent annonce son plan ; le user ne s'auto-annonce pas).
2. `type: 'decision'` ne peut être porté QUE par un message `role: 'user'`
   (seul le user autorise ou refuse).
3. `texte` est optionnel pour un plan (l'annonce est portée par
   `actions`) ; s'il est présent, il est rendu AVANT la liste des actions
   (ex. « Je vais : » ou « Je propose de régénérer après avoir vérifié la
   charte. »). Pour une décision, `texte` est optionnel et sert de
   commentaire libre (ex. « Vas-y mais garde l'ancienne source de côté »),
   affiché sous la décision.
4. `1 ≤ actions.length ≤ 5` par plan : une annonce montre au plus 5
   étapes (au-delà, l'agent groupe ; garde-fou de lisibilité).
5. Chaque action : `action` dans l'enum (type d'écrasement), `cible`
   optionnelle ≤ 60 caractères (quoi), `detail` optionnel ≤ 120
   caractères (comment). Zéro em-dash partout, y compris dans les textes
   produits par l'agent (règle DA).
6. `decideA` : l'id du plan (`p-<ts>`, généré par l'API à l'annonce,
   §4.1). Une décision sans `decideA` valide est rejetée (400) : on ne
   peut pas « valider dans le vide ».

### 3.3 Règle de dérivation (en attente vs décidé)

C'est la règle UNIQUE, implémentée côté consommateur (web) et documentée
pour le worker. Pas de champ « statut de plan » stocké :

1. On parcourt la conversation du plus récent au plus ancien.
2. Si le **dernier message** est `type: 'plan'` : ce plan est **en
   attente** (c'est le seul possiblement en attente, garde-fou
   un-seul-à-la-fois §8.2).
3. Sinon, on cherche le plan le plus récent : s'il est suivi d'une
   décision `valider` (`decideA === plan.id`) → **validé** ; d'une
   décision `annuler` → **annulé** ; d'un message libre → **abandonné**.
4. Un plan en attente dont `now - at > PLAN_TIMEOUT_MS` est **expiré**
   (l'UI le grise, les boutons Valider/Annuler disparaissent, §5.2).

Conséquence produit : la PlanCard n'est visible QUE quand le dernier
message est un plan non expiré. Dès que le user décide (valider, annuler)
ou envoie un message libre, la carte disparaît et le plan passe en
« décidé » dans le fil.

### 3.4 Pourquoi pas un flag « approuvé » sur le message

- **Crash-safe** : si l'agent annonce le plan puis crashe, le message
  reste en attente (dérivé), le user peut décider, le worker traitera.
  Un flag `approuve` laisserait un plan marqué sans mécanisme de reprise.
- **Zéro migration** : pas de colonne, pas de backfill, le JSON
  s'étend naturellement (même argument que SPEC-ASK-USER §3.4).
- **Cohérence avec le worker et la question** : une seule façon de
  penser l'état dans tout le produit (état dérivé > flag).

### 3.5 Pourquoi pas une part `plan`

Rappel de la décision §1.2 point 2 : une part (SPEC-PARTS) a un cycle
`en_cours` → `fait`/`erreur` avec durée mesurée ; elle est émise PENDANT
ou APRÈS l'exécution et rend le travail fait. Un plan est un point
d'arrêt AVANT exécution, en attente d'une décision humaine ; son cycle
`en_attente` → `valide`/`annule`/`expire` n'a pas de durée à mesurer
(l'action n'a pas commencé). Forcer le plan dans le modèle part
l'obligerait à un état artificiel (`en_cours` alors que rien ne tourne)
et à la mécanique PATCH parts (SPEC-PARTS §4.2) qui n'a pas de sens pour
une annonce. Le plan est au message `type: 'plan'` ce que la question
est au message `type: 'question'` : un point d'interaction typé,
rendu en carte pinnée, dérivé par position. Les parts restent le rendu
du travail pendant l'exécution APRÈS validation (SPEC-PARTS §6).

---

## 4. API

### 4.1 POST /api/brouillon/:id/message (étendu)

Le endpoint existant (app.ts, route 448) accepte désormais 6 formes de
body :

```jsonc
// 1. Message normal (existant, inchangé) - { texte } ou { texte, role: 'agent' }
{ "texte": "change le texte de la slide 3" }

// 2. Question (rôle agent, via MCP poser_question, SPEC-ASK-USER §4.1)
{ "role": "agent", "type": "question", "questions": [ ... ] }

// 3. Réponse (rôle user, via la question-card, SPEC-ASK-USER §4.1)
{ "role": "user", "type": "reponse", "repondA": "q-<ts>", "reponses": [ ... ] }

// 4. Parts (rôle agent, SPEC-PARTS §4.1)
{ "role": "agent", "texte": "...", "parts": [ ... ] }

// 5. Plan (rôle agent, via MCP annoncer_plan) - NOUVEAU
{
  "role": "agent",
  "type": "plan",
  "texte": "Je vais :",
  "actions": [
    { "action": "modifier_source", "cible": "source HTML", "detail": "remplace le document actuel" },
    { "action": "regenerer_slides", "cible": "9 slides", "detail": "régénérées depuis la nouvelle source" }
  ]
}

// 6. Décision (rôle user, via la PlanCard) - NOUVEAU
{ "role": "user", "type": "decision", "decideA": "p-<ts>", "decision": "valider", "texte": "Vas-y" }
// ou
{ "role": "user", "type": "decision", "decideA": "p-<ts>", "decision": "annuler" }
```

Validation (400 avec message clair, avant tout stockage) :

| Cas | Règle |
|---|---|
| `type: 'plan'` | `role` DOIT être `'agent'` ; `actions` 1..5 ; chaque action : `action` dans l'enum §3.4, `cible` optionnel ≤ 60 car., `detail` optionnel ≤ 120 car. ; `texte` optionnel |
| `type: 'decision'` | `role` DOIT être `'user'` ; `decision` ∈ `{ 'valider', 'annuler' }` ; `decideA` string non vide ; `texte` optionnel ≤ 280 car. (commentaire) |
| `type: 'plan'` + `parts` | interdit (un plan n'a pas de parts : les parts naissent à l'exécution) |
| `type: 'decision'` + `parts` | interdit |
| `type` absent | comportement actuel inchangé (`texte` obligatoire) |
| `type` inconnu | 400 |

Comportement : append du message, `slice(-200)`, `updatedAt`, journal
(§9). Pour un plan, l'API génère `id: 'p-<ts>'` s'il est absent (le
`decideA` de la décision s'y réfère).

**Pas de vérification que `decideA` existe** côté API (la conversation
peut avoir été nettoyée) : la décision est stockée telle quelle, le
consommateur (worker) fait le lien. La validation d'existence est la
responsabilité du worker au réveil (§6.3), qui refuse toute décision
`valider` sur un plan absent ou expiré.

### 4.2 GET détail brouillon

Inchangé : `conversation` renvoyée telle quelle (JSON string). Les
nouveaux champs (`type: 'plan'`, `actions`, `decideA`, `decision`)
transitent naturellement.

### 4.3 Journal d'activité (page Activité IA)

| Action | type journal | message |
|---|---|---|
| Agent annonce un plan | `plan_annonce` (auteur agent) | « a annoncé un plan : N action(s) » + aperçu première action |
| User valide | `plan_valide` (auteur user) | « a validé le plan de l'agent » + aperçu |
| User annule | `plan_annule` (auteur user) | « a annulé le plan de l'agent » + aperçu |
| User envoie un message libre pendant un plan en attente | `message_user` (existant) | inchangé (le plan est implicitement abandonné, §5.3) |
| Plan expiré | (aucun, état dérivé) | pas d'événement serveur (le timeout est un calcul, pas un job) |

### 4.4 Règle des 4 fichiers (rappel Phase 4)

Pas de changement de schéma (la conversation est un JSON dans une colonne
TEXT existante) : **aucune modification** de schema.ts / schema-pg.ts /
legacy.ts / migrate-pg.ts. Seuls changent : le parse/validation de la
route POST /message (app.ts), le type `MessageChat` côté web (api.ts),
le composant UI, et le serveur MCP.

---

## 5. Composant UI : la PlanCard pinnée au bas du fil

### 5.1 Placement et rendu

Dans l'onglet Agent du panneau droit, le chat est rendu en 2 zones :
`.chat-feed` (les messages) + `.chat-input` (textarea + Envoyer). La
PlanCard s'insère **entre les deux**, pinnée au bas du fil, exactement
comme la question-card (SPEC-ASK-USER §5.1) :

```
┌─ chat-feed ───────────────────────────┐
│  (messages, scrollable)               │
│  ...                                  │
│  [plan décidé inline]  ← inline       │
└───────────────────────────────────────┘
┌─ plan-card (sticky) ──────────────────┐  ← visible UNIQUEMENT si le
│  ✦ L'AGENT PROPOSE UN PLAN           │    dernier message est un
│  Je vais :                            │    plan en attente (non expiré)
│  1) modifier la source                │
│     remplace le document actuel       │
│  2) régénérer les slides (9)          │
│     régénérées depuis la source       │
│  [Valider]  [Annuler]                 │
└───────────────────────────────────────┘
┌─ chat-input ──────────────────────────┐
│  [textarea] [Envoyer]                 │
└───────────────────────────────────────┘
```

- La carte est `position: sticky; bottom: 0` DANS le flux du panneau
  (le chat-feed garde son scroll indépendant), même pattern que la
  question-card.
- Elle est rendue par un composant `PlanCard` qui reçoit le plan en
  attente (le dernier message si `type === 'plan'`).
- DA : fond `bg-level-3`, hairline `line-default`, radius 12 px (carte),
  texte 13 px, actions listées en blocs compacts (numéro + `action` en
  ink-primary + `cible`/`detail` en ink-tertiary 11.5 px), boutons :
  **Valider** = `primary` pleine largeur (fond accent, contraste max),
  **Annuler** = `ghost danger` (hairline + texte `--color-status-err`,
  pattern existant du bouton Supprimer, Phase 5). Monochrome strict
  (zéro accent couleur, zéro em-dash).

### 5.2 États de la carte

| État | Déclencheur | Rendu |
|---|---|---|
| En attente | dernier message = plan, âge < timeout | Carte active : texte d'annonce (si présent) + liste numérotée des actions (1..5) avec cible/detail, boutons Valider (primary) et Annuler (ghost danger) |
| Validé | une décision `valider` pointe le plan | Plus de carte : bloc inline compact (check `--color-status-ok` + « Plan validé » + la liste des actions en grisé, le commentaire `texte` de la décision s'il existe) ; le worker exécute (polling 8s → les parts `en_cours`/`fait` arrivent) |
| Annulé | une décision `annuler` pointe le plan | Bloc inline grisé : icône X `--color-status-err` + « Plan annulé » + la liste des actions barrée en grisé ; l'agent répond « D'accord, je n'ai rien modifié » |
| Abandonné | un message LIBRE suit le plan | Bloc inline grisé « Sans réponse » (la question-card a le même traitement, SPEC-ASK-USER §5.2) ; le worker traite le message libre comme une nouvelle demande |
| Expiré | dernier message = plan, âge > timeout | Carte grisée : « Plan expiré » + la liste reste lisible, boutons ABSENTS (ni Valider ni Annuler) ; le user doit relancer sa demande pour obtenir un plan frais |

### 5.3 Interaction

1. Le user clique **Valider** → `envoyerMessage(id, { role: 'user',
   type: 'decision', decideA: plan.id, decision: 'valider' })` → POST
   /message.
2. OU clique **Annuler** → même appel avec `decision: 'annuler'`.
3. La carte disparaît immédiatement (le dernier message est maintenant
   la décision, état dérivé), le plan décidé s'affiche inline.
4. Le polling 8 s existant (Phase 6f) fait le reste : le worker se
   réveille (§6.3), exécute (ou non) et répond ; ses parts
   (SPEC-PARTS) et sa réponse arrivent dans le fil normalement.
5. **Message libre pendant un plan en attente** : le user ignore la
   carte et envoie un nouveau message → le plan passe en « abandonné »
   (inline grisé), la carte disparaît. Le worker traitera le nouveau
   message comme une nouvelle demande (avec le plan non décidé en
   contexte, §8.2 : il ne re-annonce pas si la nouvelle demande couvre
   les mêmes actions, sinon il re-annonce proprement).

### 5.4 Détails d'implémentation (web)

- `MessageChat` (api.ts) : ajouter `actions?`, `decideA?`, `decision?`
  et étendre l'union de `type` avec `'plan' | 'decision'` (tous
  optionnels, rétro-compatible).
- `envoyerMessage` : accepter un body partiel (déjà étendu par
  SPEC-ASK-USER §5.4 ; ajouter `actions?`, `decideA?`, `decision?`).
- Dérivation : helper `deriverPlan(conversation: MessageChat[]):
  PlanState | null` qui applique §3.3 (dernier message plan → en
  attente, timeout → expiré, sinon plan décidé le plus récent).
  Testé unitairement (5 cas : none / attente / validé / annulé /
  abandonné / expiré).
- Le fil : pour un message `type: 'plan'` décidé, rendre le bloc inline
  (validé/annulé/abandonné) ; pour un message `type: 'decision'`, ne
  PAS le rendre comme bulle user normale (il est déjà représenté dans
  le bloc du plan) - sinon double affichage. Même règle que la paire
  question/réponse (SPEC-ASK-USER §5.4).
- L'indicateur « En attente de l'agent » (SPEC-CREATION §7.3) ne doit
  PAS s'afficher quand un plan est en attente (le worker n'attend pas
  l'agent, il attend la décision du user) : remplacer par le texte de
  la carte « L'agent propose un plan ».

---

## 6. Intégration avec le worker asynchrone et le serveur MCP

### 6.1 La règle du worker : annoncer avant d'écraser

Le prompt du worker (SPEC-WORKER-ASYNCHRONE §7.5, étendu) précise :

« Certaines de tes actions sont DESTRUCTRICES : elles écrasent ou
réordonnent la donnée existante (modifier la source HTML, régénérer les
slides, déposer de nouvelles slides, réordonner les slides). Pour toute
demande qui implique une de ces actions, tu ne dois JAMAIS l'exécuter
directement : appelle `annoncer_plan` avec la liste des actions, puis
ARRÊTE-TOI. Le user validera ou annulera ; tu reprendras à ton prochain
réveil. Ne pose pas de question de clarification en plus d'un plan (si la
demande est ambiguë ET risquée, pose d'abord la question, SPEC-ASK-USER ;
le plan vient quand la demande est claire). »

Trois cas déclenchent un plan :

1. **Action risquée dans la demande** : la demande implique au moins une
   action de l'enum §3.4 → plan obligatoire, quel que soit le reste.
2. **Confirmation explicite du user** : le user écrit « confirme avant
   d'agir », « demande-moi avant », « valide avant de toucher à la
   source » → l'agent annonce un plan pour TOUTE action (même
   `set_legende` ou `set_notes`, normalement non risquées). Ce cas est
   honoré dans la même conversation (l'engagement du user est en
   contexte) et documenté comme « mode prudent » dans le prompt.
3. **Le user a validé un plan et l'état a changé depuis** (§6.3 verrou 3)
   : le worker re-annonce au lieu d'exécuter sur un état périmé.

### 6.2 Le flux complet (aucun changement à la détection)

Le pattern s'appuie sur la règle existante « en attente = dernier message
role user » (SPEC-WORKER-ASYNCHRONE §3.1) : l'annonce du plan l'exploite
sans la modifier.

```
user : « change le texte de la slide 3 et régénère »
       → dernier message = user → EN ATTENTE
worker (cron, MCP atelier-prod) :
  1. lire_brouillon → demande claire (rien à clarifier)
  2. annoncer_plan(brouillon, [
       { action: 'modifier_source', cible: 'source HTML', detail: '...' },
       { action: 'regenerer_slides', cible: '9 slides' } ])
     → POST /message { role: 'agent', type: 'plan', actions }
     → dernier message = agent → PLUS EN ATTENTE (le worker s'arrête)
user : [PlanCard] « Valider »
       → POST /message { role: 'user', type: 'decision', decideA, decision: 'valider' }
       → dernier message = user → EN ATTENTE à nouveau
worker (réveillé par le monitor) :
  3. relit la conversation (verrou 3) : plan + décision en contexte
  4. vérifie le plan : existe, non expiré, décision valider → exécute
     (set_source / regenerer_slides avec les parts SPEC-PARTS)
  5. repondre_brouillon (« C'est fait, la source et les 9 slides sont à jour »)
user : voit les parts spinner → check et la réponse via le polling 8s
```

Le monitor du worker (hash de sortie) ne change pas : la sortie du GET
`/api/conversations/en-attente` change exactement quand l'état change
(nouvelle décision user), donc un run part au bon moment. Le plan en
attente ne déclenche RIEN (dernier message = agent) : pas de run
superflu, pas de boucle.

### 6.3 Le worker au réveil après une décision

Le worker reçoit le contexte habituel (messages ≤ 8, SPEC-WORKER-
ASYNCHRONE §3.1), qui contient le plan et la décision. Instructions du
prompt :

1. **Si le dernier message user est `type: 'decision'`** : cherche le
   plan référencé (`decideA`) dans la conversation.
   - `decision: 'valider'` ET plan non expiré (âge < `PLAN_TIMEOUT_MS`,
     calculé depuis `at` du plan) → exécute les actions du plan, dans
     l'ordre annoncé, avec les parts (SPEC-PARTS §6), puis réponds.
   - `decision: 'valider'` mais plan EXPIRÉ ou absent → **refuse
     d'exécuter** : réponds « Ce plan a expiré (ou n'existe plus), je
     re-propose une version fraîche » et re-annonce un nouveau plan
     (verrou 3 : ne jamais exécuter sur une autorisation périmée).
   - `decision: 'annuler'` → ne touche à RIEN, réponds « D'accord, je
     n'ai rien modifié. Dis-moi si tu veux ajuster autre chose ».
2. **Si le dernier message est un message libre après un plan
   abandonné** : traite-le comme une nouvelle demande (le plan non
   décidé est du contexte, pas un obstacle ; si la nouvelle demande
   couvre les mêmes actions risquées, re-annonce un plan).
3. **Vérification finale AVANT d'exécuter** (verrou 3 du worker,
   SPEC-WORKER-ASYNCHRONE §4.3) : relire le brouillon juste avant
   l'action. Si la source ou les slides ont changé depuis l'annonce du
   plan (par un autre acteur), NE PAS exécuter : re-annoncer un plan
   frais. La validation du user autorise UNE exécution sur UN état
   donné, pas sur un état qui a bougé.

### 6.4 Outil MCP : annoncer_plan

Nouvel outil (17e du serveur atelier, packages/mcp) :

```
annoncer_plan(brouillon_id: string, actions: [{ action: string, cible?: string, detail?: string }], texte?: string)
→ POST /api/brouillon/:id/message { role: 'agent', type: 'plan', actions, texte }
→ réponse { ok, planId: 'p-<ts>' } (l'id généré par l'API)
```

- `action` restreint à l'enum §3.4 (le serveur MCP valide en zod avant
  d'appeler l'API, sinon erreur claire à l'agent).
- L'outil est documenté dans son description MCP : « Annonce un plan
  d'action destructrice et ATTENDS la validation du user. Ne continue
  PAS après l'appel : ton tour est terminé, le user décidera. »
- Pas d'outil `decider_plan` : la décision vient du user via l'UI
  (POST /message `type: 'decision'`). Un agent externe (Claude Code,
  Codex) peut lire le plan via `lire_brouillon` et voir la décision
  user via le même endpoint.

### 6.5 Agents externes (Claude Code, Codex)

La page Integrations documente le pattern : un agent externe qui veut
modifier la source ou régénérer les slides doit appeler `annoncer_plan`
(ou POST /message `type: 'plan'` directement), attendre la décision
(`lire_brouillon` jusqu'à voir `type: 'decision'`), et n'exécuter
qu'après un `valider` sur un plan non expiré. Les mêmes garde-fous
s'appliquent : ne jamais écraser sans autorisation.

---

## 7. Timeout & budget

### 7.1 La constante

`PLAN_TIMEOUT_MS = 2 * 60 * 60 * 1000` (2 h), constante partagée (web),
même valeur que `QUESTION_TIMEOUT_MS` (SPEC-ASK-USER §7.1). Dérivée de
`at` du message, aucun job de nettoyage serveur. Justification : un plan
est une porte d'exécution sur une donnée vivante ; 2 h laissent au user
le temps de décider sans le presser, et la vérification de fraîcheur
(§6.3 verrou 3) protège contre l'exécution sur un état périmé.

### 7.2 Comportement à l'expiration

| Acteur | Comportement |
|---|---|
| UI | La carte passe en état « Expiré » (grisée, boutons ABSENTS). Le user ne peut PAS valider tardivement : il doit relancer sa demande, l'agent re-annoncera un plan frais. |
| Worker | Ne relance PAS le plan (pas de nudge, pas de retry bucket : les plans n'entrent jamais dans « en attente »). Si une décision `valider` arrive APRÈS expiration, il REFUSE d'exécuter (§6.3) et re-annonce. Ne JAMAIS exécuter une action risquée sans autorisation valide, même après expiration (garde-fou inaliénable). |
| Conversation | Inchangée : le plan reste en historique, marqué expiré côté affichage. |

### 7.3 Budget de run

L'annonce du plan consomme un run du worker (celui qui l'annonce). La
décision déclenche un run normal (même budget que SPEC-WORKER-
ASYNCHRONE §6 : 3 min max, 2 brouillons par run). Un plan n'ajoute donc
au pire qu'un run par approbation, et zéro run pendant l'attente : le
pattern est économique par construction (même argument que la question,
SPEC-ASK-USER §7.3).

---

## 8. Garde-fous

1. **Jamais d'action risquée sans autorisation** : une action de l'enum
   §3.4 ne doit JAMAIS être exécutée sans une décision `valider` sur un
   plan non expiré. C'est le garde-fou inaliénable, vérifié à deux
   niveaux : le prompt du worker (l'agent appelle `annoncer_plan` et
   s'arrête) et le réveil (verrou 3 : relire la conversation et
   vérifier plan + décision + fraîcheur AVANT d'exécuter).
2. **Un seul plan en attente à la fois** : le worker vérifie via
   `lire_brouillon` avant `annoncer_plan` ; si un plan est déjà en
   attente (dernier message = plan), il attend (le user décidera). Pas
   de pile de cartes. Même garde-fou que la question (SPEC-ASK-USER
   §8.2).
3. **Le plan ne part pas tout seul** : le plan en attente sort le
   brouillon de « en attente » (dernier message = agent) ; le monitor
   ne déclenche RIEN pour lui. Pas de run superflu, pas de boucle, pas
   d'exécution fantôme.
4. **Une autorisation périmée ne vaut rien** : une décision `valider`
   sur un plan expiré ou absent est refusée par le worker (§6.3), qui
   re-annonce un plan frais. Le user ne peut pas « valider un vieux
   plan » sur un état qui a bougé.
5. **L'annulation ne coûte rien** : `annuler` est traité comme une
   décision normale (un run du worker pour répondre « rien modifié »),
   zéro mutation. Un message libre abandonne le plan (§5.3).
6. **Le plan n'est pas une part, la décision n'est pas une réponse** :
   `type: 'plan'` et `type: 'decision'` sont des types de message
   distincts de `question`/`reponse` (SPEC-ASK-USER) et de `parts`
   (SPEC-PARTS). L'API rejette les combinaisons invalides (plan +
   parts, décision + parts, décision sans decideA, plan sur rôle user).
7. **Rétro-compatibilité** : tous les champs v4 sont optionnels ; un
   client qui n'envoie que `{ texte }` continue de fonctionner ; un
   message sans plan se rend comme aujourd'hui ; les questions (v2) et
   les parts (v3) ne sont pas affectées.
8. **Zéro em-dash** dans les titres/cibles/détails produits par l'agent
   et dans la spec elle-même (règle DA, appliquée dans les exemples).

---

## 9. Observabilité

- **Journal Atelier** : chaque annonce de plan (`plan_annonce`), chaque
  décision (`plan_valide` / `plan_annule`) est inscrite au journal avec
  aperçu → la page Activité IA montre le cycle d'approbation,
  horodaté, auteur tracé.
- **Page Integrations** : inchangée (l'état « agent connecté » dérive
  du journal). Le pattern plan/décision y est documenté pour les agents
  externes (§6.5).
- **Logs du worker** : le run qui annonce le plan journalise son choix
  (demande risquée → annoncer_plan avec N actions) ; le run qui exécute
  après validation journalise la décision lue (valider, plan non
  expiré) et les actions exécutées. Un refus (plan expiré) est
  journalisé aussi : c'est un événement notable (l'utilisateur a essayé
  de valider tardivement).

---

## 10. Test de bout en bout (acceptation)

1. **API (mode SQLite, tests existants étendus)** :
   - POST message normal : inchangé (vert).
   - POST plan valide (1 et 5 actions) : 200, conversation contient
     `{ role: 'agent', type: 'plan', id, actions }`.
   - POST plan avec 0 ou 6 actions : 400.
   - POST plan avec `action` hors enum : 400.
   - POST plan avec `role: 'user'` : 400.
   - POST plan + `parts` : 400.
   - POST décision valide (`decideA` + `decision: 'valider'`) : 200.
   - POST décision sans `decideA` : 400 ; `decision` hors enum : 400 ;
     `role: 'agent'` : 400.
   - POST `type: 'bogus'` : 400.
2. **Web (composant PlanCard)** :
   - Dernier message = plan → carte affichée avec la liste des actions,
     boutons Valider et Annuler.
   - Clic Valider → POST décision, carte disparaît, bloc inline « Plan
     validé ».
   - Clic Annuler → POST décision annuler, bloc inline « Plan annulé ».
   - Message libre envoyé pendant le plan → carte disparaît, plan
     inline « Sans réponse ».
   - Message plan avec `at` vieux de 3 h → carte « Expiré » sans
     boutons.
   - Aucune carte quand le dernier message est une décision (cas
     décidé).
   - Zéro erreur console, captures Playwright + vision_analyze (DA
     conforme : monochrome, hairlines, boutons primary/ghost danger,
     zéro em-dash).
3. **Worker (E2E manuel, brouillon JETABLE en prod, comme SPEC-WORKER-
   ASYNCHRONE §9)** :
   - Créer un brouillon jetable + message user risqué via API.
   - Lancer le worker : il appelle `annoncer_plan` (vérifier le message
     `type: 'plan'` dans la conversation) et NE modifie rien.
   - Vérifier : le brouillon n'apparaît plus dans
     `/api/conversations/en-attente`.
   - Répondre via `POST /message` `type: 'decision'` `valider`.
   - Relancer le worker : il exécute (source + slides réellement
     modifiées) et répond.
   - Tester aussi `annuler` sur un 2e brouillon jetable : rien n'est
     modifié.
   - Supprimer les brouillons jetables. Aucune donnée réelle touchée.

Critère produit : « change le texte de la slide 3 et régénère » →
l'agent répond par un plan (« Je vais : 1) modifier la source 2)
régénérer les slides ») avec Valider/Annuler ; le user clique Valider et
l'agent exécute ; clique Annuler et rien ne bouge.

---

## 11. Limites connues & évolutions

- **Pas d'annulation d'une exécution EN COURS** : une fois le plan
  validé, le worker exécute dans son run (max 3 min) ; le user ne peut
  pas « stopper » entre les actions. Le rollback APRÈS exécution est le
  chantier 5 (versioning, t_11b44de9) : cette spec couvre le « avant »,
  le versioning couvrira le « après ». Le `planId` (`p-<ts>`) est le
  point d'ancrage prévu pour rattacher les versions futures à
  l'autorisation qui les a produites.
- **Pas de plan multi-tours (wizard)** : un plan = 1..5 actions posées
  d'un coup, une seule décision. Un séquençage avec plusieurs points
  d'approbation (valider étape 1, puis étape 2) exigerait plusieurs
  cycles worker - possible en v2.
- **Pas de « mode prudent » persistant** : la confirmation explicite du
  user (§6.1 cas 2) vaut pour la conversation en cours ; une préférence
  globale (« toujours demander confirmation ») serait une option
  user/v2.
- **Les actions risquées sont un enum figé** : ajouter une action
  (ex. « supprimer le brouillon », « publier vers Postiz ») = étendre
  l'enum §3.4 + le mapping MCP + la liste du prompt. Le garde-fou
  n'existe que pour ce qui est déclaré : toute NOUVELLE mutation
  écrasante doit être ajoutée à l'enum avant d'être exposée.
- **Pas de notification push** quand un plan est annoncé ou décidé (le
  polling 8 s du chat suffit, cohérent avec SPEC-WORKER-ASYNCHRONE §10).
- **Limite du cron local** : le worker ne tourne que si le Mac est
  allumé (inchangé, SPEC-WORKER-ASYNCHRONE §10). Le plan en attente
  reste visible dans l'UI même si le worker est down (le user peut
  décider ; l'exécution attendra le retour du worker).
