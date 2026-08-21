import { Copy, X } from '@phosphor-icons/react';
import type { Brouillon, Reseau, Statut } from '../api';
import { slideUrl } from '../api';
import { STATUT_LABELS, badgeType, relTime } from '../format';
import { ReseauBadge } from './ReseauBadge';

interface DraftListProps {
  brouillons: Brouillon[];
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete?: (id: string) => void;
}

/** Les couleurs de statut : points discrets, pas de pilules (direction "atelier, pas dashboard"). */
const STATUT_DOT: Record<string, string> = {
  brouillon: 'var(--color-ink-tertiary)',
  'a-valider': 'var(--color-status-warn)',
  valide: 'var(--color-status-validated)',
  publie: 'var(--color-status-ok)'
};

export function DraftList({ brouillons, onOpen, onDuplicate, onDelete }: DraftListProps) {
  return (
    <div className="list-view">
      {brouillons.map((b) => {
        const reseaux = b.reseaux ?? [];
        const badge = badgeType(b.type, b.slideCount);
        return (
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
              <div className="thumb thumb-empty" />
            )}
            <div className="info">
              <div className="titre">
                {b.titre}
                <span className="badge-type-liste">{badge}</span>
              </div>
              <div className="meta">
                {reseaux.map((r) => (
                  <ReseauBadge key={r} reseau={r as Reseau} />
                ))}
                <span className="meta-dot">·</span>
                {relTime(b.updated)}
              </div>
            </div>
            <div className="status-dot" title={STATUT_LABELS[b.statut as Statut] ?? b.statut}>
              <span className="dot status-pop" style={{ background: STATUT_DOT[b.statut] ?? 'var(--color-ink-tertiary)' }} />
              {STATUT_LABELS[b.statut as Statut] ?? b.statut}
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="mini"
                title="Dupliquer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(b.id);
                }}
              >
                <Copy size={13} />
              </button>
              {onDelete && (
                <button
                  type="button"
                  className="mini danger"
                  title="Supprimer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(b.id);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
