/**
 * Intégration Postiz (self-hosted, issue #5) — API REST publique.
 *
 * Spec extraite du code du CLI officiel (postiz 2.0.15) :
 *   - Upload : POST {apiUrl}/public/v1/upload  (FormData "file", header Authorization: <apiKey>)
 *              → JSON avec le champ `path` (URL du média uploadé)
 *   - Création : POST {apiUrl}/public/v1/posts (JSON, même header)
 *              → { type: 'draft'|'schedule', date: ISO8601, posts: [{ integration: {id}, value: [...] }] }
 *
 * Règle inaliénable (workflow brouillon → validation → publication) : ce module
 * ne crée JAMAIS de post en type 'schedule'. Toujours 'draft' ; la promotion
 * vers la programmation est un acte humain dans Postiz.
 *
 * La config est lue depuis, dans l'ordre :
 *   1. POSTIZ_API_URL / POSTIZ_API_KEY (env directes)
 *   2. POSTIZ_CLI_ENV (chemin d'un fichier shell `export POSTIZ_*=...`)
 *   3. ~/postiz/cli.env (chemin par défaut documenté)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface PostizConfig {
  apiUrl: string;
  apiKey: string;
}

export interface PostizDraftInput {
  integrationId: string;
  caption: string;
  mediaUrls: string[];
  /** Date de programmation visée (ISO 8601). Le post reste un draft, la date est indicative. */
  date: string;
  /** Réglages spécifiques (ex: { post_type: 'post' } pour un carrousel Instagram). */
  settings?: Record<string, unknown>;
}

/** Normalise l'URL d'API : exige le suffixe /api (piège CLI : sans lui, réponse HTML → parse échoue). */
export function normalizeApiUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

/** Parse un fichier d'env shell (export KEY=value) et retourne les clés POSTIZ_*. */
function parseEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const l = line.trim().replace(/^export\s+/, '');
    if (!l || l.startsWith('#')) continue;
    const idx = l.indexOf('=');
    if (idx <= 0) continue;
    const key = l.slice(0, idx).trim();
    if (!key.startsWith('POSTIZ_')) continue;
    out[key] = l.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/** Charge la config Postiz. Retourne null si indisponible (raccord non configuré). */
export function getPostizConfig(): PostizConfig | null {
  const directUrl = process.env.POSTIZ_API_URL?.trim();
  const directKey = process.env.POSTIZ_API_KEY?.trim();

  let env: Record<string, string> = {};
  const cliEnv = process.env.POSTIZ_CLI_ENV || path.join(os.homedir(), 'postiz', 'cli.env');
  if (fs.existsSync(cliEnv)) env = parseEnvFile(cliEnv);

  const apiUrl = directUrl || env.POSTIZ_API_URL || '';
  const apiKey = directKey || env.POSTIZ_API_KEY || '';
  if (!apiUrl || !apiKey) return null;
  return { apiUrl: normalizeApiUrl(apiUrl), apiKey };
}

/** Upload un média vers Postiz. Retourne l'URL (champ `path` de la réponse). */
export async function postizUpload(config: PostizConfig, buffer: Buffer, filename: string): Promise<string> {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const mimeTypes: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', mp4: 'video/mp4', mov: 'video/quicktime',
    webm: 'video/webm', pdf: 'application/pdf'
  };
  const type = mimeTypes[ext] || 'application/octet-stream';
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type }), filename);

  const res = await fetch(`${config.apiUrl}/public/v1/upload`, {
    method: 'POST',
    headers: { Authorization: config.apiKey },
    body: form
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Postiz upload failed (${res.status}): ${err.slice(0, 300)}`);
  }
  const json = (await res.json()) as { path?: string; url?: string };
  const url = json.path || json.url || '';
  if (!url) throw new Error(`Postiz upload: URL absente de la réponse: ${JSON.stringify(json).slice(0, 300)}`);
  return url;
}

/** Crée un post Postiz en DRAFT (jamais schedule). Retourne l'id du post. */
export async function postizCreateDraft(config: PostizConfig, input: PostizDraftInput): Promise<string> {
  const media = input.mediaUrls.map((url) => ({
    id: Math.random().toString(36).substring(7),
    path: url
  }));
  const payload = {
    type: 'draft',
    creationMethod: 'API',
    date: input.date,
    shortLink: false,
    tags: [] as string[],
    posts: [
      {
        integration: { id: input.integrationId },
        value: [
          {
            content: input.caption,
            image: media,
            delay: 0
          }
        ],
        settings: input.settings || { post_type: 'post' }
      }
    ]
  };

  const res = await fetch(`${config.apiUrl}/public/v1/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: config.apiKey },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Postiz posts:create failed (${res.status}): ${err.slice(0, 400)}`);
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error(`Postiz posts:create: id absent de la réponse: ${JSON.stringify(json).slice(0, 300)}`);
  return json.id;
}

/** Liste les canaux connectés. Retourne la liste brute (champ `id` + `name` + `disabled`). */
export async function postizListIntegrations(config: PostizConfig): Promise<Array<{ id: string; name?: string; disabled?: boolean }>> {
  const res = await fetch(`${config.apiUrl}/public/v1/integrations`, {
    method: 'GET',
    headers: { Authorization: config.apiKey }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Postiz integrations failed (${res.status}): ${err.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data?: Array<{ id: string; name?: string; disabled?: boolean }> } | Array<{ id: string; name?: string; disabled?: boolean }>;
  const list = Array.isArray(json) ? json : json.data || [];
  return list.filter((i) => i && typeof i.id === 'string' && !i.disabled);
}

/** Supprime un post Postiz (nettoyage / rollback). Retourne true si 200. */
export async function postizDeletePost(config: PostizConfig, postId: string): Promise<boolean> {
  const res = await fetch(`${config.apiUrl}/public/v1/posts/${postId}`, {
    method: 'DELETE',
    headers: { Authorization: config.apiKey }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Postiz posts:delete failed (${res.status}): ${err.slice(0, 300)}`);
  }
  return true;
}
