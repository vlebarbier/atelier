/**
 * Intégration Sanity CMS (blog Bordeluche, projet 5idghvob) : publication d'articles.
 *
 * Rapproche le pipeline Notion→Sanity existant (scripts push-bor*.mjs dans
 * ~/Bordeluche/scripts) : même client HTTP, mêmes champs (rawHtml, coverImage,
 * slug, seoTitle...), même flux de publication (create → createOrReplace si
 * draft + delete). L'API est appelée en fetch pur, sans dépendance @sanity/client
 * (pattern du module postiz.ts).
 *
 * Config lue depuis les env, dans l'ordre :
 *   - SANITY_PROJECT_ID (défaut '5idghvob')
 *   - SANITY_DATASET   (défaut 'production')
 *   - SANITY_WRITE_TOKEN (obligatoire pour publier : token Editor)
 */

export interface SanityConfig {
  projectId: string;
  dataset: string;
  token: string;
}

export interface SanityArticleInput {
  title: string;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  category?: string;
  publishedAt?: string;
  readingTime?: number;
  excerpt?: string;
  /** Corps de l'article en HTML (champ legacy rawHtml du schéma post). */
  rawHtml: string;
  coverImage?: { dataUrl: string; alt?: string };
  /** Id du document Sanity déjà créé (réédition → createOrReplace). */
  cmsId?: string | null;
}

export interface SanityPublishResult {
  cmsId: string;
  slug: string;
  url: string;
}

/** Construit l'URL publique de l'article sur le site (Astro, /blog/<slug>/). */
export function articleUrl(slug: string): string {
  return `https://www.bordeluche.com/blog/${slug}/`;
}

export function getSanityConfig(): SanityConfig | null {
  const token = process.env.SANITY_WRITE_TOKEN;
  if (!token) return null;
  return {
    projectId: process.env.SANITY_PROJECT_ID || '5idghvob',
    dataset: process.env.SANITY_DATASET || 'production',
    token
  };
}

/** Slugify simple : minuscules, sans accents, tirets entre mots. */
export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

/** Upload une image (dataURL) vers les assets Sanity → renvoie l'_id de l'asset. */
async function uploadCoverImage(config: SanityConfig, dataUrl: string): Promise<string> {
  const m = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/);
  if (!m) throw new Error('Image de couverture invalide : dataURL image attendu');
  const contentType = m[1] ?? 'image/png';
  const buffer = Buffer.from(m[2] ?? '', 'base64');
  if (buffer.length === 0) throw new Error('Image de couverture vide');

  const res = await fetch(
    `https://${config.projectId}.api.sanity.io/v2021-06-07/assets/images/${config.dataset}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': contentType
      },
      body: buffer
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload coverImage Sanity ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { _id?: string };
  if (!json._id) throw new Error('Upload coverImage Sanity : reponse sans _id');
  return json._id;
}

/** Envoie une mutation au datastore Sanity. */
async function mutate(config: SanityConfig, mutations: Record<string, unknown>[]): Promise<{ results?: { id: string }[] }> {
  const res = await fetch(
    `https://${config.projectId}.api.sanity.io/v2021-06-07/data/mutate/${config.dataset}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mutations })
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Mutation Sanity ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<{ results?: { id: string }[] }>;
}

/**
 * Publie (ou met à jour) un article dans Sanity.
 *
 * Flux identique au pipeline existant (push-bor*.mjs) :
 *   1. upload de la coverImage si fournie → asset _id
 *   2. doc post : title, slug, seoTitle/seoDescription, category, publishedAt,
 *      readingTime, excerpt, rawHtml (le corps HTML), coverImage (asset + alt)
 *   3. si cmsId → createOrReplace (réédition) ; sinon create → si l'id créé
 *      commence par 'drafts.', createOrReplace avec l'id sans préfixe + delete
 *
 * Renvoie { cmsId, slug, url } pour persister la liaison Atelier ↔ Sanity.
 */
export async function publishArticle(config: SanityConfig, input: SanityArticleInput): Promise<SanityPublishResult> {
  const slug = input.slug || slugify(input.title);
  const title = input.title.trim();
  if (!title) throw new Error('Titre de l\'article requis');
  if (!slug) throw new Error('Slug invalide (genere depuis le titre)');

  // 1. Cover image
  let coverImage: Record<string, unknown> | undefined;
  if (input.coverImage?.dataUrl) {
    const assetId = await uploadCoverImage(config, input.coverImage.dataUrl);
    coverImage = {
      _type: 'image',
      asset: { _type: 'reference', _ref: assetId },
      alt: input.coverImage.alt || input.title
    };
  }

  // 2. Document post
  const doc: Record<string, unknown> = {
    _type: 'post',
    title,
    slug: { _type: 'slug', current: slug },
    rawHtml: input.rawHtml,
    ctaType: 'rdv'
  };
  if (input.seoTitle) doc.seoTitle = input.seoTitle;
  if (input.seoDescription) doc.seoDescription = input.seoDescription;
  if (input.category) doc.category = input.category;
  if (input.publishedAt) doc.publishedAt = input.publishedAt;
  if (typeof input.readingTime === 'number' && Number.isFinite(input.readingTime)) {
    doc.readingTime = input.readingTime;
  }
  if (input.excerpt) doc.excerpt = input.excerpt;
  if (coverImage) doc.coverImage = coverImage;

  // 3. Publication (createOrReplace si réédition, sinon create → promotion)
  let cmsId: string;
  if (input.cmsId) {
    await mutate(config, [{ createOrReplace: { _id: input.cmsId, ...doc } }]);
    cmsId = input.cmsId;
  } else {
    const created = await mutate(config, [{ create: doc }]);
    const createdId = created.results?.[0]?.id;
    if (!createdId) throw new Error('Sanity : creation sans id en retour');
    if (createdId.startsWith('drafts.')) {
      const publishedId = createdId.replace('drafts.', '');
      await mutate(config, [
        { createOrReplace: { _id: publishedId, ...doc } },
        { delete: { _id: createdId } }
      ]);
      cmsId = publishedId;
    } else {
      cmsId = createdId;
    }
  }

  return { cmsId, slug, url: articleUrl(slug) };
}
