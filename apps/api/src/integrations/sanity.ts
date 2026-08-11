/**
 * Intégration CMS Sanity (Bordeluche), publication des articles de blog.
 *
 * Réconciliation avec le pipeline Notion→Sanity existant :
 *   - Les scripts historiques (~/Bordeluche/scripts/migrate-to-sanity.mjs, push-bor*.mjs)
 *     créent des documents `_type: 'post'` avec `_id: 'article-<slug>'` (createOrReplace).
 *   - Ce module utilise le MÊME identifiant : publier deux fois le même slug écrase
 *     proprement le document existant (idempotent), quel que soit l'outil qui l'a créé.
 *   - Le site (astro) rend `rawHtml` en priorité : on y dépose le corps HTML du brouillon
 *     (le « réceptacle » Atelier), champ `sourceHtml`.
 *
 * La config est lue depuis les env (mêmes noms que le pipeline Bordeluche) :
 *   PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET, SANITY_WRITE_TOKEN.
 * Aucun appel n'est fait si la config est absente (mode local sans CMS).
 */
import { createClient, type SanityClient } from '@sanity/client';

export interface SanityConfig {
  projectId: string;
  dataset: string;
  token: string;
}

export interface ArticleCms {
  /** Slug URL de l'article (identifiant de réconciliation : _id = 'article-' + slug). */
  slug: string;
  title: string;
  /** Résumé / chapo (champ `excerpt` du schéma Sanity). */
  excerpt: string;
  /** Corps de l'article en HTML brut (champ `rawHtml`, rendu prioritaire côté site). */
  rawHtml: string;
  seoTitle?: string;
  seoDescription?: string;
  category?: string;
  publishedAt?: string;
  readingTime?: number;
  /** URL de l'image de couverture (uploadée dans les assets Sanity). */
  coverImageUrl?: string;
  coverImageAlt?: string;
}

export function getSanityConfig(): SanityConfig | null {
  const projectId = process.env.PUBLIC_SANITY_PROJECT_ID?.trim();
  const dataset = process.env.PUBLIC_SANITY_DATASET?.trim();
  const token = process.env.SANITY_WRITE_TOKEN?.trim();
  if (!projectId || !dataset || !token) return null;
  return { projectId, dataset, token };
}

function makeClient(config: SanityConfig): SanityClient {
  return createClient({
    projectId: config.projectId,
    dataset: config.dataset,
    apiVersion: '2024-01-01',
    token: config.token,
    useCdn: false
  });
}

/** Télécharge une image distante (http/https) en Buffer. Sert pour la couverture. */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const mod = await import('node:https').catch(() => null);
  const http = (await import('node:http')).default;
  const lib = url.startsWith('https:') ? (mod ? mod.default : null) : http;
  if (!lib) throw new Error('https introuvable');
  return new Promise((resolve, reject) => {
    const req = lib.get(url, (res: { statusCode?: number; headers: { location?: string }; on: (e: string, cb: (chunk: Buffer) => void) => void }) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchImageBuffer(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} en téléchargeant ${url}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

export interface PublicationCms {
  id: string;
  url: string;
  slug: string;
}

/**
 * Publie (ou remplace) un article dans Sanity. `_id: 'article-<slug>'` pour
 * réconcilier avec le pipeline Notion→Sanity existant (createOrReplace).
 * Le document est créé directement en published (pas de draft Sanity) :
 * la validation se fait dans Atelier avant d'appeler cette fonction.
 */
export async function publierArticleCms(article: ArticleCms): Promise<PublicationCms> {
  const config = getSanityConfig();
  if (!config) {
    throw new Error('CMS non configuré : PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET / SANITY_WRITE_TOKEN requis');
  }
  const client = makeClient(config);
  const docId = `article-${article.slug}`;

  let coverImage: { _type: string; asset: { _type: string; _ref: string }; alt: string } | undefined;
  if (article.coverImageUrl) {
    const buffer = await fetchImageBuffer(article.coverImageUrl);
    const asset = await client.assets.upload('image', buffer, {
      filename: `${article.slug}-cover.jpg`,
      contentType: 'image/jpeg'
    });
    coverImage = {
      _type: 'image',
      asset: { _type: 'reference', _ref: asset._id },
      alt: article.coverImageAlt || article.title
    };
  }

  const doc = {
    _type: 'post' as const,
    _id: docId,
    title: article.title,
    slug: { _type: 'slug' as const, current: article.slug },
    excerpt: article.excerpt,
    rawHtml: article.rawHtml,
    ...(article.seoTitle ? { seoTitle: article.seoTitle } : {}),
    ...(article.seoDescription ? { seoDescription: article.seoDescription } : {}),
    ...(article.category ? { category: article.category } : {}),
    ...(article.publishedAt ? { publishedAt: article.publishedAt } : {}),
    ...(article.readingTime ? { readingTime: article.readingTime } : {}),
    ...(coverImage ? { coverImage } : {})
  };

  await client.createOrReplace(doc);
  return { id: docId, url: `https://bordeluche.com/blog/${article.slug}`, slug: article.slug };
}
