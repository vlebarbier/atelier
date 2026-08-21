// Test isole : reproduit le pipeline F-29 (holder + charte + html-to-image toPng)
// dans une page vierge, pour isoler pourquoi le PNG sort blanc en prod.
const { chromium } = require('/Users/victorlebarbier/.hermes/hermes-agent/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const HTML_SOURCE = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
  .slide { width: 1080px; height: 1080px; background: var(--bordeaux); display: flex; align-items: center; justify-content: center; }
  .slide h1 { font-family: var(--police-titre, sans-serif); color: #fff; font-size: 72px; }
</style></head><body><div class="slide"><h1>Test F-29</h1></div></body></html>`;

// Charte Bordeluche (structure reelle de prod)
const CHARTE = {
  couleurs: { bordeaux: '#422928', ivoire: '#f1efea', sauge: '#6f7f75', perle: '#b0bbb4', gold: '#e8c97a' },
  polices: { titre: 'Cormorant Garamond', texte: 'Jost' },
  rayons: {},
  logos: ['logo-bordeluche.svg'],
  ton: { voix: '' },
  motsEviter: []
};

const RE_NOM = /^[a-zA-Z0-9_-]+$/;
const RE_COULEUR = /^(#[0-9a-fA-F]{3,8}|(?:rgb|hsl|oklch|lab|lch)\([^;{}]*\)|[a-zA-Z]+)$/;

// Genere le CSS exactement comme apps/web/src/charte.ts (buildCharteCss + fallback)
function buildCharteCss(charte) {
  const lignes = [];
  for (const [nom, valeur] of Object.entries(charte.couleurs)) {
    if (!RE_NOM.test(nom)) continue;
    const t = valeur.trim();
    if (!RE_COULEUR.test(t)) continue;
    lignes.push(`  --charte-couleur-${nom}: ${t};`);
    lignes.push(`  --${nom}: ${t};`);
  }
  if (charte.polices.titre) {
    lignes.push(`  --charte-police-titre: ${charte.polices.titre.replace(/"/g, "'")};`);
    lignes.push(`  --police-titre: ${charte.polices.titre.replace(/"/g, "'")};`);
  }
  if (charte.polices.texte) {
    lignes.push(`  --charte-police-texte: ${charte.polices.texte.replace(/"/g, "'")};`);
    lignes.push(`  --police-texte: ${charte.polices.texte.replace(/"/g, "'")};`);
  }
  for (const [nom, valeur] of Object.entries(charte.rayons)) {
    if (!RE_NOM.test(nom)) continue;
    lignes.push(`  --charte-rayon-${nom}: ${valeur};`);
    lignes.push(`  --rayon-${nom}: ${valeur};`);
  }
  if (lignes.length === 0) return '';
  return `:root {\n${lignes.join('\n')}\n}`;
}
function buildCharteFallbackCss(charte) {
  const l = [];
  if (charte.polices.texte) l.push(`.slide { font-family: ${charte.polices.texte}; }`);
  if (charte.polices.titre) l.push(`.slide h1, .slide h2, .slide h3, .slide h4 { font-family: ${charte.polices.titre}; }`);
  return l.join('\n');
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));

  const htiPath = path.join(__dirname, '../../node_modules/html-to-image/dist/html-to-image.js');
  const htiSrc = fs.readFileSync(htiPath, 'utf8');
  await page.setContent('<!DOCTYPE html><html><head></head><body></body></html>');
  await page.addScriptTag({ content: htiSrc });

  const tokensCss = buildCharteCss(CHARTE);
  const fallbackCss = buildCharteFallbackCss(CHARTE);

  const result = await page.evaluate(async ({ HTML_SOURCE, tokensCss, fallbackCss }) => {
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-20000px;top:0;width:1080px;background:#fff;';
    holder.innerHTML = HTML_SOURCE;
    document.body.appendChild(holder);

    const style = document.createElement('style');
    style.textContent = [tokensCss, fallbackCss].filter(Boolean).join('\n');
    holder.appendChild(style);
    // font link inline (comme le code prod)
    try {
      const res = await fetch('https://fonts.googleapis.com/css2?family=Cormorant+Garamond&family=Jost&display=swap');
      if (res.ok) {
        const css = await res.text();
        const s = document.createElement('style');
        s.textContent = css;
        holder.appendChild(s);
      }
    } catch {}

    await new Promise((r) => setTimeout(r, 900));
    const slide = holder.querySelector('.slide');
    const bg = getComputedStyle(slide).backgroundColor;
    const f1 = getComputedStyle(slide).fontFamily;

    let dataUrl = null;
    let err = null;
    let cloneInfo = null;
    try {
      dataUrl = await htmlToImage.toPng(slide, {
        pixelRatio: 2, cacheBust: true,
        width: 1080, height: 1080, backgroundColor: '#ffffff',
        onclone: (docClone) => {
          // Debug : que contient le clone ? Le .slide y est-il ? Quel style ?
          const s = docClone.querySelector('.slide');
          cloneInfo = {
            found: !!s,
            bodyLen: (docClone.body ? docClone.body.innerHTML : '').length,
            hasStyleTags: (docClone.body ? docClone.body.querySelectorAll('style').length : -1),
            rootVars: (() => {
              const r = docClone.documentElement || docClone.querySelector(':root');
              return r ? getComputedStyle(r).getPropertyValue('--bordeaux') : 'no-root';
            })(),
            slideStyle: s ? (s.getAttribute('style') || '').slice(0, 400) : null,
            slideBg: s ? getComputedStyle(s).backgroundColor : null
          };
        }
      });
    } catch (e) {
      err = String(e);
    }

    let pixel = null;
    if (dataUrl) {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(20, 20, 1, 1).data;
      pixel = { w: c.width, h: c.height, coin: [d[0], d[1], d[2]] };
    }
    holder.remove();
    return { bg, f1, dataUrl: !!dataUrl, err, pixel, cloneInfo };
  }, { HTML_SOURCE, tokensCss, fallbackCss });

  console.log('bg calcule:', result.bg);
  console.log('font calculee:', result.f1);
  console.log('cloneInfo:', JSON.stringify(result.cloneInfo));
  console.log('toPng ok:', result.dataUrl, result.err ? `ERR: ${result.err.slice(0, 150)}` : '');
  console.log('pixel PNG:', JSON.stringify(result.pixel));
  console.log('erreurs console:', errors.length, errors.slice(0, 3).map((e) => e.slice(0, 100)));
  await browser.close();
})();
