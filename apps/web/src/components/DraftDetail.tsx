import { toPng } from 'html-to-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CaretLeft, CaretRight, CaretDown, CaretUp, Code, CheckCircle, Eye, FileCode, Trash, X, ArrowsLeftRight,
  InstagramLogo, LinkedinLogo, FacebookLogo, XLogo, TiktokLogo, GoogleLogo, Stack, CalendarBlank, Sparkle, PaperPlaneTilt, VideoCamera, FileText, DownloadSimple, FilePdf
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { BrouillonDetail, DiffData, MessageChat, ReseauEntry, Statut, VersionSource } from '../api';
import { deleteBrouillon, envoyerMessage, envoyerVersPostiz, fetchBrouillon, fetchCharte, parseDiff, parseProgramme, reorderSlides, replaceSlides, restaurerVersion, slideUrl, updateBrouillon } from '../api';
import { comparerSlides, nombreSlidesDiff, urlsAvantApres, type ZoneDiff } from '../diff';
import { buildCharteCss, buildCharteFallbackCss, buildCharteFontLink, parseCharte, type CharteData } from '../charte';
import { CRENEAUX_PAR_RESEAU, JOURS_COURTS, prochainJour, RESEAUX, RESEAUX_LABELS, STATUTS_ORDRE, STATUT_LABELS, TYPE_LABELS, TYPES_CONTENUS, TYPES_DOCUMENTS, formatDate, relTime, type Creneau } from '../format';
import { ecrireDansApercu, exporterHTMLAutonome, ouvrirApercuPDF, slugifier, telechargerHTML } from '../export';

const RESEAU_ICONES: Record<string, Icon> = {
  instagram: InstagramLogo,
  linkedin: LinkedinLogo,
  facebook: FacebookLogo,
  x: XLogo,
  tiktok: TiktokLogo,
  gmb: GoogleLogo
};

/** Contraintes reelles de chaque reseau : limite de caracteres de la legende,
 *  nombre max de hashtags, nombre max d'images et format d'image recommande.
 *  Google Business Profile (gmb) : posts 1500 caracteres, 10 images max,
 *  pas de hashtags (sans effet sur les posts GMB). */
const RESEAU_CONTRAINTES: Record<string, { maxChars: number; maxHashtags: number; maxImages: number; format: string }> = {
  instagram: { maxChars: 2200, maxHashtags: 30, maxImages: 10, format: 'Carré 1080×1080 ou portrait 4:5' },
  linkedin: { maxChars: 3000, maxHashtags: 3, maxImages: 20, format: 'Paysage 1200×627' },
  facebook: { maxChars: 5000, maxHashtags: 5, maxImages: 10, format: 'Carré 1080×1080' },
  x: { maxChars: 280, maxHashtags: 2, maxImages: 4, format: 'Paysage 1600×900' },
  tiktok: { maxChars: 2200, maxHashtags: 5, maxImages: 35, format: 'Vertical 9:16' },
  gmb: { maxChars: 1500, maxHashtags: 0, maxImages: 10, format: 'Carré 1080×1080 (min 250×250)' }
};

type OngletPanneau = 'agent' | 'reseaux' | 'slides' | 'source';

/**
 * Tunnel de creation (SPEC-TUNNEL.md) : les 4 etapes visibles dans le header
 * de la vue detail. L'etape courante derive du statut du brouillon.
 */
const ETAPES_TUNNEL: { id: string; label: string }[] = [
  { id: 'demander', label: 'Demander' },
  { id: 'reviser', label: 'Réviser' },
  { id: 'valider', label: 'Valider' },
  { id: 'programmer', label: 'Programmer' }
];

function etapeEtat(statut: string, index: number): string {
  // Ordre des statuts : brouillon < a-valider < valide < publie.
  const ordre: Record<string, number> = { brouillon: 0, 'a-valider': 1, valide: 2, publie: 3 };
  const niveau = ordre[statut] ?? 0;
  if (index < niveau) return 'done';
  if (index === niveau) return 'current';
  return 'todo';
}

interface DraftDetailProps {
  id: string;
  onClose: () => void;
  onDelete: () => void;
  /** Panneau d'edition replie (bouton de la barre globale) : la slide prend tout l'espace. */
  panneauReplie?: boolean;
}

const REVISION_DEBOUNCE_MS = 400;

export function DraftDetail({ id, onClose, onDelete, panneauReplie = false }: DraftDetailProps) {
  const [brouillon, setBrouillon] = useState<BrouillonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  // Direction de transition du carrousel (spec Apollon) : 'next' | 'prev' | null
  const [slideDir, setSlideDir] = useState<'next' | 'prev' | null>(null);
  const [reseauActif, setReseauActif] = useState<string>('instagram');
  const [onglet, setOnglet] = useState<OngletPanneau>('agent');
  const [statutOpen, setStatutOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [planifOpen, setPlanifOpen] = useState(false);
  const [planifDate, setPlanifDate] = useState('');
  const [planifHeure, setPlanifHeure] = useState('09:00');
  const [planifReseau, setPlanifReseau] = useState('instagram');
  const [postizEnvoi, setPostizEnvoi] = useState(false);
  const [postizMsg, setPostizMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [conversation, setConversation] = useState<MessageChat[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [chatEnvoi, setChatEnvoi] = useState(false);
  // L'agent "travaille" : un message user est parti, pas encore de reponse agent apres.
  const [agentEnTravail, setAgentEnTravail] = useState(false);
  const [sourceDraft, setSourceDraft] = useState('');
  const [sourceBusy, setSourceBusy] = useState(false);
  const [sourceMsg, setSourceMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [rendering, setRendering] = useState(false);
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<{ id: string; label: string; checked: boolean }[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  // Mode « Apercu publie » (SPEC-TUNNEL.md US-05) : la slide courante + la
  // legende assemblee du reseau actif, comme le post apparaitra publie.
  const [apercuPublie, setApercuPublie] = useState(false);
  // Pseudo de la marque pour l'en-tete de l'apercu (charte si dispo, sinon placeholder).
  const [charteNom, setCharteNom] = useState<string | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Diff visuel avant/apres (chantier 3) : mode, position du slider, zones calculees.
  const [modeDiff, setModeDiff] = useState(false);
  const [diffPos, setDiffPos] = useState(55);
  const [zonesVisibles, setZonesVisibles] = useState(true);
  const [zonesDiff, setZonesDiff] = useState<ZoneDiff[]>([]);
  const [diffInfo, setDiffInfo] = useState<{ nouvelle: boolean; score: number } | null>(null);
  const [calculDiff, setCalculDiff] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBrouillon(id);
      setBrouillon(data);
      setNotes(data.notes || '');
      try {
        setChecklist(JSON.parse(data.checklist || '[]'));
      } catch {
        setChecklist([]);
      }
      setSlide(0);
      setReseauActif('instagram');
      setOnglet(TYPES_DOCUMENTS.includes(data.type) ? 'slides' : 'agent');
      setAgentEnTravail(false);
      try {
        setConversation(JSON.parse(data.conversation || '[]'));
      } catch {
        setConversation([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Pseudo de la marque pour l'en-tete de l'apercu publie : le nom de la charte
  // (ex. « Bordeluche ») si dispo, sinon placeholder generique (US-05).
  useEffect(() => {
    let vivant = true;
    fetchCharte()
      .then((c) => {
        if (vivant && c.nom && c.nom.trim() && c.nom !== 'Charte principale') setCharteNom(c.nom.trim());
      })
      .catch(() => {
        /* charte indisponible : pseudo generique */
      });
    return () => {
      vivant = false;
    };
  }, []);

  // Polling de la conversation : l'agent repond quand il a execute la demande.
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const data = await fetchBrouillon(id);
        const conv = JSON.parse(data.conversation || '[]') as MessageChat[];
        setConversation(conv);
        // L'agent a repondu si le dernier message est de lui (apres notre demande).
        const dernier = conv[conv.length - 1];
        setAgentEnTravail(dernier?.role === 'user');
      } catch {
        /* silencieux */
      }
    }, 8000);
    return () => clearInterval(t);
  }, [id]);

  async function onEnvoyerChat() {
    const texte = chatDraft.trim();
    if (!texte || chatEnvoi) return;
    setChatEnvoi(true);
    setAgentEnTravail(true);
    try {
      const res = await envoyerMessage(id, texte);
      setConversation(res.conversation);
      setChatDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur d\'envoi');
    } finally {
      setChatEnvoi(false);
    }
  }

  async function onProgrammer() {
    if (!brouillon || !planifDate) return;
    try {
      await updateBrouillon(id, {
        programme: JSON.stringify({ date: planifDate, heure: planifHeure, reseau: planifReseau })
      });
      setPlanifOpen(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de programmation');
    }
  }

  /** Ouvre la modale de programmation : reseau actif preselectionne, suggestion
   *  par defaut (premier creneau du reseau) appliquee d'office. Le user garde
   *  la main : les chips proposent les heures de pointe, les champs restent
   *  editables. */
  function ouvrirPlanif() {
    setPlanifReseau(reseauActif);
    const creneaux = CRENEAUX_PAR_RESEAU[reseauActif] ?? [];
    const defaut = creneaux[0];
    if (defaut) {
      setPlanifDate(prochainJour(defaut.jour));
      setPlanifHeure(defaut.heure);
    }
    setPlanifOpen(true);
  }

  /** Applique un creneau choisi : date = prochaine occurrence du jour, heure =
   *  celle du creneau (spec creneaux pertinents, US-06). */
  function appliquerCreneau(c: Creneau) {
    setPlanifDate(prochainJour(c.jour));
    setPlanifHeure(c.heure);
  }

  async function onAnnulerProgramme() {
    if (!brouillon) return;
    try {
      await updateBrouillon(id, { programme: null });
      setPlanifOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  }

  async function onEnvoyerPostiz() {
    if (!brouillon || postizEnvoi) return;
    setPostizEnvoi(true);
    setPostizMsg(null);
    try {
      const resultat = await envoyerVersPostiz(id, { reseau: reseauActif });
      setPostizMsg({
        type: 'ok',
        text: `Brouillon Postiz cree (${resultat.postId}) : ${resultat.slides_uploaded} slide(s) envoyee(s), date ${resultat.date.slice(0, 10)}. La publication reste manuelle dans Postiz.`
      });
    } catch (e) {
      setPostizMsg({ type: 'err', text: e instanceof Error ? e.message : 'Envoi vers Postiz echoue' });
    } finally {
      setPostizEnvoi(false);
    }
  }

  /** Export du livrable (F-44) : HTML autonome ou apercu impression (PDF). */
  async function onExporter(mode: 'html' | 'pdf') {
    if (!brouillon || exporting) return;
    setExportOpen(false);
    // L'apercu s'ouvre SYNCHRONEMENT au clic pour garder le geste utilisateur
    // (sinon le bloqueur de popups le tue), puis recoit le HTML une fois pret.
    const win = mode === 'pdf' ? ouvrirApercuPDF() : null;
    if (mode === 'pdf' && !win) {
      setError('Le navigateur a bloque l ouverture. Autorisez les popups pour exporter en PDF.');
      return;
    }
    setExporting(true);
    try {
      const html = await exporterHTMLAutonome(brouillon, { apercuImpression: mode === 'pdf' });
      if (mode === 'html') {
        telechargerHTML(html, `${slugifier(brouillon.titre || brouillon.id)}.html`);
      } else if (win) {
        ecrireDansApercu(win, html);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setExporting(false);
    }
  }

  async function onDeposerSource() {
    if (!brouillon || !sourceDraft.trim()) return;
    setSourceBusy(true);
    setSourceMsg(null);
    try {
      await updateBrouillon(id, { sourceHtml: sourceDraft });
      const maj = await fetchBrouillon(id);
      setBrouillon(maj);
      setSourceMsg({ type: 'ok', text: 'Source déposée. Cliquez sur « Régénérer les slides » pour mettre à jour les visuels.' });
    } catch (err) {
      setSourceMsg({ type: 'err', text: err instanceof Error ? err.message : 'Dépôt impossible' });
    } finally {
      setSourceBusy(false);
    }
  }

  /** Restaure la source HTML depuis une version snapshot (chantier 5), avec
   *  confirmation (jamais de restauration destructive sans confirmation).
   *  La restauration = set_source + regenerer : l'API remet le contenu de la
   *  version dans sourceHtml, on recharge puis on relance le rendu. */
  async function onRestaurerVersion(numero: number) {
    if (!brouillon) return;
    if (!window.confirm(`Restaurer la source depuis la version v${numero} ? Les slides seront régénérées depuis ce contenu.`)) return;
    setSourceBusy(true);
    setSourceMsg(null);
    try {
      await restaurerVersion(id, numero);
      const maj = await fetchBrouillon(id);
      setBrouillon(maj);
      setSourceDraft('');
      setSourceMsg({ type: 'ok', text: `Source restaurée depuis v${numero}. Régénération des slides...` });
      await onRegenerer();
    } catch (err) {
      setSourceMsg({ type: 'err', text: err instanceof Error ? err.message : 'Restauration impossible' });
    } finally {
      setSourceBusy(false);
    }
  }

  function onSourceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSourceDraft(String(reader.result || ''));
    reader.readAsText(file);
    e.target.value = '';
  }

  /** Upload direct d'une video (.mp4/.webm) → remplace les slides par cette video. */
  async function onSourceVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !brouillon) return;
    if (!file.type.startsWith('video/')) {
      setSourceMsg({ type: 'err', text: 'Fichier non video (.mp4/.webm attendu)' });
      return;
    }
    setSourceBusy(true);
    setSourceMsg(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
        reader.readAsDataURL(file);
      });
      const res = await replaceSlides(id, [dataUrl]);
      await updateBrouillon(id, { type: 'video' });
      await load();
      setSourceMsg({ type: 'ok', text: `Vidéo déposée (${res.slideCount} média). Le type est passé en « Vidéo ».` });
    } catch (err) {
      setSourceMsg({ type: 'err', text: err instanceof Error ? err.message : 'Erreur upload video' });
    } finally {
      setSourceBusy(false);
    }
  }

  /** Capture chaque element .slide du HTML source en PNG (rendu navigateur), puis remplace les slides via l'API. */
  async function onRegenerer() {
    if (!brouillon) return;
    const html = sourceDraft || brouillon.sourceHtml;
    if (!html) {
      setSourceMsg({ type: 'err', text: 'Aucune source HTML à rendre.' });
      return;
    }
    setRendering(true);
    setSourceMsg(null);
    try {
      // F-29 : la charte (GET /api/charte) est injectée dans le rendu au moment de la
      // capture. Ses couleurs/polices/rayons deviennent des variables CSS exposées au
      // HTML source (var(--bordeaux), var(--charte-police-titre)...) et ses polices
      // sont chargées, pour que les slides portent la marque.
      let charte: CharteData | null = null;
      try {
        const c = await fetchCharte();
        charte = parseCharte(c.data);
      } catch {
        charte = null; // charte indisponible : rendu tel quel, sans injection
      }

      // Rendu hors-écran du document source.
      const holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:-20000px;top:0;width:1080px;background:#fff;';
      holder.innerHTML = html;
      document.body.appendChild(holder);

      // Style et polices de la charte, injectés APRÈS le HTML source : en cascade,
      // les variables de la charte priment sur celles éventuellement en dur.
      if (charte) await injecterCharteRendu(holder, charte);
      await attendreRendu(charte);

      const slideEls = holder.querySelectorAll<HTMLElement>('.slide');
      if (slideEls.length === 0) {
        holder.remove();
        setSourceMsg({ type: 'err', text: 'Aucun élément .slide trouvé dans le HTML source.' });
        return;
      }

      const datas: string[] = [];
      for (let i = 0; i < slideEls.length; i++) {
        const el = slideEls[i];
        if (!el) continue;
        const dataUrl = await captureElement(el);
        if (dataUrl) datas.push(dataUrl);
      }
      holder.remove();

      if (datas.length === 0) {
        setSourceMsg({ type: 'err', text: 'La capture des slides a échoué (polices/images externes ?).' });
        return;
      }

      const res = await replaceSlides(id, datas);
      setSourceMsg({ type: 'ok', text: `${res.slideCount} slides régénérées depuis la source.` });
      // Le diff visuel s'ouvre automatiquement : montrer ce que l'agent a change.
      if (res.diff) {
        setDiffPos(55);
        setModeDiff(true);
      }
      await load();
    } catch (err) {
      setSourceMsg({ type: 'err', text: err instanceof Error ? err.message : 'Régénération impossible' });
    } finally {
      setRendering(false);
    }
  }

  /** F-29 : applique la charte au holder de capture (variables CSS + polices). */
  async function injecterCharteRendu(holder: HTMLElement, charte: CharteData) {
    const tokensCss = buildCharteCss(charte);
    const fallbackCss = buildCharteFallbackCss(charte);
    if (tokensCss || fallbackCss) {
      const style = document.createElement('style');
      style.textContent = [tokensCss, fallbackCss].filter(Boolean).join('\n');
      holder.appendChild(style);
    }
    const fontLink = buildCharteFontLink(charte);
    if (fontLink) {
      // Le CSS des polices est inliné (fetch → <style>) plutôt que chargé via un
      // <link> : html-to-image lit les @font-face depuis les feuilles même-origine
      // et les embarque en data URL dans le PNG ; un <link> cross-origin Google
      // Fonts rend les cssRules illisibles (SecurityError) et les polices tombent
      // en repli. En cas d'échec du fetch, le <link> reste le filet de secours.
      try {
        const res = await fetch(fontLink);
        if (res.ok) {
          const css = await res.text();
          const style = document.createElement('style');
          style.textContent = css;
          holder.appendChild(style);
        } else {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = fontLink;
          holder.appendChild(link);
        }
      } catch {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = fontLink;
        holder.appendChild(link);
      }
    }
  }

  /** Laisse les styles et les polices (charte incluse) s'appliquer avant la capture. */
  async function attendreRendu(charte: CharteData | null) {
    await new Promise((r) => setTimeout(r, 350));
    if (charte) {
      // document.fonts.ready se ré-arme quand le <link> Google Fonts déclenche
      // de nouveaux chargements ; un filet de 2,5s évite de bloquer sur un échec.
      await Promise.race([
        document.fonts.ready.then(() => undefined),
        new Promise((r) => setTimeout(r, 2500))
      ]);
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  /**
   * Capture un élément .slide en PNG via html-to-image (toPng).
   *
   * Pourquoi html-to-image et pas la méthode foreignObject→SVG→canvas maison :
   * le canvas était systématiquement « tainted by cross-origin data » (blob URL)
   * dans Chrome, et la capture échouait silencieusement (aucune slide régénérée).
   * toPng clone le nœud, inline les styles calculés (les var() de la charte sont
   * résolues), embarque polices et images en data URL et peint dans un canvas
   * origin-clean. Résultat vérifié en réel : le PNG capturé porte les couleurs
   * de la charte injectée (voir test-f29-mecanique.cjs, coin = bordeaux).
   */
  async function captureElement(el: HTMLElement): Promise<string | null> {
    try {
      const rect = el.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      return await toPng(el, {
        pixelRatio: 2,
        cacheBust: true,
        width,
        height,
        backgroundColor: '#ffffff'
      });
    } catch {
      return null;
    }
  }

  // Navigation clavier fleches gauche/droite, ignoree si le focus est dans un champ.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if (!brouillon || brouillon.slides.length === 0) return;
      if (e.key === 'ArrowRight') {
        changerSlide(slide + 1, 'next');
      } else if (e.key === 'ArrowLeft') {
        changerSlide(slide - 1, 'prev');
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [brouillon, slide]);

  // Diff visuel : recalcule les zones modifiees pour la slide courante quand le
  // mode diff est actif (ou que la slide / le snapshot avant change).
  const diffData = useMemo(() => parseDiff(brouillon?.diff), [brouillon?.diff]);
  useEffect(() => {
    let annule = false;
    if (!modeDiff || !diffData || !brouillon) {
      setZonesDiff([]);
      setDiffInfo(null);
      setCalculDiff(false);
      return;
    }
    const fichier = brouillon.slides[slide];
    if (!fichier || fichier.endsWith('.mp4') || fichier.endsWith('.webm')) {
      setZonesDiff([]);
      setDiffInfo(null);
      setCalculDiff(false);
      return;
    }
    const { avantUrl, apresUrl } = urlsAvantApres(brouillon.id, diffData, slide, brouillon.slides);
    if (!avantUrl || !apresUrl) {
      setZonesDiff([]);
      setDiffInfo(null);
      setCalculDiff(false);
      return;
    }
    setCalculDiff(true);
    comparerSlides(avantUrl, apresUrl)
      .then((c) => {
        if (annule) return;
        setZonesDiff(c.zones);
        setDiffInfo({ nouvelle: c.nouvelle, score: c.score });
      })
      .catch(() => {
        if (annule) return;
        setZonesDiff([]);
        setDiffInfo(null);
      })
      .finally(() => {
        if (!annule) setCalculDiff(false);
      });
    return () => {
      annule = true;
    };
  }, [modeDiff, diffData, slide, brouillon]);

  /**
   * Carrousel : change de slide avec une transition directionnelle 250ms
   * (spec Apollon) : classe .is-next/.is-prev posee un instant, puis retiree
   * pour que la transition CSS (translateX 8px → 0) joue a l'entree.
   */
  function changerSlide(next: number, dir: 'next' | 'prev') {
    if (!brouillon || brouillon.slides.length === 0) return;
    const total = brouillon.slides.length;
    const target = ((next % total) + total) % total;
    setSlideDir(dir);
    setSlide(target);
    // Deux rAF : laisse le navigateur peindre l'etat initial (decalage 8px,
    // opacity 0) avant de retirer la classe et declencher la transition.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSlideDir(null));
    });
  }

  async function setStatut(statut: Statut) {
    if (!brouillon) return;
    setBrouillon({ ...brouillon, statut });
    await updateBrouillon(id, { statut });
  }

  function onNotesChange(value: string) {
    setNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      await updateBrouillon(id, { notes: value });
    }, REVISION_DEBOUNCE_MS);
  }

  async function saveReseau(reseau: string, patch: Partial<ReseauEntry>) {
    if (!brouillon) return;
    const current = brouillon.reseaux[reseau] || { caption: '', hashtags: '', statut: 'brouillon' as Statut };
    const next: ReseauEntry = { ...current, ...patch };
    setBrouillon({ ...brouillon, reseaux: { ...brouillon.reseaux, [reseau]: next } });
    await updateBrouillon(id, { reseaux: { [reseau]: next } });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  const CHECKLIST_DEFAUT: { id: string; label: string }[] = [
    { id: 'charte', label: 'Charte respectee' },
    { id: 'textes', label: 'Textes relus' },
    { id: 'liens', label: 'Liens vérifiés' },
    { id: 'formats', label: 'Formats par réseau' }
  ];

  function toggleChecklist(id: string) {
    const next = checklist.map((c) => (c.id === id ? { ...c, checked: !c.checked } : c));
    setChecklist(next);
    updateBrouillon(id, { checklist: JSON.stringify(next) });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  function ensureChecklist() {
    // Si la checklist est vide, initialise avec les items par defaut (non coches).
    if (checklist.length === 0) {
      const init = CHECKLIST_DEFAUT.map((c) => ({ ...c, checked: false }));
      setChecklist(init);
      updateBrouillon(id, { checklist: JSON.stringify(init) });
    }
  }

  async function deplacerSlide(index: number, direction: -1 | 1) {
    if (!brouillon) return;
    const target = index + direction;
    if (target < 0 || target >= brouillon.slides.length) return;
    const next = [...brouillon.slides];
    [next[index], next[target]] = [next[target] ?? '', next[index] ?? ''];
    setBrouillon({ ...brouillon, slides: next });
    setSlide(target);
    try {
      await reorderSlides(id, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de réordonnancement');
    }
  }

  async function supprimerSlide(index: number) {
    if (!brouillon) return;
    if (!window.confirm(`Supprimer la slide ${index + 1} ?`)) return;
    const next = brouillon.slides.filter((_, i) => i !== index);
    setBrouillon({ ...brouillon, slides: next });
    setSlide((s) => Math.min(s, next.length - 1));
    try {
      await reorderSlides(id, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de suppression');
    }
  }

  if (loading) return <div className="empty">Chargement...</div>;
  if (error || !brouillon) return <div className="empty">Erreur, {error || 'brouillon introuvable'}</div>;

  const currentReseau = brouillon.reseaux[reseauActif] || { caption: '', hashtags: '', statut: 'brouillon' };
  const estDocument = TYPES_DOCUMENTS.includes(brouillon.type);
  // Pseudo affiche dans l'apercu publie : « @bordeluche » si la charte porte un
  // nom de marque, sinon placeholder generique (US-05).
  const pseudo = charteNom ? `@${slugifier(charteNom)}` : '@votremarque';
  const contraintes: { maxChars: number; maxHashtags: number; maxImages: number; format: string } =
    RESEAU_CONTRAINTES[reseauActif] ?? { maxChars: 2200, maxHashtags: 30, maxImages: 10, format: 'Carré 1080×1080' };
  const nbHashtags = (currentReseau.hashtags || '').split(/\s+/).filter((h) => h.startsWith('#')).length;
  const currentSlideFichier = brouillon.slides[slide];
  const estVideoSlide = Boolean(currentSlideFichier && (currentSlideFichier.endsWith('.mp4') || currentSlideFichier.endsWith('.webm')));

  return (
    <div id="detail" className="detail-shell">
      <header className="detail-bar">
        <div className="l">
          <button className="back" type="button" onClick={onClose}>
            <ArrowLeft size={13} /> Dashboard
          </button>
          <span className="sep">/</span>
          <span className="title" title={brouillon.titre}>{brouillon.titre}</span>
        </div>
        <div className="tunnel-steps" aria-label="Progression du workflow">
          {ETAPES_TUNNEL.map((etape, i) => {
            const etat = etapeEtat(brouillon.statut, i);
            return (
              <div key={etape.id} className={`tunnel-step ${etat}`} title={etape.label}>
                <span className="tunnel-step-dot" />
                <span className="tunnel-step-label">{etape.label}</span>
                {i < ETAPES_TUNNEL.length - 1 && <span className="tunnel-step-line" />}
              </div>
            );
          })}
        </div>
        <div className="r">
          <div className="statut-control">
            <button
              type="button"
              className={`statut-btn on--${brouillon.statut}`}
              onClick={() => setStatutOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={statutOpen}
            >
              <span className={`dot dot--${brouillon.statut}`} />
              <span className="statut-label">{STATUT_LABELS[brouillon.statut] ?? brouillon.statut}</span>
              <CaretDown size={12} className="statut-caret" />
            </button>
            {statutOpen && (
              <div className="statut-menu" role="listbox">
                <div className="statut-menu-label">Changer le statut</div>
                {STATUTS_ORDRE.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="option"
                    aria-selected={brouillon.statut === s}
                    className={brouillon.statut === s ? 'on' : ''}
                    onClick={() => {
                      setStatut(s as Statut);
                      setStatutOpen(false);
                    }}
                  >
                    <span className={`dot dot--${s}`} />
                    {STATUT_LABELS[s]}
                    {brouillon.statut === s && <Check size={12} className="statut-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="type-select">
            <button
              type="button"
              className="type-btn"
              onClick={() => setTypeOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={typeOpen}
              title="Type de contenu"
            >
              {brouillon.type === 'video' ? <VideoCamera size={13} /> : <Stack size={13} />}
              <span className="type-label">{TYPE_LABELS[brouillon.type] ?? 'Carrousel'}</span>
              <CaretDown size={12} className="statut-caret" />
            </button>
            {typeOpen && (
              <div className="statut-menu" role="listbox">
                <div className="statut-menu-label">Type de contenu</div>
                {TYPES_CONTENUS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="option"
                    aria-selected={brouillon.type === t}
                    className={brouillon.type === t ? 'on' : ''}
                    onClick={() => {
                      setBrouillon({ ...brouillon, type: t });
                      updateBrouillon(id, { type: t });
                      setTypeOpen(false);
                    }}
                  >
                    {t === 'video' ? <VideoCamera size={13} /> : <Stack size={13} />}
                    {TYPE_LABELS[t] ?? t}
                    {brouillon.type === t && <Check size={12} className="statut-check" />}
                  </button>
                ))}
                <div className="statut-menu-sep" />
                <div className="statut-menu-label">Documents</div>
                {TYPES_DOCUMENTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="option"
                    aria-selected={brouillon.type === t}
                    className={brouillon.type === t ? 'on' : ''}
                    onClick={() => {
                      setBrouillon({ ...brouillon, type: t });
                      updateBrouillon(id, { type: t });
                      setTypeOpen(false);
                    }}
                  >
                    <FileText size={13} />
                    {TYPE_LABELS[t] ?? t}
                    {brouillon.type === t && <Check size={12} className="statut-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="export-control">
            <button
              type="button"
              className="export-btn"
              onClick={() => setExportOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              disabled={exporting}
              title="Exporter le livrable (HTML autonome ou PDF)"
            >
              <DownloadSimple size={13} />
              <span>{exporting ? 'Export...' : 'Exporter'}</span>
              <CaretDown size={12} className="statut-caret" />
            </button>
            {exportOpen && (
              <div className="statut-menu export-menu" role="menu">
                <div className="statut-menu-label">Exporter le livrable</div>
                <button type="button" role="menuitem" onClick={() => onExporter('html')} disabled={exporting}>
                  <DownloadSimple size={14} />
                  <span className="mi">
                    <span className="mi-t">HTML autonome</span>
                    <span className="mi-s">Slides + légendes, tout-en-un</span>
                  </span>
                </button>
                <button type="button" role="menuitem" onClick={() => onExporter('pdf')} disabled={exporting}>
                  <FilePdf size={14} />
                  <span className="mi">
                    <span className="mi-t">PDF</span>
                    <span className="mi-s">Aperçu impression, une slide par page</span>
                  </span>
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className={`delete`}
            onClick={() => {
              if (window.confirm('Supprimer ce brouillon ? Cette action est definitive.')) {
                onDelete();
              }
            }}
            title="Supprimer le brouillon"
          >
            <Trash size={13} /> Supprimer
          </button>
        </div>
      </header>

      <div className="detail-body">
        <div className="detail-stage">
          {brouillon.slides.length > 0 && currentSlideFichier ? (
            <>
              {modeDiff && diffData ? (
                <div className="diff-bar">
                  <span className="diff-title">
                    <Eye size={13} /> Diff
                  </span>
                  {!estVideoSlide && (
                    <button
                      type="button"
                      className={`ghost${zonesVisibles ? ' on' : ''}`}
                      onClick={() => setZonesVisibles(!zonesVisibles)}
                    >
                      Zones
                    </button>
                  )}
                  <span className="diff-info">
                    {calculDiff
                      ? 'Calcul du diff...'
                      : estVideoSlide
                        ? 'Diff indisponible pour une vidéo'
                        : diffInfo?.nouvelle
                          ? 'Nouvelle slide'
                          : diffInfo && zonesDiff.length > 0
                            ? `${zonesDiff.length} zone${zonesDiff.length > 1 ? 's' : ''} modifiée${zonesDiff.length > 1 ? 's' : ''}`
                            : diffInfo
                              ? 'Aucune différence détectée'
                              : 'Aucune slide avant'}
                  </span>
                  <span className="diff-spacer" />
                  <button type="button" className="ghost" onClick={() => setModeDiff(false)}>
                    <X size={12} /> Fermer
                  </button>
                </div>
              ) : diffData && !estVideoSlide ? (
                <button type="button" className="diff-cta" onClick={() => setModeDiff(true)}>
                  <Eye size={13} /> Voir ce que l'agent a changé ({nombreSlidesDiff(diffData, brouillon.slides)})
                </button>
              ) : null}
              <div className="stage-media">
                {modeDiff && diffData && !estVideoSlide ? (
                  <DiffCompare
                    brouillonId={brouillon.id}
                    diffData={diffData}
                    slideIndex={slide}
                    slidesActuelles={brouillon.slides}
                    zones={zonesDiff}
                    diffPos={diffPos}
                    zonesVisibles={zonesVisibles}
                    onMove={setDiffPos}
                  />
                ) : (
                  <>
                    {estVideoSlide ? (
                      <video
                        key={currentSlideFichier}
                        className={slideDir === 'next' ? 'is-next' : slideDir === 'prev' ? 'is-prev' : ''}
                        src={slideUrl(brouillon.id, currentSlideFichier)}
                        controls autoPlay muted loop
                      />
                    ) : (
                      <img
                        id="slide-img"
                        className={slideDir === 'next' ? 'is-next' : slideDir === 'prev' ? 'is-prev' : ''}
                        src={slideUrl(brouillon.id, currentSlideFichier)}
                        alt=""
                      />
                    )}
                    {brouillon.slides.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="stage-arrow prev"
                          onClick={() => changerSlide(slide - 1, 'prev')}
                          aria-label="Slide precedente"
                        >
                          <CaretLeft size={18} weight="bold" />
                        </button>
                        <button
                          type="button"
                          className="stage-arrow next"
                          onClick={() => changerSlide(slide + 1, 'next')}
                          aria-label="Slide suivante"
                        >
                          <CaretRight size={18} weight="bold" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
              {apercuPublie && !estDocument && (
                <div className="apercu-legende">
                  <div className="apercu-legende-head">
                    {(() => {
                      const Icon = RESEAU_ICONES[reseauActif] || InstagramLogo;
                      return <Icon size={14} weight="regular" />;
                    })()}
                    <span className="apercu-legende-reseau">{RESEAUX_LABELS[reseauActif] || reseauActif}</span>
                    <span className="apercu-legende-pseudo">{pseudo}</span>
                  </div>
                  {(currentReseau.caption || '').trim() !== '' ? (
                    <p className="apercu-legende-caption">{currentReseau.caption}</p>
                  ) : null}
                  {(currentReseau.hashtags || '').trim() !== '' ? (
                    <p className="apercu-legende-hashtags">{currentReseau.hashtags}</p>
                  ) : null}
                  {(currentReseau.caption || '').trim() === '' && (currentReseau.hashtags || '').trim() === '' ? (
                    <p className="apercu-legende-vide">
                      Aucune légende pour {RESEAUX_LABELS[reseauActif] || reseauActif}. Onglet Réseaux pour l'écrire.
                    </p>
                  ) : null}
                  <div className={`apercu-legende-count${(currentReseau.caption || '').length > contraintes.maxChars ? ' over' : ''}`}>
                    {(currentReseau.caption || '').length} caractères / {contraintes.maxChars}
                  </div>
                </div>
              )}
              <div className="stage-nav">
                <span className="counter">
                  {slide + 1} / {brouillon.slideCount}
                </span>
                {!estDocument && (
                  <button
                    type="button"
                    className={`apercu-toggle${apercuPublie ? ' on' : ''}`}
                    onClick={() => setApercuPublie((v) => !v)}
                    aria-pressed={apercuPublie}
                    title="Voir le post assemblé (slide + légende) comme publié"
                  >
                    <Eye size={13} weight="regular" />
                    Aperçu publié
                  </button>
                )}
              </div>
              <div className="thumbs">
                {brouillon.slides.map((s, i) => (
                  <img
                    key={s}
                    src={slideUrl(brouillon.id, s)}
                    className={i === slide ? 'active' : ''}
                    onClick={() => setSlide(i)}
                    alt=""
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="no-slides">Aucune slide.</p>
          )}
        </div>

        <aside className={`side-panel${panneauReplie ? ' is-replie' : ''}`}>
          <div className="sp-section">
            <div className="sp-label">
              <span>Notes de révision</span>
              <span className={`saved${savedFlash ? ' show' : ''}`}>
                <Check size={11} weight="bold" /> Enregistré
              </span>
            </div>
            <textarea
              className="sp-textarea"
              placeholder="Notes de révision"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>

          <div className="sp-section">
            <div className="sp-label">
              <span>Checklist de validation</span>
              {checklist.length > 0 && (
                <span className="chip">
                  {checklist.filter((c) => c.checked).length}/{checklist.length}
                </span>
              )}
            </div>
            {checklist.length === 0 ? (
              <button className="ghost" type="button" onClick={ensureChecklist}>
                Initialiser la checklist
              </button>
            ) : (
              <div className="checklist-items">
                {checklist.map((c) => (
                  <label key={c.id} className={`checklist-item${c.checked ? ' checked' : ''}`}>
                    <input type="checkbox" checked={c.checked} onChange={() => toggleChecklist(c.id)} />
                    <span>{c.label}</span>
                  </label>
                ))}
                <div className="checklist-progress">
                  {checklist.filter((c) => c.checked).length}/{checklist.length} vérifiés
                </div>
              </div>
            )}
            {checklist.length > 0 &&
              checklist.every((c) => c.checked) &&
              brouillon.statut === 'brouillon' && (
                <button className="primary tunnel-next" type="button" onClick={() => setStatut('a-valider')}>
                  <ArrowRight size={13} weight="bold" /> Passer à À valider
                </button>
              )}
          </div>

          <div className="sp-section">
            <div className="sp-label">Édition du contenu</div>
            <div className="panel-tabs">
              <button type="button" className={onglet === 'agent' ? 'on' : ''} onClick={() => setOnglet('agent')}>
                <Sparkle size={12} /> Agent
              </button>
              <button type="button" className={onglet === 'reseaux' ? 'on' : ''} onClick={() => setOnglet('reseaux')}>
                <ArrowRight size={12} /> Réseaux
              </button>
              <button type="button" className={onglet === 'slides' ? 'on' : ''} onClick={() => setOnglet('slides')}>
                <Stack size={12} /> Slides
              </button>
              <button type="button" className={onglet === 'source' ? 'on' : ''} onClick={() => setOnglet('source')}>
                <Code size={12} /> Source
              </button>
            </div>

            {onglet === 'agent' ? (
              <div className="chat-panel">
                <div className="chat-feed">
                  {conversation.length === 0 ? (
                    <div className="chat-empty">
                      <Sparkle size={18} className="chat-empty-ico" />
                      <p>Demandez a votre agent de modifier ce contenu.</p>
                      <p className="chat-empty-sub">
                        « Change le texte de la slide 3 », « Ajoute une slide sur le duplex »...
                        L'agent execute et repond ici. Ne fonctionne que si votre agent est
                        connecte a Atelier (MCP ou API).
                      </p>
                    </div>
                  ) : (
                    conversation.map((m, i) => (
                      <div key={i} className={`chat-msg ${m.role}`}>
                        <div className="chat-msg-head">
                          {m.role === 'agent' ? <Sparkle size={11} /> : <span className="chat-you">Vous</span>}
                          <span className="chat-role">{m.role === 'agent' ? 'Agent' : ''}</span>
                        </div>
                        <div className="chat-msg-text">{m.texte}</div>
                      </div>
                    ))
                  )}
                  {agentEnTravail && (
                    <div className="chat-msg agent">
                      <div className="chat-msg-head">
                        <Sparkle size={11} />
                        <span className="chat-role">Agent</span>
                      </div>
                      <div className="chat-msg-text chat-typing">
                        <span className="eq-bounce"><span /><span /><span /></span>
                        <span className="stream-caret" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="chat-input">
                  <textarea
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onEnvoyerChat();
                      }
                    }}
                    placeholder="Demander une modification a votre agent..."
                    rows={2}
                    aria-label="Message a l'agent"
                  />
                  <button className="primary" type="button" onClick={onEnvoyerChat} disabled={chatEnvoi || !chatDraft.trim()}>
                    <PaperPlaneTilt size={13} weight="bold" /> {chatEnvoi ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </div>
            ) : onglet === 'source' ? (
              <div className="source-panel">
                <textarea
                  className="source-textarea"
                  value={sourceDraft || brouillon.sourceHtml || ''}
                  onChange={(e) => setSourceDraft(e.target.value)}
                  placeholder="Collez ici le HTML produit par votre agent, ou importez un fichier .html"
                  rows={10}
                  aria-label="Source HTML du document"
                />
                <div className="source-actions">
                  <label className="ghost file-label" role="button">
                    <FileCode size={13} /> Importer un fichier .html
                    <input type="file" accept=".html,.htm" onChange={onSourceFile} hidden />
                  </label>
                  <label className="ghost file-label" role="button">
                    <VideoCamera size={13} /> Importer une video (.mp4)
                    <input type="file" accept=".mp4,.webm,video/*" onChange={onSourceVideo} hidden />
                  </label>
                  <button className="primary" type="button" onClick={onDeposerSource} disabled={sourceBusy || !sourceDraft.trim()}>
                    <Check size={13} /> {sourceBusy ? 'Dépôt...' : 'Déposer la source'}
                  </button>
                  <button className="ghost" type="button" onClick={onRegenerer} disabled={rendering}>
                    {rendering ? 'Rendu en cours...' : 'Régénérer les slides'}
                  </button>
                </div>
                {rendering && (
                  <div className="render-status" role="status">
                    <span className="loader-pixels" aria-hidden="true">
                      <span /><span /><span /><span /><span /><span /><span /><span /><span />
                    </span>
                    <span className="shimmer-label">Génération du rendu</span>
                  </div>
                )}
                {sourceMsg && (
                  <div className={`source-msg ${sourceMsg.type}`}>
                    {sourceMsg.type === 'ok' ? <CheckCircle size={13} /> : <Check size={13} />} {sourceMsg.text}
                  </div>
                )}
                {brouillon.sourceHtml && !sourceDraft && (
                  <div className="source-meta">
                    <CheckCircle size={13} /> Document HTML de l'agent, {brouillon.sourceHtml.length} caractères
                  </div>
                )}
                {(brouillon.versions ?? []).length > 0 && (
                  <div className="versions-block">
                    <div className="versions-head">
                      <span className="versions-title">Versions de la source</span>
                      <span className="versions-count">{(brouillon.versions ?? []).length} snapshot{(brouillon.versions ?? []).length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="versions-list">
                      {[...(brouillon.versions ?? [])].reverse().map((v) => (
                        <div key={v.numero} className="version-row">
                          <span className="version-num">v{v.numero}</span>
                          <span className="version-meta">
                            <span className="version-date">{relTime(v.at)}</span>
                            <span className={`version-auteur ${v.auteur === 'agent' ? 'agent' : ''}`}>
                              {v.auteur === 'agent' ? 'agent' : 'vous'}
                            </span>
                          </span>
                          <span className="version-taille">{v.taille < 1024 ? `${v.taille} o` : `${(v.taille / 1024).toFixed(1)} Ko`}</span>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => onRestaurerVersion(v.numero)}
                            disabled={sourceBusy || rendering}
                            title={`Restaurer la source depuis v${v.numero}`}
                          >
                            Restaurer
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : onglet === 'slides' ? (
              <div className="slides-editor">
                <div className="slides-editor-note">
                  Réorganisez les slides avec les fleches. La slide 1 est la couverture.
                </div>
                {brouillon.slides.map((s, i) => (
                  <div key={s} className={`slide-row${i === slide ? ' active' : ''}`} onClick={() => setSlide(i)}>
                    <img src={slideUrl(brouillon.id, s)} alt={`Slide ${i + 1}`} />
                    <span className="slide-num">{i + 1}</span>
                    <div className="slide-row-actions">
                      <button
                        type="button"
                        className="ghost"
                        disabled={i === 0}
                        onClick={(e) => { e.stopPropagation(); deplacerSlide(i, -1); }}
                        title="Monter"
                      >
                        <CaretUp size={12} />
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        disabled={i === brouillon.slides.length - 1}
                        onClick={(e) => { e.stopPropagation(); deplacerSlide(i, 1); }}
                        title="Descendre"
                      >
                        <CaretDown size={12} />
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={(e) => { e.stopPropagation(); supprimerSlide(i); }}
                        title="Supprimer"
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : estDocument ? (
              <div className="doc-panel">
                <FileText size={16} />
                <p>Document de communication : {TYPE_LABELS[brouillon.type] ?? brouillon.type}</p>
                <p className="doc-panel-sub">
                  Pas de contraintes réseau ni de programmation pour ce livrable.
                  Utilisez les onglets Slides et Source pour travailler le document.
                </p>
              </div>
            ) : (
              <>
                <div className="reseau-tabs">
                  {RESEAUX.map((r) => {
                    const Icon = RESEAU_ICONES[r] || InstagramLogo;
                    return (
                      <button
                        key={r}
                        className={r === reseauActif ? 'active' : ''}
                        onClick={() => setReseauActif(r)}
                        type="button"
                      >
                        <Icon size={14} weight="regular" />
                        <span>{RESEAUX_LABELS[r] || r}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="format-reco">
                  <Stack size={14} />
                  <div className="format-reco-body">
                    <span className="format-reco-label">Format recommandé</span>
                    <span className="format-reco-value">{contraintes.format}</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="r-caption">Légende</label>
                  <textarea
                    id="r-caption"
                    rows={5}
                    placeholder={`Ajouter la légende pour ${RESEAUX_LABELS[reseauActif]}`}
                    value={currentReseau.caption || ''}
                    onChange={(e) => {
                      if (!brouillon) return;
                      setBrouillon({
                        ...brouillon,
                        reseaux: {
                          ...brouillon.reseaux,
                          [reseauActif]: { ...currentReseau, caption: e.target.value }
                        }
                      });
                    }}
                    onBlur={(e) => saveReseau(reseauActif, { caption: e.target.value })}
                  />
                  <div className={`counter${(currentReseau.caption || '').length > contraintes.maxChars ? ' over' : ''}`}>
                    <span>{(currentReseau.caption || '').length}</span> / {contraintes.maxChars} caractères
                  </div>
                </div>
                {contraintes.maxHashtags > 0 ? (
                  <div className="field">
                    <label htmlFor="r-hashtags">Hashtags</label>
                    <input
                      id="r-hashtags"
                      value={currentReseau.hashtags || ''}
                      placeholder="#Bordeaux #Conciergerie"
                      onChange={(e) => {
                        if (!brouillon) return;
                        setBrouillon({
                          ...brouillon,
                          reseaux: {
                            ...brouillon.reseaux,
                            [reseauActif]: { ...currentReseau, hashtags: e.target.value }
                          }
                        });
                      }}
                      onBlur={(e) => saveReseau(reseauActif, { hashtags: e.target.value })}
                    />
                    <div className={`counter${nbHashtags > contraintes.maxHashtags ? ' over' : ''}`}>
                      {nbHashtags} / {contraintes.maxHashtags} hashtags max
                    </div>
                  </div>
                ) : (
                  <div className="format-hint">
                    <span>Pas de hashtags sur {RESEAUX_LABELS[reseauActif] ?? reseauActif}.</span>
                  </div>
                )}
                <div className={`counter img-counter${brouillon.slides.length > contraintes.maxImages ? ' over' : ''}`}>
                  {brouillon.slides.length} / {contraintes.maxImages} images max pour ce réseau
                </div>
                <div className="reseau-statut">
                  <span className="reseau-statut-label">Statut {RESEAUX_LABELS[reseauActif]}</span>
                  {STATUTS_ORDRE.map((s) => (
                    <button
                      key={s}
                      className={(currentReseau.statut || 'brouillon') === s ? `on--${s}` : ''}
                      onClick={() => saveReseau(reseauActif, { statut: s as Statut })}
                      type="button"
                    >
                      <span className={`dot dot--${s} status-pop`} />
                      {STATUT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="sp-section planif-section">
            {estDocument ? (
              <div className="planif-nodoc">
                <CheckCircle size={13} /> Livrable de communication : pas de programmation réseau
              </div>
            ) : brouillon.programme ? (
              (() => {
                const prog = parseProgramme(brouillon.programme);
                return prog ? (
                  <>
                    <div className="planif-fait">
                      <CheckCircle size={13} />
                      Programme le <strong>{formatDate(prog.date ? `${prog.date}T12:00:00` : null)}</strong> a{" "}
                      {prog.heure} sur {RESEAUX_LABELS[prog.reseau ?? ''] ?? prog.reseau}
                    </div>
                    <button className="ghost planif-annuler" type="button" onClick={onAnnulerProgramme}>
                      Annuler la programmation
                    </button>
                  </>
                ) : null;
              })()
            ) : (
              <>
                <button className="primary planif-btn" type="button" onClick={ouvrirPlanif}>
                  <CalendarBlank size={14} weight="bold" /> Programmer dans le calendrier
                </button>
                <div className="planif-hint">Quand le contenu est prêt, planifiez sa publication.</div>
              </>
            )}
          </div>

          {!estDocument && brouillon.statut === 'valide' && (
            <div className="sp-section postiz-section">
              <button
                className="ghost postiz-btn"
                type="button"
                onClick={onEnvoyerPostiz}
                disabled={postizEnvoi}
                title="Cree un brouillon Postiz (jamais de publication automatique)"
              >
                <PaperPlaneTilt size={14} /> {postizEnvoi ? 'Envoi vers Postiz...' : 'Envoyer vers Postiz'}
              </button>
              {postizMsg && (
                <div className={`postiz-msg ${postizMsg.type === 'ok' ? 'ok' : 'err'}`} role="status">
                  {postizMsg.type === 'ok' ? <CheckCircle size={13} /> : null}
                  {postizMsg.text}
                </div>
              )}
              <div className="postiz-hint">Draft uniquement : la publication finale reste un acte humain dans Postiz.</div>
            </div>
          )}
        </aside>
      </div>

      {planifOpen && (
        <div className="modal-overlay modal-overlay-in" onClick={() => setPlanifOpen(false)}>
          <div className="modal modal-panel-in" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Programmer la publication</h3>
              <button className="modal-x" type="button" onClick={() => setPlanifOpen(false)} aria-label="Fermer">
                X
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label htmlFor="p-reseau">Réseau</label>
                <select
                  id="p-reseau"
                  value={planifReseau}
                  onChange={(e) => {
                    const r = e.target.value;
                    setPlanifReseau(r);
                    // La suggestion par defaut suit le reseau : premier creneau
                    // de sa table d'heures de pointe (US-06).
                    const defaut = (CRENEAUX_PAR_RESEAU[r] ?? [])[0];
                    if (defaut) {
                      setPlanifDate(prochainJour(defaut.jour));
                      setPlanifHeure(defaut.heure);
                    }
                  }}
                >
                  {RESEAUX.map((r) => (
                    <option key={r} value={r}>{RESEAUX_LABELS[r] || r}</option>
                  ))}
                </select>
              </div>
              <div className="creneaux-section">
                <label className="creneaux-label">Créneaux conseillés</label>
                <div className="creneaux-row">
                  {(CRENEAUX_PAR_RESEAU[planifReseau] ?? []).map((c, i) => {
                    const jour = c.jour;
                    const dateChip = prochainJour(jour);
                    const actif = planifDate === dateChip && planifHeure === c.heure;
                    return (
                      <button
                        key={`${jour}-${c.heure}-${i}`}
                        type="button"
                        className={`creneau-chip${actif ? ' on' : ''}`}
                        title={`${JOURS_COURTS[jour] ?? ''} ${c.fenetre}`}
                        aria-pressed={actif}
                        onClick={() => appliquerCreneau(c)}
                      >
                        {JOURS_COURTS[jour] ?? ''} {c.heure}
                      </button>
                    );
                  })}
                </div>
                <div className="creneaux-hint">Heures de pointe pour {RESEAUX_LABELS[planifReseau] ?? planifReseau}. Cliquez pour pré-remplir, ou saisissez librement.</div>
              </div>
              <div className="field">
                <label htmlFor="p-date">Date</label>
                <input id="p-date" type="date" value={planifDate} onChange={(e) => setPlanifDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="p-heure">Heure</label>
                <input id="p-heure" type="time" value={planifHeure} onChange={(e) => setPlanifHeure(e.target.value)} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="ghost" type="button" onClick={() => setPlanifOpen(false)}>
                Annuler
              </button>
              <button className="primary" type="button" onClick={onProgrammer} disabled={!planifDate}>
                <CalendarBlank size={13} weight="bold" /> Programmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Comparateur avant/apres : deux calques d'image superposes, un slider draggable
 * revele l'apres a gauche du handle (clip-path), les zones modifiees sont
 * encadrees en ambre (annotation, pas un statut : la DA monochrome reste intacte).
 * Les coordonnees des zones sont en fractions 0..1 : elles se superposent a
 * l'image quel que soit son affichage.
 */
function DiffCompare({
  brouillonId,
  diffData,
  slideIndex,
  slidesActuelles,
  zones,
  diffPos,
  zonesVisibles,
  onMove
}: {
  brouillonId: string;
  diffData: DiffData;
  slideIndex: number;
  slidesActuelles: string[];
  zones: ZoneDiff[];
  diffPos: number;
  zonesVisibles: boolean;
  onMove: (pos: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { avantUrl, apresUrl } = urlsAvantApres(brouillonId, diffData, slideIndex, slidesActuelles);

  const surPointer = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const p = ((clientX - rect.left) / rect.width) * 100;
    onMove(Math.min(100, Math.max(0, p)));
  };

  // Slide sans equivalent avant : on montre la nouvelle image avec un badge.
  if (!apresUrl) return null;
  if (!avantUrl) {
    return (
      <div className="diff-nouvelle">
        <img src={apresUrl} alt="Nouvelle slide" draggable={false} />
        <span className="diff-nouvelle-badge">
          <Sparkle size={11} weight="bold" /> Nouvelle slide
        </span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="diff-compare"
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        surPointer(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) surPointer(e.clientX);
      }}
    >
      <img className="diff-img" src={avantUrl} alt="Avant" draggable={false} />
      <img
        className="diff-img diff-apres"
        src={apresUrl}
        alt="Après"
        draggable={false}
        style={{ clipPath: `inset(0 ${100 - diffPos}% 0 0)` }}
      />
      {zonesVisibles &&
        zones.map((z, i) => (
          <span
            key={i}
            className="diff-zone"
            style={{
              left: `${z.x * 100}%`,
              top: `${z.y * 100}%`,
              width: `${z.w * 100}%`,
              height: `${z.h * 100}%`
            }}
          />
        ))}
      <span className="diff-badge diff-badge-apres">Après</span>
      <span className="diff-badge diff-badge-avant">Avant</span>
      <span className="diff-handle" style={{ left: `${diffPos}%` }}>
        <span className="diff-handle-knob">
          <ArrowsLeftRight size={12} weight="bold" />
        </span>
      </span>
    </div>
  );
}
