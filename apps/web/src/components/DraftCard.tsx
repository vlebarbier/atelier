import { Sparkle, ImageSquare, Stack } from '@phosphor-icons/react';
import type { Brouillon, Statut } from '../api';
import { STATUT_LABELS, formatDate, relTime } from '../format';

interface DraftCardProps {
  brouillon: Brouillon;
  onOpen: (id: string) => void;
}

export function DraftCard({ brouillon, onOpen }: DraftCardProps) {
  const cover = brouillon.slides[0] ? `/b/${brouillon.id}/${brouillon.slides[0]}` : null;

  return (
    <div
      className="card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(brouillon.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(brouillon.id);
      }}
    >
      <div className="cover">
        {cover ? (
          <img src={cover} alt={brouillon.titre} loading="lazy" />
        ) : (
          <div className="cover-empty">
            <ImageSquare size={28} />
          </div>
        )}
        <span className="nslides">
          <Stack size={11} />
          {brouillon.slideCount} slides
        </span>
      </div>
      <div className="body">
        <div className="titre">{brouillon.titre}</div>
        <div className="agent-badge">
          <Sparkle size={12} className="spark" />
          <span>Genere par Hermes, {relTime(brouillon.updated)}</span>
        </div>
        <div className="ligne">
          <span className={`badge badge--${brouillon.statut}`}>
            {STATUT_LABELS[brouillon.statut as Statut]}
          </span>
          <span className="updated">{formatDate(brouillon.updated)}</span>
        </div>
      </div>
    </div>
  );
}
