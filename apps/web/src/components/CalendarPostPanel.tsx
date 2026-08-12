import { useEffect, useState } from 'react';
import { CaretDown, CaretLeft, CaretRight, Check, X, CalendarBlank, ArrowRight, Trash } from '@phosphor-icons/react';
import type { Brouillon, Statut } from '../api';
import { parseProgramme, slideUrl, updateBrouillon } from '../api';
import { RESEAUX, RESEAUX_LABELS, STATUTS_ORDRE, STATUT_LABELS, formatDate } from '../format';

interface CalendarPostPanelProps {
  brouillon: Brouillon;
  /** Ferme le panneau (retour au calendrier). */
  onClose: () => void;
  /** Recharge la liste apres une mutation (statut, date) : le calendrier bouge. */
  onRefresh?: () => void;
  /** Ouvre le brouillon dans la vue detail complete (page Contenus/Documents). */
  onOpenDetail: (id: string) => void;
}

/**
 * Panneau lateral compact du calendrier : cliquer un post programme l'ouvre
 * ici, sans quitter la page. Affiche les slides (apercu + navigation), le
 * statut (dropdown, meme contrat que DraftDetail) et la programmation avec
 * edition DIRECTE de la date (pas de modal).
 */
export function CalendarPostPanel({ brouillon, onClose, onRefresh, onOpenDetail }: CalendarPostPanelProps) {
  const [slide, setSlide] = useState(0);
  const [statutOpen, setStatutOpen] = useState(false);
  // Champs d'edition de la programmation, initialises depuis le programme.
  const [progDate, setProgDate] = useState('');
  const [progHeure, setProgHeure] = useState('09:00');
  const [progReseau, setProgReseau] = useState('instagram');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const prog = parseProgramme(brouillon.programme);

  // Reinitialise l'edition quand on change de brouillon (pas a chaque refresh :
  // le programme est un objet frais a chaque fetch, les champs ne doivent pas
  // ecraser une saisie en cours).
  useEffect(() => {
    setSlide(0);
    setStatutOpen(false);
    const p = parseProgramme(brouillon.programme);
    setProgDate(p?.date ?? '');
    setProgHeure(p?.heure ?? '09:00');
    setProgReseau(p?.reseau ?? 'instagram');
  }, [brouillon.id]);

  const slides = brouillon.slides || [];
  const fichier = slides[slide];
  const estVideo = Boolean(fichier && (fichier.endsWith('.mp4') || fichier.endsWith('.webm')));

  const changerSlide = (next: number) => {
    if (slides.length === 0) return;
    setSlide(((next % slides.length) + slides.length) % slides.length);
  };

  async function setStatut(statut: Statut) {
    setStatutOpen(false);
    setSaving(true);
    try {
      await updateBrouillon(brouillon.id, { statut });
      onRefresh?.();
    } catch (e) {
      console.error('Erreur statut:', e);
    } finally {
      setSaving(false);
    }
  }

  /** Enregistre la programmation (date/heure/reseau) directement depuis le panneau. */
  async function enregistrerProgramme() {
    if (!progDate || saving) return;
    setSaving(true);
    try {
      await updateBrouillon(brouillon.id, {
        programme: JSON.stringify({ date: progDate, heure: progHeure, reseau: progReseau })
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      onRefresh?.();
    } catch (e) {
      console.error('Erreur programmation:', e);
    } finally {
      setSaving(false);
    }
  }

  async function retirerProgramme() {
    if (saving) return;
    setSaving(true);
    try {
      await updateBrouillon(brouillon.id, { programme: null });
      setProgDate('');
      onRefresh?.();
    } catch (e) {
      console.error('Erreur annulation:', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className="cal-panel">
      <div className="cal-panel-head">
        <button className="back" type="button" onClick={onClose}>
          <CaretLeft size={13} /> Calendrier
        </button>
        <button className="cal-panel-x" type="button" onClick={onClose} aria-label="Fermer le panneau" title="Fermer">
          <X size={13} />
        </button>
      </div>

      <div className="cal-panel-titre" title={brouillon.titre}>
        {brouillon.titre}
      </div>

      {/* Apercu des slides : image ou video, fleches si plusieurs medias. */}
      <div className="cal-panel-media">
        {fichier ? (
          estVideo ? (
            <video key={fichier} src={slideUrl(brouillon.id, fichier)} controls autoPlay muted loop />
          ) : (
            <img src={slideUrl(brouillon.id, fichier)} alt="" />
          )
        ) : (
          <div className="cal-panel-no-slide">Aucune slide.</div>
        )}
        {slides.length > 1 && (
          <>
            <button type="button" className="cal-panel-arrow prev" onClick={() => changerSlide(slide - 1)} aria-label="Slide precedente">
              <CaretLeft size={14} weight="bold" />
            </button>
            <button type="button" className="cal-panel-arrow next" onClick={() => changerSlide(slide + 1)} aria-label="Slide suivante">
              <CaretRight size={14} weight="bold" />
            </button>
          </>
        )}
      </div>
      {slides.length > 1 && (
        <>
          <div className="cal-panel-counter">
            {slide + 1} / {slides.length}
          </div>
          <div className="cal-panel-thumbs">
            {slides.map((s, i) => (
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
      )}

      {/* Statut : meme contrat que DraftDetail (dropdown point + label). */}
      <div className="cal-panel-section">
        <div className="cal-panel-label">Statut</div>
        <div className="statut-control">
          <button
            type="button"
            className={`statut-btn on--${brouillon.statut}`}
            onClick={() => setStatutOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={statutOpen}
            disabled={saving}
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
                  onClick={() => setStatut(s as Statut)}
                >
                  <span className={`dot dot--${s}`} />
                  {STATUT_LABELS[s]}
                  {brouillon.statut === s && <Check size={12} className="statut-check" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Programmation : edition directe de la date, sans quitter le calendrier. */}
      <div className="cal-panel-section cal-panel-planif">
        <div className="cal-panel-label">
          Programmation
          {savedFlash && (
            <span className="saved show">
              <Check size={11} weight="bold" /> Enregistre
            </span>
          )}
        </div>

        {prog ? (
          <div className="cal-panel-planif-fait">
            <CalendarBlank size={13} />
            <span>
              Programme le <strong>{formatDate(prog.date ? `${prog.date}T12:00:00` : null)}</strong> a {prog.heure} sur{' '}
              {RESEAUX_LABELS[prog.reseau ?? ''] ?? prog.reseau}
            </span>
          </div>
        ) : (
          <div className="cal-panel-planif-vide">Pas encore programme. Choisissez une date :</div>
        )}

        <div className="cal-panel-fields">
          <label className="cal-panel-field">
            <span>Date</span>
            <input type="date" value={progDate} onChange={(e) => setProgDate(e.target.value)} />
          </label>
          <label className="cal-panel-field">
            <span>Heure</span>
            <input type="time" value={progHeure} onChange={(e) => setProgHeure(e.target.value)} />
          </label>
          <label className="cal-panel-field">
            <span>Reseau</span>
            <select value={progReseau} onChange={(e) => setProgReseau(e.target.value)}>
              {RESEAUX.map((r) => (
                <option key={r} value={r}>
                  {RESEAUX_LABELS[r] || r}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="cal-panel-actions">
          <button className="primary" type="button" onClick={enregistrerProgramme} disabled={!progDate || saving}>
            {saving ? 'Enregistrement...' : prog ? 'Mettre a jour' : <><CalendarBlank size={13} weight="bold" /> Programmer</>}
          </button>
          {prog && (
            <button className="ghost danger" type="button" onClick={retirerProgramme} disabled={saving}>
              <Trash size={12} /> Retirer la date
            </button>
          )}
        </div>
        <div className="cal-panel-hint">
          Le brouillon se deplace sur le nouveau jour immediatement. Vous pouvez aussi le glisser.
        </div>
      </div>

      <div className="cal-panel-foot">
        <button className="ghost" type="button" onClick={() => onOpenDetail(brouillon.id)}>
          <ArrowRight size={13} /> Ouvrir dans Contenus
        </button>
      </div>
    </aside>
  );
}
