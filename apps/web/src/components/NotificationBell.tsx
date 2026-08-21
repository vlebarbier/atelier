import { useEffect, useRef, useState } from 'react';
import { Bell, Check, Warning } from '@phosphor-icons/react';
import { relTime } from '../format';

/** Evenement de notification : publication reussie ou contenu a valider. */
export interface NotifEvent {
  kind: 'publie' | 'a-valider';
  id: string;
  titre: string;
  /** Reseau de publication (Instagram, LinkedIn, le blog...). */
  reseau?: string;
  /** Date ISO de l'evenement (updated du brouillon). */
  at: string | null;
}

interface NotificationBellProps {
  events: NotifEvent[];
  /** Ouvre le contenu : navigation vers la bonne page + vue detail. */
  onOpen: (id: string) => void;
}

/**
 * Cloche de notifications (MVP 1.5, prototype audit-notifs.png) : dropdown
 * des evenements du fil de vie de l'outil, a valider (action requise) et
 * publies recemment (resultat). Chaque ligne ouvre le contenu concerne.
 */
export function NotificationBell({ events, onOpen }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fermeture au clic hors du panneau et a la touche Echap (pattern Linear).
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const aValider = events.filter((e) => e.kind === 'a-valider');
  const publies = events.filter((e) => e.kind === 'publie');
  const count = events.length;

  return (
    <div className="notif-root" ref={rootRef}>
      <button
        type="button"
        className={`icon-btn notif-btn${open ? ' on' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        aria-expanded={open}
      >
        <Bell size={15} />
        {count > 0 && <span className="notif-badge">{count > 9 ? '9+' : count}</span>}
      </button>
      {open && (
        <div className="notif-pop" role="menu" aria-label="Notifications">
          <div className="notif-head">Notifications</div>
          {count === 0 && <div className="notif-empty">Aucune notification.</div>}
          {aValider.length > 0 && (
            <div className="notif-group">
              <div className="notif-section">À valider</div>
              {aValider.map((e) => (
                <NotifItem key={e.id} event={e} onOpen={onOpen} />
              ))}
            </div>
          )}
          {publies.length > 0 && (
            <div className="notif-group">
              <div className="notif-section">Publiés récemment</div>
              {publies.map((e) => (
                <NotifItem key={e.id} event={e} onOpen={onOpen} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotifItem({ event, onOpen }: { event: NotifEvent; onOpen: (id: string) => void }) {
  const publie = event.kind === 'publie';
  const debut = publie ? (event.reseau ? `Publié sur ${event.reseau}` : 'Publié') : 'À valider';
  return (
    <button type="button" className="notif-item" role="menuitem" onClick={() => onOpen(event.id)}>
      <span className={`n-ico ${publie ? 'n-ok' : 'n-warn'}`} aria-hidden="true">
        {publie ? <Check size={12} weight="bold" /> : <Warning size={12} weight="bold" />}
      </span>
      <span className="n-body">
        <span className="n-title">
          <b>{debut}</b> · {event.titre}
        </span>
        <span className="n-meta">{relTime(event.at)}</span>
      </span>
    </button>
  );
}
