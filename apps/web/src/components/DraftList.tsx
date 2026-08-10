import { Sparkle, Stack } from '@phosphor-icons/react';
import type { Brouillon, Statut } from '../api';
import { slideUrl } from '../api';
import { STATUT_LABELS, formatDate, relTime } from '../format';

interface DraftListProps {
  brouillons: Brouillon[];
  onOpen: (id: string) => void;
}

export function DraftList({ brouillons, onOpen }: DraftListProps) {
  return (
    <div className="list-view">
      {brouillons.map((b) => (
        <div
          key={b.id}
          className="list-row"
          role="button"
          tabIndex={0}
          onClick={() => onOpen(b.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onOpen(b.id);
          }}
        >
          {b.slides[0] ? (
            <img className="thumb" src={slideUrl(b.id, b.slides[0])} alt={b.titre} loading="lazy" />
          ) : (
            <div className="thumb" />
          )}
          <div className="info">
            <div className="titre">{b.titre}</div>
            <div className="meta">
              <Stack size={11} />
              {b.slideCount} slide{b.slideCount > 1 ? 's' : ''}, {formatDate(b.updated) || 'non date'}
            </div>
            <div className="agent-badge">
              <Sparkle size={11} className="spark" />
              <span>Genere par Hermes, {relTime(b.updated)}</span>
            </div>
          </div>
          <div className="side">
            <span className={`badge badge--${b.statut}`}>{STATUT_LABELS[b.statut as Statut]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
