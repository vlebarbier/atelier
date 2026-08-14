import type { Vue } from './ContentListPage';
import type { Brouillon } from '../api';
import { DraftCard } from './DraftCard';
import { DraftList } from './DraftList';
import { Plus, Stack } from '@phosphor-icons/react';

export function GridSkeleton() {
  return (
    <div className="projects" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div className="card skeleton-card" key={i}>
          <div className="cover skeleton-block" />
          <div className="body">
            <div className="skeleton-line w70" />
            <div className="skeleton-line w40" />
            <div className="skeleton-line w55" />
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
}

export function DraftGrid({ brouillons, vue, onOpen, onNew, onDuplicate, onDelete }: DraftGridProps) {
  if (brouillons.length === 0) {
    return (
      <div className="empty-guide">
        <div className="empty-guide-mark">
          <Stack size={22} />
        </div>
        <h3>Le receptacle est vide</h3>
        <p>
          Vos agents produisent du contenu, Atelier le recoit, le montre et le fait valider.
          <br />
          Commencez par creer un brouillon, ou laissez votre agent deposer sa production via l'API.
        </p>
        <div className="empty-guide-actions">
          <button className="primary" type="button" onClick={onNew}>
            <Plus size={14} weight="bold" /> Creer un brouillon
          </button>
        </div>
        <ol className="empty-guide-steps">
          <li><span>1</span> Un agent (Hermes, Claude Code, Codex) produit le contenu</li>
          <li><span>2</span> Atelier le recoit : HTML source + visuels derives</li>
          <li><span>3</span> Vous revisez, validez, publiez. Rien ne part sans vous.</li>
        </ol>
      </div>
    );
  }

  if (vue === 'liste') {
    return <DraftList brouillons={brouillons} onOpen={onOpen} onDuplicate={onDuplicate} onDelete={onDelete} />;
  }

  return (
    <div className="projects">
      {brouillons.map((b) => (
        <DraftCard key={b.id} brouillon={b} onOpen={onOpen} onDuplicate={onDuplicate} onDelete={onDelete ?? (() => {})} />
      ))}
    </div>
  );
}
