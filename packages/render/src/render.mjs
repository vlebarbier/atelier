// packages/render/src/render.mjs
// Pipeline de rendu HTML -> PNG pour les slides de carrousel.
// Adapte de archive/render-original.cjs (prototype Bordeluche), porte en ESM.
// Usage : node src/render.mjs <source.html> [dossier-sortie]
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Rend chaque element .slide d'une page HTML en PNG individuel.
 * @param {object} options
 * @param {string} options.source chemin du fichier HTML source
 * @param {string} options.outDir dossier de sortie pour les PNG
 * @param {number} [options.size] taille du viewport carre (px)
 * @param {number} [options.scale] deviceScaleFactor (2 = @2x)
 * @returns {Promise<string[]>} chemins des fichiers generes
 */
export async function renderSlides({ source, outDir, size = 1080, scale = 2 }) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: scale
    });
    const fileUrl = 'file://' + path.resolve(source);
    await page.goto(fileUrl, { waitUntil: 'networkidle' });

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const slideCount = await page.locator('.slide').count();
    const written = [];

    for (let i = 0; i < slideCount; i++) {
      const slide = page.locator('.slide').nth(i);
      await slide.scrollIntoViewIfNeeded();
      const name = `slide-${String(i + 1).padStart(2, '0')}.png`;
      const dest = path.join(outDir, name);
      await slide.screenshot({ path: dest });
      written.push(dest);
    }

    return written;
  } finally {
    await browser.close();
  }
}

async function main() {
  const source = process.argv[2] || 'carrousel-v4.html';
  const outArg = process.argv[3] || 'slides';
  const outDir = path.resolve(dir, '..', outArg);
  console.log(`Rendu de ${source} vers ${outDir}`);
  const written = await renderSlides({ source, outDir });
  for (const file of written) console.log(`slide generee : ${file}`);
  console.log('Termine.');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
