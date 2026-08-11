import type { BrouillonDetail } from './api';
import { slideUrl } from './api';
import { RESEAUX, RESEAUX_LABELS, TYPE_LABELS } from './format';

// ── Export du livrable (F-44) ─────────────────────────────────────────
// Un brouillon (slides + legendes) s'exporte en HTML autonome (tout est
// embarque en base64, aucune dependance au serveur) ou en PDF via
// l'apercu impression du navigateur (une slide par page).
// Pour les documents (pitch deck, plaquette) c'est la sortie principale.

/** Au-dela de cette taille, une video n'est pas incluse dans l'export. */
const MAX_VIDEO_EMBARQUEE = 12 * 1024 * 1024;

function echapper(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Nom de fichier sur depuis un titre ("Pourquoi Bordeluche existe" → pourquoi-bordeluche-existe). */
export function slugifier(titre: string): string {
  const slug = titre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'livrable';
}

/** Recupere un fichier (image/video) et le convertit en data URL base64. */
async function fichierEnDataUrl(url: string): Promise<{ dataUrl: string; taille: number }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(blob);
  });
  return { dataUrl, taille: blob.size };
}

function estVideo(fichier: string): boolean {
  return fichier.endsWith('.mp4') || fichier.endsWith('.webm');
}

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #fff; color: #161616;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { max-width: 860px; margin: 0 auto; padding: 0 32px 72px; }
  .en-tete { padding: 44px 0 20px; border-bottom: 2px solid #111; margin-bottom: 30px; }
  .en-tete h1 { font-size: 26px; line-height: 1.25; margin: 0 0 8px; }
  .en-tete .meta { font-size: 12.5px; color: #6b6b6b; }
  .slide { margin: 0 0 36px; page-break-inside: avoid; }
  .slide figure { margin: 0; text-align: center; }
  .slide img, .slide video {
    max-width: 100%; max-height: 78vh;
    border-radius: 10px; background: #f4f4f2;
    box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 10px 34px rgba(0,0,0,.12);
  }
  .slide figcaption { margin-top: 10px; font-size: 11.5px; color: #8a8a8a; }
  .note-video {
    padding: 42px 20px; text-align: center;
    border: 1px dashed #c9c9c4; border-radius: 10px;
    color: #8a8a8a; font-size: 12.5px;
  }
  .legendes { margin-top: 44px; border-top: 1px solid #e2e2de; padding-top: 22px; }
  .legendes h2 {
    font-size: 11px; text-transform: uppercase; letter-spacing: .14em;
    color: #6b6b6b; margin: 0 0 16px;
  }
  .legende {
    margin-bottom: 16px; padding: 14px 18px;
    border: 1px solid #e2e2de; border-radius: 10px; background: #fafaf9;
  }
  .legende h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; margin: 0 0 8px; color: #444; }
  .legende p { margin: 0 0 6px; font-size: 13.5px; line-height: 1.6; white-space: pre-wrap; }
  .legende p.hashtags { color: #5a5a5a; }
  .barre-impression {
    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
    display: flex; gap: 12px; align-items: center; justify-content: center;
    padding: 12px 16px; background: #111; color: #fff;
  }
  .barre-impression .bi-titre { font-size: 13px; font-weight: 600; margin-right: auto; max-width: 40vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .barre-impression button { font: inherit; font-size: 13px; padding: 8px 18px; border-radius: 999px; border: none; cursor: pointer; }
  .barre-impression .imprimer { background: #fff; color: #111; font-weight: 600; }
  .barre-impression .fermer { background: transparent; color: rgba(255,255,255,.75); }
  body.avec-barre { padding-top: 46px; }
  @media print {
    .barre-impression { display: none; }
    body.avec-barre { padding-top: 0; }
    .en-tete { padding-top: 6px; }
    .slide { page-break-after: always; margin-bottom: 0; }
    .slide:last-of-type { page-break-after: auto; }
    .legendes { page-break-before: always; }
  }
`;

export interface OptionsExport {
  /** Mode apercu impression (PDF) : ajoute la barre d'outils + impression auto. */
  apercuImpression?: boolean;
}

/**
 * Construit le document HTML autonome du brouillon : slides embarquees en
 * base64 + legendes par reseau. Sans aucune dependance externe.
 */
export async function exporterHTMLAutonome(
  brouillon: BrouillonDetail,
  options: OptionsExport = {}
): Promise<string> {
  const { apercuImpression = false } = options;
  const typeLabel = TYPE_LABELS[brouillon.type] ?? 'Document';
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const total = brouillon.slides.length;

  // Slides : chaque fichier est embarque en base64 quand c'est possible.
  const slidesHtml: string[] = [];
  let num = 0;
  for (const fichier of brouillon.slides) {
    num += 1;
    const url = slideUrl(brouillon.id, fichier);
    const legendeNum = `<figcaption>${num} / ${total}</figcaption>`;
    if (estVideo(fichier)) {
      try {
        const { dataUrl, taille } = await fichierEnDataUrl(url);
        if (taille <= MAX_VIDEO_EMBARQUEE) {
          slidesHtml.push(
            `<div class="slide"><figure><video src="${dataUrl}" controls></video>${legendeNum}</figure></div>`
          );
        } else {
          slidesHtml.push(
            `<div class="slide"><div class="note-video">Video (${Math.round(taille / 1024 / 1024)} Mo) non incluse dans l'export (fichier trop volumineux).</div></div>`
          );
        }
      } catch {
        slidesHtml.push(
          `<div class="slide"><div class="note-video">Video non incluse (telechargement impossible).</div></div>`
        );
      }
    } else {
      let src = url;
      try {
        const { dataUrl } = await fichierEnDataUrl(url);
        src = dataUrl;
      } catch {
        // Hors ligne / blocage : on garde l'URL brute, l'image s'affichera en ligne.
      }
      slidesHtml.push(`<div class="slide"><figure><img src="${src}" alt="Slide ${num}">${legendeNum}</figure></div>`);
    }
  }

  if (total === 0) {
    slidesHtml.push('<div class="note-video">Aucune slide dans ce livrable.</div>');
  }

  // Legendes par reseau (uniquement si renseignees).
  const legendesHtml = RESEAUX.map((r) => {
    const entry = brouillon.reseaux[r];
    if (!entry || (!entry.caption && !entry.hashtags)) return null;
    const nom = RESEAUX_LABELS[r] ?? r;
    const caption = entry.caption ? `<p>${echapper(entry.caption)}</p>` : '';
    const hashtags = entry.hashtags ? `<p class="hashtags">${echapper(entry.hashtags)}</p>` : '';
    return `<div class="legende"><h3>${echapper(nom)}</h3>${caption}${hashtags}</div>`;
  })
    .filter((x): x is string => x !== null)
    .join('\n');

  const sectionLegendes = legendesHtml
    ? `\n<section class="legendes">\n  <h2>Legendes</h2>\n${legendesHtml}\n</section>`
    : '';

  const barre = apercuImpression
    ? `<div class="barre-impression"><span class="bi-titre">${echapper(brouillon.titre)}</span><button class="imprimer" onclick="window.print()">Imprimer / Enregistrer en PDF</button><button class="fermer" onclick="window.close()">Fermer</button></div>`
    : '';

  const script = apercuImpression
    ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print();},600);});</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(brouillon.titre)}</title>
<style>${STYLE}</style>
</head>
<body class="${apercuImpression ? 'avec-barre' : ''}">
${barre}
<div class="sheet">
  <header class="en-tete">
    <h1>${echapper(brouillon.titre)}</h1>
    <div class="meta">${echapper(typeLabel)} · ${total} slide(s) · exporte le ${echapper(date)}</div>
  </header>
${slidesHtml.join('\n')}${sectionLegendes}
</div>
${script}
</body>
</html>`;
}

/** Telecharge le HTML construit comme fichier .html autonome. */
export function telechargerHTML(html: string, nomFichier: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Ouvre l'apercu impression (pour enregistrer en PDF) dans un nouvel onglet.
 * A appeler SYNCHRONEMENT dans le handler du clic pour garder le geste
 * utilisateur (sinon le bloqueur de popups le tue), puis ecrire le HTML
 * construit via ecrireDansApercu.
 */
export function ouvrirApercuPDF(): Window | null {
  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Export</title><style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#666;font-size:14px}</style></head><body><p>Preparation de l export...</p></body></html>'
    );
    win.document.close();
  }
  return win;
}

/** Ecrit le HTML final dans l'apercu ouvert precedemment. */
export function ecrireDansApercu(win: Window, html: string): void {
  win.document.open();
  win.document.write(html);
  win.document.close();
}
