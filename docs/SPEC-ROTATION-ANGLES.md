# SPEC-ROTATION-ANGLES.md : rotation d'angles + cooldown + voice-drift check (11/08/2026)

> Spec des 3 idées issues de l'analyse de Rerun (rerun.build, plateforme d'agents
> autonomes) appliquées à Atelier : 1) rotation des angles sur piliers de contenu
> avec cooldown (ne pas répéter les thèmes récents), qui enrichit le template
> « Idée vague » de SPEC-CREATION.md ; 2) voice-drift check (le nouveau copy doit
> coller à la voix déjà publiée), complément du badge conformité F-33
> (SPEC-CONFORMITE.md) ; 3) publish-before-write, déjà en place, documenté ici
> comme règle inaliénable.
> Vision : VISION.md (« la charte est vivante », « mémoire de marque + complément
> d'agent »). Priorisation : PRIORISATION.md (pilier Conformité, Sprint 4).
> Charte évolutive : SPEC-CHARTE-EVOLUTIVE.md (même famille : la marque
> s'enrichit de ce qui est validé). Direction design : REFONTE-DESIGN.md.
> Règle de publication : STRATEGIE-PUBLICATION.md (garde-fou inaliénable).

---

## 1. Contexte et vision

### 1.1 Les trois problèmes

1. **La répétition des thèmes.** Quand on produit plusieurs contenus par semaine
   (Bordeluche : carrousels, posts, stories), l'agent finit par re-proposer les
   mêmes angles : « témoignages clients » tous les lundis, « annonce du nouveau
   logement » à chaque occasion. Le template « Idée vague » demande 2-3
   directions, mais l'agent n'a AUCUNE mémoire des thèmes déjà traités : il
   propose au hasard, et la répétition tue l'engagement (le public voit le même
   post deux fois).
2. **La dérive de voix.** Le badge conformité F-33 vérifie couleurs, polices et
   mots à éviter contre la CHARTE (l'identité déclarée). Mais la voix d'une
   marque se prouve par ce qu'elle a DÉJÀ publié : tutoiement systématique,
   phrases courtes, questions rhétoriques, vocabulaire signature. Un brouillon
   peut être 100 % conforme à la charte (bonnes couleurs, bons tokens) et sonner
   faux : trop long, trop formel, rempli d'emojis, ou avec des mots que la
   marque n'utilise jamais. Le badge ne voit pas ça.
3. **La règle de publication n'est pas écrite comme règle.** Le workflow
   « brouillon → validation → publication » est respecté dans le code (Postiz
   draft jamais schedulé) et mentionné dans STRATEGIE-PUBLICATION.md, mais il
   n'est pas formalisé comme règle inaliénable du produit, ni injecté à l'agent
   au moment de produire. Un futur développeur ou un agent pourrait « optimiser »
   en schedulant directement.

### 1.2 La décision (les 3 idées Rerun, adaptées à Atelier)

1. **Rotation des angles avec cooldown** : chaque contenu validé est rattaché à
   un **pilier éditorial** (grande famille de contenu : « témoignages »,
   « coulisses », « vie locale », « annonces »). À la production suivante,
   l'agent reçoit la liste des piliers traités récemment (fenêtre glissante) et
   doit PROPOSER des angles neufs : un pilier utilisé dans les N derniers jours
   est en cooldown. Le template « Idée vague » est enrichi : l'agent consulte la
   rotation AVANT de proposer ses 2-3 directions.
2. **Voice-drift check** : le moteur de conformité gagne un axe « voix » : le
   profil stylistique du nouveau brouillon (tutoiement, longueur de phrase,
   questions, emoji, vocabulaire) est comparé au profil des contenus DÉJÀ
   PUBLIÉS. Un écart marqué = « voix en dérive », affiché comme complément du
   badge conformité (réserve, jamais écart dur : la voix reste un jugement
   humain).
3. **Publish-before-write, règle inaliénable** : documentée section 4, renforcée
   dans le contrat agent (get_charte) et les templates. La publication est un
   acte humain, toujours. Rien ne part sans validation.

**Principe fondateur (identique à SPEC-CHARTE-EVOLUTIVE) : l'humain au centre.**
La rotation INFORME et ORIENTE les propositions de l'agent, elle ne bloque
jamais une création (le user peut forcer un pilier en cooldown s'il le veut).
Le voice-drift SIGNALE, l'humain décide. La publication est un acte humain.

### 1.3 Hors périmètre (v1)

- **Historique des angles proposés mais non retenus** (pour statistiques
  « quelle direction a été choisie ») : hors v1. La rotation se lit sur les
  contenus VALIDÉS/PUBLIÉS, pas sur les propositions avortées.
- **Scheduling automatique** : interdit, par définition (section 4).
- **Analyse d'engagement par pilier** (quel pilier performe le mieux) : le
  cooldown ne dépend pas des métriques au v1, seulement de la fraîcheur.
  Évolution v2 : pondérer le cooldown par l'engagement réel.
- **Détection automatique du pilier d'un brouillon** (deviner le pilier à
  partir du texte) : le pilier est déclaré par le user à la création (ou par
  l'agent via MCP), jamais inféré. L'inférence est fragile et brise la
  confiance (SPEC-CHARTE-EVOLUTIVE 1.3 : même logique que les signaux).
- **Multi-marques** : la charte est unique (« principale »), les piliers vivent
  dans cette charte. Même limite que F-14.

---

## 2. La rotation d'angles : piliers + cooldown

### 2.1 Vocabulaire (figé)

| Terme | Définition | Exemple Bordeluche |
|-------|-----------|--------------------|
| **Pilier** | Grande famille de contenu, déclarée dans la charte par Victor | « témoignages », « coulisses conciergerie », « vie locale », « annonces », « conseils voyageurs » |
| **Angle** | Direction particulière dans un pilier (libre) | pilier « témoignages » → angle « le couple qui a prolongé 3 nuits » |
| **Cooldown** | Fenêtre glissante pendant laquelle un pilier est « traité récemment » et doit être évité | pilier « témoignages » utilisé il y a 6 jours → en cooldown (fenêtre 14 j) |

Le **pilier** est l'unité du cooldown (stable, déclarée). L'**angle** est une
étiquette libre qui précise le contenu (utile à l'agent pour varier dans un
pilier autorisé). L'angle n'entre PAS dans le cooldown au v1 (trop fin, bruit) ;
c'est un champ documentaire.

### 2.2 Où stocker (la question de la carte)

La carte demande : « où stocker les piliers/cooldown (charte ? nouvelle
table ?) ». Réponse : **deux endroits différents, par nature.**

| Donnée | Nature | Stockage | Pourquoi |
|--------|--------|----------|----------|
| **Piliers** (la liste) | Identité de marque, déclarée par Victor | **Dans la charte** : nouveau champ `piliers: string[]` dans le JSON `data` de la table `chartes` | C'est de l'identité, comme `motsEviter` et `ton`. La charte EST la mémoire de marque (VISION.md). Pas de table nouvelle : le champ vit dans le JSON existant (aucune migration, pattern F-14 4.3). Éditable dans BrandPage. |
| **Cooldown** (l'état) | État runtime, dérivé des contenus | **Aucune table nouvelle** : dérivé des brouillons via 2 champs ajoutés sur `brouillons` (`pilier`, `angle`) + `statut` + `updatedAt` | La rotation se calcule par une requête sur les brouillons `valide`/`publie` récents avec un `pilier` non nul. C'est le principe du réceptacle : le produit détient déjà tout, on ne duplique pas l'état. Une table `angles` ne se justifierait que pour l'historique des propositions avortées (hors v1, 1.3). |

**Pourquoi pas tout dans la charte ?** Le cooldown change à chaque contenu
validé ; la charte est validée par Victor et ne doit pas muter toute seule
(principe « l'humain au centre », SPEC-CHARTE-EVOLUTIVE 1.2). L'état runtime
dérivé des brouillons est auto-cohérent : si on supprime un brouillon, la
rotation s'ajuste seule.

**Pourquoi pas une table dédiée ?** Une table `rotations` (pilier, date,
brouillon_id) serait une copie de ce que contiennent déjà les brouillons
(statut + updatedAt + pilier). Chaque écriture devrait être synchronisée ;
une requête dérivée ne peut PAS se désynchroniser. Coût identique (index sur
statut+updatedAt). YAGNI : on ajoutera une table le jour où on trackera les
propositions avortées.

### 2.3 Le cycle de vie d'un pilier

```
1. Victor déclare les piliers dans la page Charte (champ « Piliers éditoriaux »)
   → charte.piliers = ['temoignages', 'coulisses', 'vie-locale', 'annonces']

2. À la création d'un brouillon (modale « Nouvelle création »), Victor choisit
   un pilier dans la liste (select optionnel ; l'agent peut aussi le poser via
   MCP, section 6).
   → brouillon.pilier = 'temoignages'   (+ brouillon.angle = texte libre optionnel)

3. Le brouillon est validé (statut valide) puis publié (statut publie).
   Rien à faire : le pilier est déjà sur le brouillon.

4. À la production suivante, l'agent consulte get_rotation (section 6) :
   → « Piliers traités dans les 14 derniers jours : temoignages (2 contenus,
      dernier le 05/08), annonces (1, le 02/08). En cooldown. Disponibles :
      coulisses, vie-locale. »

5. Le template « Idée vague » et le squelette de prompt intègrent cette
   contrainte (section 5) : l'agent propose des directions sur les piliers
   DISPONIBLES, ou un angle neuf dans un pilier dont le cooldown est écoulé.
```

**Fenêtre de cooldown** : constante serveur `COOLDOWN_JOURS` (défaut **14**),
paramétrable sans migration. Un pilier est en cooldown si au moins un brouillon
`valide` ou `publie` avec ce pilier a un `updatedAt` dans la fenêtre. Le
`valide` compte comme le `publie` : un contenu validé mais pas encore publié
occupe déjà le pilier (c'est un thème « en cours », à ne pas re-proposer).

### 2.4 Seuils et règles anti-bruit

- Un brouillon **sans pilier** (créé avant la feature, ou pilier non renseigné)
  n'entre pas dans la rotation. Le cooldown ne s'applique qu'aux piliers
  déclarés et utilisés.
- Un pilier déclaré dans la charte mais **jamais utilisé** est toujours
  disponible.
- La rotation **n'empêche rien** : elle informe. Si Victor veut re-traiter
  « témoignages » malgré le cooldown, il crée le brouillon, point. L'agent ne
  refuse jamais une demande explicite (le message user prime, la contrainte est
  une directive, pas une barrière).

---

## 3. Voice-drift check (complément du badge F-33)

### 3.1 Le principe

F-33 (SPEC-CONFORMITE.md) vérifie le brouillon contre la CHARTE (déclarée).
Le voice-drift vérifie le brouillon contre le CORPUS PUBLIÉ (prouvé). Deux
référentiels complémentaires :

| | F-33 (existant) | Voice-drift (nouveau) |
|---|---|---|
| Référentiel | charte (couleurs, polices, motsEviter) | brouillons `publie` (texte : source_html + légendes) |
| Nature | règles déterministes, écarts durs | profil stylistique, écarts relatifs (réserve) |
| Verdict | conforme / réserves / hors charte | cohérente / en dérive / non vérifiée |
| Décision | badge informe, humain décide | badge informe, humain décide |

Le voice-drift réutilise **exactement les heuristiques de l'analyseur de
SPEC-CHARTE-EVOLUTIVE** (section 3.2 : tutoiement, questions, phrases courtes,
impératif, emoji, nominales) : un seul module de profil stylistique, deux
usages (apprendre la charte depuis les validés, vérifier la voix des nouveaux).

### 3.2 Le corpus voix

Source : les brouillons au statut **`publie`** (la voix PUBLIÉE, pas les
validés en attente : c'est ce que le public a réellement vu).

Nouvel endpoint **`GET /api/corpus-voix`** (léger, côté serveur) :

```
GET /api/corpus-voix?limit=20
→ { corpus: [{
    id, titre, statut: 'publie',
    publieLe: string (ISO),              // updatedAt du passage publie
    texte: string                        // texte extrait : source_html sans
                                         // balises + légendes par réseau +
                                         // notes, tronqué (50 000 car. max
                                         // par brouillon, règle existante)
  }] }
```

- Les 20 derniers publiés par défaut (constante `CORPUS_LIMITE`). La voix
  récente prime : un style abandonné il y a 6 mois ne doit pas « tirer » le
  profil.
- Un brouillon `publie` sans texte exploitable (vidéo sans légende) est exclu.
- **Pas de sourceHtml dans la liste** : le texte est extrait ET tronqué côté
  serveur (les brouillons peuvent faire 1 Mo ; la liste /api/brouillons reste
  légère).

### 3.3 Le moteur : `apps/web/src/voix.ts`

Module TS pur (testable, sans DOM), même architecture que `conformite.ts` :

```
voix.ts
  profilStylistique(texte: string): ProfilVoix
     tutoiement: boolean          // « tu », « toi », « ton », verbes 2e pers.
     questions: boolean           // présence de « ? » dans le texte
     phraseCourte: boolean        // longueur moyenne de phrase < 12 mots
     imperatif: boolean           // « Réservez », « Découvrez », ...
     emoji: boolean               // présence d'emojis
     nominal: boolean             // phrases sans verbe conjugué
     motsParPhrase: number        // moyenne (pour l'écart relatif)
     emojisPar1000: number        // densité (pour l'écart relatif)
     vocabulaire: string[]        // tokens >= 4 car. hors stopwords (comparé
                                  // à motsSignature de la charte, F-14)
  verifierVoix(texteBrouillon: string, corpus: CorpusVoix[],
               charte: CharteData): VerdictVoix
```

### 3.4 Le verdict

```
interface VerdictVoix {
  statut: 'coherente' | 'derive' | 'non-verifiee';
  tests: Array<{
    test: string;                 // 'tutoiement' | 'questions' | 'emoji' | ...
    attendu: string;              // profil du corpus (« tutoiement systématique »)
    observe: string;              // profil du brouillon (« vouvoiement »)
  }>;
  calculeLe: string;              // ISO
}
```

Règle de décision :

```
non-verifiee   si pas de texte brouillon exploitable OU corpus vide
               (< 3 publiés avec texte : pas de profil fiable)
derive         si >= 2 tests booléens divergent (le corpus tutoie, le
               brouillon vouvoie ; le corpus pose des questions, le brouillon
               non) OU un écart relatif marqué (motsParPhrase ou emojisPar1000
               > 1.5× la moyenne du corpus) OU vocabulaire hors charte :
               un mot fréquent du brouillon absent du corpus ET de
               motsSignature, présent dans >= 2 contenus validés récents
coherente      sinon
```

**Toujours une réserve, jamais un écart dur** : la voix est un jugement
humain, le badge SIGNALE et l'humain décide (1.2). Un verdict `derive`
n'affecte ni le statut ni la possibilité de valider. La liste `tests` donne
les raisons concrètes (c'est la matière du tooltip et de F-34 étendu).

**Fréquence de recalcul** : au montage de la vue détail et au dépôt/édition de
la source (mêmes déclencheurs que F-35). Le corpus est chargé une fois par
montage (`GET /api/corpus-voix`), pas à chaque tick du polling 8s.

### 3.5 Le badge « voix » (UI)

À côté du badge conformité existant (header de la vue détail, même pattern
visuel : point + label dans une pill discrète) :

| État | Point | Label | Tooltip |
|---|---|---|---|
| coherente | status-ok `#2FD06B` | « Voix cohérente » | « Profil stylistique aligné sur les N derniers publiés » |
| derive | status-warn `#F5A623` | « Voix en dérive » | les tests en écart : « Le corpus tutoie, ce brouillon vouvoie » |
| non-verifiee | ink-tertiary (alpha) | « Voix non vérifiée » | « Moins de 3 contenus publiés exploitables, ou brouillon sans texte » |

DA noire monochrome : jamais d'accent couleur sur un statut, le point porte la
couleur, fond neutre (règle identique au badge F-33, SPEC-CONFORMITE 5.2).
Le status-warn est utilisé ici comme « attention, à regarder », pas comme
erreur : c'est cohérent avec son usage « à valider ».

---

## 4. Publish-before-write : la règle inaliénable (documentée)

### 4.1 L'existant (déjà en place, à ne pas casser)

- **Code** : `POST /api/brouillon/:id/postiz` (app.ts) refuse tout brouillon
  non `valide` (409) et crée un post Postiz en statut **draft**, JAMAIS
  schedulé (commentaire : « JAMAIS schedule, la programmation reste un acte
  humain dans Postiz »).
- **UI** : la programmation (`programme` sur brouillons) fixe date/heure/réseau
  dans Atelier, mais la publication réelle reste un acte humain dans l'outil
  de publication.
- **Docs** : STRATEGIE-PUBLICATION.md (« brouillon → validation → publication,
  jamais de publication automatique ») ; SPEC-CREATION.md (templates : « Ne
  publie rien : je valide d'abord ici »).

### 4.2 La règle, formulée

> **Publish-before-write : un contenu ne part JAMAIS vers un canal de
> publication sans validation humaine préalable. Le passage par le statut
> `valide` (ou `publie`, posé par l'humain) est un prérequis absolu à tout
> envoi vers Postiz, un réseau ou un CMS. La programmation d'une publication
> est un acte humain ; aucun agent, aucun flux automatisé ne peut la déclencher
> seul. Le draft est l'état de sortie maximal d'Atelier.**

### 4.3 Les garde-fous (ce qui protège la règle)

| Niveau | Garde-fou | État |
|--------|-----------|------|
| API | `/postiz` exige `statut = valide` (409 sinon) | ✅ existant |
| API | Postiz reçoit `-t draft`, jamais `schedule` | ✅ existant |
| Contrat agent | `get_charte` termine ses directives par la règle (section 6) | ➕ à ajouter (cette spec) |
| Templates | « Ne publie rien : je valide d'abord ici » dans chaque `messageInitial` | ✅ existant (SPEC-CREATION) |
| Docs | STRATEGIE-PUBLICATION.md, section inaliénable | ✅ existant, cette spec la référence |
| Code | Toute future intégration (GMB, Sanity, réseaux natifs) reprend la même règle : draft ou brouillon côté cible, jamais de publication directe | ➕ règle de revue : ajouter une ligne à `.github/PULL_REQUEST_TEMPLATE.md` (« aucune publication automatique : le draft est l'état de sortie maximal ») |

**Test de non-régression** (à ajouter aux tests API existants) : un POST
`/postiz` sur un brouillon `brouillon` ou `a-valider` → 409 ; le payload
Postiz créé contient `status: 'draft'` et jamais de date programmée. Un
développeur futur qui « optimiserait » le raccord verrait ce test rouge.

---

## 5. Changements API

### 5.1 Champs `pilier` et `angle` sur `brouillons`

Deux colonnes, la règle des 4 fichiers ENSEMBLE (règle Phase 4 du skill
atelier) : `schema.ts` + `schema-pg.ts` + `legacy.ts` (ALTER TABLE ADD COLUMN
IF NOT EXISTS) + `migrate-pg.ts` (ALTER TABLE ... ADD COLUMN IF NOT EXISTS),
plus les types repo (`BrouillonRow.pilier`/`angle: string | null`,
`NewBrouillon.pilier?`/`angle?`, `BrouillonPatch.pilier?`/`angle?`).

```ts
pilier: text('pilier'),   // nullable, id de pilier ('temoignages', ...)
angle:  text('angle')     // nullable, étiquette libre (documentaire)
```

- **Zod** : `updateBrouillonSchema` (validation.js) accepte `pilier?: z.string().max(60)` et `angle?: z.string().max(120)`, et le refine « au moins un champ requis » inclut les deux nouveaux (sinon un POST pilier-only est rejeté, piège connu Phase 6f). Le `POST /api/brouillons` (création) parse son body manuellement (pattern existant, pas de schéma Zod dédié) : ajouter `pilier`/`angle` au parsing manuel, avec le même typage que titre/type.
- **app.ts** : `nextPilier`/`nextAngle` dans le POST statut + spread dans
  `updateBrouillon` + GET détail renvoie `pilier`/`angle` + GET liste renvoie
  `pilier` (nécessaire à la modale de création et au calcul de rotation).
- **Web** : `BrouillonDetail`/`BrouillonListRow` + `updateBrouillon` (Pick)
  étendus (pattern Phase 6f : ne pas oublier le Pick côté web).

### 5.2 GET /api/rotation (le cooldown)

```
GET /api/rotation?jours=14
→ {
    fenetreJours: 14,
    piliers: [{
      pilier: 'temoignages',
      occurrences: 2,               // nb de brouillons valide/publie dans la fenêtre
      dernier: '2026-08-05T10:00:00Z',
      enCooldown: true
    }],
    disponibles: ['coulisses', 'vie-locale']   // piliers de la charte non en cooldown
  }
```

Implémentation : `repo.listBrouillons()` filtré (statut ∈ {valide, publie},
`pilier` non nul, `updatedAt` >= now - 14 j), agrégé par pilier. Constante
`COOLDOWN_JOURS = 14` exportée depuis `apps/api/src/rotation.ts` (nouveau
module, avec la fonction `calculerRotation(brouillons, piliersCharte)` pure et
testable). L'endpoint lit la charte pour renvoyer `disponibles`.

### 5.3 GET /api/corpus-voix (le corpus voix)

```
GET /api/corpus-voix?limit=20
→ { corpus: [{ id, titre, statut: 'publie', publieLe, texte }] }
```

Implémentation : `repo.listBrouillons()` filtré `statut = publie`, trié par
`updatedAt` desc, limité, texte extrait serveur (strip balises du source_html
+ légendes JSON `reseaux` + notes, tronqué 50 000 car.). `CORPUS_LIMITE = 20`
dans `apps/api/src/rotation.ts`.

### 5.4 POST /api/brouillons étendu (création avec pilier)

Le body accepte `pilier?: string` (et `angle?: string`) en plus de
titre/type/conversation. La modale de création le passe (select alimenté par
les piliers de la charte, section 7).

---

## 6. Changements MCP (comment l'agent lit tout ça)

### 6.1 `get_charte` enrichi (2 ajouts)

1. **Piliers éditoriaux** : si `data.piliers` (nouveau champ charte) est non
   vide, ajouter la section au bloc d'instructions :
   ```
   ## Piliers éditoriaux
   - temoignages, coulisses, vie-locale, annonces
   ```
2. **Règle inaliénable** : les directives finales (dernière ligne du bloc)
   deviennent :
   ```
   Directives : produire un contenu qui respecte ces tokens. Ne pas inventer de
   couleurs ou polices hors charte. Si un token manque, utiliser le style neutre
   de l'outil. Ne publie jamais : tu déposes le contenu, l'humain valide et
   publie. (Publish-before-write : règle inaliénable.)
   ```

Implémentation : `packages/mcp/src/index.ts` (grep `data.motsEviter`),
construire `## Piliers éditoriaux` comme les autres sections + append de la
règle aux directives. Rebuild + `hermes mcp restart atelier` (règle Phase 6b).

### 6.2 Nouvel outil `get_rotation` (15e outil MCP)

```
get_rotation
  description : Récupère la rotation des angles : piliers éditoriaux traités
  récemment (cooldown, fenêtre glissante). À consulter AVANT de proposer des
  directions de contenu, en particulier pour le template « Idée vague » :
  ne propose pas un pilier en cooldown.
  → { fenetreJours, piliers: [...], disponibles: [...] }   (GET /api/rotation)
```

Le client MCP : `client.getRotation()` → GET /api/rotation. Le serveur
transforme la réponse en bloc lisible :

```
# Rotation des angles (cooldown 14 j)
Piliers traités récemment (à éviter) :
- temoignages : 2 contenus, dernier le 05/08
- annonces : 1 contenu, le 02/08
Piliers disponibles : coulisses, vie-locale
```

**Place dans le workflow agent** : `get_charte` reste l'étape 1 (l'identité).
`get_rotation` est l'étape 1bis pour toute production de CONTENU RÉSEAU
(carrousel, post, story) : le message initial du template « Idée vague » et le
squelette de prompt de SPEC-CREATION le demandent explicitement (section 5.2
de la présente spec). Pas pertinent pour les documents (pitch deck, plaquette) :
un deck ne « répète » pas un thème réseau.

### 6.3 Outil `set_pilier` (16e outil MCP)

L'agent doit pouvoir rattacher un pilier à un brouillon qu'il produit (cas
« user agent-first » : il crée via `creer_brouillon_postiz` ou travaille sur
un brouillon existant sans ouvrir l'UI). Aucun outil existant ne permet de
poser `pilier`/`angle` (set_notes écrit les notes, set_statut ne touche qu'au
statut, le patch générique de l'API n'est pas exposé au MCP).

→ **Nouvel outil `set_pilier` (id, pilier, angle?)** : POST /api/brouillon/:id
avec `{ pilier, angle }` (le patch générique existe déjà, 5.1). Une méthode
`client.setPilier(id, pilier, angle)` + un `server.tool` minimal dans
`packages/mcp/src/index.ts`. Le changement de pilier laisse une trace dans le
journal d'activité via le patch générique existant (journal des changements).
Rebuild + `hermes mcp restart atelier` (règle Phase 6b, vérif
`grep -c set_pilier dist/index.js`).

### 6.4 Voice-drift : l'agent n'en a pas besoin au v1

Le voice-drift est un contrôle HUMAIN (badge dans l'UI). L'agent produit
conforme en lisant la charte (ton + motsSignature via F-14) ; le badge
vérifie a posteriori. Évolution v2 (avec `verifier_conformite` de
SPEC-CONFORMITE section 7) : un outil `verifier_voix` pour que l'agent
s'auto-vérifie avant de déposer. Même porte : portage du moteur côté serveur
ou duplication TS. Hors v1.

---

## 7. UI

### 7.1 BrandPage : section « Piliers éditoriaux »

- Nouvelle section dans la page Charte graphique (même pattern que « Mots à
  éviter » : input texte, valeurs séparées par des virgules, explication en
  ink-tertiary).
- `CharteData` + `parseCharte` + `DEFAULT_CHARTE` étendus ENSEMBLE avec
  `piliers: string[]` (règle Phase 6b, sinon le champ retombe à vide au
  reload). Persisté via le PUT /api/charte existant.
- Explication affichée : « Les piliers éditoriaux sont les grandes familles de
  contenu de votre marque. Un pilier utilisé récemment entre en cooldown : il
  ne sera pas re-proposé à l'agent tant que la fenêtre n'est pas écoulée. »
- Zéro em-dash dans les libellés (règle DA).

### 7.2 Modale « Nouvelle création » : select Pilier

- Sous le champ phrase (ou dans la carte template), un select « Pilier »
  (optionnel) alimenté par `charte.piliers` :
  - vide = « Sans pilier (hors rotation) »,
  - chaque pilier avec son état : « temoignages (cooldown : 3 j restants) » si
    en cooldown (le GET /api/rotation alimente l'état). Le user PEUT choisir
    un pilier en cooldown (la rotation informe, ne bloque pas).
- Si la charte n'a aucun pilier déclaré : le select n'apparaît pas (zéro bruit
  pour les users qui ne veulent pas de la feature).
- POST /api/brouillons avec `{ pilier }` (5.4). L'angle est laissé à l'agent
  (il le pose via `set_pilier` si utile) : le user ne remplit pas d'angle.

### 7.3 Badge « voix » (détail)

- Point + label à côté du badge conformité F-33, même pill discrète (3.5).
- Tooltip = les tests en écart (« Le corpus tutoie, ce brouillon vouvoie »).
- Cliqué : réservé au détail des écarts (F-34 étendu, hors v1).

### 7.4 Aucune autre page touchée

Pas de colonne dans la vue liste (le pilier est visible dans le détail, pas
dans la liste dense : cohérent avec F-33, badge liste = v2). L'activité IA
(journal) enregistre déjà les changements de statut ; l'ajout de
`set_pilier` y laissera une trace via le patch générique (journal existant).

---

## 8. Edge cases

| Cas | Comportement |
|-----|--------------|
| Charte sans piliers déclarés | Rotation vide : `disponibles = []`, pas de section dans get_charte, select masqué dans la modale. Feature inerte, zéro régression. |
| Brouillon sans pilier (ancien) | Exclu de la rotation, jamais en cooldown. |
| Pilier en cooldown mais demandé explicitement | Autorisé : le user crée le brouillon, l'agent exécute (la rotation informe, ne bloque pas). |
| 0 ou 1 contenu publié avec texte | `verifierVoix` → `non-verifiee` (profil non fiable sous 3 échantillons). |
| Brouillon publié sans texte (vidéo sans légende) | Exclu du corpus. |
| Corpus de 20 publiés, un brouillon très ancien (6 mois) | Tronqué par `CORPUS_LIMITE` : la voix récente prime. |
| Écart relatif (mots par phrase 1.5×) | Verdict `derive` avec le test explicite dans `tests`. |
| get_rotation pendant qu'un brouillon est en cours de validation | Le brouillon `valide` compte déjà dans la rotation (un thème en cours est occupé). |
| Modale création avec pilier en cooldown | Select le montre (« cooldown : 3 j restants ») mais reste sélectionnable. |
| Agent pose `set_pilier` sur un brouillon sans pilier | Patch générique, journal « changement » tracé. |
| Publication annulée (publie → brouillon) | Le pilier sort de la fenêtre au prochain calcul (dérivé, auto-cohérent). |
| F-14 accepte un mot dans motsSignature | Le vocabulaire du corpus inclut le mot → le voice-drift le considère « de la voix », moins de faux « dérive ». |
| Postiz sur brouillon non valide | 409 (existant, test de non-régression section 4.3). |

---

## 9. Découpage d'implémentation (ordre recommandé, ~3j solo)

| Étape | Contenu | Effort | Critère d'acceptation |
|-------|---------|--------|----------------------|
| 1 | Champs `pilier`/`angle` sur brouillons (4 fichiers + types repo + Zod + app.ts + web Pick) + GET /api/rotation (module `rotation.ts` + route) | 1j | Tests API : rotation calcule cooldown sur brouillons valide/publie, fenêtre respectée, disponible vs cooldown ; 19 tests existants verts ; build api ok |
| 2 | Charte `piliers` (BrandPage + parseCharte + DEFAULT_CHARTE + get_charte MCP + règle publish-before-write dans les directives) + `set_pilier` MCP + `get_rotation` MCP | 1j | Test réel : déclarer 2 piliers → get_charte renvoie la section ; valider un brouillon avec pilier → get_rotation le met en cooldown ; directives contiennent la règle ; `hermes mcp restart atelier` + grep dist |
| 3 | Modale création (select pilier + état cooldown) + enrichissement template « Idée vague » + squelette de prompt (ligne get_rotation) | 0.5j | Capture Playwright : select alimenté, état cooldown affiché, création avec pilier persistée ; 0 erreur console |
| 4 | Voice-drift : `voix.ts` (profilStylistique + verifierVoix) + GET /api/corpus-voix + badge « voix » dans le header | 0.5j | Tests unitaires voix (corpus tutoie vs brouillon vouvoie → derive) ; capture dark + light : badge à côté de F-33, tooltip avec les tests ; 0 erreur console |

Chaque étape = PR + capture Playwright + `vision_analyze` (process en place).
Rappels : zéro em-dash partout (y compris textes générés : raisons de rotation,
tooltips voix), DA monochrome (jamais d'accent couleur sur un statut), tests +
lint verts, `npm run build -w apps/api` et `-w apps/web` avant merge, `hermes
mcp restart atelier` après rebuild du MCP.

---

## 10. Questions ouvertes pour Victor

1. **Fenêtre de cooldown** : 14 jours (reco) ou 30 ? Un pilier « témoignages »
   peut-il légitimement revenir toutes les 2 semaines, ou faut-il un mois de
   respiration ? (Constante, ajustable sans migration.)
2. **Le `valide` compte-t-il dans le cooldown** (reco : oui, un thème en cours
   est occupé) ou seulement le `publie` ?
3. **Piliers dans la charte vs table dédiée** : la reco est « piliers dans la
   charte (identité), cooldown dérivé des brouillons (zéro table) ». OK, ou
   tu préfères une table `rotations` explicite pour tracer l'historique ?
4. **Seuil de dérive** : 2 tests divergents (reco) ou 1 seul suffit pour
   « voix en dérive » ? (La voix est subtile : 1 divergence peut être un
   accident, 2 un pattern.)
5. **Le user force un pilier en cooldown** : OK que ce soit possible sans
   avertissement bloquant (reco : select le montre mais ne bloque pas), ou
   faut-il un confirm « ce pilier a été traité il y a 3 jours » ?
6. **set_pilier MCP (15e outil)** : OK d'ajouter cet outil, ou l'agent doit-il
   laisser le pilier au user (le user choisit le pilier à la création, l'agent
   ne le touche pas) ? (Reco : outil minimal, le user agent-first n'ouvre pas
   forcément l'UI avant de produire.)
