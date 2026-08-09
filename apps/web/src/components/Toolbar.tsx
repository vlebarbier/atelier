import type { Statut } from '../api';

interface ToolbarProps {
  filtre: Statut | 'tous';
  onFiltreChange: (filtre: Statut | 'tous') => void;
  count: number;
}

const FILTRES: { id: Statut | 'tous'; label: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'brouillon', label: 'Brouillon' },
  { id: 'a-valider', label: 'A valider' },
  { id: 'valide', label: 'Valide' },
  { id: 'publie', label: 'Publie' }
];

export function Toolbar({ filtre, onFiltreChange, count }: ToolbarProps) {
  return (
    <div className="toolbar">
      {FILTRES.map((f) => (
        <button
          key={f.id}
          className={f.id === filtre ? 'on' : ''}
          data-f={f.id}
          onClick={() => onFiltreChange(f.id)}
        >
          {f.label}
        </button>
      ))}
      <span className="count">
        {count} brouillon{count > 1 ? 's' : ''}
      </span>
    </div>
  );
}
