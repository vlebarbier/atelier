# SPEC-BLOG.md : page Blog, modele article + connexion CMS (Sanity) (11/08/2026)

> Spec de la page « Blog » : creer et editer des articles de blog avec la charte,
> puis les publier vers le CMS. Pour Bordeluche, le CMS est Sanity (projet
> 5idghvob, dataset production) : le pipeline Notion->Sanity existant
> (~/Bordeluche/scripts/migrate-to-sanity.mjs et push-bor*.mjs) est reconcilie
> avec ce nouveau flux (meme identifiant `_id: article-<slug>`, meme champ
> `rawHtml` rendu en priorite par le site astro).
> Vision : VISION.md (memoire de marque + complement d'agent). Priorisation :
> PRIORISATION.md (pilier « controle + sortie », Sprint 4). Direction design :
> REFONTE-DESIGN.md (« l'atelier, pas le dashboard »). Regle de publication :
> STRATEGIE-PUBLICATION.md (publish-before-write inalienable). Conformite :
> SPEC-CONFORMITE.md (badge conformite, meme famille).

---

## 1. Contexte et vision

### 1.1 Le probleme

Atelier gere les contenus reseaux sociaux (carrousels, posts, videos, stories,
programmables via le calendrier) et les documents (pitch decks, flyers,
plaquettes). Il manque une troisieme famille de livrables : **les articles de
blog**, qui ne vont ni sur les reseaux ni dans les documents, mais dans un CMS
(pour Bordeluche : Sanity, le site astro bordeluche.com).

Aujourd'hui, le pipeline Bordeluche est manuel et externe : l'agent Hermes
redige l'article (skill bordeluche-blog : recherche Pushrank, check doublons,
redaction brand voice, image de couverture FAL, publication Sanity via MCP),
mais il n'y a **aucun lien avec Atelier** : pas de suivi des statuts, pas de
revision dans l'outil, pas de trace de ce qui est publie. Le brouillon vit
dans la conversation, pas dans le receptacle.

### 1.2 La vision

La page Blog etend le receptacle aux articles : l'agent produit l'article
(charte + bibliotheque), Atelier le receptionne, le user le revise (champ par
champ : titre, chapo, corps HTML, SEO), le valide, puis le **publie vers le
CMS** d'un clic. Le workflow reste inchange : brouillon -> a valider ->
valide -> publie. **Jamais de publication automatique** (regle inalienable de
STRATEGIE-PUBLICATION.md) : l'acte de publication est humain.

---

## 2. Modele article

Un article de blog est un **brouillon de type `article`** (nouveau type, a
cote de carrousel/video/post/story/pitch-deck/...). Il reutilise l'infra
existante du receptacle : `sourceHtml` porte le corps (le « receptacle »
applique aux articles), `statut` pilote le workflow, `updatedAt` le tri.

### 2.1 Champs

| Champ | Emplacement | Type | Regle |
|---|---|---|---|
| `titre` | `brouillons.titre` | string | Titre de l'article, <= 100 car., mot-cle en debut (regle BLOG_RULES.md) |
| `slug` | `article` (JSON) | string | URL de l'article. Auto-genere depuis le titre (`slugifyArticle`) si vide. Identifiant de reconciliation CMS : `_id = 'article-' + slug` |
| `chapo` | `article` (JSON) | string | Resume 150-200 car., affiche sur la carte du listing et envoye dans `excerpt` au CMS |
| `corps` | `brouillons.sourceHtml` | HTML | Le corps de l'article en HTML brut. Rendu en priorite par le site (`rawHtml`) |
| `seoTitle` | `article` (JSON) | string | Balise `<title>`, max 70 car. Sinon titre + suffixe |
| `seoDescription` | `article` (JSON) | string | Meta description, max 170 car. Sinon chapo |
| `category` | `article` (JSON) | string | Categorie du blog (miroir du schema Sanity `post.category`) |
| `publishedAt` | `article` (JSON) | date YYYY-MM-DD | Date de publication affichee sur l'article |
| `readingTime` | `article` (JSON) | number | Temps de lecture en minutes (chiffre seul, regle BLOG_RULES.md) |
| `cmsId` / `cmsUrl` / `cmsSlug` | `article` (JSON) | string | Remplis apres publication CMS (identifiant, URL publique, slug) |
| `coverImage` | (non implemente en v1) | - | L'image de couverture reste generee par l'agent (FAL, DA_BLOG.md) et uploadee via le pipeline existant. Le champ `coverImageUrl` est prevu dans le module sanity.ts si on veut l'uploader depuis Atelier plus tard |

### 2.2 Categories (miroir du schema Sanity)

`rentabilite`, `reglementation`, `optimisation`, `marche`, `gestion`,
`experience`, `fiscalite` (constante `CATEGORIES_ARTICLE` cote web, labels
`CATEGORIES_ARTICLE_LABELS`).

### 2.3 Stockage

- Colonne `article` (TEXT JSON) ajoutee sur `brouillons` : les 4 fichiers de
  schema ENSEMBLE (regle Phase 4 du skill atelier) : `schema.ts`,
  `schema-pg.ts`, `legacy.ts` (ALTER TABLE ADD COLUMN idempotent),
  `migrate-pg.ts` (ADD COLUMN IF NOT EXISTS).
- Le corps vit dans `sourceHtml` (le receptacle HTML) : pas de duplication de
  contenu, le champ `article` ne porte que les metadonnees + SEO + trace CMS.

---

## 3. Statuts

Les statuts existants sont reutilises tels quels (aucun nouveau statut) :

| Statut | Sens | Action possible |
|---|---|---|
| `brouillon` | En cours de creation/edition | Editer, changer de statut |
| `a-valider` | Pret pour revision humaine | Reviser, passer a valide (ou retour brouillon) |
| `valide` | Approuve par le user | **Publier vers le CMS** (le bouton se debloque) |
| `publie` | Parti au CMS | Voir l'article publie (lien), re-publier si modifie |

**Garde-fou (publish-before-write, inalienable)** : la route de publication
`POST /api/brouillon/:id/publier-cms` refuse (409) tout brouillon qui n'est
pas `valide` (ou de type autre qu'`article`). Le statut ne passe a `publie`
qu'**apres** le succes de l'ecriture CMS : jamais de publication automatique,
jamais de statut « publie » sans article effectivement publie.

---

## 4. Connexion CMS (Sanity)

### 4.1 Configuration

Lues depuis les env, **memes noms que le pipeline Bordeluche existant** :

```
PUBLIC_SANITY_PROJECT_ID   # 5idghvob (Bordeluche)
PUBLIC_SANITY_DATASET      # production
SANITY_WRITE_TOKEN         # token Editor (ecriture), jamais expose au front
```

Aucun appel n'est fait si la config est absente (mode local sans CMS) : la
route repond 503 « CMS non configure » au lieu de crasher. Cote Vercel, ces
3 vars sont ajoutees aux env du projet `atelier-api` (les memes noms existent
deja dans le pipeline ~/Bordeluche).

### 4.2 Reconciliation avec le pipeline Notion->Sanity existant

Le pipeline historique (~/Bordeluche/scripts/migrate-to-sanity.mjs,
push-bor*.mjs) cree des documents Sanity `_type: 'post'` avec
`_id: 'article-<slug>'` via `createOrReplace`. Le module
`apps/api/src/integrations/sanity.ts` utilise **le meme identifiant**
(`_id: 'article-' + slug`) : publier deux fois le meme slug ecrase
proprement le document existant, quel que soit l'outil qui l'a cree. C'est
cette convention d'identifiant qui fait la reconciliation, pas une
synchronisation bilaterale.

Le document ecrit porte :

```ts
{
  _type: 'post',
  _id: 'article-<slug>',
  title, slug: { _type: 'slug', current },
  excerpt: chapo,
  rawHtml: <corps sourceHtml>,   // rendu en priorite par le site astro
  seoTitle?, seoDescription?,
  category?, publishedAt?, readingTime?,
  coverImage?  // si coverImageUrl fourni (v2)
}
```

### 4.3 Route

`POST /api/brouillon/:id/publier-cms` :

1. 404 si brouillon inconnu.
2. 409 si type != `article`.
3. 409 si statut != `valide`.
4. 400 si slug vide ou corps (sourceHtml) vide.
5. 503 si CMS non configure.
6. 502 si l'ecriture Sanity echoue (message d'erreur remonte).
7. 201 + `{ ok, cmsId, cmsUrl, slug, statut: 'publie' }` : persiste
   `cmsId`/`cmsUrl`/`cmsSlug` dans `article`, passe le statut a `publie`,
   journalise `publication_cms` dans le journal d'activite.

Le module sanity.ts est importe dynamiquement dans la route (boot leger,
comme postiz.js) : `await import('./integrations/sanity.js')`.

---

## 5. UI : page Blog

### 5.1 Navigation

Nouvelle entree sidebar « Blog » (icone `Article` de Phosphor) dans le groupe
**Travail**, entre Documents et Calendrier. Page routee `blog`, label
`Blog`, incluse dans la palette Cmd+K (groupe « Articles », ouverture de
l'editeur dedie si le brouillon est de type article).

### 5.2 Listing (BlogPage)

- Liste dense (pattern de la liste contenus) : vignette icone article, titre,
  meta (categorie en pill, slug mono, relTime), chapo sur une ligne.
- Filtres : par statut (Toolbar existant) + par categorie (select dedie).
- Badge « Publie » (vert) avec lien vers `cmsUrl` quand l'article est parti au CMS.
- Empty state guide : « Creez votre premier article avec votre agent : il
  utilisera la charte et la bibliotheque, puis vous publierez vers le CMS. »
- Bouton « Nouvel article » -> cree un brouillon `type: 'article'` et ouvre
  l'editeur.

### 5.3 Editeur (ArticleEditor)

Vue detail dediee aux articles (remplace le DraftDetail pour ce type) :

- Header : retour « Blog », titre editable, dropdown de statut (pattern
  existant), bouton **« Publier vers le CMS »** (desactive tant que l'article
  n'est pas valide avec slug + corps), bouton Supprimer.
- Corps : formulaire 2 colonnes (formulaire / apercu HTML live) :
  - **Article** : titre, slug URL (auto-genere, preview `bordeluche.com/blog/<slug>`),
    chapo, categorie, date de publication, temps de lecture.
  - **SEO** : title, meta description.
  - **Corps** : textarea source HTML + apercu rendu a droite
    (`dangerouslySetInnerHTML`, styles article dedies).
- Enregistrer : persiste titre + `article` JSON + `sourceHtml` en un seul
  patch (le patch `titre` a ete ajoute au schema de validation et a
  `BrouillonPatch`).
- Apres publication : lien « Voir l'article publie » vers `cmsUrl`.

---

## 6. Tests

`apps/api/tests/app.test.ts` (4 nouveaux tests, 16 au total, tous verts) :

1. 409 si le brouillon n'est pas de type article.
2. 409 si l'article n'est pas valide (statut brouillon).
3. 400 si article valide sans slug.
4. 503 si CMS non configure (pas d'env Sanity).

Verification live (test-publish-live.mjs, hors repo) : brouillon article
cree -> patch (statut valide + article + sourceHtml) -> `publier-cms` 201
avec `cmsId` -> requete GROQ cote Sanity (doc present, `rawHtml` correct,
excerpt/seo/category/publishedAt/readingTime remplis) -> nettoyage (doc
Sanity supprime + brouillon local supprime). Teste en reel sur le projet
5idghvob le 11/08/2026.

---

## 7. Ce qui reste pour plus tard (v2)

- **Image de couverture depuis Atelier** : le champ `coverImageUrl` est prevu
  dans `publierArticleCms` (upload dans les assets Sanity + reference
  `coverImage`), mais l'UI ne l'expose pas encore : l'image est generee par
  l'agent (FAL + DA_BLOG.md) et uploadee par le pipeline existant.
- **`ctaType`** (rdv/simulateur) : champ obligatoire du schema Sanity, non
  expose dans l'editeur v1 (le document est cree sans, le site a un defaut).
- **Rendu Portable Text** : le site rend `rawHtml` en priorite, donc le corps
  HTML source suffit ; si un jour le site exige du Portable Text, ajouter un
  convertisseur HTML -> PT cote API.
- **Check doublons / recherche SEO (Pushrank)** : l'agent garde ce role
  (skill bordeluche-blog), Atelier receptionne. La connexion Pushrank dans
  Atelier n'est pas dans le perimetre de cette carte.
