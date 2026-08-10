import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CaretLeft, CaretRight, Code, CheckCircle, FileCode, Trash,
  InstagramLogo, LinkedinLogo, FacebookLogo, XLogo, TiktokLogo
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import type { BrouillonDetail, ReseauEntry, Statut } from '../api';
import { deleteBrouillon, fetchBrouillon, slideUrl, updateBrouillon } from '../api';
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
  const [notes, setNotes] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBrouillon(id);
      setBrouillon(data);
      setNotes(data.notes || '');
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
              {brouillon.sourceHtml ? (
                <>
                  <div className="source-meta">
                    <CheckCircle size={13} /> Document HTML de l'agent, {brouillon.sourceHtml.length} caracteres
                  </div>
                  <pre className="source-code">{brouillon.sourceHtml.slice(0, 6000)}</pre>
                </>
              ) : (
                <div className="source-empty">
                  <FileCode size={20} />
                  <p>Aucune source HTML. L'agent peut la deposer via set_source (MCP).</p>
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
