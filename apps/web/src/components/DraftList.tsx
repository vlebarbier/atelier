import type { Brouillon, Reseau, Statut, StatutConformite } from '../api';
import { STATUT_LABELS, badgeType, relTime } from '../format';
import { slideUrl } from '../api';
import { ReseauBadge } from './ReseauBadge';
import { Copy, Trash, Video } from '@phosphor-icons/react';
import { Button } from './ui/button';

const DOT_STATUT: Record<string, string> = {
  brouillon: 'var(--color-status-neutral)',
  'a-valider': 'var(--color-status-warn)',
  valide: 'var(--color-status-validated)',
  publie: 'var(--color-status-ok)'
};

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
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      {brouillons.map((b, i) => {
        const conf = conformite?.[b.id];
        return (
          <div
            key={b.id}
            data-testid="brouillon-row"
            role="button"
            tabIndex={0}
            onClick={() => onOpen(b.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onOpen(b.id);
            }}
            className={`group/row flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring/60 ${
              i > 0 ? 'border-t border-border' : ''
            }`}
          >
            <div className="size-[34px] shrink-0 overflow-hidden rounded-lg bg-bg-deepest">
              {b.slides[0] ? (
                <img src={slideUrl(b.id, b.slides[0])} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{b.titre}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <span className="shrink-0 rounded-full border border-border px-2 py-px text-[10.5px] font-bold">
                  {badgeType(b.type, b.slideCount)}
                </span>
                {b.slideCount > 0 && <span className="shrink-0">{b.slideCount} visuel{b.slideCount > 1 ? 's' : ''}</span>}
                {(b.reseaux ?? []).slice(0, 3).map((r) => (
                  <ReseauBadge key={r} reseau={r as Reseau} />
                ))}
                <span className="shrink-0 text-ink-tertiary">{relTime(b.updated)}</span>
                {(conf === 'conforme' || conf === 'hors-charte') && (
                  <span
                    className={`inline-block size-[7px] shrink-0 rounded-full ${
                      conf === 'conforme' ? 'bg-status-ok' : 'bg-status-warn'
                    }`}
                    title={conf === 'conforme' ? 'Conforme à la charte' : 'Écarts avec la charte'}
                  />
                )}
              </div>
            </div>
            {onDelete && (
              <div className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-150 group-hover/row:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  title="Dupliquer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(b.id);
                  }}
                >
                  <Copy size={13} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive"
                  title="Supprimer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(b.id);
                  }}
                >
                  <Trash size={14} />
                </Button>
              </div>
            )}
            {b.type === 'video' && (
              <Video size={13} className="shrink-0 text-status-ok" aria-label="Video" />
            )}
            <span
              className="inline-block size-1.5 shrink-0 rounded-full"
              style={{ background: DOT_STATUT[b.statut as Statut] ?? 'transparent' }}
              title={STATUT_LABELS[b.statut as Statut]}
            />
          </div>
        );
      })}
    </div>
  );
}
