# SPEC-CONFORMITE.md : Badge conformité charte F-33 (11/08/2026)

> Spec de la feature « badge conforme / hors charte » (F-33, pilier Conformité,
> Sprint 4 « Le contrôle + la sortie » de PRIORISATION.md). Cadrage validé :
> le badge est une feature parmi d'autres (VISION.md Partie C : « badge =
> feature (pas le produit) »). Cette spec répond aux deux questions ouvertes de
> la carte : source de vérité (couleurs extraites des slides ?) et seuils de
> tolérance. Elle définit aussi le contrat de données consommé par F-34
> (détail des écarts) et F-35 (re-contrôle à chaque modification).
> Direction design : REFONTE-DESIGN.md. Charte : apps/web/src/charte.ts
> (CharteData, buildCharteCss). Vision : VISION.md. Priorisation : PRIORISATION.md.

---

## 1. Contexte et vision

### 1.1 Le problème

L'agent produit un brouillon (HTML source), Atelier le réceptionne et rend les
slides. L'agent a la charte en tête (F-20 get_charte) et le rendu peut
l'injecter (F-29), mais rien ne VÉRIFIE le résultat : un brouillon peut porter
une couleur étrangère, une police hors charte ou un mot interdit sans que
personne ne le voie avant la validation. La promesse produit (VISION.md) est
« ne publie plus jamais quelque chose qui ne te ressemble pas » ; le badge est
la preuve visible de cette promesse. Il ferme la boucle production -> contrôle
-> validation : l'humain voit d'un coup d'oeil si le brouillon est conforme
avant de valider.

### 1.2 La décision (cadrage)

1. **Badge = feature parmi d'autres** (pas LE produit) : c'est la preuve, pas
   la finalité. Pas de sur-ingénierie, pas de moteur d'IA : des règles
   déterministes simples, lisibles et expliquables.
2. **Sprint 4** (PRIORISATION.md) : F-33 badge + F-34 détail des écarts +
   F-35 re-contrôle. Cette spec couvre **F-33** (le moteur de calcul + le
   badge) et **fige le contrat de données** que F-34 et F-35 consommeront.
3. **Périmètre v1 : les 3 axes de la carte** : couleurs, polices, mots à
   éviter. Rayons, logos, ton : hors périmètre v1 (section 2.4).

### 1.3 Hors périmètre (rappels)

- Pas de détection sur les images (photos) : une photo d'appartement contient
  des couleurs hors charte par nature, ce n'est pas un écart.
- Pas de notation subjective : le ton (voix) ne se vérifie pas
  automatiquement, il relève de la révision humaine (et plus tard de F-14
  charte vivante).
- Pas de changement automatique de statut : le badge INFORME, l'humain
  décide. Workflow inaliénable (rien ne part sans validation).
- Pas de badge dans la vue liste au v1 (coût = N calculs au load) : v2.

---

## 2. Les 3 axes vérifiés

### 2.1 Couleurs

Règle : chaque couleur **déclarée dans le CSS de la source** (propriétés
`color`, `background-color`, `background` (stops de dégradés), `border-color`
et `border-*-color`, `fill`, `stroke`) doit être une couleur de la charte, à
la tolérance près (section 4.1).

Exceptions (jamais comptées comme écart) :

- **Neutres** : blanc, noir, gris (chroma C*ab < 12). Toujours acceptés :
  c'est le contraste typographique légitime (texte blanc sur fond bordeaux,
  par exemple).
- **alpha < 0.5** : ignorés (overlays, états hover, voiles décoratifs).
- **Couleurs dans `url(...)`** (images) : ignorées (ce sont des contenus, pas
  des déclarations de marque).
- `box-shadow` / `text-shadow` : extraits mais comptés en **note** (réserve),
  jamais en écart dur (ce sont des effets, pas des surfaces de marque).

### 2.2 Polices

Règle : la **première famille** de chaque déclaration `font-family` (et du
shorthand `font`) doit être une des polices de la charte (`polices.titre` ou
`polices.texte`), après normalisation (minuscules, sans guillemets).

- Les familles génériques (`sans-serif`, `serif`, `monospace`, `system-ui`,
  `cursive`, `fantasy`) ne comptent **jamais** comme « dans la charte », mais
  sont autorisées en fallback de fin de pile (ex. `Jost, sans-serif` est
  conforme si Jost est une police de la charte).
- Une pile uniquement générique (ex. `font-family: sans-serif`) = **réserve**
  (le contenu est rendu avec une police non charte, mais c'est souvent un
  oubli de l'agent, pas une décision de marque).

### 2.3 Mots à éviter

Règle : le **texte visible des slides** (textContent des éléments `.slide` ;
fallback : le body si aucun `.slide`) est scanné contre la liste
`motsEviter` de la charte, après normalisation (minuscules + suppression des
accents, NFD). Frontières de mot (le mot « ultra » ne matche pas
« ultramoderne »). Toute occurrence = **écart dur** (un mot explicitement
interdit est une violation, pas une approximation).

### 2.4 Hors périmètre v1 (évolutions documentées)

- **Rayons** : comparer les `border-radius` déclarés aux rayons de la charte
  est faisable mais génère des faux positifs (un brouillon peut légitimement
  utiliser un rayon custom pour un composant). À réévaluer après usage réel.
- **Logos** : vérifier que les images logo sont bien celles de la charte
  (comparaison d'URL) : fragile avec les uploads locaux et les CDN.
  À réévaluer après usage réel.
- **Ton** : non vérifiable automatiquement (section 1.3).

---

## 3. Source de vérité : le HTML source, pas les pixels (décision)

Question posée dans la carte : « source de vérité : couleurs extraites des
slides ? »

### 3.1 Décision : le HTML source du brouillon (`sourceHtml`)

**Non, on n'extrait pas les couleurs des PNG rendus. Le badge se calcule sur
la source HTML.** Raisons :

1. **Le HTML est LA source de vérité du produit** (Phase 3b du skill atelier :
   les PNG sont des artefacts dérivés, régénérables depuis la source). Vérifier
   l'artefact plutôt que la source reviendrait à contrôler deux fois la même
   chose, en plus fragile (compression, antialiasing, ratio).
2. **Les pixels ne donnent ni polices ni mots** : on ne peut pas extraire
   `font-family` d'un PNG, ni scannériser le texte fiablement (OCR = faux
   positifs et négatifs, coûteux). Deux des trois axes seraient impossibles.
3. **Les pixels mélangent contenu et charte** : une photo de salon contient
   des couleurs hors charte par nature ; le CSS n'en contient que si l'agent a
   dévié. Vérifier le CSS, c'est vérifier ce que l'agent contrôle.
4. **L'écart doit être nommable** : « quelle règle, quel sélecteur, quelle
   valeur attendue ». Seul le CSS déclaré le permet. C'est exactement ce dont
   F-34 (détail des écarts) a besoin.

### 3.2 Ce que ça implique

- Le badge se calcule sur `sourceHtml` (chaîne), **dans le navigateur**, sans
  nouvelle route API : le brouillon contient déjà `sourceHtml` et le web
  fetch déjà la charte (`GET /api/charte`, `parseCharte`).
- **`var()` résolues** : la source peut référencer les tokens de la charte via
  les variables CSS injectées au rendu (`--charte-couleur-<nom>`,
  `--charte-police-titre`, `--charte-police-texte`, et les noms bruts
  `--<nom>`, cf. `buildCharteCss` dans `apps/web/src/charte.ts`). Le moteur
  **résout `var(--x)` contre les tokens de la charte AVANT comparaison** :
  une source qui utilise `var(--charte-couleur-bordeaux)` est conforme par
  construction. Une `var()` qui ne se résout ni dans la charte ni dans le
  `:root` de la source = **note** (réserve), pas écart dur : c'est un symptôme
  de source cassée, pas un écart de marque.
- **Complément v2 (optionnel, NON bloquant)** : échantillonnage des couleurs
  dominantes de la slide rendue (canvas, lecture de pixels) pour attraper les
  couleurs injectées par des images en fond de slide. À n'activer que si le
  bruit est maîtrisé (seuil de couverture surfacique, ex. une couleur qui
  couvre > 30 % d'une slide). Hors v1.

---

## 4. Seuils de tolérance

### 4.1 Couleurs : CIEDE2000 (ΔE)

Comparaison dans l'espace Lab (sRGB -> Lab), métrique **CIEDE2000** (le
standard industriel de différence de couleur ; une distance RGB euclidienne ne
reflète pas la perception humaine, elle donnerait des verdicts faux sur les
verts et les oranges).

| Seuil | ΔE | Verdict |
|---|---|---|
| Conforme | <= 2.0 | identique à l'oeil |
| Toléré (réserve) | 2.0 < ΔE <= 8.0 | proche, écart perceptible à l'inspection |
| Écart (dur) | > 8.0 | visiblement hors charte |

- Une couleur « presque » charte (ex. `#422929` au lieu de `#422928`, ΔE
  ~0.5) est conforme : l'agent a visé juste.
- Une couleur visiblement différente (ex. un brun `#5A3A39` au lieu du
  bordeaux `#422928`, ΔE ~8-10 selon la couleur) est un écart dur.
- Seuils paramétrables dans une constante (`SEUIL_CONFORME`,
  `SEUIL_ECART`) pour ajustement après les premiers usages réels.

### 4.2 Polices : correspondance exacte normalisée

Pas de tolérance : la famille effective doit être **exactement** une police de
la charte (normalisée). Une police non charte = écart dur. (En typographie, il
n'y a pas de « presque » : `Jost` et `Jost SemiBold` sont deux familles
différentes si le nom déclaré diffère.)

### 4.3 Mots : correspondance exacte normalisée

Pas de tolérance : le mot normalisé doit apparaître tel quel, avec frontières
de mot. Pas de stemming ni de fuzzy matching au v1 : une liste de mots à
éviter est courte et écrite par le user, les variantes se listent à la main
(ex. « cle en main » et « clé en main » sont deux entrées si on veut couvrir
l'accent). Toute occurrence = écart dur.

### 4.4 Règle de décision globale

```
hors charte (err)        si >= 1 écart dur
                         (couleur ΔE > 8, police hors charte, mot interdit)
conforme avec réserves   sinon, si >= 1 réserve
                         (couleur tolérée 2 < ΔE <= 8, var() non résolue,
                         pile générique seule)
non vérifié (neutre)     si pas de sourceHtml OU charte sans aucune donnée
                         (ni couleurs, ni polices, ni motsEviter)
conforme (ok)            sinon
```

**Score numérique** (affiché dans le détail F-34, pas dans le badge) :
100 - 20 × écarts durs - 5 × réserves, plancher 0.

---

## 5. Le verdict visuel (badge)

### 5.1 Placement

Header de la vue détail (`dhead`), à côté du contrôle de statut
(`.statut-btn`), visible sans ouvrir le panneau. S'applique aux **Contenus ET
aux Documents** : la charte régit les deux (seules les contraintes réseau
diffèrent, et les documents n'en ont pas).

### 5.2 États (DA noire monochrome : les statuts sémantiques gardent leurs
couleurs, jamais d'accent couleur sur un statut)

| État | Couleur | Label | Tooltip (title) |
|---|---|---|---|
| conforme | status-ok `#2FD06B` | « Conforme » | « 0 écart, 0 réserve » |
| reserve | status-warn `#F5A623` | « Conforme avec réserves » | « N réserves » |
| hors-charte | status-err `#FF5252` | « Hors charte » | « N écarts » |
| non-verifie | ink-tertiary (alpha) | « Non vérifié » | « Déposez la source HTML ou complétez la charte » |

Rendu : **point coloré** (même pattern `.dot--<statut>` que les statuts
existants, la couleur porte le verdict) + label 12px ink-secondary, dans une
pill discrète (fond level-2, hairline) pour tenir dans le header compact.
Anti-pattern : pas de pilule colorée pleine (la DA interdit l'accent couleur
sur un statut ; le point porte la couleur, le fond reste neutre).

Le **clic est réservé à F-34** (panneau détail des écarts). Au v1, seul le
tooltip natif (`title`) résume : « 2 couleurs hors charte, 1 police
inconnue ».

### 5.3 Comportement pendant le calcul

Calcul synchrone < 5 ms sur une source typique (DOMParser + parcours des
règles) : **pas d'état de chargement**. Si la source est en cours de frappe
(textarea de l'onglet Source), recalcul au blur / debounce 400 ms (pattern
debounce existant des notes).

---

## 6. Le moteur : `apps/web/src/conformite.ts`

Module TS : une couche de logique pure (testable, sans DOM) + une couche
d'extraction DOM.

```
conformite.ts
  normaliseCouleur(css: string): string | null   -> hex sRGB canonique via le
     navigateur lui-même (canvas 1x1 : fillStyle = valeur, getImageData ->
     [r,g,b]) : gère hex, rgb, hsl, oklch, lab, noms de couleurs, tout, sans
     dépendance. null si la valeur est invalide (fillStyle rejeté).
  deltaE2000(hexA, hexB): number                  CIEDE2000 pur (aucun DOM)
  estNeutre(hex): boolean                         chroma C*ab < 12 (Lab)
  normalisePolice(css): string                    minuscules, sans guillemets,
     première famille (avant la première virgule)
  normaliseMot(s): string                         minuscules + NFD (sans accents)
  extraireCouleurs(html, charte): EcartCouleur[]  DOMParser + résolution var()
  extrairePolices(html): EcartPolice[]            font-family + font shorthand
  extraireTexte(html): string                     textContent des .slide
  verifierConformite(sourceHtml, charte): VerdictConformite
```

### 6.1 Contrat de données (figé dès maintenant pour F-34 / F-35)

```ts
interface VerdictConformite {
  statut: 'conforme' | 'reserve' | 'hors-charte' | 'non-verifie';
  score: number;                        // 0-100 (section 4.4)
  ecarts: {
    couleurs: Array<{                   // écarts durs uniquement (ΔE > 8)
      valeur: string;                   // couleur déclarée (normalisée)
      procheDe: string;                 // couleur de charte la plus proche
      deltaE: number;
      contexte: string;                 // règle / sélecteur d'origine
    }>;
    polices: Array<{
      police: string;                   // famille effective
      attendu: string;                  // polices de la charte (titre/texte)
      contexte: string;                 // règle / sélecteur d'origine
    }>;
    mots: Array<{
      mot: string;                      // mot interdit trouvé
      slide: number | null;             // numéro de slide (index .slide + 1)
      extrait: string;                  // ±20 caractères autour de l'occurrence
    }>;
  };
  reserves: string[];                   // var() non résolue, pile générique,
                                        // couleurs tolérées, box-shadow, etc.
  calculeLe: string;                    // ISO
}
```

### 6.2 Règles d'extraction

- **Couleurs** : parcourir les `<style>` et les attributs `style` ; pour
  chaque déclaration de propriété colorée (liste section 2.1), résoudre
  `var()` (charte d'abord, puis `:root` de la source), normaliser via
  `normaliseCouleur`, puis classer : conforme / tolérée (réserve) / écart dur
  / neutre (ignoré) / alpha < 0.5 (ignoré). Les stops de dégradés
  (`linear-gradient`, `radial-gradient`, `conic-gradient`) sont extraits et
  vérifiés comme des couleurs.
- **Polices** : déclarations `font-family` + shorthand `font` (extraire la
  famille). Première famille = famille effective. Comparaison normalisée à
  `{ polices.titre, polices.texte }`.
- **Texte** : `textContent` des éléments `.slide` (le HTML source est
  structuré en `.slide`, c'est le contrat du pipeline de rendu et de la
  capture client) ; fallback `body` si aucun `.slide`.
- **Parsing tolérant** : `DOMParser` ne jette jamais (un HTML cassé devient un
  arbre approximatif) ; les règles illisibles sont ignorées avec une note en
  réserve.

---

## 7. Changements API et MCP

- **API : AUCUN changement.** Le moteur tourne côté web sur `sourceHtml` +
  charte déjà chargées. Pas de table, pas de colonne, pas de route nouvelle.
  (La règle des 4 fichiers ne s'applique pas : zéro schéma touché.)
- **MCP : aucun outil nouveau au v1.** Évolution v2 recommandée (hors F-33) :
  outil `verifier_conformite` (14e outil, lecture seule) pour que l'agent
  s'auto-vérifie AVANT de déposer (boucle « l'agent se corrige », qui nourrit
  F-23 feedback de validation). Nécessitera de porter le moteur côté serveur
  (ou de le dupliquer en TS serveur) ; à décider quand F-23 est priorisé.

---

## 8. Contrat avec F-34 et F-35

- **F-34 (détail des écarts)** : consomme `VerdictConformite` tel quel
  (`ecarts` + `reserves` + `score`). Aucune donnée supplémentaire à calculer.
  Le clic sur le badge (réservé) ouvrira le panneau listant les écarts, avec
  la couleur attendue à côté de la couleur déclarée (et le ΔE).
- **F-35 (re-contrôle à chaque modification)** : le moteur est une fonction
  pure sur `(sourceHtml, charte)`, le recalcul est trivial. Déclencheurs :
  - montage de la vue détail (load),
  - dépôt / édition de la source (PUT source, textarea),
  - régénération des slides (la source n'a pas changé, re-vérification par
    hygiène),
  - retour sur la vue après édition de la charte (onglet Charte),
  - polling 8s du chat : recalcul UNIQUEMENT si `sourceHtml` a changé depuis
    le dernier verdict (pas à chaque tick).

---

## 9. Edge cases

| Cas | Comportement |
|---|---|
| Pas de `sourceHtml` | Badge « Non vérifié » |
| Charte vide (ni couleurs, ni polices, ni motsEviter) | Badge « Non vérifié » (rien à comparer) |
| Charte partielle (couleurs seulement) | Axes manquants ignorés (pas d'écart), verdict sur les axes présents |
| `var(--charte-couleur-x)` résolue par la charte | Conforme par construction (résolution avant comparaison) |
| `var()` inconnue | Réserve (note), pas d'écart dur |
| HTML malformé | DOMParser tolérant, règles illisibles ignorées avec note |
| Couleur dans `url(...)` (image) | Ignorée |
| Dégradé | Stops extraits et vérifiés comme couleurs |
| alpha < 0.5 | Ignorée (overlay / hover) |
| Neutres (blanc, noir, gris) | Toujours acceptés (contraste typographique) |
| Mot interdit dans un attribut (alt, aria-label) | Ignoré au v1 (texte visible uniquement) |
| Pile générique seule (`font-family: sans-serif`) | Réserve, pas d'écart dur |
| Document (pitch deck, flyer) | Badge actif aussi (la charte régit les documents) |
| Brouillon type video | La source décrit pochette / cartes ; le badge s'applique à ce qui est déclaré |
| Couleur proche mais pas identique (ΔE <= 8) | Réserve (conforme avec réserves) |
| Charte mise à jour pendant que le détail est ouvert | Recalcul au retour sur la vue (F-35) |

---

## 10. Découpage d'implémentation (ordre recommandé, ~2j solo)

| Étape | Contenu | Effort | Critère d'acceptation |
|---|---|---|---|
| 1 | Logique pure : `normaliseCouleur` (canvas 1x1), `deltaE2000`, `estNeutre`, `normalisePolice`, `normaliseMot` + test `node:test` (pattern `packages/tokens/tokens.test.mjs`) | 0.5j | Tests verts : `#422928` vs `#422929` ≈ 0.5 ΔE (conforme) ; rouge `#FF0000` vs bordeaux > 8 (écart) ; neutres détectés ; oklch normalisé |
| 2 | Extraction DOM (`extraireCouleurs` / `extrairePolices` / `extraireTexte`) + `verifierConformite` branché sur DraftDetail (charte + sourceHtml déjà chargés) | 0.5j | Capture Playwright : brouillon conforme réel -> « Conforme » ; brouillon édité avec une couleur étrangère -> « Hors charte » ; 0 erreur console |
| 3 | Badge UI (4 états, point + label + tooltip) dans le header, DA monochrome | 0.5j | Capture dark + light + vision_analyze : point visible, label lisible, aucune pilule colorée pleine |
| 4 | Re-contrôle F-35 (déclencheurs) + edge cases (source vide, charte vide) + doc du contrat pour F-34 | 0.5j | Édition de la source -> badge à jour sans reload ; source vidée -> « Non vérifié » ; charte vidée -> « Non vérifié » |

Chaque étape = PR + capture Playwright + `vision_analyze` (process en place).
Rappels : zéro em-dash partout, DA monochrome (jamais d'accent couleur sur un
statut), tests + lint verts, `npm run build -w apps/web` avant merge.

---

## 11. Questions ouvertes pour Victor

1. **Neutres exemptés** (blanc, noir, gris toujours acceptés) ? Reco : oui,
   sinon chaque slide avec du texte blanc sur fond charte devient « Hors
   charte » (faux positifs en série).
2. **Seuils ΔE** : 2/8 (stricts, reco) ou 3/10 (souples) ? Les seuils sont une
   constante, ajustables après les premiers usages réels.
3. **Verdict 3 niveaux** (conforme / réserves / hors charte) + non vérifié,
   ou binaire (conforme / hors charte) ? Reco : 3 niveaux, les réserves
   évitent le tout-ou-rien qui décourage l'agent.
4. **Mots à éviter** : correspondance exacte normalisée (reco) ou racine /
   fuzzy ? Reco : exacte au v1, les variantes se listent à la main.
5. **Périmètre des mots** : texte des slides uniquement (reco v1) ou aussi
   les légendes par réseau (champ légende du panneau Réseaux) ? Les légendes
   sont stockées hors source HTML, il faudrait les ajouter au moteur.
6. **Badge dans la vue liste** (un point par ligne) : v1 ou v2 ? Reco : v2
   (coût de N calculs au load, et la liste dense est déjà chargée).
