# SPEC-ASK-USER.md : questionnaire de clarification, pattern ask_user de shadcn (12/08/2026)

> Spec du « questionnaire de clarification » importé du repo shadcn-ui/chatbot-template
> (outil `ask_user`) : quand une demande est ambiguë (« change le texte de la slide 3 »
> sans dire quoi), l'agent pose UNE question structurée AVANT d'agir, le user répond
> dans le chat, puis l'agent exécute avec la réponse. Cette spec répond aux 4 axes de
> la carte : **format des messages** (question en attente vs répondue, état dérivé),
> **composant UI** (question-card pinnée au bas du fil, comme shadcn), **intégration
> avec le worker asynchrone** (l'agent pose la question au lieu de répondre, la réponse
> réveille le worker), **timeout** (question expirée sans réponse, jamais d'action à
> l'aveugle). Reliée à : worker asynchrone (SPEC-WORKER-ASYNCHRONE.md, t_75229918),
> chat async (PR #26, Phase 6f du skill atelier), SPEC-CREATION.md (« En attente de
> l'agent »), REFONTE-DESIGN.md (direction « l'atelier, pas le dashboard »).

---

## 1. Contexte et vision

### 1.1 Le problème

Le chat avec l'agent (Phase 6f) est le « complément d'agent » de VISION.md : le user
écrit « change le texte de la slide 3 », l'agent modifie le HTML source, régénère,
répond. Mais quand la demande est ambiguë, l'agent agit **à l'aveugle** :

1. **Aucune clarification possible.** « Change le texte de la slide 3 » : quel texte
   exactement ? « Ajoute une slide sur le duplex » : quel contenu, quelle photo ?
   L'agent doit deviner, produire au hasard, ou répondre « ta demande est ambiguë » et
   attendre un nouveau message - les deux sont mauvais (travail perdu ou dead-end).
2. **Le modèle n'a aucun moyen d'arrêter et de demander.** Un agent qui tourne (worker
   asynchrone, SPEC-WORKER-ASYNCHRONE.md) a une seule sortie : la réponse. Il ne peut
   pas « suspendre » son exécution en attendant une information du user.
3. **Le chat ne distingue pas les questions des réponses.** Tous les messages sont
   `{ role, texte, at }` : rien ne marque une question en attente, rien ne structure
   une réponse (choix vs texte libre).

Le repo shadcn-ui/chatbot-template résout exactement ce problème avec le pattern
`ask_user` : un outil que le modèle appelle pour poser 1..N questions structurées
(question + exactement 3 choix courts), l'UI rend une **question-card pinnée au bas du
fil** (sticky, comme un formulaire inline), le user répond (choix cliqué OU texte
libre), la réponse est renvoyée au modèle qui **reprend** son exécution. C'est ce
pattern qu'on importe, adapté à l'architecture asynchrone d'Atelier (pas de session de
streaming : la conversation est stockée, le worker est un cron).

### 1.2 La décision (cadrage)

1. **La question est un message de conversation, pas un flag.** On étend le format
   `MessageChat` avec un type optionnel (`question` / `reponse`). Pas de colonne, pas
   de migration : la conversation reste un JSON TEXT sur `brouillons` (Phase 6f).
2. **« En attente » vs « répondue » = état dérivé, pas un champ.** Une question est
   *en attente* ssi elle est le **dernier message** de la conversation. Dès que le user
   répond (message suivant), elle bascule en *répondue* atomiquement. Même logique que
   le worker (SPEC-WORKER-ASYNCHRONE.md §3.2 : état dérivé > flag, crash-safe, zéro
   orphelin : si l'agent crashe après la question, elle reste en attente et le user
   peut répondre quand même).
3. **L'agent pose la question AU LIEU de répondre.** Le worker asynchrone, quand une
   demande est ambiguë, appelle un outil MCP `poser_question` qui écrit le message
   `type: 'question'`. Le brouillon sort alors de l'ensemble « en attente » (dernier
   message = agent) : le worker ne tourne plus pour lui. Quand le user répond (dernier
   message = user), le brouillon **réintègre** l'ensemble « en attente » et le worker
   se réveille avec la réponse en contexte. Zéro changement de la règle de détection.
4. **Timeout = jamais d'action à l'aveugle.** Une question sans réponse expire après
   `QUESTION_TIMEOUT_MS` (2 h) : l'UI marque la carte « Sans réponse », le worker ne
   relance pas et surtout **n'exécute jamais** une demande ambiguë sans réponse. Le
   user peut répondre après expiration : la réponse est traitée normalement.
5. **UI : question-card pinnée au bas du fil** (pattern shadcn exact) : quand le
   dernier message est une question en attente, une carte sticky s'affiche au-dessus
   de l'input du chat avec la question, les 3 choix cliquables et un champ texte
   libre. Les questions répondue s'affichent inline dans le fil (Q grisée / A normale).

### 1.3 Périmètre v1

- Message de question : 1..3 questions par carte, chacune avec **exactement 3 choix**
  courts (contrainte shadcn) + toujours un champ « autre réponse » libre.
- Une seule question en attente à la fois (le worker ne pose pas une question si une
  autre est déjà en attente, garde-fou §8.2).
- Timeout d'expiration côté UI (état dérivé de `at`), pas de job de nettoyage.
- Hors périmètre : multi-tours de questionnaire (wizard), notifications push,
  relance automatique de l'agent après expiration, questions préremplies depuis les
  données du brouillon (choix dynamiques type « liste des logements »), agent qui
  répond avec des choix chargés depuis une ressource de la bibliothèque.

---

## 2. Vocabulaire (figé)

| Terme | Sens |
|---|---|
| Question | Message de conversation `type: 'question'` (rôle agent) : un texte + 1..3 blocs `{ question, choix }` |
| Réponse | Message de conversation `type: 'reponse'` (rôle user) : les réponses aux blocs de la question, `repondA` pointe la question |
| En attente | Une question dont le message est le DERNIER de la conversation (le user doit répondre) |
| Répondue | Une question suivie d'au moins un message user (la question est résolue) |
| Expirée | Une question en attente dont l'âge dépasse `QUESTION_TIMEOUT_MS` |
| Question-card | La carte sticky pinnée au bas du fil qui rend la question en attente |
| Demande ambiguë | Une demande où l'agent ne peut pas savoir quoi faire sans information du user (quoi, quel, combien, où, quand) |

Règle de dérivation de l'état d'une question (source de vérité, §3.3) :

| État | Condition |
|---|---|
| En attente | `type === 'question'` ET c'est le dernier message de la conversation |
| Répondue | `type === 'question'` ET un message user le suit (type 'reponse' ou message libre) |
| Expirée | En attente ET `now - at > QUESTION_TIMEOUT_MS` (2 h) |

---

## 3. Format des messages (v2, rétro-compatible)

### 3.1 Le format actuel (inchangé pour les messages existants)

```ts
interface MessageChat {
  role: 'user' | 'agent';
  texte: string;
  at: string; // ISO
}
```

Les messages existants restent valides tels quels : l'ajout de champs optionnels ne
casse rien (les consommateurs actuels lisent `role`/`texte`/`at`, l'API stocke le JSON
brut, `slice(-200)` inchangé).

### 3.2 Le format étendu (v2)

```ts
type MessageChat = {
  role: 'user' | 'agent';
  texte: string;          // obligatoire pour les messages normaux, optionnel pour question/reponse
  at: string;
  // v2 (optionnels) :
  type?: 'question' | 'reponse';
  id?: string;            // question : identifiant stable 'q-<ts>' (généré côté API si absent)
  questions?: {           // type === 'question' (rôle agent) : 1..3 blocs
    question: string;
    choix: string[];      // EXACTEMENT 3 choix courts et distincts (contrainte shadcn)
  }[];
  repondA?: string;       // type === 'reponse' (rôle user) : id de la question répondue
  reponses?: {            // type === 'reponse' : aligné sur questions (même ordre)
    question: string;
    reponse: string;      // le choix cliqué OU le texte libre du user
  }[];
};
```

### 3.3 Règle de dérivation (en attente vs répondue)

C'est la règle UNIQUE, implémentée côté consommateur (web) et documentée pour le
worker. Pas de champ « statut de question » stocké :

1. On parcourt la conversation du plus récent au plus ancien.
2. Si le **dernier message** est `type: 'question'` : cette question est **en attente**
   (c'est la seule possiblement en attente, garde-fou une-seule-à-la-fois §8.2).
3. Toute question plus ancienne que le dernier message user est **répondue**.
4. Une question en attente dont `now - at > QUESTION_TIMEOUT_MS` est **expirée**
   (l'UI la grise, elle n'est plus une carte active).

Conséquence produit : la carte question n'est visible QUE quand le dernier message est
une question. Dès que le user envoie quoi que ce soit (réponse structurée ou message
libre), la carte disparaît et la question passe en « répondue » dans le fil.

### 3.4 Pourquoi pas un flag « répondue » sur le message

- **Crash-safe** : si l'agent pose la question puis crashe, le message reste en
  attente (dérivé), le user peut répondre, le worker traitera. Un flag `traite`
  laisserait une question marquée « en attente » sans mécanisme de reprise.
- **Zéro migration** : pas de colonne, pas de backfill, le JSON s'étend naturellement.
- **Cohérence avec le worker** : la même philosophie que SPEC-WORKER-ASYNCHRONE.md
  §3.2 (état dérivé > flag) - une seule façon de penser l'état dans tout le produit.

---

## 4. API

### 4.1 POST /api/brouillon/:id/message (étendu)

Le endpoint existant (app.ts, route 408) accepte désormais 3 formes de body :

```jsonc
// 1. Message normal (existant, inchangé) - { texte } ou { texte, role: 'agent' }
{ "texte": "change le texte de la slide 3" }

// 2. Question (rôle agent, via MCP poser_question)
{
  "role": "agent",
  "type": "question",
  "questions": [
    { "question": "Quel texte veux-tu mettre sur la slide 3 ?",
      "choix": ["Garde le titre, change le sous-titre", "Remplace tout le texte", "Supprime la slide"] },
    { "question": "Dans quel ton ?",
      "choix": ["Ton actuel de la charte", "Plus direct", "Plus premium"] }
  ]
}

// 3. Réponse (rôle user, via la question-card)
{
  "role": "user",
  "type": "reponse",
  "repondA": "q-<ts>",
  "reponses": [
    { "question": "Quel texte veux-tu mettre sur la slide 3 ?", "reponse": "Remplace tout le texte" },
    { "question": "Dans quel ton ?", "reponse": "Plus direct" }
  ]
}
```

Validation (400 avec message clair, avant tout stockage) :

| Cas | Règle |
|---|---|
| `type: 'question'` | `role` DOIT être `'agent'` ; `questions` 1..3 ; chaque `question` non vide ; chaque `choix` EXACTEMENT 3 éléments, courts (< 80 car.), distincts ; `texte` optionnel (dérivé : premier question si absent) |
| `type: 'reponse'` | `role` DOIT être `'user'` ; `reponses` 1..3 ; aligné sur les blocs de la question `repondA` (mêmes questions, même ordre) ; chaque `reponse` non vide |
| `type` absent | comportement actuel inchangé (`texte` obligatoire) |
| `type` inconnu | 400 |

Comportement : append du message, `slice(-200)`, `updatedAt`, journal (voir §4.3).
**Pas de vérification que `repondA` existe** côté API (la conversation peut avoir été
nettoyée) : la réponse est stockée telle quelle, le consommateur (worker) fait le lien.

### 4.2 GET détail brouillon

Inchangé : `conversation` renvoyée telle quelle (JSON string). Les nouveaux champs
(`type`, `id`, `questions`, `reponses`, `repondA`) transitent naturellement.

### 4.3 Journal d'activité (page Activité IA)

| Action | type journal | message |
|---|---|---|
| Agent pose une question | `question_posee` (auteur agent) | « a posé N question(s) de clarification » + aperçu première question |
| User répond via la carte | `reponse_question` (auteur user) | « a répondu à la question » + aperçu première réponse |
| User envoie un message libre pendant une question en attente | `message_user` (existant) | inchangé (la question est implicitement abandonnée, voir §5.3) |

### 4.4 Règle des 4 fichiers (rappel Phase 4)

Pas de changement de schéma (la conversation est un JSON dans une colonne TEXT
existante) : **aucune modification** de schema.ts / schema-pg.ts / legacy.ts /
migrate-pg.ts. Seuls changent : le parse/validation de la route POST /message (app.ts),
le type `MessageChat` côté web (api.ts), le composant UI, et l'outil MCP.

---

## 5. Composant UI : la question-card pinnée au bas du fil (pattern shadcn)

### 5.1 Placement et rendu

Dans l'onglet Agent du panneau droit, le chat est rendu en 2 zones :
`.chat-feed` (les messages) + `.chat-input` (textarea + Envoyer). La question-card
s'insère **entre les deux**, pinnée au bas du fil :

```
┌─ chat-feed ──────────────────────┐
│  (messages, scrollable)          │
│  ...                             │
│  [Q répondue inline]  ← inline   │
└──────────────────────────────────┘
┌─ question-card (sticky) ─────────┐  ← visible UNIQUEMENT si le
│  Question de l'agent             │    dernier message est une
│  ┌────────────────────────────┐  │    question en attente
│  │ Quel texte veux-tu...      │  │
│  │ [choix 1] [choix 2] [choix 3]│ │
│  │ [autre réponse...        ] │  │
│  └────────────────────────────┘  │
│  [Répondre]                      │
└──────────────────────────────────┘
┌─ chat-input ─────────────────────┐
│  [textarea] [Envoyer]            │
└──────────────────────────────────┘
```

- La carte est `position: sticky; bottom: 0` DANS le flux du panneau (le chat-feed
  garde son scroll indépendant) - exactement le `sticky bottom-2` de
  `components/question-card.tsx` (shadcn).
- Elle est rendue par un composant `QuestionCard` qui reçoit la question en attente
  (le dernier message de la conversation si `type === 'question'`).
- DA : fond `bg-level-3`, hairline `line-default`, radius 12 px (carte), inputs 8 px,
  texte 13 px, choix = boutons `ghost` (pill), bouton Répondre = `primary` pleine
  largeur. Monochrome strict (zéro accent couleur, zéro em-dash).
- La carte est **désactivée** quand une réponse est en cours d'envoi (état `envoi`).

### 5.2 États de la carte

| État | Déclencheur | Rendu |
|---|---|---|
| En attente | dernier message = question, âge < timeout | Carte active : 1..3 blocs question, chacun avec les 3 choix cliquables + un input « Autre réponse » ; si > 1 question, compteur discret « 1/2 » ; bouton Répondre disabled tant que chaque question n'a pas une réponse (choix OU texte libre) |
| Répondue | un message user suit la question | Plus de carte : la question s'affiche inline dans le fil (bloc compact : question en ink-secondary, réponse en ink-primary) - équivalent `ask-user-part.tsx` (shadcn, `<ol>` question/answer) |
| Expirée | dernier message = question, âge > timeout | Carte grisée : texte « Sans réponse » + la question reste lisible, choix désactivés, mais le champ « Autre réponse » reste actif (répondre après expiration est permis, §7.2) |
| Abandonnée | un message LIBRE (pas `type: 'reponse'`) suit la question | Pas de carte : la question s'affiche inline grisée avec mention « Sans réponse » ; le worker traite le message libre comme une nouvelle demande (§5.3) |

### 5.3 Interaction

1. Le user clique un choix OU tape « Autre réponse » (ou les deux, le texte libre
   prime) pour chaque bloc.
2. Clic « Répondre » → `envoyerMessage(id, { role: 'user', type: 'reponse',
   repondA: question.id, reponses })` → POST /message.
3. La carte disparaît immédiatement (le dernier message est maintenant la réponse,
   état dérivé), la paire Q/A apparaît inline dans le fil.
4. Le polling 8 s existant (Phase 6f) fait le reste : quand le worker aura exécuté et
   répondu, sa réponse arrive dans le fil normalement.
5. **Message libre pendant une question en attente** : le user ignore la carte et
   envoie un nouveau message depuis l'input → la question passe en « abandonnée »
   (inline grisée), la carte disparaît. Le worker traitera le nouveau message comme
   une nouvelle demande (avec l'historique en contexte : il voit la question posée
   et non répondue, §8.2 garde-fou : il ne la re-pose pas si la nouvelle demande la
   couvre, sinon il re-posera proprement).

### 5.4 Détails d'implémentation (web)

- `MessageChat` (api.ts) : ajouter `type?`, `id?`, `questions?`, `reponses?`,
  `repondA?` (tous optionnels, rétro-compatible).
- `envoyerMessage` : accepter un body partiel (aujourd'hui il force `{ texte, role }`).
  Nouvelle signature : `envoyerMessage(id, body: { texte?, role?, type?, questions?,
  reponses?, repondA? })` - l'existant continue de marcher.
- Dérivation : helper `deriverQuestion(conversation: MessageChat[]): QuestionState |
  null` qui applique §3.3 (dernier message question → en attente, timeout → expirée,
  sinon null). Testé unitairement (4 cas : none / attente / expirée / répondue-abandonnée).
- Le fil : pour un message `type: 'question'` **répondu**, rendre le bloc inline Q/A ;
  pour un message `type: 'reponse'`, ne PAS le rendre comme bulle user normale
  (il est déjà représenté dans le bloc Q/A) - sinon double affichage.
- L'indicateur « En attente de l'agent » (SPEC-CREATION §7.3) ne doit PAS s'afficher
  quand une question est en attente (le worker n'attend pas l'agent, il attend le
  user) : remplacer par le texte de la carte « Question de l'agent ».

---

## 6. Intégration avec le worker asynchrone

### 6.1 L'agent pose la question au lieu de répondre

Nouvel outil MCP `poser_question` (14e outil du serveur atelier, packages/mcp) :

```
poser_question(brouillon_id: string, questions: [{ question: string, choix: string[] }])
→ POST /api/brouillon/:id/message { role: 'agent', type: 'question', questions }
→ réponse { ok, conversation } (le message est stocké, le brouillon sort de « en attente »)
```

Règle dans le prompt du worker (SPEC-WORKER-ASYNCHRONE.md §7.5, étendue) :
« Si la demande du user est ambiguë (il manque une information : quel texte, quel
logement, quel réseau, combien, quand), ne PAS agir à l'aveugle et ne PAS répondre
« ta demande est ambiguë » : appelle `poser_question` avec 1..3 questions, chacune
avec exactement 3 choix courts et distincts. Puis arrête-toi : le user répondra et tu
reprendras à ton prochain réveil. »

### 6.2 Le cycle complet (aucun changement à la détection)

Le pattern s'appuie sur la règle existante « en attente = dernier message role user »
(SPEC-WORKER-ASYNCHRONE.md §3.1) - la question l'exploite sans la modifier :

```
user : « change le texte de la slide 3 »        → dernier message = user  → EN ATTENTE
worker : lire_brouillon, demande ambiguë
       → poser_question (« Quel texte ? »)      → dernier message = agent → plus en attente
                                                 (le worker ne tourne plus pour ce brouillon)
user : [carte] « Remplace tout le texte »       → dernier message = user  → EN ATTENTE à nouveau
worker : lit la conversation (la question ET la réponse sont en contexte)
       → exécute (set_source + regenerer_slides) → repondre_brouillon (« C'est fait »)
user : voit la réponse via le polling 8 s
```

Le monitor du worker (hash de sortie) ne change pas : la sortie du GET
`/api/conversations/en-attente` change exactement quand l'état change (nouveau message
user), donc un run part au bon moment. La question en attente ne déclenche RIEN
(dernier message = agent) : pas de run superflu, pas de boucle.

### 6.3 Le worker au réveil après une réponse

Le worker reçoit le contexte habituel (messages ≤ 8, SPEC-WORKER-ASYNCHRONE.md §3.1),
qui contient la question et la réponse. Instructions du prompt :

1. Si le dernier message user est `type: 'reponse'` (ou suit manifestement une
   question posée par toi) : traite-le comme la réponse à ta question, exécute la
   demande d'origine AVEC cette réponse, puis réponds normalement.
2. Si le dernier message est un message libre après une question abandonnée :
   traite-le comme une nouvelle demande (la question non répondue est du contexte,
   pas un obstacle).
3. Ne JAMAIS re-poser la même question si elle vient d'être répondue (le re-check
   du verrou 3 de SPEC-WORKER-ASYNCHRONE.md §4.3 s'applique : relire la conversation
   avant d'agir).

### 6.4 MCP : lire_brouillon

La description de `lire_brouillon` mentionne désormais la conversation avec les
questions en attente (« dernier message = question posée par l'agent, en attente de
réponse du user ») pour que les agents externes (Claude Code, Codex - page
Integrations) comprennent l'état.

---

## 7. Timeout & budget

### 7.1 La constante

`QUESTION_TIMEOUT_MS = 2 * 60 * 60 * 1000` (2 h), constante partagée (web). Dérivée de
`at` du message, aucun job de nettoyage serveur.

### 7.2 Comportement à l'expiration

| Acteur | Comportement |
|---|---|
| UI | La carte passe en état « Expirée » (grisée, « Sans réponse »). Le user peut TOUJOURS répondre : la réponse est traitée normalement et réveille le worker. |
| Worker | Ne relance PAS la question (pas de nudge, pas de retry bucket pour les questions : elles n'entrent jamais dans « en attente »). Ne JAMAIS exécuter une demande ambiguë sans réponse, même après expiration (garde-fou inaliénable). |
| Conversation | Inchangée : la question reste en historique, marquée expirée côté affichage. |

### 7.3 Budget de run

La question posée consomme un run du worker (le run qui la pose). La réponse déclenche
un run normal (même budget que SPEC-WORKER-ASYNCHRONE.md §6 : 3 min max, 2 brouillons
par run). Une question n'ajoute donc au pire qu'un run par clarification, et zéro run
pendant l'attente - le pattern est économique par construction.

---

## 8. Garde-fous

1. **Jamais d'action à l'aveugle** : une demande ambiguë SANS réponse ne doit jamais
   aboutir à une modification (source, slides, légendes, notes). L'agent pose la
   question ou, si le budget ne le permet pas, répond honnêtement qu'il a besoin
   d'une précision (règle Bordeluche : pas d'invention, pas de faux contenu).
2. **Une seule question en attente à la fois** : le worker vérifie via `lire_brouillon`
   avant `poser_question` ; si une question est déjà en attente, il attend (le user
   répondra) - pas de pile de cartes.
3. **3 choix, courts et distincts** (contrainte shadcn) : pas de choix vagues
   (« oui », « peut-être »), pas de choix dupliqués, chaque choix < 80 caractères.
   Le texte libre « Autre réponse » est TOUJOURS disponible (le user n'est jamais
   enfermé dans les choix).
4. **Jamais de statut de validation ni de publication** par le worker (inchangé,
   SPEC-WORKER-ASYNCHRONE.md §7.1) - la question ne change rien à ce périmètre.
5. **La question n'est pas une réponse** : `poser_question` ne marque PAS la demande
   comme traitée (elle n'apparaît jamais dans « en attente »), elle la met en pause.
6. **Rétro-compatibilité** : tous les champs v2 sont optionnels ; un client qui
   n'envoie que `{ texte }` continue de fonctionner (l'API et le web ignorent les
   champs absents).

---

## 9. Observabilité

- **Journal Atelier** : chaque question posée (`question_posee`) et chaque réponse
  (`reponse_question`) est inscrite au journal avec aperçu → la page Activité IA
  montre le cycle de clarification, horodaté, auteur tracé.
- **Page Integrations** : inchangée (l'état « agent connecté » dérive du journal).
- **Logs du worker** : le run qui pose la question journalise son choix (demande
  ambiguë → poser_question avec N questions) dans sa sortie cron.

---

## 10. Test de bout en bout (acceptance)

1. **API (mode SQLite, tests existants étendus)** :
   - POST message normal : inchangé (vert).
   - POST question valide (1 et 3 blocs) : 200, conversation contient
     `{ role: 'agent', type: 'question', id, questions }`.
   - POST question avec 2 choix ou 4 choix : 400.
   - POST question avec `role: 'user'` : 400.
   - POST reponse valide (`repondA` + `reponses` alignées) : 200.
   - POST reponse avec `reponses` vide : 400.
   - POST `type: 'bogus'` : 400.
2. **Web (composant QuestionCard)** :
   - Dernier message = question → carte affichée avec les choix, bouton Répondre
     disabled tant que rien n'est rempli.
   - Clic choix → Répondre → POST reponse, carte disparaît, bloc Q/A inline.
   - Message libre envoyé pendant la question → carte disparaît, question inline
     « Sans réponse ».
   - Message question avec `at` vieux de 3 h → carte « Expirée ».
   - Aucune carte quand le dernier message est une réponse (cas répondue).
   - Zéro erreur console, captures Playwright + vision_analyze (DA conforme :
     monochrome, hairlines, zéro em-dash).
3. **Worker (E2E manuel, brouillon JETABLE en prod, comme SPEC-WORKER-ASYNCHRONE.md
   §9)** :
   - Créer un brouillon jetable + message user ambigu via API.
   - Lancer le worker : il appelle `poser_question` (vérifier le message
     `type: 'question'` dans la conversation) et NE modifie rien.
   - Vérifier : le brouillon n'apparaît plus dans `/api/conversations/en-attente`.
   - Répondre via `POST /message` `type: 'reponse'`.
   - Relancer le worker : il exécute la demande avec la réponse et répond.
   - Vérifier la réponse `role: 'agent'` + les modifications réelles (ex. notes).
   - Supprimer le brouillon jetable. Aucune donnée réelle touchée.

Critère produit : « change le texte de la slide 3 » sans précision → l'agent répond
par une question (avec choix) au lieu d'agir au hasard ; le user clique et l'agent
exécute exactement ce qui a été demandé.

---

## 11. Limites connues & évolutions

- **Pas de wizard multi-étapes** : une carte = 1..3 questions posées d'un coup
  (contrainte shadcn adaptée à l'async). Un vrai questionnaire séquentiel (réponse 1
  → question 2) exigerait plusieurs cycles worker, possible en v2.
- **Choix statiques** : les choix sont écrits par l'agent au moment de la question.
  Évolution naturelle : choix dynamiques depuis les données (liste des logements,
  liste des slides, réseaux) injectés par l'API dans la carte - v2.
- **Pas de relance automatique** : une question expirée n'est pas re-posée par le
  worker. Évolution possible : un retry bucket « question sans réponse » (miroir du
  bucket bloqué du worker) qui envoie une relance polie après X h - v2.
- **Pas de notification push** quand une question est posée ou répondue (le polling
  8 s du chat suffit, cohérent avec SPEC-WORKER-ASYNCHRONE.md §10).
- **Limite du cron local** : le worker ne tourne que si le Mac est allumé (inchangé,
  SPEC-WORKER-ASYNCHRONE.md §10) - la question en attente reste visible dans l'UI
  même si le worker est down (c'est une amélioration : le user voit que l'agent
  attend sa réponse).
