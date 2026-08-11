/**
 * Charte graphique active : tokens de marque (couleurs, polices, rayons, logos,
 * ton) partagés entre la page Charte et le rendu des slides (F-29).
 *
 * Deux usages :
 *  - BrandPage : édition + import CSS ;
 *  - DraftDetail (capture) : le HTML source produit par l'agent peut référencer
 *    les tokens de la charte via des variables CSS (var(--bordeaux),
 *    var(--charte-couleur-bordeaux), var(--charte-police-titre),
 *    var(--rayon-carte), var(--logo)...) ; on injecte ces variables dans le
 *    holder de capture au moment du rendu pour que les slides portent la marque.
 */

export interface CharteData {
  couleurs: Record<string, string>;
  polices: { titre: string; texte: string };
  rayons: Record<string, string>;
  logos: string[];
  ton: { voix: string };
  motsEviter: string[];
}

export const DEFAULT_CHARTE: CharteData = {
  couleurs: {},
  polices: { titre: '', texte: '' },
  rayons: {},
  logos: [],
  ton: { voix: '' },
  motsEviter: []
};

export function parseCharte(data: string): CharteData {
  try {
    const parsed = JSON.parse(data);
    return {
      couleurs: parsed.couleurs || {},
      polices: { titre: parsed.polices?.titre || '', texte: parsed.polices?.texte || '' },
      rayons: parsed.rayons || {},
      logos: Array.isArray(parsed.logos) ? parsed.logos : [],
      ton: { voix: parsed.ton?.voix || '' },
      motsEviter: Array.isArray(parsed.motsEviter) ? parsed.motsEviter : []
    };
  } catch {
    return DEFAULT_CHARTE;
  }
}

// --- Sanitisation des valeurs injectées : la charte est un contenu user, on
// ne renvoie jamais de CSS arbitraire dans le rendu. ---

const RE_NOM = /^[a-zA-Z0-9_-]+$/;
const RE_COULEUR = /^(#[0-9a-fA-F]{3,8}|(?:rgb|hsl|oklch|lab|lch)\([^;{}]*\)|[a-zA-Z]+)$/;
const RE_POLICE = /^[A-Za-z0-9 .'",-]+$/;
const RE_RAYON = /^[0-9.]+(?:px|rem|em|%)?$/;
const RE_LOGO = /^https?:\/\/\S+$/;

function couleurCSS(v: string): string | null {
  const t = v.trim();
  return RE_COULEUR.test(t) ? t : null;
}

/** Première famille de police (avant la première virgule), sans guillemets. */
function premiereFamille(v: string): string | null {
  const premiere = v.split(',')[0] ?? '';
  const t = premiere.trim().replace(/["']/g, '');
  return /^[A-Za-z0-9 +-]+$/.test(t) && t.length > 0 ? t : null;
}

function policeCSS(v: string): string | null {
  const t = v.trim();
  if (!t || !RE_POLICE.test(t)) return null;
  return t.replace(/"/g, "'");
}

function rayonCSS(v: string): string | null {
  const t = v.trim();
  return RE_RAYON.test(t) ? t : null;
}

function logoURL(v: string): string | null {
  const t = v.trim();
  return RE_LOGO.test(t) ? t : null;
}

/**
 * Bloc CSS `:root` exposant les tokens de la charte en variables CSS.
 * Chaque token est exposé deux fois : sous le nom brut de la charte
 * (--bordeaux) et sous le préfixe --charte-couleur-* / --charte-police-* /
 * --charte-rayon-* / --charte-logo-N. Le HTML source peut utiliser l'un ou
 * l'autre ; injecté APRÈS le style du HTML source, il gagne en cascade.
 */
export function buildCharteCss(charte: CharteData): string {
  const lignes: string[] = [];
  for (const [nom, valeur] of Object.entries(charte.couleurs)) {
    if (!RE_NOM.test(nom)) continue;
    const v = couleurCSS(valeur);
    if (!v) continue;
    lignes.push(`  --charte-couleur-${nom}: ${v};`);
    lignes.push(`  --${nom}: ${v};`);
  }
  const policeTitre = charte.polices.titre ? policeCSS(charte.polices.titre) : null;
  if (policeTitre) {
    lignes.push(`  --charte-police-titre: ${policeTitre};`);
    lignes.push(`  --police-titre: ${policeTitre};`);
  }
  const policeTexte = charte.polices.texte ? policeCSS(charte.polices.texte) : null;
  if (policeTexte) {
    lignes.push(`  --charte-police-texte: ${policeTexte};`);
    lignes.push(`  --police-texte: ${policeTexte};`);
  }
  for (const [nom, valeur] of Object.entries(charte.rayons)) {
    if (!RE_NOM.test(nom)) continue;
    const v = rayonCSS(valeur);
    if (!v) continue;
    lignes.push(`  --charte-rayon-${nom}: ${v};`);
    lignes.push(`  --rayon-${nom}: ${v};`);
  }
  charte.logos.forEach((logo, i) => {
    const u = logoURL(logo);
    if (!u) return;
    lignes.push(`  --charte-logo-${i + 1}: url('${u}');`);
    if (i === 0) lignes.push(`  --logo: url('${u}');`);
  });
  if (lignes.length === 0) return '';
  return `:root {\n${lignes.join('\n')}\n}`;
}

/**
 * Règles de repli appliquées au rendu des slides : le clone capturé perd
 * l'héritage du body du document source (il est dessiné dans un SVG isolé),
 * donc on pose explicitement les polices de la charte sur .slide.
 */
export function buildCharteFallbackCss(charte: CharteData): string {
  if (!charte.polices.texte && !charte.polices.titre) return '';
  const texte = charte.polices.texte ? policeCSS(charte.polices.texte) : null;
  const titre = charte.polices.titre ? policeCSS(charte.polices.titre) : null;
  const l: string[] = [];
  if (texte) {
    l.push(`.slide { font-family: ${texte}; }`);
  }
  if (titre) {
    l.push(`.slide h1, .slide h2, .slide h3, .slide h4 { font-family: ${titre}; }`);
  }
  return l.join('\n');
}

/**
 * URL Google Fonts pour les polices de la charte (null si aucune police
 * exploitable). Charge la première famille de chaque slot (titre/texte).
 */
export function buildCharteFontLink(charte: CharteData): string | null {
  const familles = [charte.polices.titre, charte.polices.texte]
    .map((f) => (f ? premiereFamille(f) : null))
    .filter((f): f is string => f !== null)
    .filter((f, i, arr) => arr.indexOf(f) === i);
  if (familles.length === 0) return null;
  return `https://fonts.googleapis.com/css2?family=${familles.join('&family=')}&display=swap`;
}
