// Serveur MCP Atelier : expose les brouillons de contenu aux agents IA (Hermes, Claude Code, Codex...).
// Outils : liste_brouillons, lire_brouillon, set_statut, set_notes, set_legende,
//          regenerer_slides, creer_brouillon_postiz.
// Usage : node dist/index.js   (stdio) — configurer dans le client MCP de l'agent.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { AtelierClient, AtelierApiError } from './client.js';

const STATUTS = ['brouillon', 'a-valider', 'valide', 'publie'] as const;
const RESEAUX = ['instagram', 'linkedin', 'facebook', 'x', 'tiktok'] as const;

const client = new AtelierClient();
const server = new McpServer({ name: 'atelier', version: '0.1.0' });

function rep(ok: boolean, data: Record<string, unknown>): { content: { type: 'text'; text: string }[] } {
  return { content: [{ type: 'text', text: JSON.stringify({ ok, ...data }, null, 2) }] };
}

// ═════════════════ CONTENU ══════════════════════════════════════════════

server.tool(
  'liste_brouillons',
  'Liste les brouillons de contenu (carrousels, posts) avec id, titre, statut (brouillon/a-valider/valide/publie), nombre de slides et date de mise à jour.',
  {},
  async () => {
    try {
      const data = await client.listeBrouillons();
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return rep(false, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

server.tool(
  'lire_brouillon',
  'Détail complet d\'un brouillon : slides, notes, statut et légendes par réseau (caption, hashtags, statut par réseau).',
  { id: z.string().describe('Identifiant du brouillon (ex: carrousel-bordeluche-v7)') },
  async ({ id }) => {
    try {
      const data = await client.lireBrouillon(id);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (e) {
      return rep(false, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

server.tool(
  'set_statut',
  'Change le statut d\'un brouillon. Statuts : brouillon, a-valider, valide, publie.',
  {
    id: z.string().describe('Identifiant du brouillon'),
    statut: z.enum(STATUTS).describe('Nouveau statut')
  },
  async ({ id, statut }) => {
    try {
      await client.setStatut(id, statut);
      return rep(true, { id, statut });
    } catch (e) {
      return rep(false, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

server.tool(
  'set_notes',
  'Écrit les notes de révision d\'un brouillon (remplace les notes existantes).',
  {
    id: z.string().describe('Identifiant du brouillon'),
    notes: z.string().describe('Notes de révision')
  },
  async ({ id, notes }) => {
    try {
      await client.setNotes(id, notes);
      return rep(true, { id, notes: notes.slice(0, 100) });
    } catch (e) {
      return rep(false, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

server.tool(
  'set_legende',
  'Écrit la légende (caption + hashtags) d\'un réseau social pour un brouillon. Réseaux : instagram, linkedin, facebook, x, tiktok.',
  {
    id: z.string().describe('Identifiant du brouillon'),
    reseau: z.enum(RESEAUX).describe('Réseau social'),
    caption: z.string().default('').describe('Texte du post'),
    hashtags: z.string().default('').describe('Hashtags séparés par des espaces')
  },
  async ({ id, reseau, caption, hashtags }) => {
    try {
      await client.setLegende(id, reseau, caption, hashtags);
      return rep(true, { id, reseau, caption: caption.slice(0, 80) });
    } catch (e) {
      return rep(false, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

// ═════════════════ VISUELS ══════════════════════════════════════════════

server.tool(
  'regenerer_slides',
  'Régénère les slides d\'un carrousel depuis son HTML source via le pipeline de rendu (packages/render), puis copie les PNG dans le dossier du brouillon cible.',
  {
    source_html: z.string().describe('Nom du fichier HTML source (ex: carrousel-v4.html)'),
    sortie_id: z.string().describe('Id du brouillon cible (ex: carrousel-bordeluche-v7)')
  },
  async ({ source_html, sortie_id }) => {
    try {
      const { renderSlides } = await import('@atelier/render');
      const { execFileSync } = await import('node:child_process');
      const path = await import('node:path');
      const fs = await import('node:fs');

      // 1. Rendre les slides depuis le HTML source (le render attend un chemin absolu)
      const sourceDir = process.env.ATELIER_SOURCES_DIR || process.cwd();
      const source = path.join(sourceDir, source_html);
      if (!fs.existsSync(source)) {
        return rep(false, { error: `source HTML introuvable : ${source}` });
      }
      const outDir = path.join(sourceDir, 'slides-generees', sortie_id);
      fs.mkdirSync(outDir, { recursive: true });
      const fichiers = await renderSlides({ source, outDir });

      // 2. Copier vers le dossier du brouillon (celui servi par l'API /b/:id/)
      const dataDir = process.env.ATELIER_DATA_DIR || path.join(sourceDir, 'data', 'brouillons');
      const dstDir = path.join(dataDir, sortie_id, 'slides');
      fs.mkdirSync(dstDir, { recursive: true });
      for (const f of fichiers) {
        const dest = path.join(dstDir, path.basename(f));
        fs.copyFileSync(f, dest);
      }
      return rep(true, { slides_generees: fichiers.length, brouillon: sortie_id });
    } catch (e) {
      return rep(false, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

// ═════════════════ POSTIZ ═══════════════════════════════════════════════

server.tool(
  'set_source',
  'Dépose la source HTML d\'un brouillon (le document de travail produit par l\'agent : carrousel, post, story, article). Le HTML est la source de vérité, les PNG sont régénérés depuis lui via regenerer_slides.',
  {
    id: z.string().describe('Identifiant du brouillon (crée-le d\'abord si besoin)'),
    source_html: z.string().describe('Le document HTML complet produit par l\'agent')
  },
  async ({ id, source_html }) => {
    try {
      await client.setSource(id, source_html);
      return rep(true, { id, source_html: source_html.slice(0, 80) });
    } catch (e) {
      return rep(false, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

server.tool(
  'creer_brouillon_postiz',
  'Crée un brouillon Postiz pour un brouillon donné : uploade les slides puis crée le post en statut draft (jamais publié automatiquement, workflow brouillon → validation → publication).',
  {
    id: z.string().describe('Identifiant du brouillon'),
    reseau: z.enum(RESEAUX).describe('Réseau social cible'),
    caption: z.string().describe('Texte du post'),
    integration_id: z.string().optional().describe('Id d\'intégration Postiz (défaut : Instagram Bordeluche)')
  },
  async ({ id, reseau, caption, integration_id }) => {
    try {
      const { execFileSync } = await import('node:child_process');
      const path = await import('node:path');
      const fs = await import('node:fs');

      // 1. Récupérer les slides via l'API
      const brouillon = await client.lireBrouillon(id) as { slides?: string[] };
      const slides = brouillon?.slides || [];
      if (!slides.length) return rep(false, { error: 'Aucune slide dans ce brouillon' });

      // 2. Uploader chaque slide → URL (le CLI postiz renvoie un JSON avec le champ "path")
      const env = { ...process.env } as Record<string, string>;
      const cliEnv = process.env.POSTIZ_CLI_ENV || '';
      if (cliEnv && fs.existsSync(cliEnv)) {
        const content = fs.readFileSync(cliEnv, 'utf8');
        for (const line of content.split('\n')) {
          const l = line.trim().replace(/^export\s+/, '');
          const idx = l.indexOf('=');
          if (idx > 0 && !l.startsWith('#')) {
            env[l.slice(0, idx).trim()] = l.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
          }
        }
      }
      const integ = integration_id || process.env.ATELIER_INSTAGRAM_INTEGRATION_ID || '';

      const dataDir = process.env.ATELIER_DATA_DIR || path.join(process.cwd(), 'data', 'brouillons');
      const mediaUrls: string[] = [];
      for (const s of slides) {
        const local = path.join(dataDir, id, s);
        if (!fs.existsSync(local)) return rep(false, { error: `fichier introuvable : ${local}` });
        const out = execFileSync('postiz', ['upload', local], { env, encoding: 'utf8', timeout: 120_000 });
        const jsonStart = out.indexOf('{');
        let url = '';
        try {
          const parsed = jsonStart >= 0 ? JSON.parse(out.slice(jsonStart)) : {};
          url = parsed.path || parsed.url || '';
        } catch { /* fallback ci-dessous */ }
        if (!url) url = out.trim().replace(/^"|"$/g, '');
        if (!url) return rep(false, { error: `URL introuvable dans la réponse upload : ${out.slice(0, 200)}` });
        mediaUrls.push(url);
      }

      // 3. Créer le post draft (post_type=post pour un carrousel Instagram)
      const settings = JSON.stringify({ post_type: 'post' });
      const cmd = [
        'posts:create',
        '-c', caption,
        '-m', mediaUrls.join(','),
        '-i', integ,
        '-t', 'draft',
        '--settings', settings,
        '-s', '2026-01-01T00:00:00Z'
      ];
      const r = execFileSync('postiz', cmd, { env, encoding: 'utf8', timeout: 120_000 });
      return rep(true, { id, reseau, slides_uploaded: mediaUrls.length, postiz: r.slice(0, 300) });
    } catch (e) {
      return rep(false, { error: e instanceof Error ? e.message : String(e) });
    }
  }
);

// ═════════════════ BOOT ═════════════════════════════════════════════════

const transport = new StdioServerTransport();
await server.connect(transport);
