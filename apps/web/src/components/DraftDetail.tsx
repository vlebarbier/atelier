import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CaretLeft, CaretRight, Code, CheckCircle, FileCode, Trash,
  InstagramLogo, LinkedinLogo, FacebookLogo, XLogo, TiktokLogo
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { BrouillonDetail, ReseauEntry, Statut } from '../api';
import { deleteBrouillon, fetchBrouillon, replaceSlides, slideUrl, updateBrouillon } from '../api';
import { RESEAUX, RESEAUX_LABELS, STATUTS_ORDRE, STATUT_LABELS } from '../format';

const RESEAU_ICONES: Record<string, Icon> = {
  instagram: InstagramLogo,
  linkedin: LinkedinLogo,
  facebook: FacebookLogo,
  x: XLogo,
  tiktok: TiktokLogo
};

interface DraftDetailProps {
  id: string;
  onClose: () => void;
  onDelete: () => void;
}

const REVISION_DEBOUNCE_MS = 400;

export function DraftDetail({ id, onClose, onDelete }: DraftDetailProps) {
  const [brouillon, setBrouillon] = useState<BrouillonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [reseauActif, setReseauActif] = useState<string>('instagram');
  const [showSource, setShowSource] = useState(false);
  const [sourceDraft, setSourceDraft] = useState('');
  const [sourceBusy, setSourceBusy] = useState(false);
  const [sourceMsg, setSourceMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [rendering, setRendering] = useState(false);
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<{ id: string; label: string; checked: boolean }[]>([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setShowSource(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDeposerSource() {
    if (!brouillon || !sourceDraft.trim()) return;
    setSourceBusy(true);
    setSourceMsg(null);
    try {
      await updateBrouillon(id, { sourceHtml: sourceDraft });
      setBrouillon({ ...brouillon, sourceHtml: sourceDraft });
      setSourceMsg({ type: 'ok', text: 'Source déposée. Cliquez sur « Régénérer les slides » pour mettre à jour les visuels.' });
    } catch (err) {
      setSourceMsg({ type: 'err', text: err instanceof Error ? err.message : 'Dépôt impossible' });
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
      // Rendu hors-écran du document source.
      const holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:-20000px;top:0;width:1080px;background:#fff;';
      holder.innerHTML = html;
      document.body.appendChild(holder);
      await new Promise((r) => setTimeout(r, 300)); // laisse les styles/polices s'appliquer

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
      await load();
    } catch (err) {
      setSourceMsg({ type: 'err', text: err instanceof Error ? err.message : 'Régénération impossible' });
    } finally {
      setRendering(false);
    }
  }

  function captureElement(el: HTMLElement): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const rect = el.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(height));
        const foreign = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        foreign.setAttribute('width', '100%');
        foreign.setAttribute('height', '100%');
        const clone = el.cloneNode(true) as HTMLElement;
        clone.style.margin = '0';
        foreign.appendChild(clone);
        svg.appendChild(foreign);

        const xml = new XMLSerializer().serializeToString(svg);
        const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = width * 2;
            canvas.height = height * 2;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
          } catch {
            resolve(null);
          } finally {
            URL.revokeObjectURL(url);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      } catch {
        resolve(null);
      }
    });
  }

  // Navigation clavier fleches gauche/droite, ignoree si le focus est dans un champ.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      if (!brouillon || brouillon.slides.length === 0) return;
      if (e.key === 'ArrowRight') {
        setSlide((s) => (s + 1) % brouillon.slides.length);
      } else if (e.key === 'ArrowLeft') {
        setSlide((s) => (s - 1 + brouillon.slides.length) % brouillon.slides.length);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [brouillon]);

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
    { id: 'liens', label: 'Liens verifies' },
    { id: 'formats', label: 'Formats par reseau' }
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

  if (loading) return <div className="empty">Chargement...</div>;
  if (error || !brouillon) return <div className="empty">Erreur, {error || 'brouillon introuvable'}</div>;

  const currentReseau = brouillon.reseaux[reseauActif] || { caption: '', hashtags: '', statut: 'brouillon' };
  const currentSlideFichier = brouillon.slides[slide];

  return (
    <div id="detail">
      <div className="back">
        <button
          type="button"
          onClick={() => {
            onClose();
          }}
        >
          <ArrowLeft size={14} /> Retour a la grille
        </button>
      </div>
      <div className="dhead">
        <h2>{brouillon.titre}</h2>
        <div className="controls">
          <button
            className="ghost danger"
            type="button"
            onClick={() => {
              if (window.confirm('Supprimer ce brouillon ? Cette action est definitive.')) {
                onDelete();
              }
            }}
            title="Supprimer le brouillon"
          >
            <Trash size={14} /> Supprimer
          </button>
          <div className="statut-choix">
            {STATUTS_ORDRE.map((s) => (
              <button
                key={s}
                className={brouillon.statut === s ? `on--${s}` : ''}
                onClick={() => setStatut(s as Statut)}
                type="button"
              >
                {STATUT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="notes">
        <label className="notes-label" htmlFor="notes">
          Notes de revision
        </label>
        <textarea
          id="notes"
          placeholder="Notes de revision"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>

      <div className="notes checklist-block">
        <label className="notes-label">Checklist de validation</label>
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
              {checklist.filter((c) => c.checked).length}/{checklist.length} verifies
            </div>
          </div>
        )}
      </div>

      <div className="dbody">
        <div>
          {brouillon.slides.length > 0 && currentSlideFichier ? (
            <>
              <div className="media-frame">
                <div className="slider">
                  <img id="slide-img" src={slideUrl(brouillon.id, currentSlideFichier)} alt="" />
                  <div className="nav">
                    <button
                      type="button"
                      onClick={() => setSlide((s) => (s - 1 + brouillon.slides.length) % brouillon.slides.length)}
                    >
                      <CaretLeft size={14} /> Precedente
                    </button>
                    <span className="counter">
                      {slide + 1} / {brouillon.slideCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSlide((s) => (s + 1) % brouillon.slides.length)}
                    >
                      Suivante <CaretRight size={14} />
                    </button>
                  </div>
                  <div className="legend">{currentSlideFichier}</div>
                </div>
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

        <div className="panel">
          <div className="panel-head">
            <h3>Legendes et declinaisons</h3>
            <button
              type="button"
              className={`source-toggle${showSource ? ' on' : ''}`}
              onClick={() => setShowSource((s) => !s)}
              title="Afficher la source HTML du document"
            >
              <Code size={13} /> Source
            </button>
          </div>
          {showSource ? (
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
                <button className="ghost" type="button" onClick={onDeposerSource} disabled={sourceBusy || !sourceDraft.trim()}>
                  <Check size={13} /> {sourceBusy ? 'Dépôt...' : 'Déposer la source'}
                </button>
                <button className="primary" type="button" onClick={onRegenerer} disabled={rendering}>
                  {rendering ? 'Rendu en cours...' : 'Régénérer les slides'}
                </button>
              </div>
              {sourceMsg && (
                <div className={`source-msg ${sourceMsg.type}`}>
                  {sourceMsg.type === 'ok' ? <CheckCircle size={13} /> : <Check size={13} />} {sourceMsg.text}
                </div>
              )}
              {brouillon.sourceHtml && !sourceDraft && (
                <div className="source-meta">
                  <CheckCircle size={13} /> Document HTML de l'agent, {brouillon.sourceHtml.length} caracteres
                </div>
              )}
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
          <div className="field">
            <label htmlFor="r-caption">Legende</label>
            <textarea
              id="r-caption"
              rows={7}
              placeholder={`Texte du post pour ${RESEAUX_LABELS[reseauActif]}`}
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
            <div className="counter">
              <span>{(currentReseau.caption || '').length}</span> caracteres
            </div>
          </div>
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
                {STATUT_LABELS[s]}
              </button>
            ))}
          </div>
          <div className={`saved${savedFlash ? ' show' : ''}`}>
            <Check size={13} weight="bold" /> Enregistre
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
