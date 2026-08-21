# SPEC-COLLECTEUR.md : la bibliothèque collecte les sources externes (GitHub, Instagram, Sanity, Notion) pour enrichir la charte (13/08/2026)

> Spec produit pour le collecteur de la bibliothèque : scanner les sources du user
> (GitHub, Instagram, CMS Sanity, Notion) pour en tirer des éléments de marque
> (tokens, voix, mots, formats, assets) qui alimentent la bibliothèque et la
> CHARTE ÉVOLUTIVE (F-01/02). Rien ne s'ajoute à la charte sans validation Victor.
> Vision : VISION.md (la charte est vivante, la bibliothèque = la mémoire de la
> marque) et UX-RESEARCH.md v3 §7-8 (Phase D1, tableau de faisabilité 2026).
> Spec liée : SPEC-CHARTE-EVOLUTIVE.md (le moteur propositions réutilisé tel quel,
> il s'enrichit des contenus validés ; la présente spec ajoute l'autre entrée de
> la boucle : les sources externes). Priorisation : PRIORISATION.md (la
> bibliothèque est dans le MVP, Sprint 3 livré ; le collecteur est l'étape
> suivante de « la mémoire »).

---

## 1. Contexte et vision

### 1.1 Le problème

La bibliothèque d'Atelier (table `ressources`, Sprint 3) se remplit à la main :
le user uploade ses photos, archive une page web. Or la matière de marque existe
déjà, dispersée dans ses sources : le repo GitHub contient la charte (tokens),
la voix (brand-voice.md) et les assets du site ; le compte Instagram contient des
années de posts publiés qui montrent ce qui fonctionne ; le CMS (Sanity) contient
les articles ; Notion contient les docs de marque.

Aujourd'hui cet existant est invisible pour l'agent : il n'apparaît ni dans la
bibliothèque ni dans la charte. Le user devrait tout re-téléverser à la main pour
que sa mémoire de marque soit complète. C'est un travail mort, et la charte reste
pauvre alors que les sources sont la meilleure matière d'identité disponible.

### 1.2 La décision (le collecteur, humain au centre)

La bibliothèque devient un **collecteur** : un mécanisme qui scanne les sources
connectées, en extrait des **éléments de marque** (couleurs, polices, logos,
règles de ton, mots signature, formats, assets), puis les dépose dans la
bibliothèque et les PROPOSE à la charte. La validation reste humaine, par le
même moteur que SPEC-CHARTE-EVOLUTIVE :

1. **Scanner** : l'utilisateur (ou l'agent via MCP) déclenche un scan d'une source
   connectée. L'API interroge la source (API officielle), récupère des éléments
   bruts (fichiers, posts, articles, pages).
2. **Collecter** : chaque élément brut devient une **collecte** (journalisée,
   idempotente : un re-scan ne duplique rien).
3. **Déposer** : les éléments réutilisables par l'agent (assets, pages, posts
   performants) sont archivés comme **ressources** de la bibliothèque (table
   existante, catégorie « source:<nom> » pour tracer l'origine).
4. **Proposer** : les éléments d'identité (couleurs, polices, logos, ton, mots,
   formats) deviennent des **propositions** de charte (table `propositions` de
   SPEC-CHARTE-EVOLUTIVE, type étendu). Victor accepte ou rejette, rien ne se
   fusionne sans lui.
5. **Boucler** : la charte enrichie est injectée par `get_charte` à la production
   suivante. L'agent produit conforme dès le premier jet, à partir de la vraie
   matière de marque du user.

**Principe fondateur, inchangé : l'humain au centre.** Le collecteur propose,
Victor dispose. Le scan ne modifie jamais la charte directement ; il ne crée que
des ressources (archivage non destructif) et des propositions (en attente de
décision).

### 1.3 Hors périmètre (v1)

- **Facebook** : pas de token page disponible aujourd'hui (l'app Meta existante
  ne couvre que Instagram). Le connecteur est conçu mais non activé au v1.
- **LinkedIn** : lecture payante/restreinte (faisabilité UX-RESEARCH §7) : scan
  partiel seulement, hors v1.
- **TikTok** : restreint (approbation requise), hors v1.
- **Scan automatique périodique** (cron) : le v1 scanne à la demande (bouton UI +
  outil MCP). Un cron « rescan hebdo » est une évolution triviale (même endpoint).
- **Détection de couleurs dans les images** : le v1 extrait les tokens depuis des
  fichiers structurés (tokens.json, CSS, design-tokens) et du texte ; l'analyse
  visuelle de pixels (ex. extraire la palette d'une photo) est un chantier lourd,
  hors périmètre (déjà exclu dans SPEC-CHARTE-EVOLUTIVE §1.3).
- **Synchronisation bidirectionnelle** : on lit les sources, on n'y écrit rien
  (pas de push vers GitHub/IG depuis Atelier au v1).

---

## 2. Les sources : ordre de connexion et faisabilité vérifiée

La carte demande : « quelles sources connecter d'abord (GitHub + IG) ». L'ordre
validé par la faisabilité réelle (vérifiée le 13/08/2026, tokens et API testés) :

| Ordre | Source | Faisabilité (vérifiée) | Ce qu'on en tire | Coût |
|---|---|---|---|---|
| 1 | **GitHub** | ✅ API REST publique + token gh dispo (compte vlebarbier, 3 repos : atelier public, bordeluche privé, bordeluche-proprietaires privé) | charte (tokens.json, design-tokens), voix (brand-voice.md), assets (public/), docs (docs/, emails/) | 0 €, rate limit 5000/h avec token |
| 2 | **Instagram** | ✅ Graph API compte business/creator ; app Meta EXISTANTE (INSTAGRAM_APP_ID/SECRET dans ~/postiz/postiz.env) ; il manque un long-lived token user → à connecter | posts publiés (media + caption + engagement) : tons qui fonctionnent, visuels, formats | 0 €, token 60 j à rafraîchir |
| 3 | **Sanity** | ✅ API de lecture publique + token Editor dispo (SANITY_WRITE_TOKEN, projet 5idghvob/production, dataset production) | articles : title, excerpt, rawHtml (HTML complet), publishedAt | 0 € |
| 4 | **Notion** | ✅ API (MCP notion connecté, 28 DB) ; la DB « de marque » reste à identifier | docs de marque, guides, posts planifiés | 0 € |
| 5 | **Facebook** | ⚠️ Graph API possible MAIS aucun token page dispo → hors v1 | posts page | 0 €, setup Meta requis |

### 2.1 Pourquoi GitHub d'abord

- **Zéro setup** : le token gh est déjà là (scopes repo), l'API REST est publique
  et gratuite. Le scan peut être livré et testé immédiatement sur les 3 repos.
- **Matière la plus dense** : le repo `vlebarbier/bordeluche` contient à lui seul
  la charte de marque du premier client réel : `brand-voice.md` (les 5 règles de
  voix, source de vérité copywriting), `public/` (favicon.svg, assets, vidéos),
  `docs/` (guides, trames), `emails/` (modèles). Le repo `vlebarbier/atelier`
  contient `packages/tokens/tokens.json` (la DA du produit lui-même, format DTCG
  exploitable directement).
- **Le parser existe** : `charte-parser.ts` (Phase 5b) traite déjà un CSS en
  couleurs/polices/rayons/logos ; le même parseur s'applique aux `tokens.json`
  (DTCG) et aux CSS des repos scannés.

### 2.2 Pourquoi Instagram ensuite

- C'est la source d'identité **comportementale** : les posts publiés montrent ce
  qui fonctionne réellement (engagement), pas ce qui est déclaré dans un doc.
- Le connecteur est faisable : app Meta existante (utilisée par Postiz), compte
  business/creator requis. Il manque seulement un **long-lived token Instagram**
  (60 jours, refresh via Facebook Login) : à produire une fois via le flux OAuth
  de la page Intégrations (pattern SPEC STRATEGIE-PUBLICATION §3.2) ou un token
  fourni par Victor.
- Les données sont riches : caption (texte), media_type (IMAGE/VIDEO/CAROUSEL),
  like_count, comments_count, permalink, timestamp. C'est la matière des
  propositions « formats qui fonctionnent » et « mots signature » tirés des
  vraies légendes.

### 2.3 Sanity et Notion en v1 (complément)

- **Sanity** : lecture via l'API de query (`*[_type=="post"]`), le token Editor
  est dispo. Les articles publiés sont une source de ton et de mots signature.
  L'intégration de publication existe déjà (`integrations/sanity.ts`) : on ajoute
  la lecture.
- **Notion** : via l'API/MCP. Le v1 scanne une DB désignée comme « marque »
  (paramètre de config) ; sans désignation, le scan Notion est désactivé
  (éviter de scanner 28 DB au hasard).

---

## 3. Le format des données collectées

### 3.1 Table `collectes` (nouvelle, le journal)

Chaque élément récupéré par un scan est une **collecte**, persistée pour
l'audit, l'idempotence et le re-scan :

```
collectes
  id            text PK           // collecte-<timestamp36>
  source        text NOT NULL     // 'github' | 'instagram' | 'sanity' | 'notion'
  typeElement   text NOT NULL     // 'token' | 'voix' | 'mot' | 'format' | 'asset' | 'page' | 'post'
  nom           text NOT NULL     // nom lisible (ex. 'brand-voice.md', 'Post 14/06 reel')
  valeur        text              // le contenu pertinent (texte, chemin, caption)
  urlSource     text              // URL/permalink d'origine (ex. permalink IG, raw github)
  metadonnees   text JSON         // libre : repo, chemin, engagement (likes/comments), date
  hash          text              // sha256 du contenu brut, pour la dédup
  ressourceId   text              // id de la ressource créée (si archivée en bibliothèque)
  createdAt     text NOT NULL
```

**Idempotence** : clé naturelle `(source, hash)`. Un re-scan qui retrouve le même
hash (même fichier, même post) ne recrée ni collecte ni ressource : il met à jour
`metadonnees` si l'engagement a changé (posts IG) et passe. Un scan complet est
donc relançable sans risque de doublon.

### 3.2 De la collecte aux deux sorties

| typeElement | Source type | Sortie bibliothèque (ressources) | Sortie charte (propositions) |
|---|---|---|---|
| `token` (couleurs/polices/rayons) | tokens.json, design-tokens.css | non (pas d'asset) | OUI, type `token` : « palette bordeaux/ivoire/sauge » |
| `voix` (règles de ton) | brand-voice.md | OUI, page « brand-voice.md » (categorie source:github) | OUI, type `ton` : « règles de voix du repo » |
| `mot` (vocabulaire) | captions IG, articles | non | OUI, type `mot` (avec seuil de récurrence) |
| `format` (structures qui marchent) | posts IG performants, carrousels validés | non | OUI, type `format` |
| `asset` (logo, image, vidéo) | public/ du repo, images des posts | OUI, ressource image/vidéo (categorie source:github / source:instagram) | OUI si logo : type `logo` (ajout à charte.logos) |
| `page` (doc, article) | docs/, emails/, articles Sanity | OUI, ressource page (sourceUrl + contenu) | non au v1 (l'analyseur mot/ton s'applique aux posts et articles, pas aux docs) |
| `post` (posts IG publiés) | compte Instagram | OUI pour les visuels des posts performants | OUI : mot/format via l'analyseur de SPEC-CHARTE-EVOLUTIVE |

### 3.3 Les propositions de charte (réutilisation du moteur existant)

La table `propositions` de SPEC-CHARTE-EVOLUTIVE (type ∈ {mot, ton, format})
s'étend avec deux types : `token` (palette/couleurs/polices) et `logo`. Les
champs existants suffisent :

- `raison` : « Collecté depuis GitHub (bordeluche/brand-voice.md) » ou
  « 5 posts IG à engagement élevé utilisent ce ton ».
- `sourceId` : id de la collecte (le brouillon reste la source pour la boucle
  contenus validés ; la collecte est la source pour la boucle sources externes).
- `occurrences` : pour GitHub/Sanity, 1 occurrence suffit (c'est une source de
  vérité déclarée) ; pour IG, le seuil de récurrence de SPEC-CHARTE-EVOLUTIVE
  s'applique (2+ posts, anti-bruit).

Fusion dans la charte (acceptation) :

| Type proposition | Fusion charte | Injecté par get_charte |
|---|---|---|
| `token` | charte.couleurs (merge palette + hex) + charte.polices + charte.rayons | section Couleurs/Typographie |
| `logo` | charte.logos (push URL) | section Logos |
| `ton` | charte.ton.voix ou ton.regles | section Ton |
| `mot` | charte.motsSignature | section Mots signature |
| `format` | charte.formats | section Formats qui fonctionnent |

Aucun changement de schéma charte : les 5 champs existent déjà (SPEC-CHARTE-
EVOLUTIVE §4.2). La fusion est la même fonction `fusionProposition`.

---

## 4. Le scan : contrat API et connecteurs

### 4.1 Endpoint

```
POST /api/collecteur/scan
{ source: 'github' | 'instagram' | 'sanity' | 'notion',
  config?: { repo?: string, limit?: number, dbId?: string } }
→ 200 { collectes: N, ressourcesCreees: N, propositionsCreees: N,
        rejetees: [ { nom, raison } ] }
```

- Le scan est **synchrone** mais borné : par défaut 25 éléments max par source
  (constante `SCAN_LIMIT_PAR_SOURCE`), 1 seul appel réseau par élément (le
  graph GitHub est parcouru en profondeur bornée : racine + `public/` +
  `docs/` + `emails/` + `packages/tokens/`, fichiers de moins de 2 Mo).
- **Rejet silencieux** : un élément qui ne matche aucun type (ex. un SVG de
  bouton) est listé dans `rejetees` avec sa raison, jamais bloquant.
- Les tokens de source vivent dans l'API (env Vercel / .env.local), jamais dans
  le front : `GITHUB_TOKEN`, `IG_TOKEN` (long-lived), `SANITY_WRITE_TOKEN`
  (existant), `NOTION_TOKEN` (existant côté MCP, à dupliquer pour l'API).

### 4.2 Les connecteurs (`apps/api/src/collecteur/`)

```
collecteur/
  scan.ts        // orchestration : source → fetch → normalise en collectes → dédup → dépôt
  github.ts      // API REST github.com (contents API + raw), token optionnel (repos privés)
  instagram.ts   // Graph API /{ig-user-id}/media, champs caption, media_type, like_count,
                 // comments_count, permalink, timestamp, media_url
  sanity.ts      // query API *[_type=="post"] (title, excerpt, rawHtml, publishedAt, slug)
  notion.ts      // query d'une DB désignée (config.collecteur.notionDbId)
  analyse.ts     // réutilise l'analyseur de SPEC-CHARTE-EVOLUTIVE (charte-evolutive.ts)
```

- **github.ts** : liste les fichiers par pattern (tokens.json, *.css, brand-voice*,
  README, docs/, emails/, public/) ; pour chaque fichier cible, fetch du contenu
  brut (raw.githubusercontent.com), hachage, normalisation. Repos scannés par
  défaut : ceux du compte connecté (gh list), filtrables par `config.repo`.
  Le repo privé bordeluche est lisible grâce au token (scopes repo).
- **instagram.ts** : `GET /{ig-user-id}/media?fields=...` paginé (2 pages max),
  score d'engagement = likes + comments ; les posts au-dessus du percentile 75
  deviennent des ressources visuelles + des propositions format ; les captions
  passent dans l'analyseur pour les mots/ton (seuil 2 posts).
- **sanity.ts** : query des 10 derniers articles publiés ; titre + excerpt +
  texte extrait du rawHtml → analyseur mot/ton ; les articles sont archivés en
  ressources page (avec sourceUrl vers bordeluche.com/blog/<slug>).
- **notion.ts** : v1 simple : lit les pages de la DB configurée, archive en
  ressources page. Aucune analyse mot/ton au v1 (le champ libre des pages Notion
  est trop hétérogène ; l'analyse s'y ajoutera si un usage réel le justifie).

### 4.3 Outil MCP

Un outil `scan_collecteur` (source, config?) expose le scan à l'agent : « scanne
mon GitHub », « récupère mes posts Instagram qui marchent ». Réponse = résumé
structuré (collectes, ressources, propositions créées). Règle Phase 6b : rebuild
puis `hermes mcp restart atelier` (vérif `grep -c scan_collecteur dist/index.js`).

---

## 5. UI : la page Bibliothèque devient le lieu du collecteur

### 5.1 Section « Sources » (en haut de BibliothequePage)

- Une ligne par source (GitHub, Instagram, Sanity, Notion) avec : nom, état
  (connecté si le token env est présent, sinon « à connecter » avec guidance),
  dernier scan (date + nombre de collectes), bouton « Scanner » (ghost).
- Les sources hors v1 (Facebook, LinkedIn, TikTok) : lignes grisées « indisponible
  au v1 » (pas de bouton), pour la transparence sans promesse.
- Pendant un scan : état de chargement (spinner spinner + texte « Scan de GitHub
  en cours »), pas de double-clic (bouton disabled).
- Résultat : toast/message inline « X collectes, Y ressources, Z propositions » ;
  les nouvelles ressources apparaissent dans la grille en dessous (filtre
  catégorie « source:github » pour les isoler).

### 5.2 Lien avec la page Charte

- Les propositions issues du collecteur apparaissent dans la section
  « Suggestions de la charte vivante » (SPEC-CHARTE-EVOLUTIVE §7.1) avec leur
  `raison` tracée (« Collecté depuis GitHub : bordeluche/brand-voice.md »).
- Le badge sidebar « Charte graphique » (compteur) couvre les deux boucles
  (contenus validés + sources externes) : un seul compteur, c'est le même moteur.

### 5.3 Détails DA (REFONTE-DESIGN.md + tokens actuels)

- Section sur fond `bg-level-2`, lignes en liste dense (pattern Linear) : icône
  source (GitHubLogo/InstagramLogo de Phosphor), nom, méta (dernier scan) en
  ink-tertiary.
- Zéro em-dash partout (y compris les raisons générées par les connecteurs :
  « Collecte depuis GitHub : repo/chemin » avec deux-points, pas de tiret long).
- États complets : empty (aucune source connectée → guidance vers Intégrations),
  loading, error (message du connecteur affiché).

---

## 6. Edge cases

| Cas | Comportement |
|---|---|
| Token IG expiré (60 j) | Le scan répond 401 → l'UI marque la source « à reconnecter », guidance vers Intégrations. Aucun crash. |
| Repo privé sans token (autre user) | github.ts saute les repos inaccessibles (404/403) → listés dans `rejetees` avec raison, le scan continue. |
| Rate limit GitHub (5000/h avec token) | Scan borné à ~30 requêtes par run ; en cas de 403, message « limite API atteinte, réessayez plus tard » et le scan partiel est conservé. |
| Fichier > 2 Mo (assets lourds) | Skip avec raison « fichier trop lourd pour une collecte » (l'upload manuel reste possible). |
| Re-scan immédiat | Idempotent par (source, hash) : aucune duplication, metadonnees à jour. |
| Post IG supprimé depuis le dernier scan | La ressource archivée reste (copie locale), la collecte marquée « post supprimé » (metadonnees), pas de suppression. |
| Captions IG pleines d'emojis/hashtags | L'analyseur retire hashtags et emojis avant l'extraction de mots (même nettoyage que les légendes réseau). |
| Charte inexistante | Fusion impossible → la proposition reste `proposee` (même règle que SPEC-CHARTE-EVOLUTIVE §8). |
| Scan Notion sans DB désignée | La source est affichée « à configurer », le scan renvoie 400 avec message clair. |
| Engagement IG nul (compte neuf) | Aucun post au-dessus du percentile 75 → zéro ressource visuelle, l'analyse mot/ton continue sur les captions. |

---

## 7. Découpage d'implémentation (ordre recommandé, ~4 j solo)

| Étape | Contenu | Effort | Critère d'acceptation |
|---|---|---|---|
| 1 | Table `collectes` (4 fichiers + types repo + méthodes) + POST /api/collecteur/scan (squelette) + connecteur GitHub (tokens.json, brand-voice, assets) | 1.5 j | Scan réel du repo bordeluche → collectes + ressources + proposition token/ton créées ; re-scan → 0 doublon ; tests API verts ; build api ok |
| 2 | Connecteur Instagram (Graph API + analyseur) + Sanity (lecture) | 1.25 j | Scan IG avec token de test → ressources visuelles des posts performants + propositions mot/format (seuil 2) ; scan Sanity → ressources articles + propositions ton |
| 3 | UI section Sources (BibliothequePage) + raisons dans la page Charte | 1 j | Capture Playwright dark + light : sources, états, scan réel → ressources visibles, 0 erreur console |
| 4 | Outil MCP `scan_collecteur` + connecteur Notion + polish | 0.5 j | Test stdio MCP : scan_collecteur répond ; `hermes mcp restart atelier` ; grep dist |

Chaque étape = PR + capture + `vision_analyze` (process en place). Rappels : zéro
em-dash (y compris dans les textes générés par les connecteurs), DA monochrome,
tests + lint verts, `npm run build -w apps/api` et `-w apps/web` avant merge.

---

## 8. Prérequis hors code (à faire avant ou pendant l'étape 2)

1. **Token Instagram long-lived** : produire un token (60 j) via l'app Meta
   existante (INSTAGRAM_APP_ID/SECRET) + flux OAuth de la page Intégrations, ou
   token fourni par Victor. Sans lui, la source IG reste « à connecter » mais
   GitHub/Sanity/Notion fonctionnent.
2. **Identifier la DB Notion « marque »** : choisir parmi les 28 DB celle qui
   porte les docs de marque (à défaut, Notion désactivé).
3. **Token GitHub en env Vercel** : `GITHUB_TOKEN` (le token gh existant, scopes
   repo) à copier dans les env de l'API (atelier-api) pour que le scan tourne en
   prod, pas seulement en local.

---

## 9. Questions ouvertes pour Victor

1. **Seuil IG** : 2 posts à engagement élevé pour proposer un mot/format, comme
   les contenus validés, ou 3 ? (Reco : 2, même constante que SPEC-CHARTE-
   EVOLUTIVE, ajustable sans migration.)
2. **Types de propositions nouveaux** (`token`, `logo`) : OK pour étendre la
   table propositions, ou préférez-vous que les collectes de tokens aillent
   directement dans la charte (import CSS manuel reste possible) ? (Reco :
   propositions, le principe humain-au-centre reste uniforme.)
3. **Scan automatique** : un cron hebdomadaire de rescan (IG surtout, où la
   matière change) est-il souhaitable, ou le scan manuel suffit au v1 ? (Reco :
   manuel au v1, cron en v2.)
4. **Repos scannés par défaut** : les 3 repos du compte (atelier, bordeluche,
   bordeluche-proprietaires) ou seulement bordeluche ? (Reco : les 3, chaque
   repo apporte une couche : produit / marque / propriétaires.)
