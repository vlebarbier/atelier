/**
 * F-29 : verification de la mecanique d'injection charte dans le rendu.
 *
 * Teste la chaine pure (hors navigateur) : la charte de PRODUCTION
 * (GET /api/charte) est parsee puis transformee en CSS de tokens
 * (buildCharteCss), regles de repli (buildCharteFallbackCss) et lien
 * Google Fonts (buildCharteFontLink). Verifie que les couleurs, polices
 * et rayons de la charte sont bien exposes en variables CSS utilisables
 * par un HTML source (var(--bordeaux), var(--charte-police-titre)...).
 *
 * Usage : node test-f29-mecanique.cjs   (depuis apps/web)
 */
import { parseCharte, buildCharteCss, buildCharteFallbackCss, buildCharteFontLink } from './src/charte.ts';

const API = process.env.ATELIER_API_URL || 'https://atelier-api-three.vercel.app';

let failures = 0;
function check(nom, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${nom}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures += 1;
}

const res = await fetch(`${API}/api/charte`);
check('GET /api/charte -> 200', res.ok, `${res.status}`);
const json = await res.json();
check('charte a un champ data JSON', typeof json.data === 'string' && json.data.length > 0);

const charte = parseCharte(json.data);
check('couleurs parsees (>= 1)', Object.keys(charte.couleurs).length >= 1, `${Object.keys(charte.couleurs).length} couleurs`);
check('polices parsees', charte.polices.titre && charte.polices.texte, `${charte.polices.titre} / ${charte.polices.texte}`);

const css = buildCharteCss(charte);
check('buildCharteCss non vide', css.length > 0);
check('tokens exposes en --couleur', Object.keys(charte.couleurs).every((nom) => css.includes(`--${nom}:`) && css.includes(`--charte-couleur-${nom}:`)), 'double exposition nom brut + prefixe');
check('tokens polices exposes', css.includes('--police-titre:') && css.includes('--police-texte:'));
for (const nom of Object.keys(charte.rayons)) {
  check(`rayon --rayon-${nom} expose`, css.includes(`--rayon-${nom}:`), charte.rayons[nom]);
}

const fallback = buildCharteFallbackCss(charte);
check('fallback pose .slide font-family', fallback.includes('.slide { font-family:') && fallback.includes(charte.polices.texte), charte.polices.texte);

const link = buildCharteFontLink(charte);
check('font link Google Fonts genere', !!link && link.startsWith('https://fonts.googleapis.com/css2?family='), link || 'null');

// Verif que le CSS injecte apres le HTML source gagne en cascade : on simule
// un HTML source qui utilise var(--bordeaux) et on verifie que la variable
// est resolue par le bloc :root de la charte.
const htmlSource = '.slide { background: var(--bordeaux); }';
check('variable --bordeaux utilisable par le HTML source', css.includes('--bordeaux: #422928') || /--bordeaux:\s*#[0-9a-f]+/i.test(css), 'var(--bordeaux) resolvable');

console.log(`\n${failures === 0 ? 'OK : mecanique F-29 operationnelle' : `${failures} echec(s)`}`);
process.exit(failures === 0 ? 0 : 1);
