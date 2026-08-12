import { useMemo, useState, useCallback, type DragEvent } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import type { Brouillon } from '../api';
import { updateBrouillon, parseProgramme } from '../api';
import { Page, PageHeader } from '../components/ui';
import { TYPES_DOCUMENTS, TYPE_ARTICLE } from '../format';

interface CalendarPageProps {
  brouillons: Brouillon[];
  /** Callback optionnel pour ouvrir un brouillon au clic. */
  onOpen?: (id: string) => void;
  /** Callback pour rafraichir la liste apres une mutation (drag & drop). */
  onRefresh?: () => void;
}

const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS_LABELS = [
  'Janvier',
  'Fevrier',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Aout',
  'Septembre',
  'Octobre',
  'Novembre',
  'Decembre'
];

/** Extrait la date de programmation (YYYY-MM-DD) ou null. */
function getProgrammeDate(b: Brouillon): string | null {
  const prog = parseProgramme(b.programme);
  return prog?.date ?? null;
}

/** Construit un objet programme JSON pour une date donnee, en preservant heure/reseau existants. */
function buildProgramme(b: Brouillon, newDate: string): string {
  let heure = '09:00';
  let reseau = 'instagram';
  const prog = parseProgramme(b.programme);
  if (prog) {
    if (prog.heure) heure = prog.heure;
    if (prog.reseau) reseau = prog.reseau;
  }
  return JSON.stringify({ date: newDate, heure, reseau });
}

/** Formate une date YYYY-MM-DD. */
function formatDate(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/** Lundi de la semaine contenant la date (lundi = premier jour). */
function startOfWeek(d: Date): Date {
  const dow = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
}

type Vue = 'mois' | 'semaine';

/** Calendrier de programmation : grille mois ou semaine, drag & drop pour
 *  reprogrammer, et liste laterale des brouillons valides en attente de date. */
export function CalendarPage({ brouillons, onOpen, onRefresh }: CalendarPageProps) {
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [vue, setVue] = useState<Vue>('mois');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Seuls les contenus programmables comptent : pas de documents ni d'articles
  // de blog dans le calendrier (ils ont leurs propres pages).
  const programmables = useMemo(
    () =>
      brouillons.filter((b) => !TYPES_DOCUMENTS.includes(b.type ?? '') && b.type !== TYPE_ARTICLE),
    [brouillons]
  );

  // Liste laterale : brouillons VALIDES sans date de programme. Le tunnel
  // s'arrete avant la programmation, on montre ce qui attend.
  const aProgrammer = useMemo(
    () => programmables.filter((b) => b.statut === 'valide' && !getProgrammeDate(b)),
    [programmables]
  );

  // Grille : uniquement les brouillons PROGRAMMES (programme.date), ranges par
  // jour (cle YYYY-MM-DD). Les brouillons sans date vivent dans la liste laterale.
  const byDate = useMemo(() => {
    const map = new Map<string, Brouillon[]>();
    for (const b of programmables) {
      const prog = parseProgramme(b.programme);
      if (!prog?.date) continue;
      const d = new Date(`${prog.date}T12:00:00`);
      if (Number.isNaN(d.getTime())) continue;
      const key = formatDate(d.getFullYear(), d.getMonth(), d.getDate());
      const list = map.get(key) || [];
      list.push(b);
      map.set(key, list);
    }
    return map;
  }, [programmables]);

  const today = new Date();
  const todayKey = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const goPrev = () => {
    if (vue === 'mois') setViewDate(new Date(year, month - 1, 1));
    else {
      const ws = startOfWeek(viewDate);
      setViewDate(new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() - 7));
    }
  };
  const goNext = () => {
    if (vue === 'mois') setViewDate(new Date(year, month + 1, 1));
    else {
      const ws = startOfWeek(viewDate);
      setViewDate(new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 7));
    }
  };
  const goToday = () => setViewDate(new Date());

  const handleDrop = useCallback(
    async (targetKey: string) => {
      if (!dragId) return;
      setDragOverKey(null);
      setDragId(null);

      const brouillon = programmables.find((b) => b.id === dragId);
      if (!brouillon) return;

      // Deja programme sur ce jour, rien a faire.
      if (getProgrammeDate(brouillon) === targetKey) return;

      setSaving(true);
      try {
        const programme = buildProgramme(brouillon, targetKey);
        await updateBrouillon(dragId, { programme });
        onRefresh?.();
      } catch (err) {
        console.error('Erreur reprogrammation:', err);
      } finally {
        setSaving(false);
      }
    },
    [dragId, programmables, onRefresh]
  );

  const dragStart = (b: Brouillon) => (e: DragEvent) => {
    setDragId(b.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', b.id);
  };
  const dragEnd = () => {
    setDragId(null);
    setDragOverKey(null);
  };

  const itemsFor = (key: string | null): Brouillon[] => (key ? byDate.get(key) || [] : []);

  // ---- Vue mois ----
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  const monthCells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) monthCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) monthCells.push(formatDate(year, month, d));
  while (monthCells.length % 7 !== 0) monthCells.push(null);

  // ---- Vue semaine ----
  const weekStart = startOfWeek(viewDate);
  const weekDays: Date[] = Array.from(
    { length: 7 },
    (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)
  );
  const weekFirst = weekDays[0] as Date;
  const weekLast = weekDays[6] as Date;
  const semaineLabel =
    weekFirst.getMonth() === weekLast.getMonth()
      ? `Du ${weekFirst.getDate()} au ${weekLast.getDate()} ${MOIS_LABELS[weekLast.getMonth()]} ${weekLast.getFullYear()}`
      : `Du ${weekFirst.getDate()} ${MOIS_LABELS[weekFirst.getMonth()]} au ${weekLast.getDate()} ${MOIS_LABELS[weekLast.getMonth()]} ${weekLast.getFullYear()}`;

  const label = vue === 'mois' ? `${MOIS_LABELS[month]} ${year}` : semaineLabel;

  const cellClass = (key: string | null, extra = ''): string => {
    const parts = ['calendar-cell'];
    if (!key) parts.push('empty');
    if (key === todayKey) parts.push('today');
    if (key && dragOverKey === key) parts.push('drag-over');
    if (extra) parts.push(extra);
    return parts.join(' ');
  };

  const dropHandlers = (key: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      if (key && dragId) {
        e.preventDefault();
        if (dragOverKey !== key) setDragOverKey(key);
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      // Ne pas quitter l'etat drag-over quand la souris passe sur un
      // enfant de la cellule (daynum, items) : sinon le surlignage clignote.
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      if (key && dragOverKey === key) setDragOverKey(null);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (key) handleDrop(key);
    }
  });

  const renderItem = (b: Brouillon) => (
    <div
      key={b.id}
      className={`calendar-item badge--${b.statut}${dragId === b.id ? ' dragging' : ''}${onOpen ? ' clickable' : ''}`}
      title={b.titre}
      draggable
      onDragStart={dragStart(b)}
      onDragEnd={dragEnd}
      onClick={() => onOpen?.(b.id)}
    >
      {b.titre}
    </div>
  );

  const renderItemList = (key: string | null) => {
    const items = itemsFor(key);
    return (
      <>
        {items.slice(0, 3).map(renderItem)}
        {items.length > 3 && <div className="calendar-more">+{items.length - 3}</div>}
      </>
    );
  };

  return (
    <Page>
      <PageHeader
        title="Calendrier"
        sub="Glissez un brouillon d'un jour a l'autre pour le reprogrammer. Les brouillons valides sans date attendent dans la liste de droite."
      />
      <div className="calendar-toolbar">
        <button className="ghost calendar-icobtn" onClick={goPrev} title="Mois precedent" type="button">
          <CaretLeft size={14} />
        </button>
        <span className="calendar-month-label">{label}</span>
        <button className="ghost calendar-icobtn" onClick={goNext} title="Mois suivant" type="button">
          <CaretRight size={14} />
        </button>
        <button className="ghost" onClick={goToday} type="button">
          Aujourd'hui
        </button>
        <div className="view-toggle" role="group" aria-label="Vue du calendrier">
          <button className={vue === 'mois' ? 'on' : ''} onClick={() => setVue('mois')} type="button">
            Mois
          </button>
          <button className={vue === 'semaine' ? 'on' : ''} onClick={() => setVue('semaine')} type="button">
            Semaine
          </button>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-main">
          {vue === 'mois' ? (
            <>
              <div className="calendar-grid calendar-head">
                {JOURS_SEMAINE.map((j) => (
                  <div key={j} className="calendar-head-cell">
                    {j}
                  </div>
                ))}
              </div>
              <div className={`calendar-grid${saving ? ' calendar-saving' : ''}`}>
                {monthCells.map((key, i) => {
                  const items = itemsFor(key);
                  const showHint = key !== null && dragId !== null && items.length === 0;
                  return (
                    <div key={i} className={cellClass(key)} {...dropHandlers(key)}>
                      {key && (
                        <>
                          <div className={`calendar-daynum${key === todayKey ? ' today-num' : ''}`}>
                            {Number(key.slice(8))}
                          </div>
                          <div className="calendar-items">{renderItemList(key)}</div>
                        </>
                      )}
                      {showHint && <div className="calendar-drop-hint" />}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={`calendar-week${saving ? ' calendar-saving' : ''}`}>
              {weekDays.map((d, i) => {
                const key = formatDate(d.getFullYear(), d.getMonth(), d.getDate());
                const items = itemsFor(key);
                const showHint = dragId !== null && items.length === 0;
                return (
                  <div key={key} className={cellClass(key)} {...dropHandlers(key)}>
                    <div className="calendar-week-head">
                      <span className="calendar-week-dow">{JOURS_SEMAINE[i]}</span>
                      <span className={`calendar-week-daynum${key === todayKey ? ' today-num' : ''}`}>
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="calendar-items">{renderItemList(key)}</div>
                    {showHint && <div className="calendar-drop-hint" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="calendar-side">
          <div className="calendar-side-title">
            A programmer
            {aProgrammer.length > 0 && <span className="calendar-side-count">{aProgrammer.length}</span>}
          </div>
          <div className="calendar-side-sub">
            Brouillons valides sans date de programmation. Glissez-les sur un jour pour les programmer.
          </div>
          {aProgrammer.length === 0 ? (
            <div className="calendar-side-empty">
              Rien en attente. Les brouillons valides apparaissent ici jusqu'a leur programmation.
            </div>
          ) : (
            <div className="calendar-side-list">
              {aProgrammer.map((b) => (
                <div
                  key={b.id}
                  className="calendar-side-item"
                  title={b.titre}
                  draggable
                  onDragStart={dragStart(b)}
                  onDragEnd={dragEnd}
                  onClick={() => onOpen?.(b.id)}
                >
                  <span className="dot" />
                  <span className="calendar-side-titre">{b.titre}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
      {saving && <div className="calendar-toast">Reprogrammation en cours...</div>}
    </Page>
  );
}
