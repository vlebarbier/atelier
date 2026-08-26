import type { Vue } from './ContentListPage';
import type { Brouillon, StatutConformite } from '../api';
import { DraftCard } from './DraftCard';
import { DraftList } from './DraftList';
import { Plus, Stack } from '@phosphor-icons/react';
import { Button } from './ui/button';

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="aspect-[4/3] w-full animate-pulse bg-bg-level-2" />
          <div className="flex flex-col gap-2 p-3">
            <div className="h-3 w-3/4 animate-pulse rounded-full bg-bg-level-2" />
            <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-bg-level-2" />
            <div className="h-2.5 w-2/3 animate-pulse rounded-full bg-bg-level-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface DraftGridProps {
  brouillons: Brouillon[];
  vue: Vue;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Verdicts de conformite a la charte par brouillon (F-33) : badge sur les covers. */
  conformite?: Record<string, StatutConformite>;
}

export function DraftGrid({ brouillons, vue, onOpen, onNew, onDuplicate, onDelete, conformite }: DraftGridProps) {
  if (brouillons.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Stack size={22} />
        </div>
        <h3 className="font-display text-[15px] font-semibold">Le receptacle est vide</h3>
        <p className="max-w-md text-[12.5px] text-muted-foreground">
          Vos agents produisent du contenu, Atelier le recoit, le montre et le fait valider.
          <br />
          Commencez par creer un brouillon, ou laissez votre agent deposer sa production via l'API.
        </p>
        <Button type="button" onClick={onNew}>
          <Plus size={14} weight="bold" /> Creer un brouillon
        </Button>
        <ol className="mt-2 flex flex-col gap-1.5 text-left text-[12px] text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">1</span>
            Un agent (Hermes, Claude Code, Codex) produit le contenu
          </li>
          <li className="flex items-center gap-2">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">2</span>
            Atelier le recoit : HTML source + visuels derives
          </li>
          <li className="flex items-center gap-2">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">3</span>
            Vous revisez, validez, publiez. Rien ne part sans vous.
          </li>
        </ol>
      </div>
    );
  }

  if (vue === 'liste') {
    return <DraftList brouillons={brouillons} onOpen={onOpen} onDuplicate={onDuplicate} onDelete={onDelete} conformite={conformite} />;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
      {brouillons.map((b) => (
        <DraftCard key={b.id} brouillon={b} onOpen={onOpen} onDuplicate={onDuplicate} onDelete={onDelete ?? (() => {})} conformite={conformite?.[b.id]} />
      ))}
    </div>
  );
}
