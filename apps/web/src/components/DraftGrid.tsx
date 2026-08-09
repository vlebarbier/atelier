import type { Vue } from './Header';
import type { Brouillon } from '../api';
import { DraftCard } from './DraftCard';
import { DraftList } from './DraftList';

interface DraftGridProps {
  brouillons: Brouillon[];
  vue: Vue;
  onOpen: (id: string) => void;
}

export function DraftGrid({ brouillons, vue, onOpen }: DraftGridProps) {
  if (brouillons.length === 0) {
    return (
      <div className="empty">
        Aucun brouillon pour l'instant.
        <br />
        <br />
        Deposez un dossier dans <code>brouillons/</code>
        <br />
        (slides/ + meta.json optionnel) puis actualisez.
      </div>
    );
  }

  if (vue === 'liste') {
    return <DraftList brouillons={brouillons} onOpen={onOpen} />;
  }

  return (
    <div className="projects">
      {brouillons.map((b) => (
        <DraftCard key={b.id} brouillon={b} onOpen={onOpen} />
      ))}
    </div>
  );
}
