# SPEC-PARTS.md : des cartes d'action dans le chat, l'agent montre son travail (12/08/2026)

> Spec du « tool-parts » importé du repo shadcn-ui/chatbot-template
> (components/parts) et adapté à l'architecture asynchrone d'Atelier.
> Aujourd'hui l'agent ne répond que par du texte brut dans le chat
> (`{ role, texte, at }`, Phase 6f PR #26) : on ne voit pas ce qu'il a
> fait, ni combien de temps ça a pris. Cette spec introduit des **cartes
> d'action structurées** (« Slide 3 modifiée », « Légende mise à jour »,
> « Source déposée ») avec un état (en cours / fait / erreur) et une
> durée affichée, rendues en DA noire avec la motion 150-250ms du design
> system. Reliée à : chat async (Phase 6f), SPEC-ASK-USER.md (le type
> `question`, t_cef95a58), worker asynchrone (SPEC-WORKER-ASYNCHRONE.md,
> t_75229918), SPEC-CREATION.md, REFONTE-DESIGN.md, spec animations
> Apollon (t_429a4bef, 8 classes / 7 zones).

---

## 1. Contexte et vision

### 1.1 Le problème

Le chat avec l'agent (Phase 6f) affiche chaque message comme un bloc de
texte brut : `chat-msg` avec l'en-tête (Sparkle + « Agent ») et le corps
`chat-msg-text`. Quand l'agent exécute une demande (« change le texte de
la slide 3 », « mets à jour la légende », « voici la source »), le user ne
voit qu'une réponse textuelle du type « C'est fait » ou « Slide 3 mise à
jour ». Trois manques :

1. **Le travail n'est pas visible.** On voit le résultat déclaré, pas
   l'action. Rien ne distingue « j'ai déposé la source », « j'ai régénéré
   les 9 slides », « j'ai mis à jour la légende Instagram » : c'est une
   masse de texte, vite illisible quand la conversation s'allonge.
2. **Pas d'état ni de durée.** Une régénération de slides prend plusieurs
   secondes, une écriture de légende est quasi instantanée : le user ne
   sait jamais si l'agent travaille encore ni combien de temps une action
   a pris. Le seul indicateur actuel est le caret de frappe
   (`stream-caret`, 200ms), qui ne distingue pas les actions.
3. **Rien n'est structuré pour l'avenir.** Le diff visuel avant/après
   (chantier 3, t_625fe5a9) et le versioning (chantier 5, t_11b44de9)
   auront besoin de savoir QUELLE action a touché QUOI (quelle slide,
   quel réseau, quelle durée). Un texte libre ne permet aucune liaison.

Le repo shadcn-ui/chatbot-template résout exactement ce problème avec
les **tool parts** (`components/parts/`) : chaque message agent est une
liste de parts typées (`text`, `tool-<name>`), chaque part a des états
qui progressent avec le stream (`input-streaming` → `input-available` →
`output-available` / `output-error`), et chaque composant part rend son
état (spinner pendant l'exécution, résultat ou erreur à la fin). C'est ce
pattern qu'on importe, adapté : Atelier est asynchrone (pas de session de
streaming, la conversation est un JSON stocké, le worker est un cron),
donc « en cours » n'est pas un stream mais un message d'annonce suivi
d'une mise à jour in-place de la part.

### 1.2 La décision (cadrage)

1. **La part est un champ du message, pas un message séparé.** On étend
   `MessageChat` avec `parts?: PartChat[]` (1..N par message agent). Une
   part décrit UNE action : type, titre, sous-titre, état, durée. Pas de
   colonne, pas de migration : la conversation reste un JSON TEXT sur
   `brouillons` (Phase 6f). Rétro-compatible : un message sans `parts`
   se rend comme aujourd'hui.
2. **Cinq types de parts, figés** (la liste de la carte, pas plus pour
   v1) : `slide_modifiee`, `legende_maj`, `source_deposee`, `question`,
   `erreur`. Chaque action de l'agent est rattachée à un type (voir §6.2
   le mapping outils MCP → parts). Les types sont extensibles en v2
   (`statut_maj`, `note_maj`, `check_conformite`...), mais on ne les
   ajoute QUE quand une vraie action les produit.
3. **État dérivé + mise à jour in-place, pas de flag.** Une part naît
   `en_cours` (annoncée par l'agent avant d'agir), puis est mise à jour
   in-place vers `fait` ou `erreur` avec la durée mesurée. La mise à jour
   réécrit le JSON de la conversation (même mécanique que le patch
   générique `{ conversation }` déjà utilisé pour nettoyer un test,
   SPEC-ASK-USER §5.4). Crash-safe : si l'agent meurt entre l'annonce et
   la fin, la part reste `en_cours` et l'UI la dérive en « interrompue »
   après `PARTS_TIMEOUT_MS` (§7) - le user n'a jamais une carte « en
   cours » éternelle.
4. **Le type `question` est le point d'ancrage d'ask_user.** Une question
   posée par l'agent (SPEC-ASK-USER §3.2, message `type: 'question'`) se
   rend comme une part `question` : la question-card pinnée au bas du fil
   si elle est en attente, le bloc Q/A inline si elle est répondue. La
   spec parts définit le contrat de rendu ; le format des données reste
   celui de SPEC-ASK-USER (aucune divergence).
5. **Les parts sont émises par l'agent, pas par l'API.** L'API reste un
   tuyau (elle stocke le JSON). C'est la couche agent (le serveur MCP, ou
   un agent externe via l'API) qui annonce et termine les parts : une
   mutation faite par le user dans l'UI ne crée pas de carte « Source
   déposée » dans le chat (le chat raconte le travail de l'AGENT, pas les
   gestes du user).

### 1.3 Périmètre v1

- Format `parts` dans `MessageChat` (rétro-compatible), 5 types figés.
- Rendu web : carte part (icône + titre + sous-titre + durée), états
  `en_cours` (spinner), `fait` (check + durée), `erreur` (rouge).
- Annonce + terminaison : route API (POST /message étendu + PATCH part),
  outils MCP (`emettre_part` / `terminer_part`), et **auto-parts sur les
  3 outils de mutation principaux** (set_source, set_legende,
  regenerer_slides / deposer_slides) via un helper commun.
- Timeout d'interruption (part `en_cours` expirée → rendu « interrompue »).
- Hors périmètre : types de parts supplémentaires, file d'attente de
  parts, diff visuel avant/après (chantier 3), versioning (chantier 5),
  notification push.

---

## 2. Vocabulaire (figé)

| Terme | Sens |
|---|---|
| Part | Unité d'action structurée dans un message agent : `{ type, titre, sousTitre?, etat, debut?, dureeMs? }` |
| PartCard | La carte rendue dans le chat pour une part (icône + titre + sous-titre + durée) |
| Annoncer | Émettre une part `en_cours` avant d'exécuter l'action |
| Terminer | Mettre à jour in-place une part vers `fait` (ou `erreur`) avec la durée mesurée |
| En cours | `etat: 'en_cours'` : l'action est annoncée, pas terminée (spinner) |
| Fait | `etat: 'fait'` : l'action a abouti (check + durée affichée) |
| Erreur | `etat: 'erreur'` : l'action a échoué (texte d'erreur en sous-titre) |
| Interrompue | Part `en_cours` dont l'âge dépasse `PARTS_TIMEOUT_MS` (état dérivé, rendu comme une erreur) |
| Message agent | Message `role: 'agent'` pouvant porter `texte` (résumé final) et/ou `parts` (les cartes) |

Règle de dérivation de l'état d'une part (source de vérité, §7) :

| État rendu | Condition |
|---|---|
| En cours | `etat === 'en_cours'` ET âge ≤ `PARTS_TIMEOUT_MS` |
| Fait | `etat === 'fait'` (dureeMs affichée si présente) |
| Erreur | `etat === 'erreur'` |
| Interrompue | `etat === 'en_cours'` ET `now - at > PARTS_TIMEOUT_MS` (rendue comme erreur, jamais de spinner éternel) |

---

## 3. Format des messages (v3, rétro-compatible)

### 3.1 Le format actuel (inchangé pour les messages existants)

```ts
interface MessageChat {
  role: 'user' | 'agent';
  texte: string;
  at: string; // ISO
}
```

Les messages existants restent valides tels quels : les champs v2 (question,
SPEC-ASK-USER) et v3 (parts) sont optionnels, les consommateurs actuels
lisent `role`/`texte`/`at`, l'API stocke le JSON brut, `slice(-200)` inchangé.

### 3.2 Le format étendu (v3 = v2 + parts)

```ts
type PartType = 'slide_modifiee' | 'legende_maj' | 'source_deposee'
              | 'question' | 'erreur';

type PartEtat = 'en_cours' | 'fait' | 'erreur';

type PartChat = {
  type: PartType;
  titre: string;            // ex. 'Slide 3 modifiée'
  sousTitre?: string;       // ex. 'Titre remplacé par « Duplex Gambetta »' ou 'Instagram · 1 284 caractères'
  etat: PartEtat;
  debut?: string;           // ISO : moment de l'annonce (permet de calculer la durée côté UI si absente)
  dureeMs?: number;         // durée mesurée, remplie à la terminaison
};

type MessageChat = {
  role: 'user' | 'agent';
  texte: string;            // obligatoire pour les messages sans parts, optionnel si parts présentes
  at: string;
  // v2 (SPEC-ASK-USER, optionnels) :
  type?: 'question' | 'reponse';
  id?: string;
  questions?: { question: string; choix: string[] }[];
  repondA?: string;
  reponses?: { question: string; reponse: string }[];
  // v3 (parts, optionnels) :
  parts?: PartChat[];
};
```

Règles du format :

1. `parts` ne peut être porté QUE par un message `role: 'agent'` (un
   message user n'a jamais de parts : le user ne « montre pas son
   travail », il demande).
2. `texte` devient optionnel quand `parts` est présent : un message peut
   être 100% cartes (« Slide 3 modifiée ») sans résumé. À l'inverse, un
   message `parts` peut aussi porter `texte` : les cartes sont rendues
   PUIS le texte (résumé final de l'agent, ex. « Dis-moi si tu veux
   ajuster autre chose ») - même logique que shadcn où un message mêle
   text parts et tool parts.
3. `1 ≤ parts.length ≤ 5` par message : une réponse d'agent montre au
   plus 5 actions (au-delà, l'agent groupe ou fractionne ; garde-fou de
   lisibilité).
4. `titre` : verbe passé + objet, ≤ 60 caractères, zéro em-dash, pas de
   point final (« Slide 3 modifiée », pas « Slide 3 modifiée. »).
5. `dureeMs` : nombre entier ≥ 0, rempli à la terminaison par le serveur
   (mesure autour de l'exécution) ou par l'agent. L'UI ne l'affiche que
   si `etat === 'fait'`.

### 3.3 Pourquoi pas un message séparé par part

- **Cohérence visuelle** : les parts d'une même réponse (ex. « Source
  déposée » + « Slides régénérées ») apparaissent ensemble dans un même
  message, comme un seul tour d'agent - pas une pluie de bulles.
- **Liaison au diff/versioning** (chantiers 3 et 5) : le message qui
  contient la part est l'unité de temps de l'action ; le diff s'y
  rattachera naturellement.
- **Rétro-compatibilité** : le rendu actuel (`m.texte`) continue de
  marcher pour les messages sans parts ; un client ancien qui ignore
  `parts` affiche juste le texte (ou rien si texte absent, cas voulu).

---

## 4. API

### 4.1 POST /api/brouillon/:id/message (étendu)

Le endpoint existant (app.ts, route 448) accepte désormais 4 formes de body :

```jsonc
// 1. Message normal (existant, inchangé) - { texte } ou { texte, role: 'agent' }
{ "texte": "change le texte de la slide 3" }

// 2. Question (rôle agent, via MCP poser_question, SPEC-ASK-USER §4.1)
{ "role": "agent", "type": "question", "questions": [ ... ] }

// 3. Réponse (rôle user, via la question-card, SPEC-ASK-USER §4.1)
{ "role": "user", "type": "reponse", "repondA": "q-<ts>", "reponses": [ ... ] }

// 4. Parts (rôle agent, via MCP emettre_part ou auto-parts des outils)
{
  "role": "agent",
  "texte": "Source déposée, slides régénérées.",
  "parts": [
    { "type": "source_deposee", "titre": "Source déposée", "sousTitre": "document.html · 12,4 Ko", "etat": "fait", "dureeMs": 312 },
    { "type": "slide_modifiee", "titre": "Slides régénérées", "sousTitre": "9 slides", "etat": "fait", "dureeMs": 1840 }
  ]
}
```

Validation (400 avec message clair, avant tout stockage) :

| Cas | Règle |
|---|---|
| `parts` présent | `role` DOIT être `'agent'` ; tableau de 1 à 5 parts ; chaque part : `type` dans l'enum, `titre` non vide ≤ 60 car., `sousTitre` optionnel ≤ 120 car., `etat` dans l'enum, `debut` ISO optionnel, `dureeMs` entier ≥ 0 optionnel |
| `parts` présent + `type: 'question'` | interdit (une question n'est pas une part : c'est un message `type: 'question'`, voir SPEC-ASK-USER) |
| `texte` absent sans `parts` | 400 (comportement actuel) |
| `type` inconnu dans une part | 400 |
| `type` inconnu au niveau message | 400 (SPEC-ASK-USER) |

Comportement : append du message, `slice(-200)`, `updatedAt`, journal
(voir §9). Pas de changement pour les formes 1-3.

### 4.2 PATCH /api/brouillon/:id/parts/:partId (terminer une part)

Met à jour in-place une part déjà annoncée (`en_cours` → `fait` /
`erreur`) :

```jsonc
// Body :
{ "etat": "fait", "dureeMs": 1840 }
// ou
{ "etat": "erreur", "sousTitre": "Le rendu a échoué : police externe sans CORS" }
```

Règles :

- `partId` : identifiant de la part. Une part n'a PAS de champ `id`
  propre : son identifiant est le couple `(index du message dans la
  conversation, index de la part dans le message)`, sérialisé en
  `m<idxMsg>-p<idxPart>` par le serveur au moment de l'annonce (renvoyé
  dans la réponse du POST). L'agent le stocke et le renvoie à la
  terminaison. Pas de champ en plus dans le JSON stocké (le format reste
  minimal).
- Recherche : le serveur parse la conversation, localise la part par son
  couple d'indices, vérifie que `etat` actuel est `en_cours` (une part
  déjà `fait` ne se re-termine pas : 409), met à jour `etat`, `dureeMs`
  (ou `sousTitre` en cas d'erreur), `updatedAt`. Écrit le JSON réécrit.
- Si la part n'existe pas (conversation nettoyée) : 404 sans effet de
  bord. L'agent continue (la terminaison est best-effort, §8.3).
- La durée peut aussi être calculée côté serveur si `dureeMs` absent :
  `Date.now() - debut` (fallback, si `debut` présent dans la part).

### 4.3 GET détail brouillon

Inchangé : `conversation` renvoyée telle quelle (JSON string). Les
nouveaux champs (`parts`) transitent naturellement. Le web parse et rend.

### 4.4 Règle des 4 fichiers (rappel Phase 4)

Pas de changement de schéma (la conversation est un JSON dans une colonne
TEXT existante) : **aucune modification** de schema.ts / schema-pg.ts /
legacy.ts / migrate-pg.ts. Seuls changent : le parse/validation de la
route POST /message (app.ts), la nouvelle route PATCH parts (app.ts), le
type `MessageChat` côté web (api.ts), le composant UI, et le serveur MCP.

---

## 5. Composant UI : la PartCard (pattern shadcn parts, adapté)

### 5.1 Structure du rendu

Dans l'onglet Agent du panneau droit, un message agent se rend en :

```
┌─ chat-msg.agent ────────────────────────────┐
│  (chat-msg-head)  ✦ AGENT                   │
│                                             │
│  ┌─ part-card (bg-level-3, hairline) ─────┐ │
│  │ [icône]  Slide 3 modifiée          ✓ 1,8 s │
│  │          Titre remplacé par « Duplex »   │ │
│  └─────────────────────────────────────────┘ │
│  ┌─ part-card ────────────────────────────┐ │
│  │ [icône]  Légende mise à jour        ✓ 0,4 s │
│  │          Instagram · 1 284 caractères    │ │
│  └─────────────────────────────────────────┘ │
│  (chat-msg-text)  « Dis-moi si tu veux      │
│   ajuster autre chose. »                     │
└──────────────────────────────────────────────┘
```

- Les parts remplacent le texte brut POUR LES ACTIONS : le message
  s'affiche en cartes, le texte (si présent) passe sous les cartes en
  `chat-msg-text` classique.
- Un message agent SANS parts se rend exactement comme aujourd'hui
  (bulle texte) : rétro-compatibilité totale, le rendu actuel est
  conservé.
- Un message `type: 'question'` se rend en part `question` : carte pinnée
  en attente OU bloc Q/A inline répondue (SPÉC ASK-USER §5.1-5.2, aucun
  nouveau composant : la PartCard `question` absorbe la QuestionCard de
  la spec ask-user, cf. §5.4).

### 5.2 Contenu de la carte

| Élément | Règle |
|---|---|
| Icône | Une icône Phosphor par type (§5.3), 14px, ink-secondary, dans un conteneur carré 26px radius 7px (bg-level-2, hairline) |
| Titre | `part.titre`, 13px, ink-primary, weight 500 |
| Sous-titre | `part.sousTitre`, 11.5px, ink-tertiary, une ligne (ellipsis) |
| Durée | À DROITE du titre, uniquement si `etat === 'fait'` : `1,8 s` (format fr-FR, 1 décimale ; ≥ 60 s → `1 min 12 s`), 10.5px, ink-tertiary, tabular-nums, alignée à droite (margin-left auto) |
| État | `en_cours` → spinner (icône CircularProgress, rotation `atelier-spin` 650ms) + pastille « En cours » 10px ink-tertiary ; `fait` → Check 12px `--color-status-ok` ; `erreur` / interrompue → WarningCircle 12px `--color-status-err` |
| Fond | bg-level-3, hairline `--color-line-default`, radius 12px (carte), padding 9px 11px |
| Largeur | 100 % de la bulle agent (les cartes sont pleine largeur du feed, contrairement aux bulles texte) |

**Couleurs des états = couleurs sémantiques du design system** (vert
`status-ok` pour fait, rouge `status-err` pour erreur), PAS l'accent
monochrome : la DA dit « les statuts sémantiques gardent leurs couleurs,
jamais d'accent couleur sur un statut ». Le spinner en cours reste en
encre mono (ink-secondary), jamais de couleur : le travail en cours n'est
pas un statut final.

### 5.3 Icônes Phosphor par type

| Type de part | Icône | Justification |
|---|---|---|
| slide_modifiee | `Stack` (ou `Images` si dispo) | le contenu, les slides |
| legende_maj | `TextT` | le texte de légende |
| source_deposee | `FileCode` | le HTML source |
| question | `Question` (ou `ChatCircle` si dispo) | la clarification |
| erreur | `WarningCircle` | l'échec |

Piège Phosphor déjà connu (Phase 6b) : vérifier les exports AVANT d'écrire
le composant (`grep -oE "Question|ChatCircle|Images|TextT" node_modules/@phosphor-icons/react/dist/*.d.ts`) ; `Type` n'existe pas, `TextT` oui.

### 5.4 La part `question` (pont avec SPEC-ASK-USER)

- **En attente** (dernier message = question, âge < timeout) : la
  PartCard `question` EST la question-card pinnée au bas du fil
  (SPEC-ASK-USER §5.1) : icône Question, titre « Question de l'agent »,
  sous-titre = la première question, contenu = les blocs
  question/choix + champ « Autre réponse » + bouton Répondre.
- **Répondue** : la même carte devient un bloc Q/A compact inline
  (équivalent `ask-user-part.tsx` de shadcn : `<ol>` question/answer,
  question en ink-secondary, réponse en ink-primary), sans spinner ni
  durée.
- **Expirée / abandonnée** : carte grisée « Sans réponse » (SPEC-ASK-USER
  §5.2), zéro interaction, même rendu que la part `erreur` en grisé.
- L'implémentation de la question-card est celle de la carte ask-user
  (t_cef95a58, SPEC-ASK-USER) : la spec parts ne REDÉFINIT pas le
  format, elle définit le CONTENU VISUEL de la carte dans le langage
  part (icône + titre + sous-titre), pour que le feed reste homogène.

### 5.5 DA noire et motion 150-250ms (spec animations t_429a4bef)

- **Entrée des cartes** : la classe `msgStreamIn` existante (200ms,
  `--motion-ease`, opacity + translateY 4px) s'applique aux part-cards
  comme aux chat-msg (`.chat-msg, .msg-enter` couvre déjà le message ;
  ajouter `.part-card` à ce sélecteur ou une animation identique). Pas de
  blur (consigne : « sans blur »).
- **Transition d'état en_cours → fait** : 150ms (`--motion-duration-fast`)
  sur l'opacité et le transform du check (scale 0.85 → 1, easing
  `--motion-ease`). Le check « pop » : réutiliser `statusPop` existant si
  présent (keyframe déjà en place pour les statuts), sinon une micro
  animation 150ms locale.
- **Apparition du sous-titre** : rien de spécial (il est là dès la
  terminaison, la hauteur change naturellement avec `rows-expand` si
  besoin, 250ms medium).
- **Zéro transition linear/ease-in-out** (règle DA) : tout passe par
  `--motion-ease`.
- **`prefers-reduced-motion`** : le bloc global existant (styles.css
  ligne ~36) coupe déjà les animations ; le spinner doit aussi s'arrêter
  (vérifier que `atelier-spin` est dans le bloc réduit, sinon l'ajouter).
- **Monochrome strict** : les icônes de carte en ink-secondary, les
  hairlines en `--color-line-default`, zéro em-dash nulle part, y
  compris dans les titres/sous-titres produits par l'agent (règle
  Bordeluche : pas d'invention, mais le composant ne doit pas introduire
  d'em-dash non plus).

### 5.6 Placement dans le DOM (web)

- Nouveau composant `PartCard.tsx` (ou bloc dans DraftDetail) : reçoit
  `{ part: PartChat }`, rend la carte. Mappings icône + format durée
  (`formatDuree(ms)`) dans un helper `parts.ts` testable unitairement.
- Dans le rendu de `conversation.map(...)` (DraftDetail ligne ~858) :
  si `m.parts?.length` → rendre les `<PartCard>` à la place de la bulle
  `chat-msg-text` (le head agent reste), puis `m.texte` en dessous si
  présent. Les messages user et les messages agent sans parts : rendu
  actuel inchangé.
- Le caret de frappe (`stream-caret` / `eq-bounce`) reste le seul
  indicateur « l'agent est en train de répondre » au niveau du feed. Les
  parts `en_cours` indiquent « l'agent a annoncé UNE action précise ».
  Les deux coexistent : le caret disparaît quand la réponse arrive, la
  part passe alors de spinner à check.

---

## 6. Intégration avec le worker asynchrone et le serveur MCP

### 6.1 Le flux : annoncer, exécuter, terminer

```
user : « change le texte de la slide 3 et mets à jour la légende »
worker (cron, MCP atelier-prod) :
  1. lire_brouillon → demande claire, pas de question nécessaire
  2. emettre_part(brouillon, 'slide_modifiee', 'Slide 3 modifiée',
                  { sousTitre: 'Titre remplacé par « Duplex Gambetta »' })
     → POST /message { role: 'agent', parts: [{ type: 'slide_modifiee', ...,
       etat: 'en_cours' }] } → réponse { partId: 'm12-p0' }
  3. exécute (set_source / regenerer_slides / PATCH legende)
  4. terminer_part(brouillon, 'm12-p0', { etat: 'fait', dureeMs: 1840 })
     → PATCH /api/brouillon/:id/parts/m12-p0
  5. repondre_brouillon(brouillon, « C'est fait, dis-moi si tu veux
     ajuster autre chose. ») → POST /message { role: 'agent', texte }
user : voit (polling 8s) : carte « Slide 3 modifiée » spinner → carte
       check « 1,8 s » + le texte de la réponse. Zéro texte brut.
```

### 6.2 Auto-parts sur les outils de mutation (le cas 90%)

Plutôt que de demander à l'agent de penser à annoncer chaque action, le
serveur MCP émet AUTOMATIQUEMENT la part autour des outils de mutation,
via un helper commun `withPart` :

```ts
// packages/mcp/src/parts.ts (nouveau)
async function withPart<T>(
  id: string,
  type: PartType,
  titre: string,
  sousTitre: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const annonce = await client.emettrePart(id, type, titre, sousTitre); // best-effort
  const debut = Date.now();
  try {
    const resultat = await fn();
    if (annonce?.partId) {
      await client.terminerPart(id, annonce.partId, {
        etat: 'fait',
        dureeMs: Date.now() - debut
      }); // best-effort
    }
    return resultat;
  } catch (e) {
    if (annonce?.partId) {
      await client.terminerPart(id, annonce.partId, {
        etat: 'erreur',
        sousTitre: e instanceof Error ? e.message : String(e)
      }); // best-effort
    }
    throw e;
  }
}
```

Mapping outils → parts (v1, figé) :

| Outil MCP | Part émise | Titre | Sous-titre |
|---|---|---|---|
| set_source | source_deposee | « Source déposée » | taille en Ko (« 12,4 Ko ») ou « HTML du document » |
| set_legende | legende_maj | « Légende mise à jour » | « Instagram · 1 284 caractères » (label réseau + longueur caption) |
| regenerer_slides | slide_modifiee | « Slides régénérées » | « 9 slides » (nombre) |
| deposer_slides (si l'outil existe) | slide_modifiee | « Slides déposées » | « 9 slides » |
| set_notes | (aucune, hors liste v1) | - | - |
| set_statut | (aucune, hors liste v1) | - | - |

Pour v1, seuls ces 4 outils émettent (les 3 types d'action de la carte).
set_notes/set_statut restent couverts par le texte de la réponse
(`repondre_brouillon`) : ils ne sont pas dans la liste des 5 types, on ne
force pas une part pour eux (types extensibles en v2, §1.2).

### 6.3 Outils MCP explicites (le cas 10%)

Deux nouveaux outils (15e et 16e du serveur) pour les cas où l'agent
veut montrer du travail qui n'est pas une mutation simple (multi-étapes,
longue préparation, vérification) :

- `emettre_part(brouillon_id, type, titre, sousTitre?)` : annonce une
  part `en_cours`, renvoie `{ partId }`. `type` restreint à l'enum
  (question autorisée ici pour les cartes de clarification autonomes).
- `terminer_part(brouillon_id, part_id, { etat: 'fait'|'erreur',
  duree_ms?, sous_titre? })` : termine la part, renvoie la conversation
  mise à jour.

Le prompt du worker (SPEC-WORKER-ASYNCHRONE §7.5, étendu) précise :
« Quand tu exécutes une demande, les parts d'action sont émises
automatiquement par les outils de mutation. Pour un travail long ou
multi-étapes qui ne correspond pas à un outil, annonce-le avec
emettre_part avant d'agir, puis termine-le avec terminer_part. Ne crée
jamais de part dont l'action n'existe pas (pas de fausse carte). »

### 6.4 Le monitor du worker (aucun changement)

La détection « en attente » (dernier message `role: 'user'`) ne change
pas : une part `en_cours` est un message `role: 'agent'`, donc le brouillon
sort de « en attente » pendant l'exécution - exactement comme une réponse.
Le monitor (hash de sortie du GET /api/conversations/en-attente) ne
déclenche pas de run superflu : la part `en_cours` est un message agent,
pas un message user. Les PATCH de terminaison ne créent pas de nouveau
message, donc pas de faux réveil non plus.

### 6.5 Agents externes (Claude Code, Codex)

La page Integrations documente le pattern : POST /message avec `parts`
puis PATCH /api/brouillon/:id/parts/:partId. Les agents externes qui
mutent via l'API peuvent annoncer/terminer leurs actions sans passer par
le serveur MCP.

---

## 7. Timeout & états dérivés

### 7.1 La constante

`PARTS_TIMEOUT_MS = 5 * 60 * 1000` (5 min), constante partagée (web).
Justification : un run du worker dure au maximum 3 min
(SPEC-WORKER-ASYNCHRONE §6) ; une part `en_cours` plus vieille que 5 min
ne peut plus être légitimement en cours (agent mort, run interrompu,
réseau coupé). Dérivée de `at` du message (pas de job de nettoyage).

### 7.2 Comportement à l'expiration

| Acteur | Comportement |
|---|---|
| UI | La carte passe de « En cours » (spinner) à « Interrompue » : icône WarningCircle `status-err` en grisé (opacité 0.6), sous-titre « Interrompu » (ou le sous-titre d'origine s'il existe), durée non affichée. Le user comprend qu'une action n'a pas abouti. |
| Worker | Ne relance PAS automatiquement une part interrompue (pas de retry bucket). Le user peut re-demander, le worker re-partira proprement. |
| Conversation | Inchangée : la part reste `en_cours` dans le JSON (l'état est dérivé côté rendu). Si l'agent revient et termine une part expirée, elle passe à `fait`/`erreur` normalement (le PATCH ne vérifie pas l'âge, seulement l'état `en_cours`). |

### 7.3 Budget de run

Une part `en_cours` + son PATCH de terminaison = 2 appels API légers en
plus de l'exécution, dans le MÊME run du worker (pas de run
supplémentaire). L'auto-part via `withPart` n'ajoute aucun tour de LLM :
l'annonce et la terminaison sont des effets de bord du serveur MCP.

---

## 8. Garde-fous

1. **Jamais de fausse carte** : une part doit correspondre à une action
   RÉELLEMENT exécutée. L'auto-part via `withPart` garantit l'ordre
   (annonce avant, terminaison après dans le même try/catch) ; l'outil
   `emettre_part` est documenté pour l'agent comme « annonce ce que tu
   vas faire », pas « prétends avoir fait ».
2. **La terminaison est best-effort** : si le PATCH part échoue (404,
   réseau), l'action principale a déjà réussi et l'outil MCP répond
   normalement. Une carte restée `en_cours` dérive en « Interrompue »
   (§7), le user voit qu'une action n'a pas été confirmée - jamais
   l'inverse (une action faite sans carte serait une régression de
   transparence, mais pas un bug bloquant).
3. **Zéro accent couleur sur un statut** (règle DA) : `fait` = vert
   sémantique, `erreur` = rouge sémantique, `en_cours` = encre mono.
   Jamais de blanc accent sur une carte de statut.
4. **Parts limitées aux messages agent** : l'API rejette `parts` sur un
   message user (400). Le user ne peut pas créer de fausse carte.
5. **1 à 5 parts par message** : limite de lisibilité, validée côté API
   et côté MCP (zod `array().min(1).max(5)`).
6. **Rétro-compatibilité** : tous les champs v3 sont optionnels ; un
   client qui n'envoie que `{ texte }` continue de fonctionner ; un
   message sans `parts` se rend comme aujourd'hui ; les questions
   (v2) ne sont pas des parts (pas de double rendu).
7. **Pas d'em-dash** dans les titres/sous-titres de parts (le composant
   n'en introduit pas, la doc MCP n'en utilise pas, les exemples de la
   spec non plus).

---

## 9. Observabilité

- **Journal Atelier** : l'annonce d'une part ne crée PAS de nouvel
  événement de journal (les mutations journalisent déjà leurs propres
  événements : `source_deposee`, `slides_regeneres`, `legende_maj` côté
  route, cf. app.ts). Le PATCH de terminaison est silencieux pour le
  journal (c'est une mise à jour du même tour d'agent, pas une nouvelle
  action). Seul cas nouveau : `emettre_part`/`terminer_part` explicites
  (outils 15/16) journalisent une ligne légère
  (`part_annoncee` / `part_terminee`, auteur agent) pour tracer le
  travail multi-étapes sur la page Activité IA.
- **Logs du worker** : le run journalise ses parts (annonce + terminaison
  avec durée) dans sa sortie cron, pour le débogage.
- **Page Activité IA** : inchangée pour les mutations (les événements
  existants restent), enrichie des lignes part pour les cas explicites.

---

## 10. Test de bout en bout (acceptance)

1. **API (mode SQLite, tests existants étendus)** :
   - POST message normal : inchangé (vert).
   - POST message agent avec 2 parts valides : 200, conversation contient
     `{ role: 'agent', parts: [...] }`, `texte` optionnel.
   - POST message avec `parts` sur `role: 'user'` : 400.
   - POST message avec 0 part ou 6 parts : 400.
   - POST message avec `type` de part inconnu : 400.
   - POST message avec `type: 'question'` dans une part : 400.
   - POST message avec `titre` vide : 400.
   - PATCH part : annonce (POST) → PATCH `{ etat: 'fait', dureeMs }` →
     la conversation contient la part à `fait` avec `dureeMs` ; re-PATCH
     → 409 ; PATCH sur partId inexistant → 404.
   - PATCH part `{ etat: 'erreur', sousTitre }` : part à `erreur` avec le
     sous-titre d'erreur.
2. **Web (composant PartCard)** :
   - Message agent avec 2 parts faites : 2 cartes (icône + titre +
     sous-titre + durée formatée), le texte passe sous les cartes.
   - Message agent avec une part `en_cours` : spinner + « En cours ».
   - Part `en_cours` avec `at` vieux de 6 min : carte « Interrompue »
     (WarningCircle grisé, pas de durée).
   - Part `erreur` : rouge + sous-titre d'erreur.
   - Message agent sans parts : rendu actuel inchangé.
   - Zéro erreur console, captures Playwright + vision_analyze (DA
     conforme : monochrome, hairlines, zéro em-dash, motion 150-250ms).
3. **MCP (test stdio, comme Phase 6b/6c)** : `test-parts.cjs` lance le
   serveur, annonce une part (POST), exécute set_legende réel, vérifie
   que la conversation contient la part `fait` avec durée, puis nettoie
   (conversation remise à l'état initial via le patch générique).
4. **Worker (E2E manuel, brouillon JETABLE en prod, comme
   SPEC-WORKER-ASYNCHRONE §9)** : message user → run du worker →
   les cartes apparaissent dans le chat (polling 8s) → vérifier la
   transition spinner → check avec durée → supprimer le brouillon. Aucune
   donnée réelle touchée.

Critère produit : « change le texte de la slide 3 » → le chat montre une
carte « Slide 3 modifiée » avec spinner puis check et durée, plus jamais
uniquement du texte brut.

---

## 11. Limites connues & évolutions

- **Types figés à 5** pour v1 : `statut_maj` (set_statut), `note_maj`
  (set_notes), `check_conformite` (le chantier « agent réactif »
  t_c57fda84 devra l'ajouter quand la vérification charte existera),
  `publication` (Postiz) - v2 quand les actions existeront réellement.
- **Pas de durées historiques** : la durée est mesurée par l'agent/serveur
  au moment de l'action, pas rejouée. Une part annoncée avant cette spec
  (aucune, la spec n'existe pas encore) n'aurait pas de durée.
- **Pas de liaison part ↔ diff** : le diff visuel (chantier 3) et le
  versioning (chantier 5) pourront rattacher leurs artefacts à la part
  (`partId`) quand ils existeront - le format est prêt, la liaison non.
- **Pas de mise à jour serveur de la durée** : si `dureeMs` est absent au
  PATCH et que `debut` est absent aussi, la carte `fait` n'affiche pas de
  durée (cas dégradé acceptable).
- **Le rendu « Interrompue » ne distingue pas « agent mort » de « run
  long »** : 5 min est un arbitrage (run max 3 min) ; si des runs plus
  longs apparaissent, monter la constante.
- **Pas de notification push** quand une part se termine (le polling 8s
  du chat suffit, cohérent avec SPEC-WORKER-ASYNCHRONE §10).
