import type { Brouillon, Statut, StatutConformite } from '../api';
import { STATUT_LABELS, badgeType, relTime } from '../format';
import { slideUrl } from '../api';
import { ReseauBadges } from './ReseauBadge';
import { Copy, Trash, Video } from '@phosphor-icons/react';

interface DraftListProps {
  brouillons: Brouillon[];
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Verdicts de conformite a la charte par brouillon (F-33) : point dans la ligne. */
  conformite?: Record<string, StatutConformite>;
}

export function DraftList({ brouillons, onOpen, onDuplicate, onDelete, conformite }: DraftListProps) {
  return (
    <div className="pub-liste">
      {brouillons.map((b) => {
        const conf = conformite?.[b.id];
        return (
        <div key={b.id} className="pub-row" role="button" tabIndex={0} onClick={() => onOpen(b.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(b.id); }}>
          <div className="thumb">
            {b.slides[0] ? <img src={slideUrl(b.id, b.slides[0])} alt="" /> : <div className="thumb-empty" />}
          </div>
          <div className="infos">
            <div className="titre">{b.titre}</div>
            <div className="meta">
              <span className="badge-type-liste">{badgeType(b.type, b.slideCount)}</span>
              {b.slideCount > 0 && <span className="slides-count">{b.slideCount} visuel{b.slideCount > 1 ? 's' : ''}</span>}
              <ReseauBadges reseaux={b.reseaux ?? []} />
              <span>{relTime(b.updated)}</span>
              {(conf === 'conforme' || conf === 'hors-charte') && (
                <span
                  className={`conf-dot ${conf === 'conforme' ? 'ok' : 'warn'}`}
                  title={conf === 'conforme' ? 'Conforme à la charte' : 'Écarts avec la charte'}
                />
              )}
            </div>
          </div>
          {onDelete && (
            <div className="pub-actions">
              <button type="button" className="mini" title="Dupliquer"
                onClick={(e) => { e.stopPropagation(); onDuplicate(b.id); }}>
                <Copy size={13} />
              </button>
              <button type="button" className="mini" title="Supprimer"
                onClick={(e) => { e.stopPropagation(); onDelete(b.id); }}>
                <Trash size={14} />
              </button>
            </div>
          )}
          {b.type === 'video' && (
            <span className="status-dot" style={{ color: 'var(--color-status-ok)' }} title="Video">
              <Video size={12} />
            </span>
          )}
          <span
            className={`status-dot ${
              b.statut === 'a-valider'
                ? 'a-valider'
                : b.statut === 'valide'
                  ? 'valide'
                  : b.statut === 'publie'
                    ? 'publie'
                    : ''
            }`}
            title={STATUT_LABELS[b.statut as Statut]}
          />
        </div>
        );
      })}
    </div>
  );
}
