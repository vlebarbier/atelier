import { useMemo } from 'react';
import type { Brouillon } from '../api';

interface CalendarPageProps {
  brouillons: Brouillon[];
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

/** Grille mensuelle simple, sans lib externe. Chaque brouillon apparait sur son jour de updated. */
export function CalendarPage({ brouillons }: CalendarPageProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const byDay = useMemo(() => {
    const map = new Map<number, Brouillon[]>();
    for (const b of brouillons) {
      // Un brouillon programme apparait sur sa date de programmation ;
      // sinon sur sa date de mise a jour.
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
  // getDay() : 0 = dimanche. On veut une semaine commencant lundi.
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayNum = now.getDate();

  return (
    <div className="calendar-page">
      <div className="calendar-title">
        {MOIS_LABELS[month]} {year}
      </div>
      <div className="calendar-grid calendar-head">
        {JOURS_SEMAINE.map((j) => (
          <div key={j} className="calendar-head-cell">
            {j}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`calendar-cell${day === null ? ' empty' : ''}${day === todayNum ? ' today' : ''}`}
          >
            {day !== null && (
              <>
                <div className="calendar-daynum">{day}</div>
                <div className="calendar-items">
                  {(byDay.get(day) || []).slice(0, 3).map((b) => (
                    <div key={b.id} className={`calendar-item badge--${b.statut}`} title={b.titre}>
                      {b.titre}
                    </div>
                  ))}
                  {(byDay.get(day) || []).length > 3 && (
                    <div className="calendar-more">+{(byDay.get(day) || []).length - 3}</div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
