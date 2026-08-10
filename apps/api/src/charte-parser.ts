/**
 * Parse une charte graphique depuis un artefact CSS (issu d'un agent, de Claude
 * Design, d'un export Figma, d'un design system). Extrait :
 *  - les variables CSS (--nom: valeur) comme tokens,
 *  - les couleurs (hex, rgb, hsl) dediees,
 *  - les polices (font-family),
 *  - les rayons (border-radius),
 *  - les logos (url() dans les declarations).
 * Le resultat est une charte structuree (couleurs / polices / rayons / logos)
 * pret a etre injectee dans le pipeline de rendu et les instructions agents.
 */

export interface CharteParsee {
  couleurs: Record<string, string>;
  polices: { titre: string; texte: string };
  rayons: Record<string, string>;
  logos: string[];
}

const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB_RE = /rgba?\([^)]+\)/g;
const HSL_RE = /hsla?\([^)]+\)/g;

function normalizeColor(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function isColorLike(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    v.startsWith('#') ||
    v.startsWith('rgb') ||
    v.startsWith('hsl') ||
    v.startsWith('oklch') ||
    v.startsWith('lab(') ||
    v.startsWith('color(') ||
    v === 'transparent' ||
    v.startsWith('var(')
  );
}

/** Extrait le nom lisible d'une couleur (pour les noms de tokens). */
function colorLabel(key: string, value: string): string {
  const k = key.replace(/^--/, '').replace(/[-_]+/g, '-').toLowerCase();
  return k || value.slice(0, 12);
}

export function parseCssCharte(css: string): CharteParsee {
  const couleurs: Record<string, string> = {};
  const polices: { titre: string; texte: string } = { titre: '', texte: '' };
  const rayons: Record<string, string> = {};
  const logos: string[] = [];

  // 1. Variables CSS : --nom: valeur;
  const varRe = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  const varValues: Record<string, string> = {};
  while ((m = varRe.exec(css)) !== null) {
    const keyRaw = m[1];
    const valueRaw = m[2];
    if (keyRaw === undefined || valueRaw === undefined) continue;
    const key = keyRaw;
    const value = normalizeColor(valueRaw);
    varValues[key] = value;
    const lk = key.toLowerCase();

    // Couleur ?
    if (isColorLike(value)) {
      couleurs[colorLabel(key, value)] = value;
    }
    // Rayon ?
    else if (lk.includes('radius') || /^\d+(\.\d+)?px$/.test(value) || value.includes('rem')) {
      rayons[colorLabel(key, value)] = value;
    }
    // Police ?
    else if (lk.includes('font') || lk.includes('police') || lk.includes('typo')) {
      if (lk.includes('titre') || lk.includes('display') || lk.includes('heading')) {
        polices.titre = value;
      } else if (lk.includes('texte') || lk.includes('body') || lk.includes('sans')) {
        polices.texte = value;
      } else if (!polices.titre) {
        polices.titre = value;
      } else {
        polices.texte = value;
      }
    }
  }

  // 2. Regles explicites : font-family / border-radius / background:url() dans les regles.
  const fontRe = /font-family\s*:\s*([^;}]+)/g;
  const fonts: string[] = [];
  while ((m = fontRe.exec(css)) !== null) {
    const famRaw = m[1];
    if (famRaw === undefined) continue;
    const fam = (famRaw.split(',')[0] ?? '').trim().replace(/^['"]|['"]$/g, '');
    if (fam && fam !== 'sans-serif' && fam !== 'serif' && fam !== 'monospace' && !fonts.includes(fam)) {
      fonts.push(fam);
    }
  }
  if (!polices.titre && fonts.length > 0) polices.titre = fonts[0] ?? '';
  if (!polices.texte && fonts.length > 1) polices.texte = fonts[1] ?? '';
  if (!polices.texte && fonts.length === 1) polices.texte = fonts[0] ?? '';

  const radiusRe = /border-radius\s*:\s*([^;}]+)/g;
  const radii: string[] = [];
  while ((m = radiusRe.exec(css)) !== null) {
    const rRaw = m[1];
    if (rRaw === undefined) continue;
    const r = normalizeColor(rRaw);
    if (r && !radii.includes(r)) radii.push(r);
  }
  if (Object.keys(rayons).length === 0 && radii.length > 0) {
    radii.forEach((r, i) => {
      rayons[`radius-${i + 1}`] = r;
    });
  }

  const urlRe = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  while ((m = urlRe.exec(css)) !== null) {
    const uRaw = m[1];
    if (uRaw === undefined) continue;
    const u = uRaw.trim();
    if (/^(https?:)?\/\//.test(u) || /^data:image\//.test(u)) {
      if (!logos.includes(u)) logos.push(u);
    }
  }

  // 3. Couleurs brutes (hex/rgb/hsl) si aucune variable couleur n'a ete trouvee.
  if (Object.keys(couleurs).length === 0) {
    const seen = new Set<string>();
    for (const re of [HEX_RE, RGB_RE, HSL_RE]) {
      const src = css.match(re) || [];
      for (const raw of src) {
        const c = normalizeColor(raw);
        if (!seen.has(c)) {
          seen.add(c);
          couleurs[`couleur-${Object.keys(couleurs).length + 1}`] = c;
        }
      }
    }
  }

  return { couleurs, polices, rayons, logos };
}
