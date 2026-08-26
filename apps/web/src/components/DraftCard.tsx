import { ImageSquare, Copy, X, CheckCircle, Warning } from '@phosphor-icons/react';
import type { Brouillon, Reseau, Statut, StatutConformite } from '../api';
import { slideUrl } from '../api';
import { STATUT_LABELS, badgeType, relTime } from '../format';
import { ReseauBadge } from './ReseauBadge';
import { Button } from './ui/button';

/** Couleur du point de statut (jamais l'accent dore, regle DA). */
const DOT_STATUT: Record<string, string> = {
  brouillon: 'var(--color-status-neutral)',
  'a-valider': 'var(--color-status-warn)',
  valide: 'var(--color-status-validated)',
  publie: 'var(--color-status-ok)'
};

interface DraftCardProps {
  brouillon: Brouillon;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  /** Verdict de conformite a la charte (F-33) : chip sur la cover, en bas a gauche. */
  conformite?: StatutConformite;
}

export function DraftCard({ brouillon, onOpen, onDuplicate, onDelete, conformite }: DraftCardProps) {
  const cover = brouillon.slides[0] ? slideUrl(brouillon.id, brouillon.slides[0]) : null;
  const reseaux = brouillon.reseaux ?? [];
  const badge = badgeType(brouillon.type, brouillon.slideCount);

  return (
    <div
      data-testid="brouillon-card"
      className="group/card relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card shadow-(--color-shadow-sm) transition-[transform,box-shadow,border-color] duration-150 ease-(--ease-atelier) hover:-translate-y-0.5 hover:border-line-hover hover:shadow-(--color-shadow-md) focus-visible:outline-2 focus-visible:outline-ring/60"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(brouillon.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(brouillon.id);
      }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-bg-deepest">
        {cover ? (
          <img src={cover} alt={brouillon.titre} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-tertiary">
            <ImageSquare size={28} />
          </div>
        )}
        {badge && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-bold text-white backdrop-blur-sm">
            {badge}
          </span>
        )}
        {conformite === 'conforme' && (
          <span
            className="absolute bottom-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10.5px] font-bold text-status-ok backdrop-blur-sm"
            title="Conforme à la charte"
          >
            <CheckCircle size={11} weight="bold" /> Conforme
          </span>
        )}
        {conformite === 'hors-charte' && (
          <span
            className="absolute bottom-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10.5px] font-bold text-primary backdrop-blur-sm"
            title="Écarts avec la charte : le detail est dans la vue de revision"
          >
            <Warning size={11} weight="bold" /> Hors charte
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <div className="line-clamp-2 text-[13px] leading-snug font-medium">{brouillon.titre}</div>
        {reseaux.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {reseaux.map((r) => (
              <ReseauBadge key={r} reseau={r as Reseau} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <span
              className="inline-block size-1.5 rounded-full"
              style={{ background: DOT_STATUT[brouillon.statut] ?? 'transparent' }}
              aria-hidden="true"
            />
            {STATUT_LABELS[brouillon.statut as Statut]}
          </span>
          <span className="text-[11.5px] text-ink-tertiary">{relTime(brouillon.updated)}</span>
        </div>
      </div>
      <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 transition-opacity duration-150 group-hover/card:opacity-100">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-7"
          title="Dupliquer"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(brouillon.id);
          }}
        >
          <Copy size={13} />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="size-7 text-destructive hover:text-destructive"
          title="Supprimer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(brouillon.id);
          }}
        >
          <X size={14} />
        </Button>
      </div>
    </div>
  );
}
