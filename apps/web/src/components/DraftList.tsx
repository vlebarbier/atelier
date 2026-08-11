import { ArrowRight, Sparkle, Stack, Trash } from '@phosphor-icons/react';
import type { Brouillon, Statut } from '../api';
import { slideUrl } from '../api';
import { STATUT_LABELS, formatDate, relTime } from '../format';

interface DraftListProps {
  brouillons: Brouillon[];
  onOpen: (id: string) => void;
  onDelete?: (id: string) => void;
}

/** Les couleurs de statut : points discrets, pas de pilules (direction "atelier, pas dashboard"). */
const STATUT_DOT: Record<string, string> = {
  brouillon: 'var(--color-ink-tertiary)',
  'a-valider': 'var(--color-status-warn)',
  valide: 'var(--color-status-ok)',
  publie: 'var(--color-status-ok)'
};

export function DraftList({ brouillons, onOpen, onDelete }: DraftListProps) {
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
            <div className="thumb thumb-empty" />
          )}
          <div className="info">
            <div className="titre">{b.titre}</div>
            <div className="meta">
              <Stack size={11} />
              {b.slideCount} slide{b.slideCount > 1 ? 's' : ''} · {formatDate(b.updated) || 'non daté'}
            </div>
          </div>
          <div className="agent-badge" title="Produit par un agent">
            <Sparkle size={11} className="spark" />
            <span>généré par Hermes, {relTime(b.updated)}</span>
          </div>
          <div className="status-dot" title={STATUT_LABELS[b.statut as Statut] ?? b.statut}>
            <span className="dot status-pop" style={{ background: STATUT_DOT[b.statut] ?? 'var(--color-ink-tertiary)' }} />
            {STATUT_LABELS[b.statut as Statut] ?? b.statut}
          </div>
          <div className="row-actions">
            <button type="button" className="ghost" onClick={(e) => { e.stopPropagation(); onOpen(b.id); }} title="Ouvrir">
              <ArrowRight size={13} />
            </button>
            {onDelete && (
              <button
                type="button"
                className="ghost danger"
                onClick={(e) => { e.stopPropagation(); onDelete(b.id); }}
                title="Supprimer"
              >
                <Trash size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
