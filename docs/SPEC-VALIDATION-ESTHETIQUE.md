# SPEC-VALIDATION-ESTHETIQUE.md : « Est-ce beau ? » + avis esthétique de l'agent (UX A3+)

> Spec de la validation esthétique, le niveau 2 de la décision de validation
> (UX-RESEARCH.md §3 : « la validation répond à 2 questions : est-ce conforme ?
> ET est-ce beau ? »). Elle ajoute au mode VALIDER : 1) l'avis esthétique de
> l'agent (le feedback de goût : équilibre, hiérarchie, hook visuel, cohérence,
> inspiré de l'évaluateur avec du goût de Claude Design, ETUDE-CLAUDE-DESIGN.md
> §3) ; 2) la question explicite « Est-ce beau ? » avec 3 réponses
> (Pas encore / Presque / Oui) qui déclenchent l'action. Conséquence :
> « Approuver » devient un acte à deux temps : conforme ET beau.
>
> Dépend de : UX A3 (décision explicite Approuver / Demander des modifs, colonne
> `decision` JSON, branche feat/ux-a3-validation-explicite) et F-33 (badge
> conformité charte, SPEC-CONFORMITE.md, implémentation en cours). Cette spec
> étend le contrat A3 sans le casser.
>
> Direction design : REFONTE-DESIGN.md, UX-RESEARCH.md §3. Charte :
> apps/web/src/charte.ts. Vision : VISION.md.

---

## 1. Contexte et vision

### 1.1 Le problème

Le A3 a donné au mode VALIDER une décision binaire : « Approuver » (statut
valide) ou « Demander des modifs » (retour brouillon, note obligatoire). Mais
cette décision ne juge qu'une seule dimension : le workflow. Or la promesse
produit (VISION.md) est « ne publie plus jamais quelque chose qui ne te
ressemble pas », et la recherche UX (UX-RESEARCH.md §3, validée par Victor) a
établi que la validation est un **jugement à deux niveaux** :

1. **Conforme** : objectif, vérifiable par des règles (couleurs, typo, ton,
   formats). C'est F-33, le badge conformité.
2. **Beau** : subjectif, un jugement de goût que l'utilisateur doit pouvoir
   exprimer simplement, pas juste « conforme ou pas ».

Aujourd'hui, un brouillon parfaitement conforme mais visuellement médiocre peut
être approuvé sans que personne ne le dise. Le A3+ ferme cette faille : le mode
VALIDER demande explicitement « Est-ce beau ? » et l'agent apporte son
évaluation esthétique avant la décision finale.

### 1.2 La décision (cadrage)

1. **« Approuver » devient un acte à deux temps** : l'approbation finale exige
   que l'utilisateur ait répondu « Oui » à la question « Est-ce beau ? » ET que
   la conformité soit bonne (quand le badge F-33 est disponible). Le contrat
   API est le filet (comme la note obligatoire du A3) : pas seulement un
   désactiver de bouton côté UI.
2. **L'avis esthétique de l'agent est un INPUT, pas un GATE** : l'agent note le
   post (équilibre, hiérarchie, hook visuel, cohérence), mais son avis ne
   bloque jamais l'approbation. L'humain décide. L'avis est là pour informer,
   enrichir le goût, faire émerger un problème que l'utilisateur n'avait pas
   vu.
3. **Trois réponses, pas une échelle** : Pas encore / Presque / Oui (recommandé
   par UX-RESEARCH.md §10 : simple, chaque réponse déclenche une action
   claire). Pas d'échelle 1-5 pour le ressenti du user.
4. **L'avis de l'agent est toujours visible en mode VALIDER** (recommandé
   UX-RESEARCH.md §10 : c'est la valeur « évaluateur avec du goût »), avec un
   état vide actionnable (bouton « Demander l'avis ») plutôt qu'un bloc mort.

### 1.3 Hors périmètre

- Pas de scoring automatique du « beau » côté serveur : le beau est un jugement
  humain, l'agent donne un avis (qualitatif + notes), pas un verdict.
- Pas de blocage de l'approbation sur l'avis de l'agent (l'humain peut approuver
  sans avis, ou contre l'avis).
- Pas d'échelle 1-5 pour le ressenti du user (3 choix, cf. décision 3).
- Pas de notification à l'agent quand l'utilisateur répond « Pas encore » :
  l'agent voit la demande via le chat (message type 'question', pattern
  existant), pas un nouveau canal.
- La conformité F-33 n'est pas ré-implémentée ici : la spec référence le badge
  existant (SPEC-CONFORMITE.md) et le verrou s'active quand il est livré.

---

## 2. Le flux de validation final (mode VALIDER)

```
VALIDER (statut a-valider)
┌──────────────────────────────────────────────────────────┐
│  Carte Conformité (F-33, objective) : checklist verte    │
│  Carte Avis esthétique de l'agent : note /5 + 4 axes     │
│    + commentaire (état vide : [Demander l'avis])         │
│  « Est-ce beau ? »                                       │
│    [Pas encore] [Presque] [Oui]                          │
│                                                          │
│  [Demander des modifs]  [Approuver]                      │
│   (note obligatoire)     (actif si Oui + conforme)       │
│  Décision tracée : qui, quand, beau, note                │
└──────────────────────────────────────────────────────────┘
```

### 2.1 Le mapping des 3 réponses

| Réponse | Action déclenchée | Détail |
|---|---|---|
| **Pas encore** | Itérer | Retour brouillon via `demander-modifs`, note pré-remplie « Pas encore beau : à retravailler » (éditable). L'agent refait une passe. |
| **Presque** | Ajustements | Retour brouillon via `demander-modifs`, note pré-remplie « Presque : petits ajustements » (éditable). L'agent affine. |
| **Oui** | Débloque Approuver | Le bouton Approuver devient actif (si conformité OK aussi, cf. §4). La réponse « Oui » est tracée dans la décision. |

La réponse n'est pas un pré-requis séparé : cliquer une réponse EST l'action
(exception : « Oui » ne valide pas directement, il débloque Approuver pour
garder l'acte à deux temps et la possibilité d'un dernier regard).

### 2.2 L'ordre des questions

1. L'utilisateur regarde le post (stage), la carte Conformité et la carte Avis.
2. Il répond « Est-ce beau ? ».
3. Selon la réponse, l'action primaire se met en avant (Itérer / Ajustements /
   Approuver actif).
4. La décision est enregistrée et tracée (colonne `decision` enrichie).

---

## 3. L'avis esthétique de l'agent (le feedback de goût)

### 3.1 Le concept

Inspiré de l'architecture generator + evaluator de Claude Design
(ETUDE-CLAUDE-DESIGN.md §3) : un évaluateur avec « du goût », des critères qui
transforment « est-ce que ce post est bon ? » en termes notables. Pour Atelier,
le contenu est jugé sur 4 axes :

- **Équilibre** : composition, répartition des masses, respiration, alignements.
- **Hiérarchie** : le regard va-t-il au bon endroit ? Titre, message principal,
  CTA sont-ils dans le bon ordre de priorité ?
- **Hook visuel** : le post attire-t-il l'oeil dans un feed ? La slide 1
  accroche-t-elle ?
- **Cohérence** : le post respecte-t-il la charte et l'identité de la marque,
  d'une slide à l'autre ?

L'agent évalue la **source HTML + la charte** (pas les pixels) : il a accès au
document maître (le HTML source, la vérité) et à la charte (get_charte). Le
feedback est un jugement structuré, pas un message libre.

### 3.2 Structure de données (colonne `avis_esthetique`)

Nouvelle colonne JSON sur `brouillons`, même pattern que `decision` :

```json
{
  "noteGlobale": 4,
  "axes": {
    "equilibre": { "note": 4, "commentaire": "Le bloc CTA est trop haut sur la slide 2." },
    "hierarchie": { "note": 5, "commentaire": "Titre d'abord, message ensuite, CTA en bas. Bon ordre." },
    "hook": { "note": 3, "commentaire": "La slide 1 est dense, le visuel d'accroche est noye." },
    "coherence": { "note": 4, "commentaire": "Couleurs charte respectees, typo OK." }
  },
  "commentaire": "Globalement solide, a retravailler sur le hook de la premiere slide.",
  "par": "hermes",
  "at": "2026-08-13T10:30:00.000Z"
}
```

Règles :

- `noteGlobale` et chaque `axes.*.note` : entier 1-5 (Zod `z.number().int().min(1).max(5)`).
- `axes` : les 4 clés obligatoires (equilibre, hierarchie, hook, coherence).
- `par` : l'agent qui a évalué (libre, ex. `hermes`, `claude-code`).
- `at` : ISO 8601, posé côté serveur.
- Une seule avis à la fois : un nouveau dépôt **remplace** le précédent (pas
  d'historique au v1 ; le journal Activité IA garde la trace).
- `null` = pas encore d'avis.

### 3.3 API

**POST /api/brouillon/:id/avis-esthetique** : dépose l'avis (écrit par l'agent
via MCP). Body :

```json
{
  "noteGlobale": 4,
  "axes": {
    "equilibre": { "note": 4, "commentaire": "..." },
    "hierarchie": { "note": 5, "commentaire": "..." },
    "hook": { "note": 3, "commentaire": "..." },
    "coherence": { "note": 4, "commentaire": "..." }
  },
  "commentaire": "...",
  "par": "hermes"
}
```

- Validation : `avisEsthetiqueSchema` (Zod), structure §3.2, `commentaire`
  optionnel ≤ 1000, `par` requis ≤ 64, notes requises.
- 200 : `{ ok: true, avisEsthetique: {...} }`. 400 : erreur Zod. 404 : brouillon
  inconnu.
- Accepté quel que soit le statut (l'agent peut pré-évaluer un brouillon).
- Journalise (Activité IA, type `avis-esthetique`) : qui, noteGlobale, id
  brouillon.
- **Invalidation** : toute mutation des slides (POST /slides, /order,
  regenerer_slides) remet `avis_esthetique` à `null` (l'avis ne vaut plus si le
  contenu a changé). Le `beau` de la décision précédente reste tracé mais le
  verrou Approuver se ré-arme (cf. §4.2).

**GET détail** : renvoie `avisEsthetique` (objet parsé ou `null`), à côté de
`decision`.

### 3.4 MCP

Nouvel outil **`evaluer_esthetique`** (14e outil) :

- `id` (string) : id du brouillon.
- `noteGlobale` (int 1-5), `axes` (4 objets { note 1-5, commentaire string
  optional }), `commentaire` (string optional ≤ 1000), `par` (string, défaut
  `hermes`).
- Appelle `POST /api/brouillon/:id/avis-esthetique` via le client existant
  (`AtelierClient.evaluerEsthetique()`).
- Le prompt de l'agent doit l'inviter à évaluer la **source HTML + la charte**
  (get_charte) sur les 4 axes, pas les pixels.
- Rappel : rebuild (`tsc`) puis `hermes mcp restart atelier` pour exposer
  (vérif : `grep -c evaluer_esthetique dist/index.js`).

### 3.5 UI (carte Avis esthétique)

- **Rempli** : note globale en tête (`4/5`), les 4 axes avec note + commentaire
  (axes à 5 : vert ok ; 3-4 : ambre ; 1-2 : neutre/secondaire), commentaire
  global, footer `par · date`.
- **Vide** : titre « Avis esthétique » + texte « L'agent n'a pas encore donné
  son avis sur ce contenu » + bouton **« Demander l'avis »** (ghost, icône
  Sparkle) qui poste dans le chat un message type 'question' : « Donne ton avis
  esthétique sur ce contenu (équilibre, hiérarchie, hook visuel, cohérence)
  avec une note globale sur 5. » L'agent répond via `evaluer_esthetique`, le
  polling 8s du chat rafraîchit la carte.
- Emplacement : dans le panneau droit, au-dessus du bloc « Est-ce beau ? »,
  sous la carte Conformité (le workflow domine en mode VALIDER).
- Le bouton « Demander l'avis » ne s'affiche que si un agent est connecté
  (détection existante : conversation présente ou MCP joignable ; au pire, le
  message part dans le chat et l'agent le traitera à sa prochaine passe).

---

## 4. « Est-ce beau ? » et l'acte à deux temps

### 4.1 La question

Dans le mode VALIDER (statut `a-valider`), sous la carte Avis esthétique, un
bloc :

```
Est-ce beau ?
  [Pas encore]  [Presque]  [Oui]
```

- C'est le ressenti du user, exprimé en un clic. Aucune échelle, aucun champ
  texte requis au moment du choix (la note vient après pour Pas encore /
  Presque, via le flux Demander des modifs existant).
- Les trois réponses sont des boutons radio visuellement (sélection unique,
  point coloré), pas trois actions séparées.

### 4.2 Le déclenchement (mapping exact)

| Réponse cliquée | Appel API | Résultat |
|---|---|---|
| Pas encore | `POST /decision { decision: 'demander-modifs', beau: 'pas-encore', note: 'Pas encore beau : à retravailler' }` | Statut brouillon, note éditable avant envoi (le user peut préciser), décision tracée. |
| Presque | `POST /decision { decision: 'demander-modifs', beau: 'presque', note: 'Presque : petits ajustements' }` | Statut brouillon, note éditable, décision tracée. |
| Oui | Aucun appel immédiat : **le bouton Approuver s'active** | La réponse reste en mémoire locale + est tracée quand Approuver est cliqué (le POST /decision d'approbation porte `beau: 'oui'`). |

### 4.3 L'acte à deux temps (côté contrat)

La route **POST /api/brouillon/:id/decision** existante (A3) est étendue :

- Nouveau champ `beau` : `z.enum(['pas-encore', 'presque', 'oui'])`, optionnel.
- **Règle de gate côté API** : `decision: 'approuver'` exige `beau: 'oui'`
  (sinon 400 `{ error: "Pour approuver, répondez d'abord 'Oui' à la question Est-ce beau ?" }`).
  C'est le filet : même un client qui n'affiche pas la question ne peut pas
  approuver sans le « Oui ».
- `decision: 'demander-modifs'` : `beau` optionnel (pas-encore ou presque), note
  obligatoire (règle existante conservée).
- La trace enregistrée devient
  `{ decision, beau, note, par, at }` (beau toujours présent : 'oui' pour une
  approbation, la réponse choisie sinon).
- Le journal Activité IA (type 'decision') gagne `beau` dans le payload.

### 4.4 Le verrou conformité (F-33)

Quand le badge F-33 est disponible (SPEC-CONFORMITE.md, implémentation à venir) :

- Le bouton Approuver n'est actif que si **beau = oui ET conformité bonne**
  (aucun écart dur). Si le badge est rouge, le bouton reste désactivé avec un
  message « Hors charte : corrigez avant d'approuver ».
- Côté API : la route /decision en 'approuver' vérifie aussi la conformité
  calculable (le moteur F-33) et refuse (409) si écart dur. L'utilisateur
  assume jamais un hors-charte en approuvant (promesse VISION.md).
- Tant que F-33 n'est pas livré, le verrou conformité est inactif (seul le
  verrou beau s'applique). Cette spec ne bloque pas le merge du A3+ sur
  l'arrivée de F-33 : le verrou s'active à la livraison de F-33 sans
  changement de contrat (le POST /decision ajoute juste une vérification).

---

## 5. Changements API (récapitulatif)

1. **Colonne `avis_esthetique`** (TEXT JSON, défaut NULL) : les 4 fichiers
   ENSEMBLE (règle Phase 4 : schema.ts, schema-pg.ts, legacy.ts ALTER TABLE,
   migrate-pg.ts ALTER TABLE ADD COLUMN IF NOT EXISTS), types
   `BrouillonRow.avisEsthetique?: string | null`.
2. **`avisEsthetiqueSchema`** (validation.ts) : structure §3.2, notes int 1-5,
   commentaires ≤ 1000.
3. **`POST /api/brouillon/:id/avis-esthetique`** : dépose l'avis, journalise
   (type 'avis-esthetique'). Idempotent par remplacement.
4. **POST /decision étendu** : champ `beau`, gate 'approuver' → beau='oui'
   (400 sinon), trace enrichie, journal avec beau. Le refine existant (note
   obligatoire pour demander-modifs) est conservé.
5. **Invalidation** : dans les routes qui mutent les slides (POST /slides,
   POST /order, et l'appel interne de regenerer_slides), remettre
   `avis_esthetique` à NULL dans l'UPDATE.
6. **GET détail** : parse `avisEsthetique` (comme decision).

## 6. Changements MCP (récapitulatif)

1. `client.ts` : `evaluerEsthetique(id, input)` → POST avis-esthetique.
2. `index.ts` : outil `evaluer_esthetique` (14e), zod schema §3.4.
3. `lire_brouillon` : décrire `avisEsthetique` dans le retour (l'agent voit s'il
   a déjà évalué).
4. Rebuild + `hermes mcp restart atelier`.

## 7. UI (récapitulatif)

Dans `DraftDetail.tsx`, bloc de décision (statut `a-valider`) :

1. **Carte Avis esthétique** (§3.5) : lecture de `brouillon.avisEsthetique`,
   état vide avec « Demander l'avis » (message chat type 'question').
2. **Bloc « Est-ce beau ? »** : 3 radio (Pas encore / Presque / Oui). Au clic
   Pas encore / Presque : ouvre le flux Demander des modifs (le bloc note
   existant) avec la note pré-remplie, bouton de confirmation. Au clic Oui :
   active Approuver.
3. **Bouton Approuver** : désactivé tant que `beau !== 'oui'` (et, si F-33
   dispo, si conformité rouge). Au clic : POST /decision { approuver,
   beau: 'oui' }.
4. **Trace** : après décision, afficher la dernière décision tracée
   (existant A3) avec en plus le beau : « Approuvé (beau) · 12 août 14:30 ».

Composants : les classes existantes du A3 (`decide-note`, boutons decision)
sont réutilisées, ajout des styles carte avis (axes à points colorés) dans
styles.css. Icônes Phosphor : existantes (Sparkle, Check, PencilSimple).
Vérifier les exports avant toute icône nouvelle (`grep` des .d.ts).

## 8. Edge cases

| Cas | Comportement |
|---|---|
| Brouillon pas en a-valider | La carte Est-ce beau ? et les boutons n'apparaissent pas (règle A3 existante). L'avis esthétique peut être déposé par l'agent n'importe quand (pré-évaluation). |
| Slides régénérées après avis | `avis_esthetique` remis à null ; la carte redevient vide avec « Demander l'avis » ; le beau tracé reste visible dans l'historique mais Approuver se ré-arme (beau local redevient vide). |
| User clique Oui puis change d'avis | Il reclique Pas encore / Presque : l'action bascule, Approuver se désactive. Le dernier choix gagne. |
| POST /decision 'approuver' sans beau | 400 (gate API). Le bouton UI ne le permet pas, mais le contrat protège les clients tiers (MCP, curl). |
| Approuver sans avis de l'agent | Autorisé (l'avis est un input, pas un gate). Le mode VALIDER invite à le demander mais ne bloque pas. |
| Avis avec note hors 1-5 | 400 Zod (message clair). |
| Deux agents déposent un avis | Le dernier remplace (pas d'historique au v1) ; le journal Activité IA garde les deux traces (type 'avis-esthetique', qui). |
| Demandes de modifs (Pas encore / Presque) sans note | 400, règle A3 conservée (note obligatoire), pré-remplie par défaut mais l'utilisateur peut la vider ? Non : le POST part avec la note pré-remplie, l'utilisateur peut la modifier avant envoi mais elle reste non vide. |
| F-33 pas encore livré | Seul le verrou beau s'applique. Aucune dépendance bloquante. |
| Contenu type document (hors réseaux) | L'esthétique s'applique aussi (un pitch deck doit être beau). Pas de différence de flux. |

## 9. Découpage d'implémentation (ordre recommandé, ~2 j solo)

**Étape 1, API (0.5 j)** : colonne avis_esthetique (4 fichiers + types),
avisEsthetiqueSchema, POST avis-esthetique, invalidation sur mutations slides,
GET détail. Tests : déposer / remplacer / invalider / 400 notes hors range.

**Étape 2, Décision étendue (0.5 j)** : champ beau dans decisionSchema + route
/decision (gate approuver), trace enrichie, journal avec beau. Tests : approuver
sans beau → 400, avec beau 'oui' → 200, demander-modifs beau presque → 200.

**Étape 3, MCP (0.5 j)** : outil evaluer_esthetique + client + test stdio
(test-stdio étendu) + `hermes mcp restart atelier`.

**Étape 4, UI (0.5-1 j)** : carte Avis esthétique (rempli + vide + Demander
l'avis), bloc Est-ce beau ?, verrou Approuver, trace enrichie. Vérif :
captures Playwright (mode VALIDER avec avis, sans avis, après régénération) +
vision_analyze + 0 erreur console + zéro em-dash.

Chaque étape = un commit propre. PR unique `feat/validation-esthetique` sur
main, CI verte (tokens build + lint + test + build web).

## 10. Questions ouvertes pour Victor

1. **L'avis de l'agent : obligatoire avant Approuver ou simple input ?**
   Recommandé : simple input (l'humain décide, l'avis informe). Si tu veux le
   rendre obligatoire, c'est une ligne de plus (gate API), mais ça ajoute de la
   friction quand l'agent n'est pas connecté.
2. **Notes 1-5 ou échelle plus fine pour l'avis ?** Recommandé : 1-5 (assez
   fin pour le feedback, assez simple pour l'agent).
3. **Contourner le hors-charte ?** Quand F-33 sera livré, l'approbation d'un
   post hors charte sera refusée (promesse « ne publie jamais hors charte »).
   Veux-tu un contournement explicite (checkbox « je assume ») ou un refus
   dur ? Recommandé : refus dur au v1, on verra avec l'usage réel.
4. **Historique des avis ?** Au v1, un seul avis (remplacement). Un historique
   d'avis par itération serait utile plus tard (avec le versioning des slides).
   À garder en backlog.
