import { useMemo, useState, useCallback } from 'react';
import type { Brouillon } from '../api';
import { updateBrouillon } from '../api';
import { Page, PageHeader } from '../components/ui';

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
  if (!b.programme) return null;
  try {
    const prog = JSON.parse(b.programme);
    return prog?.date ?? null;
  } catch {
    return null;
  }
}

/** Construit un objet programme JSON pour une date donnee, en preservant heure/reseau existants. */
function buildProgramme(b: Brouillon, newDate: string): string {
  let heure = '09:00';
  let reseau = 'instagram';
  const existing = getProgrammeDate(b);
  if (existing && b.programme) {
    try {
      const prog = JSON.parse(b.programme);
      if (prog?.heure) heure = prog.heure;
      if (prog?.reseau) reseau = prog.reseau;
    } catch {
      /* fallback defaut */
    }
  }
  return JSON.stringify({ date: newDate, heure, reseau });
}

/** Formate une date YYYY-MM-DD. */
function formatDate(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/** Grille mensuelle avec drag & drop : glisser un brouillon d'un jour a l'autre met a jour sa programmation. */
export function CalendarPage({ brouillons, onOpen, onRefresh }: CalendarPageProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<number, Brouillon[]>();
    for (const b of brouillons) {
      let d: Date | null = null;
      if (b.programme) {
        try {
          const prog = JSON.parse(b.programme);
          if (prog?.date) d = new Date(`${prog.date}T12:00:00`);
        } catch {
          d = null;
        }
      }
      if (!d && b.updated) {
        d = new Date(b.updated);
        if (Number.isNaN(d.getTime())) d = null;
      }
      if (!d) continue;
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const day = d.getDate();
      const list = map.get(day) || [];
      list.push(b);
      map.set(day, list);
    }
    return map;
  }, [brouillons, year, month]);

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayNum = now.getDate();

  const handleDrop = useCallback(
    async (day: number) => {
      if (!dragId || day === null) return;
      setDragOverDay(null);
      setDragId(null);

      const brouillon = brouillons.find((b) => b.id === dragId);
      if (!brouillon) return;

      // Si le brouillon est deja programme sur ce jour, ne rien faire.
      const currentDate = getProgrammeDate(brouillon);
      const newDate = formatDate(year, month, day);
      if (currentDate === newDate) return;

      setSaving(true);
      try {
        const programme = buildProgramme(brouillon, newDate);
        await updateBrouillon(dragId, { programme });
        onRefresh?.();
      } catch (err) {
        console.error('Erreur reprogrammation:', err);
      } finally {
        setSaving(false);
      }
    },
    [dragId, brouillons, year, month, onRefresh]
  );

  return (
    <Page>
      <PageHeader
        title="Calendrier"
        sub={`${MOIS_LABELS[month]} ${year}, glissez un brouillon d'un jour a l'autre pour le reprogrammer.`}
      />
      <div className="calendar-grid calendar-head">
        {JOURS_SEMAINE.map((j) => (
          <div key={j} className="calendar-head-cell">
            {j}
          </div>
        ))}
      </div>
      <div className={`calendar-grid${saving ? ' calendar-saving' : ''}`}>
        {cells.map((day, i) => {
          const isDropTarget = day !== null && dragOverDay === day;
          const isDraggingDay = day !== null && dragId !== null;
          return (
            <div
              key={i}
              className={`calendar-cell${day === null ? ' empty' : ''}${day === todayNum ? ' today' : ''}${isDropTarget ? ' drag-over' : ''}`}
              onDragOver={(e) => {
                if (day !== null && dragId) {
                  e.preventDefault();
                  if (dragOverDay !== day) setDragOverDay(day);
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                // Ne pas quitter l'etat drag-over quand la souris passe sur un
                // enfant de la cellule (daynum, items) : sinon le surlignage clignote.
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                if (dragOverDay === day) setDragOverDay(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (day !== null) handleDrop(day);
              }}
            >
              {day !== null && (
                <>
                  <div className="calendar-daynum">{day}</div>
                  <div className="calendar-items">
                    {(byDay.get(day) || []).slice(0, 3).map((b) => (
                      <div
                        key={b.id}
                        className={`calendar-item badge--${b.statut}${dragId === b.id ? ' dragging' : ''}${onOpen ? ' clickable' : ''}`}
                        title={b.titre}
                        draggable
                        onDragStart={(e) => {
                          setDragId(b.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', b.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOverDay(null);
                        }}
                        onClick={() => onOpen?.(b.id)}
                      >
                        {b.titre}
                      </div>
                    ))}
                    {(byDay.get(day) || []).length > 3 && (
                      <div className="calendar-more">+{(byDay.get(day) || []).length - 3}</div>
                    )}
                  </div>
                </>
              )}
              {day !== null && isDraggingDay && (byDay.get(day)?.length ?? 0) === 0 && (
                <div className="calendar-drop-hint" />
              )}
            </div>
          );
        })}
      </div>
      {saving && <div className="calendar-toast">Reprogrammation en cours...</div>}
    </Page>
  );
}
