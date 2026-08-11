# SPEC-CHARTE-EVOLUTIVE.md : la charte s'enrichit des contenus validés (11/08/2026)

> Spec produit pour la boucle « mémoire de marque » : les mots, le ton et les formats
> qui reviennent dans les livrables ACCEPTÉS sont proposés comme ajouts à la charte,
> Victor valide ou rejette chaque proposition. Rien ne s'ajoute à la charte sans lui.
> Vision : VISION.md (point 3 de la vision révisée : « la charte est vivante »).
> Priorisation : PRIORISATION.md (F-14 Charte vivante, RICE 2.9, effort 3j ;
> F-23 Feedback de validation à l'agent, même moteur, à venir).
> Carte kanban « Charte evolutive : feedback des contenus valides (F-01/02) » :
> elle correspond à F-14 (charte vivante) de PRIORISATION.md ; F-23 (feedback à
> l'agent) partage le moteur d'analyse mais reste hors périmètre v1 (section 1.3).
> Direction design : REFONTE-DESIGN.md. Portes d'entrée liées : SPEC-CREATION.md.

---

## 1. Contexte et vision

### 1.1 Le problème

La charte graphique d'Atelier (couleurs, polices, ton, mots à éviter) est un état figé :
elle se remplit à l'import CSS, puis ne bouge plus. Or la marque, elle, bouge. Chaque
contenu validé par Victor est un signal : un mot qui revient dans les accroches, un ton
qui se précise (tutoiement, questions, phrases courtes), un format qui fonctionne
(carrousel témoignage en 5 slides). Aujourd'hui ces signaux sont perdus : ils vivent
dans les brouillons acceptés, invisibles pour l'agent qui produira le contenu suivant.

Résultat : la boucle ne se ferme jamais. L'agent ré-apprend la marque à chaque
production, Victor ré-explique, et la charte reste pauvre alors que les livrables
validés sont la meilleure source d'identité disponible.

### 1.2 La décision (la boucle, humain au centre)

La charte s'enrichit des contenus validés selon un mécanisme de **proposition +
validation Victor**, jamais d'auto-ajout :

1. **Détecter** : quand un brouillon passe au statut `valide` ou `publie`, un analyseur
   extrait du contenu accepté des signaux récurrents (mots, ton, formats).
2. **Proposer** : chaque signal qui revient dans plusieurs contenus validés devient une
   **proposition** (`proposee`), visible dans la page Charte graphique avec sa raison
   (« apparait dans 3 contenus validés ») et sa source.
3. **Valider** : Victor accepte ou rejette. Accepter = fusion dans la charte
   (motsSignature, règle de ton, format récurrent). Rejeter = la proposition est
   enterrée, elle ne ressort pas.
4. **Boucler** : la charte enrichie est injectée par `get_charte` à la production
   suivante. L'agent produit conforme du premier coup, et le contenu validé suivant
   enrichit encore la charte. C'est la boucle mémoire de marque (VISION.md).

**Principe fondateur : l'humain au centre.** La charte est l'identité de la marque,
elle ne se modifie jamais automatiquement. L'analyseur propose, Victor dispose. C'est
aussi le principe de VISION.md D5 (« l'humain au centre de la validation ») appliqué
à la charte elle-même.

### 1.3 Hors périmètre (v1)

- **F-23 (feedback à l'agent)** : envoyer à l'agent un message de feedback quand un
  contenu est rejeté ou modifié. Même moteur d'analyse, mais c'est un chantier séparé
  (PRIORISATION : « nourrit la charte vivante, arrive après »). La présente spec ne
  couvre que le sens contenu validé → charte.
- **Détection de couleurs/polices récurrentes** dans les slides (VISION.md mentionne
  « détection de couleurs/polices récurrentes »). Les slides sont des PNG (pas de
  texte exploitable) et l'extraction visuelle est un chantier lourd ; le v1 se limite
  aux signaux TEXTUELS (mots, ton) et STRUCTURELS (formats), où le source HTML donne
  une matière fiable.
- **Templates automatiques** (F-30, backlog) : un format récurrent proposé à la charte
  ne crée PAS un template exploitable. C'est une évolution future (le format validé
  devient une référence de structure, pas un preset).
- **Versionnage de la charte** (F-15) : chaque fusion pourrait créer une version.
  Hors v1, la charte garde son `updated_at` et l'historique des fusions est porté par
  la table `propositions` (les acceptées y restent).

---

## 2. Le mécanisme en 4 étapes

### 2.1 La boucle complète

```
contenu validé ──► analyseur ──► propositions (proposee)
                                      │
                      Victor accepte ─┴──► fusion dans la charte
                      Victor rejette ────► enterrée (ne ressort pas)
                                              │
        production suivante ◄── get_charte injecte la charte enrichie
```

### 2.2 Déclencheur : le passage au statut valide/publie

L'analyse se déclenche au moment où un brouillon **transite** vers `valide` ou
`publie` (dans `POST /api/brouillon/:id`, quand `nextStatut ∈ {valide, publie}` et
`row.statut ∉ {valide, publie}`, c'est-à-dire uniquement à la transition, pas à chaque
mise à jour). Le contenu analysé :

1. **`source_html`** (le document source, la vérité) : texte extrait en retirant les
   balises.
2. Sinon (ou en complément) : les **légendes** par réseau et les **notes** du brouillon.
3. Le **titre** du brouillon.

Si le brouillon n'a aucun texte exploitable (ex. vidéo sans légende), l'analyse saute
sans erreur.

**Idempotence** : si le brouillon repasse en `brouillon` puis re-devient `valide`,
l'analyse re-tourne mais les propositions sont dédupliquées (section 4.1) : on
incrémente les occurrences au lieu de dupliquer.

### 2.3 L'analyseur : extraction de signaux

L'analyseur (`apps/api/src/charte-evolutive.ts`, à créer) produit une liste de
signaux bruts à partir du texte d'UN contenu validé :

- **mots** : tokens de 4 caractères ou plus, hors stopwords français et hors mots
  déjà présents dans la charte (motsEviter ET motsSignature), avec leur fréquence.
- **ton** : tests stylistiques booléens (section 3.2).
- **formats** : structure détectée (section 3.3).

L'analyseur ne décide PAS : il remonte des signaux à la couche agrégation, qui
compare à l'historique des contenus déjà validés (table `propositions`) et ne crée ou
ne renforce une proposition que si le signal est récurrent (section 3.4).

---

## 3. Les trois familles de signaux

### 3.1 Mots (vocabulaire signature)

Un **mot signature** est un mot qui revient dans les contenus validés sans être dans
la charte. Exemples vécus Bordeluche : « maison », « hôte », « épicurien » dans les
accroches. C'est la matière positive de la marque (la charte n'a aujourd'hui que
`motsEviter`, le négatif ; on ajoute `motsSignature`, le positif).

Règles d'extraction :

| Règle | Valeur | Pourquoi |
|-------|--------|----------|
| Longueur minimale | 4 caractères | évite « la », « un », « et » même hors stopwords |
| Stopwords français | liste intégrée (~200 mots) | « avec », « pour », « votre » ne sont pas des signatures |
| Exclusion charte | mots déjà dans `motsEviter` OU `motsSignature` | pas de doublon, pas de contradiction |
| Mots propres à un contenu | exclus si présents dans un seul contenu | la récurrence est le signal |
| Noms d'outils/plateformes | exclus (« instagram », « atelier ») | bruit de contexte, pas de marque |

### 3.2 Ton (règles de voix)

Chaque contenu validé est soumis à des tests stylistiques déterministes (pas d'IA
dans le v1, des heuristiques reproductibles) :

| Signal | Test | Exemple de proposition si récurrent |
|--------|------|-------------------------------------|
| Tutoiement | présence de « tu », « toi », « ton », « tes », verbes 2e pers. | « tutoiement systématique » |
| Questions | présence de « ? » dans les accroches/légendes | « accroches en question rhétorique » |
| Phrases courtes | longueur moyenne de phrase < 12 mots | « phrases courtes (moyenne < 12 mots) » |
| Impératif | verbes à l'impératif (« Réservez », « Découvrez ») | « appels à l'action à l'impératif » |
| Emoji | présence d'emoji dans les légendes | « emoji dans les légendes (modéré) » |
| Phrases nominales | phrases sans verbe conjugué | « titres en phrase nominale » |

Une règle de ton proposée = une ligne ajoutée au bloc ton de la charte, injectée par
`get_charte` à côté de `ton.voix`.

### 3.3 Formats (structures qui fonctionnent)

Signaux structurels extraits du brouillon (type + organisation) :

| Signal | Test |
|--------|------|
| Type récurrent | `type` du brouillon (carrousel, post, story, video, pitch-deck...) |
| Nombre de slides | `slideCount` (ex. carrousel systématiquement en 5 slides) |
| Accroche slide 1 | texte du premier slide contient un hook (titre court, pas de CTA) |
| CTA en dernière slide | dernier slide contient « en savoir plus », « réserver », « découvrir », « lien en bio » |
| Structure témoignage | slides avec citation (guillemets) + nom |

Exemple de proposition : « carrousel témoignage : accroche, 1 témoignage par slide,
CTA final (3 contenus validés) ».

### 3.4 Seuils anti-bruit (la règle de récurrence)

Une proposition n'apparaît **jamais** pour un seul contenu. Seuil minimal :

- **Mots** : présent dans **2 contenus validés distincts** (et pas seulement
  fréquent dans un seul).
- **Ton** : signal positif dans **2 contenus validés** sur les 3 derniers analysés.
- **Formats** : même structure dans **2 contenus validés** de même `type`.

Implémentation : les signaux sont agrégés via la table `propositions` (les
occurrences comptent les contenus distincts, pas les tokens). Une proposition
`proposee` n'est créée qu'au franchissement du seuil ; en dessous, les occurrences
sont accumulées en statut `candidate` (invisible dans l'UI, voir 4.1).

---

## 4. Modèle de données

### 4.1 Table `propositions` (nouvelle)

Table nouvelle : les 4 fichiers ENSEMBLE (`schema.ts`, `schema-pg.ts`, `legacy.ts`,
`migrate-pg.ts` + types repo `repo.ts` + méthodes `listPropositions` /
`getProposition` / `upsertProposition` / `setPropositionStatut` dans
`repo-sqlite.ts` et `repo-pg.ts`) :

```ts
propositions = sqliteTable('propositions', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),          // 'mot' | 'ton' | 'format'
  valeur: text('valeur').notNull(),      // le mot, la règle de ton, le format
  raison: text('raison').notNull().default(''),  // « apparait dans 2 contenus validés »
  statut: text('statut').notNull().default('candidate'),
  // candidate (sous le seuil, invisible) | proposee | acceptee | rejetee
  occurrences: integer('occurrences').notNull().default(1),  // nb de contenus validés distincts
  sourceId: text('source_id'),           // id du brouillon qui a déclenché la dernière occurrence
  sourceTitre: text('source_titre'),     // titre de ce brouillon (affiché dans l'UI)
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  decidedAt: text('decided_at')          // date d'acceptation/rejet par Victor
});
```

- **Déduplication** : clé naturelle `(type, valeur)` pour le statut `proposee` (et
  `candidate`). À chaque analyse : si une ligne `(type, valeur)` existe en
  `candidate`/`proposee`, on incrémente `occurrences` et on met à jour `sourceId` ;
  sinon on crée une ligne `candidate`. Une ligne passe `candidate → proposee` quand
  `occurrences ≥ 2`.
- **Enterrement** : `rejetee` est terminal. Une valeur rejetée n'est JAMAIS re-proposée,
  même si elle réapparaît (l'analyseur l'exclut via un filtre sur le statut rejetee).
- **Conservation** : les acceptées restent en base (elles portent l'historique des
  fusions, ex. `decidedAt`), le versionnage charte (F-15) pourra les lire.

### 4.2 Extension de la charte (3 champs nouveaux)

La charte actuelle : `{ couleurs, polices, rayons, logos, ton: { voix }, motsEviter }`.
On ajoute 3 champs, chacun alimenté par un type de proposition acceptée :

| Champ | Type | Alimenté par | Injecté par get_charte |
|-------|------|--------------|------------------------|
| `motsSignature` | `string[]` | proposition `mot` acceptée | « Mots signature : maison, hôte » |
| `ton.regles` | `string[]` | proposition `ton` acceptée | sous « ## Ton », après `voix` |
| `formats` | `string[]` | proposition `format` acceptée | « ## Formats qui fonctionnent » |

`BrandPage.tsx` : `CharteData` + `parseCharte` + `DEFAULT_CHARTE` étendus ENSEMBLE
(règle Phase 6b, sinon les champs retombent à vide au reload) + section d'affichage
des mots signature / règles de ton / formats (lecture seule au v1, éditables
manuellement plus tard).

### 4.3 Règle des 4 fichiers + pièges connus

- Table nouvelle → `CREATE TABLE IF NOT EXISTS` dans `legacy.ts` ET `migrate-pg.ts`,
  schéma dans `schema.ts` ET `schema-pg.ts` (règle Phase 4, toujours les 4 ensemble).
- Colonnes sur `chartes` (data JSON) : AUCUNE migration, les 3 champs vivent dans le
  JSON existant (comme `ton` et `motsEviter`). Seule `parseCharte` côté web et le
  `get_charte` MCP changent.
- Piège TypeScript `noUncheckedIndexedAccess` : tout accès tableau (ex. stopwords)
  exige `?? ''` / gardes (règle déjà en place).

---

## 5. Changements API

### 5.1 Déclenchement de l'analyse (dans le POST statut existant)

Dans `POST /api/brouillon/:id` (app.ts), quand `nextStatut ∈ {valide, publie}` et
`row.statut ∉ {valide, publie}` : appeler `analyserContenuValide(row)` après
l'update. L'analyse est synchrone mais légère (un brouillon à la fois, pas de
scan global) : extraction du texte, tests stylistiques, upserts de propositions.
Erreur d'analyse = log + on continue, jamais d'échec du changement de statut.

### 5.2 GET /api/propositions

```
GET /api/propositions?statut=proposee   (défaut : proposee + candidate? non, proposee par défaut)
→ { propositions: [{ id, type, valeur, raison, statut, occurrences, sourceId, sourceTitre, decidedAt }] }
```

Filtre optionnel `statut` (proposee | acceptee | rejetee). La liste `proposee` est
triée par `updatedAt` desc (les plus fraîches d'abord).

### 5.3 POST /api/propositions/:id/decision

```
POST /api/propositions/:id/decision
{ decision: 'acceptee' | 'rejetee' }

acceptee → 1. lit la proposition (404 si absente, 409 si déjà décidée)
           2. fusion dans la charte selon le type (4.2)
           3. statut acceptee + decidedAt (saveCharte + setPropositionStatut)
rejetee  → statut rejetee + decidedAt, aucune fusion
→ 200 { id, statut, charte?: { motsSignature, ton, formats } }  (charte = état après fusion)
```

La fusion côté serveur : `fusionProposition(charte, proposition)` dans
`charte-evolutive.ts` (push dans le bon tableau, déduplique les doublons, préserve
les autres champs). Le GET /api/charte renvoie ensuite la charte enrichie (aucun
changement de contrat, le champ `data` contient les 3 nouveaux).

### 5.4 Aucun nouvel endpoint de gestion

Pas de DELETE de proposition (l'enterrement = rejetee, suffisant au v1). Pas de
modification manuelle d'une proposition (création uniquement par l'analyseur, par
design : c'est la boucle qui propose, pas l'humain qui se dicte à lui-même).

---

## 6. MCP : aucun outil nouveau, get_charte enrichi

**Pas d'outil MCP nouveau au v1.** La boucle est portée par l'humain (Victor valide
dans l'UI), l'agent n'a pas à lister ou voter les propositions.

Le seul changement : `get_charte` (Phase 6b) doit rendre les 3 nouveaux champs quand
ils existent, pour que la production suivante les respecte :

```
# Charte graphique : <nom>
## Couleurs (tokens)      → inchangé
## Typographie            → inchangé
## Ton                    → voix + « Règles apprises : phrases courtes, tutoiement »
## Mots à éviter          → inchangé
## Mots signature         → maison, hôte          (nouveau, si non vide)
## Formats qui fonctionnent → carrousel témoignage : accroche, 1 témoignage/slide, CTA
                                                    (nouveau, si non vide)
+ Directives finales inchangées
```

Implémentation : `getCharte()` côté client MCP lit déjà `data` (charte JSON) ;
ajouter `motsSignature`, `ton.regles`, `formats` à la construction du bloc
instructions (grep `data.motsEviter` dans `packages/mcp/src/index.ts`). Rebuild +
`hermes mcp restart atelier` (règle Phase 6b, vérif `grep -c motsSignature dist/index.js`).

---

## 7. UI : la page Charte graphique devient le lieu de validation

### 7.1 Section « Suggestions » (BrandPage)

Nouvelle section en haut de la page Charte graphique (au-dessus de l'import CSS),
visible seulement s'il y a des propositions `proposee` :

- Titre : « Suggestions de la charte vivante » + compteur (ex. « 3 en attente »).
- Une ligne par proposition : badge de type (Mot / Ton / Format, tokens existants
  status-neutral), la `valeur` en texte, la `raison` en ink-tertiary (« Apparait dans
  2 contenus validés · carrousel-bordeluche-v7 »), deux boutons :
  - « Accepter » (classe `primary`, petit) → POST decision acceptee → la ligne
    disparaît, la charte en dessous se met à jour (reload charte).
  - « Rejeter » (classe `ghost`) → POST decision rejetee → la ligne disparaît.
- État vide (si aucune proposition) : rien à afficher, la section ne s'affiche pas.
  Un sous-texte discret dans la charte peut mentionner le principe : « La charte
  s'enrichit des contenus que vous validez : mots, ton et formats récurrents vous
  seront proposés ici. »
- Anti-double-clic : les deux boutons se désactivent pendant la requête (pattern
  existant). Erreur réseau : message inline, la ligne reste.

### 7.2 Badge discret dans la sidebar

Sur l'entrée « Charte graphique » (sidebar, groupe Marque) : point ou compteur
« N » (ink-tertiary, pattern badge « à valider » du Dashboard) quand il y a des
propositions en attente. Petit et discret, DA monochrome (jamais de couleur d'accent
sur un statut, tokens status-warn si on veut de l'attention mais à usage parcimonieux).

### 7.3 Détails DA (REFONTE-DESIGN.md)

- Section sur fond `bg-level-2`, cartes `bg-level-3` + hairline, radius 12px.
- Boutons compacts (petit padding), le primaire reste le blanc plein (dark) / noir
  (light) monochrome.
- Zéro em-dash partout, y compris dans les textes de raison générés par l'analyseur.

---

## 8. Edge cases

| Cas | Comportement |
|-----|--------------|
| Contenu sans texte (vidéo sans légende) | Analyse saute sans erreur, aucune proposition |
| Mot déjà dans motsEviter | Exclu par l'analyseur (pas de contradiction charte) |
| Mot déjà proposé (même valeur) | Déduplication : occurrences incrémentées, pas de doublon |
| Proposition rejetée puis le mot réapparait | Enterrée définitivement : jamais re-proposée (filtre statut rejetee) |
| Passage valide → brouillon → valide | Analyse re-tourne, dédup protège des doublons |
| Plusieurs validations en rafale | Upsert séquentiel, occurrences cumulées |
| Charte inexistante | Fusion impossible (pas de charte) : la proposition reste proposee, un avertissement log. Le GET /api/charte retournant une charte par défaut, la fusion se fait sur celle-ci |
| 409 sur décision déjà prise | Proposition déjà acceptee/rejetee : renvoyer l'état actuel, pas d'erreur bloquante (idempotence UI) |
| Analyse lente | Synchrone mais un seul brouillon ; si > 500 ms, passer en tâche différée (setTimeout) sans bloquer le POST |
| Textes énormes (source HTML 1 Mo) | Extraction limitée aux 50 000 premiers caractères de texte (règle déjà utilisée pour l'archivage web) |

---

## 9. Découpage d'implémentation (ordre recommandé, ~3j solo)

| Étape | Contenu | Effort | Critère d'acceptation |
|-------|---------|--------|----------------------|
| 1 | Table `propositions` (4 fichiers + types repo + méthodes repo sqlite/pg) + GET /api/propositions + POST /:id/decision (sans fusion) | 0.75j | Tests API : création/upsert/liste/décision ; 11 tests existants verts ; build api ok |
| 2 | Analyseur `charte-evolutive.ts` (mots + ton + formats, stopwords, seuils) + déclenchement dans POST statut + fusion dans la charte | 1.25j | Test réel : valider 2 contenus avec le même mot → proposition proposee ; accepter → GET /api/charte contient motsSignature ; rejeter → enterrée, GET ne la re-propose pas |
| 3 | UI : section Suggestions (BrandPage) + badge sidebar + champs charte (motsSignature/regles/formats) dans parseCharte + DEFAULT_CHARTE | 1j | Capture Playwright dark + light : propositions rendues, accepter met à jour la charte sans reload manuel, 0 erreur console ; get_charte MCP renvoie les 3 champs (test stdio) |

Chaque étape = PR + capture + `vision_analyze` (process en place). Rappels : zéro
em-dash (y compris dans les textes générés par l'analyseur), DA monochrome, tests +
lint verts, `npm run build -w apps/api` et `-w apps/web` avant merge, `hermes mcp
restart atelier` après rebuild du MCP.

---

## 10. Questions ouvertes pour Victor

1. **Seuils** : 2 contenus validés suffisent-ils pour proposer un mot/ton/format, ou
   faut-il 3 ? (Reco : 2 pour démarrer vite, ajustable par constante sans migration.)
2. **Mots signature** : OK pour un champ positif `motsSignature` (le vocabulaire à
   PRIVILÉGIER) en miroir de `motsEviter` ? C'est un nouveau concept de charte, pas
   seulement une extension.
3. **Formats → templates** : un format accepté doit-il à terme alimenter les
   templates de SPEC-CREATION (bouton « créer un template depuis ce format ») ? (Reco :
   oui, en v2 ; au v1 le format reste une référence texte injectée à l'agent.)
4. **Enterrement définitif** : un mot rejeté ne doit jamais ressortir, même s'il
   devient très fréquent ? (Reco : oui au v1, simple ; on pourra ajouter une
   « réouverture » manuelle plus tard.)
5. **Placement UI** : la section Suggestions vit dans la page Charte graphique (reco)
   ou mérite-t-elle sa propre page ?
