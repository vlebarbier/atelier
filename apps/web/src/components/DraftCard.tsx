import { ImageSquare, Copy, X } from '@phosphor-icons/react';
import type { Brouillon, Reseau, Statut } from '../api';
import { slideUrl } from '../api';
import { STATUT_LABELS, badgeType, relTime } from '../format';
import { ReseauBadge } from './ReseauBadge';

interface DraftCardProps {
  brouillon: Brouillon;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DraftCard({ brouillon, onOpen, onDuplicate, onDelete }: DraftCardProps) {
  const cover = brouillon.slides[0] ? slideUrl(brouillon.id, brouillon.slides[0]) : null;
  const reseaux = brouillon.reseaux ?? [];
  const badge = badgeType(brouillon.type, brouillon.slideCount);

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
        <span className="badge-type">{badge}</span>
      </div>
      <div className="body">
        <div className="titre">{brouillon.titre}</div>
        {reseaux.length > 0 && (
          <div className="nets">
            {reseaux.map((r) => (
              <ReseauBadge key={r} reseau={r as Reseau} />
            ))}
          </div>
        )}
        <div className="ligne">
          <span className={`badge badge--${brouillon.statut}`}>
            {STATUT_LABELS[brouillon.statut as Statut]}
          </span>
          <span className="updated">{relTime(brouillon.updated)}</span>
        </div>
      </div>
      <div className="pub-actions">
        <button
          type="button"
          className="mini"
          title="Dupliquer"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(brouillon.id);
          }}
        >
          <Copy size={13} />
        </button>
        <button
          type="button"
          className="mini"
          title="Supprimer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(brouillon.id);
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
