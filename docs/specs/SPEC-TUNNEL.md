# SPEC-TUNNEL.md : tunnel de creation, progression d'etapes + suggestions workflow (vue detail) (11/08/2026)

> Spec du « tunnel de creation » dans la vue detail : un stepper discret du workflow
> (Demander -> Reviser -> Valider -> Programmer) dans le header, des suggestions
> contextuelles qui portent la prochaine action (passer a A valider quand la checklist
> est complete, programmer quand le contenu est valide), et un mode « Apercu publie »
> (slides + legende assemblee). Inspire de Linear (le statut comme etape, pas comme
> badge) et Notion (suggestions contextuelles, apercu de publication).
> Direction design : REFONTE-DESIGN.md (« l'atelier, pas le dashboard »). Vision :
> VISION.md (memoire de marque + complement d'agent). Priorisation : PRIORISATION.md
> (Sprint 4, controle + sortie). Creation : SPEC-CREATION.md (la porte d'entree).
> Regle de publication : STRATEGIE-PUBLICATION.md (publish-before-write inalienable).

---

## 1. Contexte et vision

### 1.1 Le probleme

Le workflow complet d'un contenu existe deja, mais il est invisible :

1. **Aucun fil conducteur.** L'utilisateur demande a l'agent (onglet Agent), revise
   (notes + checklist + legendes), valide (dropdown statut) puis programme (section
   planif en bas du panneau). Chaque outil est la, mais rien ne dit « tu es ici, la
   prochaine action est ca ». Le header n'affiche qu'un statut passif (Brouillon /
   A valider / Valide / Publie) sans lien avec les actions disponibles.
2. **La checklist est un cul-de-sac.** Quand les 4 items sont coches, rien ne se
   passe : le user doit deviner qu'il faut maintenant changer le statut a la main
   dans le dropdown du header. Le geste « je valide » est decouple de la condition
   « tout est verifie ».
3. **La validation ne debouche sur rien.** Une fois le contenu passe en « Valide »,
   l'invitation a programmer est noyee dans le hint passif « Quand le contenu est
   pret, planifiez sa publication » en bas du panneau.
4. **Pas de vision « ce que le public verra ».** On revise slide par slide et legende
   par legende, mais on ne peut jamais voir le post ASSEMBLE (slides + legende du
   reseau) comme il apparaitra publie. L'export HTML existe mais c'est un livrable,
   pas un mode de lecture.

Linear resout 1 et 3 avec un stepper de workflow dans le header (le statut est une
etape, pas un badge) ; Notion resout 2 et 3 avec des suggestions contextuelles
inline et un apercu de publication. C'est exactement ce qu'on pose ici.

### 1.2 La decision

Un **tunnel de creation** dans la vue detail, 4 elements, tous purement frontend
(rien a changer cote API : statut, checklist, conversation, programme et slides
existent deja) :

1. **Stepper discret** Demander -> Reviser -> Valider -> Programmer dans le header
   du detail (`.detail-bar`), a cote du titre. Il reflete l'etat reel a tout
   moment (etape courante, etapes faites, etapes a venir). Statuts sémantiques
   inchanges : le stepper est monochrome (points alpha + check blanc), seuls les
   dots du dropdown gardent les couleurs de statut.
2. **Suggestion « Passer a A valider »** : bandeau inline dans le panneau droit,
   affiche quand la checklist est complete (et seulement la). Le CTA fait
   `setStatut('a-valider')` d'un clic.
3. **Invitation « Contenu valide -> Programmer dans le calendrier »** : bandeau
   affiche quand le statut est `valide` et qu'aucune programmation n'existe. Le
   CTA ouvre la modale planif existante.
4. **Mode « Apercu publie »** : toggle discret dans le stage, pres du compteur de
   slides. Quand il est actif, la slide courante s'affiche avec, en dessous, la
   legende assemblee du reseau actif (caption + hashtags), comme un post publie.

Motion : tokens existants uniquement, `--motion-duration-fast` (150ms) pour les
micro-transitions (points du stepper, fermeture de suggestion), `--motion-duration-
medium` (250ms) pour les apparitions (stepper, bandeau, zone legende), toujours avec
`--motion-ease` (cubic-bezier(0.32, 0.72, 0, 1)). Jamais linear ni ease-in-out.
`prefers-reduced-motion` respecte (les guards globaux existants s'appliquent).

### 1.3 Hors perimetre (v1)

- **Pas de changement du modele de statuts.** `brouillon / a-valider / valide /
  publie` restent la source de verite (une seule source). Le stepper est un
  DERIVE, jamais un ecrivain de statut (sauf via les CTA des suggestions, qui
  appellent le meme setStatut que le dropdown).
- **Pas de publication reelle depuis le tunnel.** L'apercu publie est un mode de
  LECTURE. La publication passe par Postiz (STRATEGIE-PUBLICATION.md,
  publish-before-write inalienable).
- **Pas de stepper cliquable au v1.** Le stepper est un indicateur ; changer de
  statut reste explicite (dropdown header ou CTA des suggestions). Un stepper
  cliquable serait un dropdown deguise, a trancher plus tard (question ouverte,
  section 9).
- **Pas de multi-users, pas d'editeur graphique** (SPEC-CREATION.md section 1.3).
- **Pas de persistence des fermetures de suggestion** (etat par session, section 4.6).

---

## 2. Vocabulaire (fige)

| Terme | Sens |
|---|---|
| Etape | L'une des 4 cases du stepper : Demander, Reviser, Valider, Programmer |
| Stepper | La barre d'etapes du header (`.workflow-stepper`) |
| Suggestion | Le bandeau inline du panneau qui propose la prochaine action |
| Checklist complete | checklist non vide ET tous les items coches |
| Apercu publie | Le mode de lecture du post assemble (slides + legende) |
| Reseau actif | Le reseau selectionne dans l'onglet Reseaux (`reseauActif`) |

Mapping etape -> condition de completion (regle figee, section 3.4) :

| Etape | Faite quand |
|---|---|
| Demander | conversation non vide OU au moins 1 slide (l'agent a produit, ou le user a depose) |
| Reviser | statut dans {a-valider, valide, publie} |
| Valider | statut dans {valide, publie} |
| Programmer | `programme` non null OU statut `publie` |

---

## 3. Le stepper discret (header)

### 3.1 Placement

Dans `.detail-bar`, entre la zone gauche (back / sep / titre) et la zone droite
(type-select / statut / export / delete). Il pousse la zone droite si le titre est
court, et se resout en points seuls si la largeur manque (voir 3.5). C'est un
element de 13px aligne verticalement, discret : on doit le lire comme une
progression, pas comme un controle.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Dashboard / Carrousel, Pourquoi Bordeluche existe   ● Demander → ...   │
│                                        ┌────────┐ ┌────────┐ ┌──────┐ ┌─┐ │
│                                        │Carrousel│ │● Valide│ │Exporter│ │×│ │
│                                        └────────┘ └────────┘ └──────┘ └─┘ │
└──────────────────────────────────────────────────────────────────────────┘
                 ┌──────────────────────────────────────────────┐
                 │ ✓ Demander   ● Reviser   ○ Valider   ○ Programmer │
                 └──────────────────────────────────────────────┘
```

### 3.2 Structure DOM / classes

```
<div class="workflow-stepper" aria-label="Progression du workflow">
  <div class="ws-step done" aria-current="false">
    <span class="ws-icone"><Check size={10} weight="bold" /></span>
    <span class="ws-label">Demander</span>
  </div>
  <span class="ws-connector" />
  <div class="ws-step current" aria-current="step">
    <span class="ws-icone"><span class="ws-dot" /></span>
    <span class="ws-label">Reviser</span>
  </div>
  <span class="ws-connector" />
  <div class="ws-step pending">
    <span class="ws-icone"><span class="ws-dot ws-dot--vide" /></span>
    <span class="ws-label">Valider</span>
  </div>
  <span class="ws-connector" />
  <div class="ws-step pending">… Programmer …</div>
</div>
```

Icônes : `Check` (Phosphor, deja importee) pour les etapes faites, un point CSS
pour courante/pending. Pas de nouvelle icone.

### 3.3 Apparence (DA noire)

| Partie | Style |
|---|---|
| Conteneur | `display:flex; align-items:center; gap:8px; font-size:12px;` |
| Etape done | label `--color-ink-secondary`, icone Check `--color-ink-secondary` (14px), le check « pop » a 150ms |
| Etape courante | label `--color-ink-primary` font-weight 500, point plein 6px `--color-ink-primary` (monochrome) |
| Etape pending | label `--color-ink-tertiary`, point vide (bordure hairline, fond transparent) |
| Connecteur | 16px x 1px `--color-line-default` |
| Survol | aucune action (indicateur pur) |

Regle DA : **zero couleur de statut dans le stepper**. Les couleurs semantiques
(ambre/vert) restent sur les dots du dropdown statut et les badges. Le stepper est
monochrome blanc sur noir, comme le reste de la DA validee.

### 3.4 Regle de calcul (derivee, pas d'etat)

L'etape courante = la premiere etape non faite dans l'ordre
`[Demander, Reviser, Valider, Programmer]`. On calcule un `wsIndex` (0..3) :

```
function wsIndex(brouillon): number {
  const conversation = JSON.parse(brouillon.conversation || '[]');
  const demande = conversation.length > 0 || brouillon.slides.length > 0;
  if (!demande) return 0;
  const statut = brouillon.statut;
  if (statut === 'brouillon') return 1;                 // Reviser
  if (statut === 'a-valider') return 2;                 // Valider
  if (statut === 'valide') {
    return brouillon.programme ? 3 : 2;                 // Programmer si programme pose
  }
  return 3;                                              // publie
}
```

Cas particulier **documents** (TYPES_DOCUMENTS) : le stepper n'affiche que
3 etapes (Demander, Reviser, Valider). Programmer est masque (un pitch deck ne se
programme pas sur Instagram). La regle wsIndex s'applique sans la 4e etape.

Retour en arriere : si le statut repasse de `valide` a `brouillon`, le stepper
recule immediatement (il reflete l'etat reel, pas un historique).

### 3.5 Responsive et densite

- Si la largeur du header est insuffisante (fenetre etroite, titre long), les
  labels passent en points seuls (tooltip `title` avec le nom de l'etape), via une
  media query existante ou `overflow:hidden` sur les labels. Les 4 etapes restent
  visibles en points : la progression se lit au contour (check / point plein /
  point vide).
- Sous 1100px (le detail passe en colonne, REFONTE-DESIGN.md), le stepper reste
  dans le header mais peut se replier en 3 points pleins + libelle de l'etape
  courante seulement.

### 3.6 Motion

- Apparition du stepper : `fadeUp` 200ms `--motion-ease` (le header en a deja un
  `fadeUp` medium, on reste coherent).
- Changement d'etape : transition `background`/`color` 150ms sur `.ws-step`,
  le check des etapes faites apparait avec `scale(0.8 -> 1)` 150ms.
- `prefers-reduced-motion` : guards existants coupent les animations.

---

## 4. Les suggestions workflow (le panneau droit)

### 4.1 Le principe

Un bandeau inline, tout en haut du panneau droit (au-dessus des onglets Agent /
Reseaux / Slides / Source), qui propose LA prochaine action. Pas de modale, pas de
toast : un element calme, fermable, qui disparait des que sa condition tombe.

Une seule suggestion visible a la fois. Priorite : **S1 (checklist complete) >
S2 (valide, a programmer) > S0 (premier jet) > aucune**.

### 4.2 S1 : « Passer a A valider »

**Declencheur (TOUTES les conditions) :**

- statut === `brouillon`
- checklist non vide (au moins 1 item)
- checklist complete (tous les items coches)
- `brouillon.slides.length > 0` (on ne passe pas a A valider un contenu vide)

**Contenu :**

```
┌────────────────────────────────────────────────────────────────┐
│ ✦  Checklist complete (4/4). Le contenu est pret a valider.   ✕ │
│                                        [ Passer a A valider → ] │
└────────────────────────────────────────────────────────────────┘
```

**Action :** le CTA fait `setStatut('a-valider')` (meme chemin que le dropdown :
`setStatut` existant -> POST patch). La suggestion disparait (le statut n'est plus
`brouillon`).

### 4.3 S2 : « Contenu valide -> Programmer dans le calendrier »

**Declencheur (TOUTES les conditions) :**

- statut === `valide`
- `programme` null (ou absent)
- type dans TYPES_CONTENUS (pas un document)
- pas de suggestion fermee S2 dans la session

**Contenu :**

```
┌────────────────────────────────────────────────────────────────┐
│ ✓  Contenu valide. Il ne manque que la programmation.        ✕ │
│                                        [ Programmer → ]          │
└────────────────────────────────────────────────────────────────┘
```

**Action :** le CTA ouvre la modale planif existante (`setPlanifOpen(true)`), avec
le reseau actif preselectionne. Une fois la programmation posee, la condition
`programme === null` tombe et la suggestion disparait (le bloc « Programme le X a H
sur Y » du panneau prend le relais).

### 4.4 S0 : « Demander un premier jet » (boucle Demander)

**Declencheur (TOUTES les conditions) :**

- conversation vide
- `brouillon.slides.length === 0`
- statut `brouillon`

**Contenu :**

```
┌────────────────────────────────────────────────────────────────┐
│ ✦  Le contenu est vide. Demandez un premier jet a votre agent. ✕ │
│                                        [ Demander a l'agent → ]  │
└────────────────────────────────────────────────────────────────┘
```

**Action :** bascule sur l'onglet Agent et focus le textarea du chat. Elle ferme
la boucle « Demander » du stepper : le user agent-first n'est jamais bloque (il
peut deposer sa source directement, voir 4.5), le user creatif a son premier CTA.

### 4.5 Regles de non-affichage (edge cases)

| Cas | Comportement |
|---|---|
| statut `publie` | aucune suggestion (le contenu est sorti) |
| checklist vide (jamais initialisee) | S1 masquee : le bouton « Initialiser la checklist » du bloc existant reste la seule porte |
| checklist partielle (2/4) | S1 masquee (pas de pression tant que tout n'est pas coche) |
| 0 slide + checklist complete | S1 masquee (condition slides) |
| document (pitch deck...) valide | S2 masquee (pas de programmation reseau, cf. planif-nodoc existant) |
| programme deja pose | S2 masquee (le bloc « Programme le X » est affiche a la place) |
| statut `a-valider` | ni S1 ni S2 (on attend la validation) |

### 4.6 Fermeture

Bouton `✕` (12px, ink-tertiary, hover ink-primary) : ferme la suggestion pour la
SESSION (state local `suggestionsFermees: Set<string>`). Elle reapparait si sa
condition redevient vraie apres un changement d'etat (ex : on repasse en
`brouillon` -> S1 revient si la checklist est encore complete). Pas de
localStorage au v1 (question ouverte 9.4).

### 4.7 Apparence et motion

- Conteneur `.suggestion-band` : fond `--color-bg-level-2`, bordure
  `--color-line-default`, radius 12px (cartes), padding 10px 12px, icone Sparkle
  13px ink-secondary, texte 12.5px ink-secondary, CTA bouton `primary` compact
  (padding reduit, 11.5px).
- Apparition : `fadeUp` 200ms (translateY 6px -> 0) `--motion-ease`.
- Disparition (condition tombe ou fermeture) : opacity 0 + translateY(4px)
  150ms, puis retrait du DOM (`onTransitionEnd` ou timeout 150ms).
- Le bandeau est en haut du panneau, AU-DESSUS des `.panel-tabs`, pour ne pas
  decaler les sections au milieu de la lecture.

---

## 5. Le mode « Apercu publie »

### 5.1 Principe

Voir le post ASSEMBLE comme il apparaitra publie : la slide courante + la legende
du reseau actif (caption + hashtags) rendue en dessous, dans une carte legende.
C'est un mode de LECTURE du stage, pas un export (l'export HTML/PDF existant
reste le livrable).

### 5.2 Declencheur

Bouton ghost discret dans la zone du stage, a cote du compteur `1 / 9` :

```
┌──────────────────────────────────────────────┐
│  [◀]  [slide]  [▶]                           │
│                 1 / 9        [👁 Apercu publie] │
└──────────────────────────────────────────────┘
```

- Icône `Eye` (Phosphor, a verifier dans les .d.ts avant usage, cf. pitfall
  Phase 2b) ou `TextT` fallback ; libelle « Apercu publie ».
- Etat actif : `border-color: accent` + texte accent (pattern `.src-toggle.on`
  existant, reutilisable).
- Masque pour TYPES_DOCUMENTS (pas de legende reseau).
- Masque quand `brouillon.slides.length === 0`.

### 5.3 Rendu

Quand `apercuPublie` est actif, sous la slide courante (dans le flux du stage,
pas en overlay) :

```
┌──────────────────────────────────────────────┐
│            (slide courante, idem)            │
├──────────────────────────────────────────────┤
│ [IG] Instagram      @bordeluche              │
│                                              │
│ J'ai vécu ce que vivent les propriétaires…   │
│ (caption complet, texte 13px ink-primary,    │
│  line-height 1.5, retours a la ligne         │
│  conserves)                                  │
│                                              │
│ #bordeaux #conciergerie #airbnb (ink-tertiary)│
│                1 234 caracteres / 2200       │
└──────────────────────────────────────────────┘
```

- **Carte legende** `.apercu-legende` : fond `--color-bg-level-2`, hairline,
  radius 12px, padding 14px, largeur alignee sur la slide (max-width identique).
- **En-tete** : icone du reseau actif (RESEAU_ICONES existant) + nom du reseau
  (RESEAUX_LABELS) en 11px ink-secondary, pseudo « @bordeluche » en ink-tertiary
  (le pseudo vient de la charte si dispo, sinon placeholder generique).
- **Caption** : `currentReseau.caption` brut (texte 13px), les sauts de ligne
  conserves (`white-space: pre-wrap`).
- **Hashtags** : `currentReseau.hashtags` en ink-tertiary, sous le caption.
- **Compteur** discret : `X caracteres / maxChars` (reutilise
  `RESEAU_CONTRAINTES[reseauActif].maxChars`), en ink-tertiary 10.5px, rouge si
  depasse (classe `.counter.over` existante).
- Si caption ET hashtags vides : placeholder « Aucune legende pour Instagram.
  Onglet Reseaux pour l'ecrire. » (12px ink-tertiary).

### 5.4 Interactions

- Les fleches carrousel et les vignettes restent actives : on navigue slide par
  slide, la legende reste fixe en dessous (c'est la legende du POST, pas de la
  slide).
- Le reseau actif est celui du panneau (`reseauActif`) : changer de reseau dans
  l'onglet Reseaux met a jour l'apercu immediatement.
- Le panneau droit reste ouvert et editable (l'apercu est un mode de lecture du
  stage, pas un verrou).
- Le toggle est independant de l'onglet du panneau : on peut etre en apercu
  publie et editer la legende dans l'onglet Reseaux en meme temps.

### 5.5 Motion

- Apparition de `.apercu-legende` : `fadeUp` 200ms `--motion-ease`.
- Bascule du toggle : 150ms (fond/bordure), sans deplacement du stage.
- `prefers-reduced-motion` respecte.

---

## 6. Changements de code

### 6.1 Vue detail (DraftDetail.tsx)

Aucun nouveau fichier au v1 (le composant fait 1102 lignes, on ajoute ~150 ; un
extrait WorkflowStepper est possible si ca depasse, decision d'implementation).

Nouveaux states :

```ts
const [apercuPublie, setApercuPublie] = useState(false);
const [suggestionsFermees, setSuggestionsFermees] = useState<Set<string>>(new Set());
// wsIndex est derive (pas d'etat) : fonction pure de brouillon (section 3.4)
```

Nouveaux derives (recacul a chaque render, pas de state) :

```ts
const wsIndex = calculerWsIndex(brouillon, estDocument);
const suggestionActive = calculerSuggestion(brouillon, suggestionsFermees); // 'S0' | 'S1' | 'S2' | null
```

`calculerSuggestion` : applique les regles 4.2/4.3/4.4 dans l'ordre de priorite
S1 > S2 > S0, en tenant compte de `suggestionsFermees` et du type (document).

Rendu :

- Stepper : insere dans `.detail-bar` entre `.l` et `.r` (ou dans `.l` apres le
  titre si la largeur le permet).
- Suggestion : au-dessus de `.panel-tabs` dans le panneau droit.
- Apercu : toggle dans `.stage-nav` a cote du compteur ; `.apercu-legende` rendue
  sous `.stage-media` quand `apercuPublie`.

### 6.2 CSS (styles.css)

Nouvelles classes : `.workflow-stepper`, `.ws-step`, `.ws-step.done/.current/
.pending`, `.ws-icone`, `.ws-dot`, `.ws-dot--vide`, `.ws-connector`,
`.suggestion-band`, `.suggestion-band .cta`, `.suggestion-close`,
`.apercu-toggle`, `.apercu-toggle.on`, `.apercu-legende`, `.apercu-legende-head`,
`.apercu-legende-hashtags`, `.apercu-legende-count`.

Tokens utilises (existants uniquement) : `--color-ink-primary/secondary/tertiary`,
`--color-line-default`, `--color-bg-level-2`, `--color-accent-base`,
`--motion-duration-fast/medium`, `--motion-ease`, `--radius-*`. Zero nouvelle
valeur, zero em-dash dans les commentaires CSS.

### 6.3 API / MCP

**Aucun changement.** Le stepper, les suggestions et l'apercu se calculent depuis
l'existant (statut, checklist, conversation, programme, slides, reseaux). C'est le
point fort de cette spec : le tunnel est une couche de presentation pure.

### 6.4 Verification (filet DA)

1. `npm run build -w apps/web` (le lint integre de patch peut mentir, verifier au
   build, cf. skill).
2. Captures Playwright (grille -> clic carte -> detail) dark + light, avec :
   stepper visible, suggestion S1 affichee (checklist completee via la vraie
   checklist du brouillon de test), apercu publie actif, 0 erreur console.
3. `vision_analyze` sur chaque capture (questions critiques : stepper aligne,
   bandeau discret, legende alignee sur la slide, zero accent couleur parasite).
4. `grep -rn "—" apps/ packages/` -> 0 (em-dash).
5. `npm run test -w apps/api` (regression API, meme si rien ne change cote API).
6. PR, CI verte, merge.

---

## 7. Edge cases (recapitulatif executable)

| Cas | Stepper | Suggestion | Apercu |
|---|---|---|---|
| brouillon vide (0 slide, 0 conversation) | Demander courant | S0 | masque |
| brouillon avec slides, checklist vide | Reviser courant | aucune (initialiser la checklist) | visible |
| checklist complete, statut brouillon | Reviser courant | S1 | visible |
| statut a-valider | Valider courant | aucune | visible |
| statut valide, pas de programme | Valider courant | S2 | visible |
| statut valide, programme pose | Programmer courant | aucune | visible |
| statut publie | tout fait | aucune | visible |
| document, statut valide | 3 etapes, Valider courant | aucune | masque |
| retour valide -> brouillon | stepper recule | S1 revient si checklist complete | visible |
| programme annule (valide) | stepper recule a Valider | S2 revient | visible |

---

## 8. Decoupage d'implementation (ordre recommande, ~1.5j solo)

1. **Stepper (0.5j)** : `calculerWsIndex` + rendu dans `.detail-bar` + CSS +
   motion. Verifier sur les 4 statuts + document + responsive.
2. **Suggestions (0.5j)** : `calculerSuggestion` + bandeau + CTA + fermeture +
   priorite S1 > S2 > S0. Verifier les 7 cas de la table 4.5.
3. **Apercu publie (0.5j)** : toggle + `.apercu-legende` (caption, hashtags,
   compteur, placeholder) + synchro reseau actif.
4. **Verification (0.5j)** : captures + vision_analyze + build + tests + grep
   em-dash + PR.

Chaque etape est une PR separee ou une PR unique selon la charge ; le pattern
etabli est : PR avec captures + vision_analyze avant merge (Phase 6d).

---

## 9. Questions ouvertes pour Victor

1. **Stepper cliquable ?** Au v1 il est indicateur pur (changer de statut reste
   explicite). Un stepper cliquable (Linear le fait) economiserait un clic mais
   dupliquerait le dropdown. Reco : indicateur pur au v1, on verra avec l'usage.
2. **Apercu publie : carte simple ou simulation de fil ?** Au v1 : slide + carte
   legende (sobre). Une simulation de fil (fond du reseau, story ring, UI du
   reseau autour) est possible plus tard mais coute cher et vieillit mal (les UIs
   reseaux changent). Reco : carte simple.
3. **S0 incluse ?** La boucle « Demander » du stepper est plus honnete avec S0
   (le premier CTA du user creatif). Si Victor la trouve redondante avec l'empty
   state du chat, on la retire (0 cout, c'est une condition de plus).
4. **Persistance des fermetures de suggestion ?** Session only au v1 (simple,
   pas de localStorage). Si le user ferme S1 et revient 3 jours apres, elle
   reapparait (tant que la condition tient). Reco : session only.
