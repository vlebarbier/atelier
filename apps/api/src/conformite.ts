/**
 * Contrôle de conformité à la charte (F-33 badge, F-34 détail des écarts) :
 * compare la source HTML d'un brouillon à la charte active et produit un
 * verdict + le détail des écarts (couleurs de marque hors charte, polices
 * hors charte).
 *
 * Module pur, sans dépendance : testable unitairement, consommé par les
 * routes GET /api/brouillon/:id/conformite (détail) et GET /api/conformite
 * (badges de la grille).
 *
 * Choix de conception v1 :
 * - les couleurs achromatiques (blanc, noir, gris) ne sont PAS contrôlées :
 *   les fonds et textes neutres ne sont pas des choix de marque ;
 * - les références aux tokens (var(--charte-*), var(--bordeaux)...) sont
 *   conformes par construction : ce ne sont pas des couleurs littérales ;
 * - les polices génériques (sans-serif, system-ui...) ne sont pas des écarts.
 */

export type StatutConformite = 'conforme' | 'hors-charte' | 'sans-charte' | 'sans-source';

export interface Ecart {
  nature: 'couleur' | 'police';
  /** La valeur hors charte, telle qu'écrite dans la source. */
  valeur: string;
  /** Explication lisible (ex. « utilisée mais absente de la charte »). */
  detail: string;
}

export interface VerdictConformite {
  statut: StatutConformite;
  ecarts: Ecart[];
}

/** La charte lue côté API (JSON de la table charte, shape CharteData du web). */
export interface CharteConformite {
  couleurs?: Record<string, string>;
  polices?: { titre?: string; texte?: string };
}

const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const RGB_RE = /rgba?\(\s*[^)]+\)/g;
const HSL_RE = /hsla?\(\s*[^)]+\)/g;
const FONT_RE = /font-family\s*:\s*([^;}]+)/g;

const POLICES_GENERIQUES = new Set([
  'sans-serif',
  'serif',
  'monospace',
  'system-ui',
  'inherit',
  'initial',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'cursive',
  'fantasy',
  '-apple-system',
  'blinkmacsystemfont'
]);

/** « #rgb » → « #rrggbb », tout en minuscules : la comparaison ignore la casse. */
function normaliserHex(v: string): string {
  const h = v.trim().toLowerCase();
  return h.replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, '#$1$1$2$2$3$3');
}

/** rgb/rgba → « r,g,b » : l'alpha est ignoré, la teinte compte, pas l'opacité. */
function normaliserRgb(v: string): string {
  const m = /rgba?\(\s*([^)]+)\)/.exec(v);
  if (!m || m[1] === undefined) return v.trim().toLowerCase().replace(/\s+/g, ' ');
  return m[1]
    .split(',')
    .slice(0, 3)
    .map((p) => p.trim())
    .join(',');
}

/** Clé de comparaison d'une couleur (charte ou source), normalisée. */
function cleCouleur(v: string): string {
  const t = v.trim().toLowerCase();
  if (t.startsWith('#')) return normaliserHex(t);
  if (t.startsWith('rgb')) return normaliserRgb(t);
  return t.replace(/\s+/g, ' ');
}

/** Une couleur achromatique (blanc, noir, gris) n'est pas un choix de marque. */
function estAchromatique(v: string): boolean {
  const t = v.trim().toLowerCase();
  if (t === 'transparent' || t === 'white' || t === 'black') return true;
  if (t.startsWith('#')) {
    // #rrggbb achromatique ssi rr === gg === bb (ex. #ffffff, #1a1a1a).
    return /^#([0-9a-f]{2})\1\1$/.test(normaliserHex(t));
  }
  if (t.startsWith('rgb')) {
    const parts = normaliserRgb(t).split(',');
    return parts.length === 3 && parts[0] === parts[1] && parts[1] === parts[2];
  }
  if (t.startsWith('hsl')) {
    const m = /hsla?\(\s*[\d.]+%?[\s,]+([\d.]+)%/.exec(t);
    return m ? Number(m[1]) === 0 : false;
  }
  return false;
}

function extraireCouleurs(sourceHtml: string): string[] {
  const trouvees: string[] = [];
  const push = (v: string | undefined) => {
    if (v && !trouvees.includes(v)) trouvees.push(v);
  };
  for (const re of [HEX_RE, RGB_RE, HSL_RE]) {
    for (const m of sourceHtml.matchAll(re)) push(m[0]);
  }
  return trouvees;
}

/** Premières familles des déclarations font-family, sans guillemets. */
function extrairePolices(sourceHtml: string): string[] {
  const familles: string[] = [];
  for (const m of sourceHtml.matchAll(FONT_RE)) {
    const brut = m[1];
    if (!brut) continue;
    const premiere = (brut.split(',')[0] ?? '').trim().replace(/^['"]|['"]$/g, '');
    if (premiere && !familles.includes(premiere)) familles.push(premiere);
  }
  return familles;
}

/** Première famille d'une police de charte, normalisée pour la comparaison. */
function clePolice(v: string): string {
  return (v.split(',')[0] ?? '').trim().replace(/^['"]|['"]$/g, '').toLowerCase();
}

/**
 * Verdict de conformité d'un brouillon face à la charte :
 * - 'sans-charte' : aucune charte exploitable (rien à contrôler)
 * - 'sans-source' : pas de HTML source (rien de produit à contrôler)
 * - 'conforme'    : aucune couleur de marque ni police hors charte
 * - 'hors-charte' : au moins un écart (détail dans `ecarts`)
 */
export function analyserConformite(sourceHtml: string, charte: CharteConformite): VerdictConformite {
  const couleursCharte = Object.values(charte.couleurs ?? {}).map(cleCouleur);
  const policesCharte = [charte.polices?.titre, charte.polices?.texte]
    .filter((p): p is string => Boolean(p))
    .map(clePolice);

  if (couleursCharte.length === 0 && policesCharte.length === 0) {
    return { statut: 'sans-charte', ecarts: [] };
  }
  if (!sourceHtml.trim()) {
    return { statut: 'sans-source', ecarts: [] };
  }

  const ecarts: Ecart[] = [];
  if (couleursCharte.length > 0) {
    for (const c of extraireCouleurs(sourceHtml)) {
      if (estAchromatique(c)) continue;
      if (!couleursCharte.includes(cleCouleur(c))) {
        ecarts.push({ nature: 'couleur', valeur: c, detail: 'couleur utilisée absente de la charte' });
      }
    }
  }
  if (policesCharte.length > 0) {
    for (const p of extrairePolices(sourceHtml)) {
      if (POLICES_GENERIQUES.has(p.toLowerCase())) continue;
      if (!policesCharte.includes(clePolice(p))) {
        ecarts.push({ nature: 'police', valeur: p, detail: 'police utilisée absente de la charte' });
      }
    }
  }
  return { statut: ecarts.length === 0 ? 'conforme' : 'hors-charte', ecarts };
}
