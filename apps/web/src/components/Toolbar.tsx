import type { Statut } from '../api';

interface ToolbarProps {
  filtre: Statut | 'tous';
  onFiltreChange: (filtre: Statut | 'tous') => void;
  count: number;
}

/** Les filtres silencieux : texte + point colore, pas de pilules (direction refonte). */
const FILTRES: { id: Statut | 'tous'; label: string; dot?: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'brouillon', label: 'Brouillon', dot: 'var(--color-ink-tertiary)' },
  { id: 'a-valider', label: 'A valider', dot: 'var(--color-status-warn)' },
  { id: 'valide', label: 'Valide', dot: 'var(--color-status-ok)' },
  { id: 'publie', label: 'Publie', dot: 'var(--color-status-ok)' }
];

export function Toolbar({ filtre, onFiltreChange, count }: ToolbarProps) {
  return (
    <div className="toolbar toolbar-quiet">
      {FILTRES.map((f) => (
        <button
          key={f.id}
          className={f.id === filtre ? 'on' : ''}
          data-f={f.id}
          onClick={() => onFiltreChange(f.id)}
        >
          {f.dot && <span className="dot" style={{ background: f.dot }} />}
          {f.label}
        </button>
      ))}
      <span className="toolbar-count">
        {count} brouillon{count > 1 ? 's' : ''}
      </span>
    </div>
  );
}
