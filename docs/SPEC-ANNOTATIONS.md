# SPEC-ANNOTATIONS.md : annotation inline sur les slides, commentaires attachés à un élément (13/08/2026)

> Spec du chantier UX A2+ (UX-RESEARCH.md §8, ETUDE-CLAUDE-DESIGN.md §3A.2) :
> commenter UN élément précis de la slide, pas juste le chat. Clic sur une
> zone de la slide → commentaire attaché (coordonnées + élément résolu) →
> l'agent modifie cet élément. Le chat reste le cœur ; l'annotation est un
> raccourci pour pointer précisément. Pattern : proofing (Krock) : comment
> épinglé au pixel, historique intact à travers les versions.
> Reliée à : chat async (Phase 6f, PR #26), SPEC-PARTS.md (les parts,
> t_429a4bef), SPEC-ASK-USER.md (les types de message, t_cef95a58),
> versioning (US-07), REFONTE-DESIGN.md (le stage hero, PR #23/#24).

---

## 1. Contexte et vision

### 1.1 Le problème

Le chat avec l'agent (Phase 6f) permet de demander n'importe quelle
modification : « change le texte de la slide 3 », « agrandis le titre »,
« le CTA est mal placé ». Mais le user ne peut pas POINTER l'endroit exact.
Conséquences :

1. **L'ambiguïté du langage.** « La slide 3 » ne dit pas QUEL élément :
   le titre, le paragraphe, le bouton, le fond ? L'agent doit deviner, ou
   le user doit décrire laborieusement (« le petit texte gris sous le
   titre en haut à droite »). À chaque aller-retour de précision, un tour
   de chat perdu.
2. **Le refactoring implicite.** Quand l'agent corrige « le texte de la
   slide 3 », il choisit lui-même l'élément visé. Le user n'a aucun moyen
   de verrouiller sa cible : « je parlais du TITRE, pas de la légende ».
3. **La traçabilité.** Rien ne garde la trace de « cet élément a été
   signalé, puis corrigé ». Le proofing (Krock, Frame.io, Figma) a
   résolu ce problème depuis longtemps : le commentaire est épinglé au
   pixel, reste dans l'historique à travers les versions, et passe à
   l'état « résolu » quand la correction est faite.

Claude Design fait exactement cela : « commentaires inline sur un élément
précis » (ETUDE-CLAUDE-DESIGN.md §3A.2). C'est le raffinement fin qui
manque à Atelier.

### 1.2 La décision (cadrage)

1. **L'annotation est un message de conversation enrichi, pas une
   entité côte à côte.** On étend `MessageChat` avec un type
   `'annotation'` (v4, après question/réponse v2 et parts v3). Le chat
   reste LE cœur : l'annotation s'affiche dans le fil comme un message
   user, l'agent la lit avec `lire_brouillon`, répond avec
   `repondre_brouillon`. Zéro nouvelle table, zéro migration : la
   conversation reste un JSON TEXT sur `brouillons`. Rétro-compatible :
   un client ancien affiche `texte` normalement.
2. **L'annotation porte les coordonnées ET l'élément résolu.** Le clic
   donne (x, y) relatifs à la slide. Mais une coordonnée seule ne dit
   rien à l'agent (« le point à 34 % × 12 % »). Atelier a un avantage
   unique : la SOURCE HTML (le document maître, Phase 3b). On peut donc
   re-rendre la slide depuis la source, faire un hit-testing DOM au point
   cliqué, et capturer l'élément réel : balise, classes, texte extrait,
   chemin court. C'est ce qui transforme « un pixel » en « le h1
   "Duplex Gambetta" ».
3. **Le hit-testing est best-effort.** Si la source HTML est absente, si
   le rendu échoue (police externe sans CORS) ou si la slide est une
   vidéo, l'annotation se crée quand même avec les coordonnées seules :
   `element` est optionnel. Le user reste capable de pointer, l'agent
   travaille sur (x, y) + son texte.
4. **Résolution par le user, proposée par l'agent.** L'annotation naît
   non résolue (pin accent). Le user la résout quand il juge la
   correction faite (bouton « Résolue »), l'agent peut la proposer
   résolue via l'API après correction. L'annotation n'est JAMAIS
   supprimée : l'historique reste intact (pattern proofing Krock), la pin
   passe en grisée.
5. **Une annotation = une demande de modification.** Pas de fil de
   discussion par pin en v1 (le fil reste le chat). L'annotation est un
   point d'entrée vers le chat : elle pré-remplit la précision, la
   réponse de l'agent arrive dans le fil normalement.

### 1.3 Périmètre v1

- Format `type: 'annotation'` dans `MessageChat` (v4, rétro-compatible),
  avec `annotation: { slide, x, y, element?, resolue, resolueAt? }`.
- Web : mode annotation sur le stage (clic → hit-testing → popover →
  envoi), pins numérotées par slide, badge sur les vignettes, lien
  pin ↔ message chat, bouton « Résolue ».
- API : `POST /message` accepte la forme annotation ; nouveau
  `PATCH /api/brouillon/:id/annotation/:annId` pour la résolution
  (idempotent).
- Côté agent : pas de nouvel outil MCP requis en v1 (lire_brouillon +
  repondre_brouillon suffisent), format documenté pour l'agent.
- Hors périmètre : regroupement de pins superposées, timestamp vidéo,
  suivi automatique de l'élément quand la source change (la pin reste à
  sa position, elle ne « suit » pas l'élément déplacé), fil de discussion
  par pin, rôles multiples (collaboration).

---

## 2. Vocabulaire (figé)

| Terme | Sens |
|---|---|
| Annotation | Message `type: 'annotation'` : un commentaire user attaché à une slide, avec coordonnées + élément résolu |
| Pin | Le marqueur visuel de l'annotation sur la slide (pastille numérotée à x%, y%) |
| Cible | L'élément résolu par hit-testing : `{ balise, classes, texte, chemin }` |
| Résolue | `resolue: true` : le user a validé la correction (pin grisée, historique conservé) |
| Hit-testing | Re-rendu de la slide depuis la source HTML dans un holder aligné sur l'image, puis `elementFromPoint` au point cliqué |
| Pointer | Poser une annotation par clic direct sur la slide (au lieu de décrire dans le chat) |

Règles du vocabulaire : « annotation » désigne le message (données), « pin »
désigne le rendu (visuel). Une annotation a exactement une pin. Une pin
n'existe pas sans annotation.

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

Les messages existants restent valides tels quels. Les champs v2
(question, SPEC-ASK-USER), v3 (parts, SPEC-PARTS) et v4 (annotation) sont
optionnels ; les consommateurs actuels lisent `role`/`texte`/`at`, l'API
stocke le JSON brut, `slice(-200)` inchangé.

### 3.2 Le format étendu (v4 = v3 + annotation)

```ts
type ElementResolu = {
  balise: string;          // ex. 'h1', 'p', 'button'
  classes: string[];       // classes significatives, ex. ['titre', 'hero'] (max 4)
  texte: string;           // extrait du textContent, max 80 caractères
  chemin: string;          // sélecteur court, ex. '.hero > h1' (max 5 niveaux)
};

type AnnotationChat = {
  slide: number;           // index 0-based de la slide dans brouillon.slides
  x: number;               // 0..1 relatif à la LARGEUR de la slide
  y: number;               // 0..1 relatif à la HAUTEUR de la slide
  element?: ElementResolu; // hit-testing réussi (optionnel, fallback coordonnées seules)
  resolue: boolean;        // défaut false
  resolueAt?: string;      // ISO, rempli à la résolution
};

type MessageChat = {
  role: 'user' | 'agent';
  texte: string;
  at: string;
  // v2 (SPEC-ASK-USER, optionnels) :
  type?: 'question' | 'reponse';
  id?: string;
  questions?: { question: string; choix: string[] }[];
  repondA?: string;
  reponses?: { question: string; reponse: string }[];
  // v3 (SPEC-PARTS, optionnels) :
  parts?: PartChat[];
  // v4 (annotation, optionnel) :
  annotation?: AnnotationChat;
};
```

Règles du format :

1. `type: 'annotation'` ne peut être porté QUE par un message
   `role: 'user'`. L'agent n'émet jamais d'annotation (il n'épingle
   pas, il corrige) : il répond dans le fil comme d'habitude. L'API
   rejette 400 si `role: 'agent'` + `annotation`.
2. `annotation` présent ⇒ `type === 'annotation'` (et inversement :
   `type: 'annotation'` ⇒ `annotation` requis). Les deux champs se
   valident ensemble, comme `questions`/`reponses` en v2.
3. `texte` est requis (le commentaire lui-même, 1..500 caractères).
   C'est ce que l'agent lit en premier ; les métadonnées
   (`slide`, `x`, `y`, `element`) sont le contexte de précision.
4. `slide` : entier ≥ 0, strictement inférieur au nombre de slides du
   brouillon au moment de la création (validé côté API ; à l'affichage,
   si les slides ont changé depuis, la pin est clampée à la dernière
   slide et le message porte un hint « slide modifiée depuis »).
5. `x`, `y` : nombres finis dans [0, 1]. Stockés en fraction relative,
   PAS en pixels : la slide est responsive, les coordonnées doivent
   survivre au resize du stage. Même convention que les zones diff
   (`ZoneDiff.x/y/w/h` en 0..1, DraftDetail `DiffCompare`).
6. `element` : optionnel. S'il est présent : `balise` non vide,
   `classes` ≤ 4 éléments, `texte` ≤ 80 caractères, `chemin` ≤ 5
   niveaux (`.hero > h1`, pas le chemin DOM complet). Ces bornes gardent
   le message compact et lisible par l'agent.
7. `resolue` : toujours false à la création. Ne devient true que par le
   PATCH dédié (§4.2), jamais par le POST. `resolueAt` est rempli par le
   serveur à la résolution (pas par le client).

### 3.3 Exemple complet

```jsonc
{
  "role": "user",
  "type": "annotation",
  "id": "a-1723540000123",
  "texte": "Le titre est trop petit par rapport au reste, agrandis-le",
  "at": "2026-08-13T14:02:00.000Z",
  "annotation": {
    "slide": 2,
    "x": 0.34,
    "y": 0.12,
    "element": {
      "balise": "h1",
      "classes": ["titre", "hero"],
      "texte": "Duplex Gambetta",
      "chemin": ".hero > h1"
    },
    "resolue": false
  }
}
```

Et après résolution :

```jsonc
{
  "role": "user",
  "type": "annotation",
  "id": "a-1723540000123",
  "texte": "Le titre est trop petit par rapport au reste, agrandis-le",
  "at": "2026-08-13T14:02:00.000Z",
  "annotation": {
    "slide": 2,
    "x": 0.34,
    "y": 0.12,
    "element": {
      "balise": "h1",
      "classes": ["titre", "hero"],
      "texte": "Duplex Gambetta",
      "chemin": ".hero > h1"
    },
    "resolue": true,
    "resolueAt": "2026-08-13T14:05:31.000Z"
  }
}
```

### 3.4 Pourquoi un message, pas une colonne `annotations`

- **Le chat reste le cœur** (décision UX-RESEARCH §1) : l'annotation
  est un message du fil, visible dans l'ordre chronologique, avec la
  réponse de l'agent juste après. Une colonne séparée casserait cette
  continuité (il faudrait « relier » annotation et réponse).
- **L'agent a déjà l'outil de lecture.** `lire_brouillon` renvoie la
  conversation ; les annotations arrivent sans nouveau mécanisme MCP.
- **Zéro migration.** La conversation est un JSON TEXT ; ajouter un
  champ optionnel ne touche ni schema.ts, ni schema-pg.ts, ni legacy.ts,
  ni migrate-pg.ts (la règle des 4 fichiers de la Phase 4 ne s'applique
  pas ici : rien ne change dans le schéma SQL).
- **L'historique est gratuit.** Le proofing exige « comment history
  intact » : les annotations résolues restent dans le fil, rien à
  archiver.

---

## 4. API

### 4.1 POST /api/brouillon/:id/message (étendu, 4e forme)

Le endpoint existant (app.ts, route 448) accepte une 4e forme de body :

```jsonc
// 4. Annotation (rôle user implicite, via le clic sur la slide)
{
  "type": "annotation",
  "texte": "Le titre est trop petit, agrandis-le",
  "annotation": {
    "slide": 2,
    "x": 0.34,
    "y": 0.12,
    "element": { "balise": "h1", "classes": ["titre"], "texte": "Duplex Gambetta", "chemin": ".hero > h1" }
  }
}
```

Validation (400 avec message clair, avant tout stockage) :

| Cas | Règle |
|---|---|
| `type: 'annotation'` | `role` ABSENT ou `'user'` (une annotation est un message user ; `role: 'agent'` → 400) |
| `annotation` présent | `slide` entier ≥ 0 et < slideCount du brouillon ; `x`, `y` finis dans [0, 1] ; `element` optionnel conforme §3.2-6 ; `resolue` interdit à la création (toujours false) |
| `type: 'annotation'` sans `annotation` | 400 (les deux champs vont ensemble) |
| `texte` | requis, 1..500 caractères |
| `type` inconnu | 400 (spec ASK-USER) |

Comportement : append du message (`id` généré `a-<ts>` si absent, même
mécanique que `q-<ts>` en v2), `slice(-200)`, `updatedAt`, journal
(§8). Le brouillon sort de l'ensemble « en attente » comme pour un
message normal (le worker le traite : c'est une demande de modification,
rien de spécial à faire côté worker).

### 4.2 PATCH /api/brouillon/:id/annotation/:annId (résoudre)

Marque une annotation résolue (le user a validé la correction, ou
l'agent l'a proposée après avoir corrigé) :

```jsonc
// Body :
{ "resolue": true }
```

Règles :

- `annId` : le `id` du message (`a-<ts>`), créé par le serveur à
  l'append (§4.1) ou fourni par le client.
- Recherche : le serveur parse la conversation, localise le message
  `type: 'annotation'` dont `id === annId`. Si absent : 404 sans effet
  de bord.
- Mise à jour : `annotation.resolue = true`, `annotation.resolueAt =
  now`, `updatedAt`. **Idempotent** : si déjà résolue, 200 sans
  changement (un double-clic du user ne produit pas d'erreur ; on ne
  suit pas ici la sémantique 409 du PATCH parts, car la résolution est
  une action user répétable, pas une terminaison de run).
- Pas de retour arrière en v1 (`resolue: false` n'est pas accepté :
  400). Une annotation résolue reste résolue ; si le user veut
  re-signaler, il crée une nouvelle annotation.
- L'agent peut appeler ce PATCH (via son serveur MCP ou l'API) après
  avoir corrigé l'élément visé : c'est la « résolution proposée ». Le
  serveur MCP documente la route ; pas d'outil dédié en v1 (voir §6).

### 4.3 GET détail

`GET /api/brouillon/:id` renvoie déjà `conversation` (JSON brut). Les
annotations transitent sans changement. Le client web parse et rend.

---

## 5. Côté web : le mode annotation

### 5.1 Le déclencheur

Un bouton toggle « Annoter » dans la barre du stage (icône `MapPin`,
côté du toggle aperçu publié, classe `ghost`, état actif `on` avec le
pattern actif de la DA : fond ink 9%, texte ink-primary). Au survol de
la slide en mode annotation : curseur `crosshair` + hint discret
(« Cliquez sur l'élément à commenter », pill flottant 150ms fade-in).

Le mode annotation est désactivé par défaut. Il s'active par clic sur le
bouton, se désactive par : nouveau clic sur le bouton, touche Echap, ou
envoi d'une annotation (après l'envoi, on retombe en mode normal : le
user a pointé, il regarde la réponse dans le chat).

### 5.2 Le clic : hit-testing

Au clic dans le stage (hors boutons de navigation, hors pins) :

1. **Coordonnées relatives.** `x = (clientX - rect.left) / rect.width`,
   `y = (clientY - rect.top) / rect.height`, où `rect` est le bounding
   rect de l'image de la slide (`#slide-img`), clampé à [0, 1]. Même
   calcul que `surPointer` de DiffCompare (DraftDetail l.1609).
2. **Hit-testing (best-effort).** Si `brouillon.sourceHtml` existe et
   que la slide n'est pas une vidéo :
   a. Construire un holder hors-écran (`position: fixed; left: -20000px`),
      y injecter la slide courante extraite de la source (l'élément
      `.slide` d'index `slide`, même extraction que `onRegenerer`).
      Injecter la charte (`injecterCharteRendu`) et attendre le rendu
      (`attendreRendu`), comme la régénération client (Phase 6).
   b. **Aligner le holder sur l'image affichée.** Le point critique : le
      `elementFromPoint` doit se faire dans la MÊME géométrie que
      l'image affichée. On clone la slide rendue dans un conteneur
      positionné exactement sur le bounding rect de `#slide-img`
      (`position: absolute; left/top/width/height` du rect), avec la
      slide mise à l'échelle (`transform: scale(k)` ou largeur forcée)
      pour que les proportions correspondent pixel à pixel.
   c. `document.elementFromPoint(clientX, clientY)` → élément le plus
      profond. Remonter jusqu'à un élément « significatif » (texte non
      vide, ou balise structurelle : h1-h6, p, button, img, li) au plus
      5 niveaux, en s'arrêtant à la frontière de la slide.
   d. Extraire `ElementResolu` : balise, classes (filtrées des classes
      purement utilitaires si possible), texte (textContent, extrait ≤
      80 car, sinon `chemin` seul), chemin court (remontée parent avec
      `>` et classes, max 5 niveaux).
   e. Retirer le holder (try/finally, comme `onRegenerer`).
3. **Fallback.** Si le hit-testing échoue (pas de source, erreur de
   rendu, vidéo, `elementFromPoint` renvoie le holder lui-même) :
   `element` reste absent. Le popover affiche « Élément non détecté
   (source absente ou slide vidéo) : l'agent travaillera sur les
   coordonnées indiquées ».

### 5.3 Le popover

Un popover flottant apparaît au point cliqué (position absolute dans le
stage, `left: x*100%; top: y*100%`, translate(-50%, -120%) pour passer
au-dessus de la pin, flip horizontal/vertical si débordement du stage,
même technique que le popover statut). Contenu :

1. **Badge cible** (si `element` résolu) : `h1 · « Duplex Gambetta »`
   (balise + classes en ink-tertiary, texte en ink-primary), tronqué.
2. **Textarea** pré-rempli : « Sur cet élément : » + placeholder
   « Dites à l'agent quoi modifier (taille, texte, position...) ». Le
   user complète ou réécrit.
3. **Actions** : `Annuler` (ghost) / `Envoyer l'annotation` (primary,
   désactivé si texte vide). Enter envoie, Shift+Enter nouvelle ligne
   (même convention que le chat), Echap annule.

À l'envoi : `POST /message` forme annotation (§4.1) → à la réponse, la
conversation est relue (le polling 8s existant suffit, pas de fetch
dédié) → le popover se ferme, le mode annotation se désactive, la pin
apparaît.

### 5.4 Les pins

- **Rendu.** Un calque `annot-layer` au-dessus de l'image (position
  absolute, pointer-events none sauf les pins). Chaque annotation de la
  slide courante rend une pastille à `left: x*100%; top: y*100%` :
  cercle 18px, fond accent (blanc dark / noir light), texte on-accent,
  numéro d'ordre (1, 2, 3... dans l'ordre d'apparition dans la
  conversation, pas l'index du message), `box-shadow` halo 18% comme le
  pattern de sélection. Résolue : fond `bg-level-3`, texte ink-tertiary,
  icône Check 10px, opacité 0.55.
- **Numérotation par slide.** Les numéros se comptent PAR SLIDE (la pin
  « 1 » de la slide 2 n'est pas la « 1 » de la slide 5) : le compteur se
  recalcule au rendu, c'est un dérivé visuel, pas un champ stocké.
- **Interaction.** Clic sur une pin non résolue → le popover d'édition
  se rouvre (modification du texte) + focus sur le message dans le chat
  (scrollIntoView + flash 300ms). Clic sur une pin résolue → scroll vers
  le message dans le chat uniquement. Clic sur le message annotation
  dans le chat → navigue vers la slide (`setSlide(annotation.slide)`) +
  flash la pin 300ms.
- **Les autres slides.** Les annotations des autres slides n'affichent
  pas leurs pins (pas de raison de les superposer) : un badge discret
  sur la vignette correspondante (onglet Slides) et dans la nav : « 2 »
  en pill accent 10%, comme le badge `nslides`. Clic sur le badge →
  `setSlide(i)` + les pins apparaissent.
- **Vidéo.** Sur une slide vidéo, pas de pin rendue (la géométrie
  n'est pas stable) : l'annotation se crée avec coordonnées + texte
  seul, le message dans le chat porte le badge « Slide 4 (vidéo) ».

### 5.5 Le rendu dans le chat

Le message `type: 'annotation'` se rend comme un message user avec une
carte de contexte (avant le texte) :

- Icône `MapPin` 12px + « Slide {slide+1} » + badge cible si présent
  (`h1 · Duplex Gambetta`) en ink-secondary ;
- le `texte` du user en dessous (rendu normal) ;
- bouton ghost « Résolue » (Check) si non résolue, badge « Résolue »
  (gris, opacité 0.55) si résolue ;
- le tout dans un fond `bg-level-2` arrondi 8px avec hairline (carte,
  pas une simple bulle) pour la distinguer d'un message texte libre.

Aucun changement pour les messages `question`/`reponse`/`parts` (v2/v3).

---

## 6. Côté agent (MCP)

Pas de nouvel outil MCP en v1 : le serveur MCP expose déjà
`lire_brouillon` (renvoie la conversation complète, annotations
incluses) et `repondre_brouillon`. Deux enrichissements doc :

1. **Description de `lire_brouillon`** : ajouter une ligne expliquant le
   format `type: 'annotation'` (slide, x, y, element) et la conduite à
   tenir : « Si le dernier message est une annotation, retrouve
   l'élément visé dans la source HTML (par `element.chemin`/`texte`,
   sinon par les coordonnées x/y dans la slide `slide`), applique la
   modification demandée, régénère les slides, réponds dans la
   conversation, et propose la résolution via
   `PATCH /api/brouillon/:id/annotation/<id>` ».
2. **Format lu par l'agent** : la spec recommande que la réponse de
   l'agent confirme la cible (« J'ai agrandi le h1 "Duplex Gambetta" de
   la slide 3 ») pour que le user vérifie d'un coup d'œil que la bonne
   zone a été traitée.

Le worker asynchrone (SPEC-WORKER-ASYNCHRONE.md) traite une annotation
comme n'importe quelle demande : dernier message user → run → mutation →
réponse. Rien à changer côté worker pour v1.

Option v1.1 (hors périmètre, à ne PAS implémenter maintenant) : outil
MCP `resoudre_annotation` (id_brouillon, id_annotation) qui wrappe le
PATCH, pour que l'agent résolve sans connaître le format de la route.

---

## 7. Garde-fous

1. **Jamais de fausse cible.** `element` doit résulter d'un vrai
   hit-testing sur la slide rendue depuis la source. Interdit de
   l'inventer côté client ou de l'envoyer sans le re-rendu. Si le
   hit-testing échoue, on envoie sans `element` (fallback assumé), on ne
   fabrique pas un sélecteur approximatif.
2. **L'annotation est un message user.** `role: 'agent'` + `annotation`
   → 400. L'agent n'épingle pas, il corrige.
3. **Bornes strictes.** `slide`, `x`, `y` valides côté API (400 si hors
   bornes) ; `texte` 1..500 car ; `element` borné (§3.2-6). Une
   annotation malformée est rejetée avant stockage, jamais « rewound ».
4. **La pin ne suit pas l'élément.** Quand la source change (l'agent a
   corrigé, slides régénérées), la pin reste à ses coordonnées
   d'origine : c'est un marqueur du moment, pas une ancre réactive. Si
   l'élément a bougé, le message porte le hint « slide modifiée depuis »
   (§3.2-4) ; le user juge. Pas de re-mapping automatique en v1
   (l'élément déplacé n'est plus au même endroit : le re-mapping serait
   faux).
5. **DA conforme.** Zéro em-dash dans les textes de pin/popover ;
   pastille accent monochrome (jamais de couleur sur un état : résolue =
   grisée, pas de vert) ; motion 150-250ms ; `prefers-reduced-motion`
   respecté (les flashs deviennent des changements d'opacité sans
   animation).
6. **Pas de collision avec v2/v3.** `type: 'annotation'` est disjoint de
   `question`/`reponse` (v2) et de `parts` (v3) : un message ne peut pas
   être à la fois question et annotation ; les parts restent portées par
   les messages agent. L'API valide l'exclusivité.
7. **Rétro-compatibilité.** Un client qui ignore v4 affiche le message
   comme un texte user normal (`texte` est toujours présent et
   auto-suffisant). L'annotation dégrade proprement.

---

## 8. Observabilité

- **Journal Atelier** : la création d'une annotation journalise un
  événement `annotation_posee` (auteur user, brouillon, slide, x/y,
  élément balise si présent) ; la résolution journalise
  `annotation_resolue` (auteur user ou agent). Visible sur la page
  Activité IA, même format que les événements existants (`source_deposee`,
  `legende_maj`).
- **Conversation** : l'annotation est un message comme les autres, le
  `slice(-200)` s'applique, le polling 8s la fait apparaître sans code
  dédié.
- **Logs worker** : rien de spécial (l'annotation est une demande
  standard).

---

## 9. Test de bout en bout (acceptance)

1. **API (mode SQLite, tests existants étendus)** :
   - POST message annotation valide (avec element) : 200, conversation
     contient le message avec `id: 'a-<ts>'`, `annotation.resolue:
     false`.
   - POST annotation sans element (fallback) : 200, `element` absent.
   - POST annotation avec `role: 'agent'` : 400.
   - POST annotation avec `slide` hors bornes (négatif ou ≥ slideCount) :
     400.
   - POST annotation avec `x` ou `y` hors [0, 1] ou non fini : 400.
   - POST annotation avec `resolue: true` à la création : 400.
   - POST annotation avec `texte` vide ou > 500 car : 400.
   - POST `type: 'annotation'` sans `annotation` : 400.
   - PATCH résolution : POST → PATCH `{ resolue: true }` → 200,
     conversation avec `resolue: true` + `resolueAt` ; re-PATCH → 200
     idempotent (resolueAt inchangé) ; PATCH sur id inexistant → 404 ;
     PATCH `{ resolue: false }` → 400.
2. **Web (DraftDetail)** :
   - Mode annotation actif → survol crosshair + hint.
   - Clic sur la slide avec source HTML → popover avec badge cible
     (balise + texte extrait), envoi → pin apparaît numérotée + message
     dans le chat avec la carte de contexte.
   - Clic sans source HTML → popover « élément non détecté », envoi →
     pin sans badge cible.
   - Clic sur la pin → scroll chat + flash ; clic sur le message →
     navigation slide + flash pin.
   - Bouton « Résolue » → PATCH → pin grisée, message badge « Résolue »,
     re-clic impossible (bouton disparaît).
   - Badge « 2 » sur la vignette d'une slide annotée ; clic → navigation
     + pins visibles.
   - Zéro erreur console ; captures Playwright (grille + détail, dark +
     light) + vision_analyze (DA conforme : monochrome, hairlines, zéro
     em-dash, motion 150-250ms).
3. **MCP (test stdio, comme Phase 6b/6c)** : `test-annotations.cjs`
   lance le serveur, crée une annotation via POST, vérifie que
   `lire_brouillon` renvoie le message avec `annotation`, répond via
   `repondre_brouillon`, résout via PATCH, vérifie l'état, puis nettoie
   (brouillon jetable).
4. **E2E manuel (brouillon JETABLE en prod, comme SPEC-PARTS §10.4)** :
   ouvrir un brouillon de test, pointer une slide, envoyer l'annotation,
   vérifier que le worker la traite et que l'agent répond (polling 8s),
   résoudre, supprimer le brouillon. Aucune donnée réelle touchée.

Critère produit : « je clique sur le titre, je dis "plus grand", l'agent
agrandit CE titre-là (pas un autre) et le confirme dans le chat ». Le
aller-retour de précision (slide → élément) disparaît.

---

## 10. Limites connues & évolutions

- **Pas de regroupement de pins.** Deux annotations au même endroit se
  superposent (la dernière gagne au clic). v2 : pile de pins (comme
  Figma) avec compteur. Peu probable en usage solo (Victor), backlog.
- **Pas de timestamp vidéo.** Sur une vidéo, l'annotation est ponctuelle
  (coordonnées + texte), pas temporelle. Le proofing vidéo (Frame.io)
  épingle au temps ; v2 si les vidéos deviennent un format majeur.
- **La pin ne suit pas l'élément.** Documenté §7-4. Si l'agent déplace
  l'élément, la pin reste à l'ancien emplacement (hint « slide modifiée
  depuis »). Un re-mapping automatique serait faux ; un re-mapping
  assisté (l'agent indique le nouvel emplacement) est une option v2.
- **Pas de fil par pin.** Un seul commentaire par annotation ; les
  échanges se font dans le chat. v2 : fil imbriqué si les users le
  demandent.
- **Pas de collaboration.** Une seule personne (Victor) ; pas de
  @mentions, pas de rôles. Hors périmètre assumé (ETUDE-CLAUDE-DESIGN
  §3C : le partage org-scoped n'est pas une priorité).
- **`resolue` sans retour arrière.** Si le user résout par erreur, il
  doit créer une nouvelle annotation. Acceptable (l'historique garde
  l'ancienne) ; v2 : toggle.
- **Hit-testing et polices externes.** Le re-rendu de la slide peut
  échouer si une police/image externe casse la géométrie (le même risque
  que la régénération client). Le fallback coordonnées-seules couvre ce
  cas : l'annotation n'est jamais bloquée.

---

## Références

- ETUDE-CLAUDE-DESIGN.md §3A.2 : « commentaires inline attachés à un
  élément précis (pas juste le chat) » = le chantier A2.
- UX-RESEARCH.md §8 A2 : « annotation inline (inspiration Claude
  Design) ».
- Krock (pattern proofing) : https://krock.io/blog/design-review-software/
  commentaire épinglé au pixel, historique intact, résolution.
- SPEC-PARTS.md (v3, les parts), SPEC-ASK-USER.md (v2, les types de
  message), SPEC-PLAN-VALIDATION.md (le flux de validation, t_29efa3ee).
- REFONTE-DESIGN.md (le stage hero, PR #23/#24), Phase 6f (chat async,
  PR #26), Phase 3b (source HTML = document maître, PR #10).
