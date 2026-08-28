import type { Statut } from '../api';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

interface ToolbarProps {
  filtre: Statut | 'tous';
  onFiltreChange: (filtre: Statut | 'tous') => void;
  count: number;
}

/** Les filtres silencieux : texte + point colore, actif souligne (SPEC-SHADCN
 *  V1 : ToggleGroup). Les points portent la couleur du statut, jamais l'accent. */
const FILTRES: { id: Statut | 'tous'; label: string; dot?: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'brouillon', label: 'Brouillon', dot: 'var(--color-status-neutral)' },
  { id: 'a-valider', label: 'A valider', dot: 'var(--color-status-warn)' },
  { id: 'valide', label: 'Valide', dot: 'var(--color-status-validated)' },
  { id: 'publie', label: 'Publie', dot: 'var(--color-status-ok)' }
];

export function Toolbar({ filtre, onFiltreChange, count }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <ToggleGroup
        type="single"
        value={filtre}
        onValueChange={(v) => {
          if (v) onFiltreChange(v as Statut | 'tous');
        }}
        aria-label="Filtrer par statut"
      >
        {FILTRES.map((f) => (
          <ToggleGroupItem
            key={f.id}
            value={f.id}
            variant="quiet"
            data-testid={`filtre-statut-${f.id}`}
            className="inline-flex items-center gap-1.5"
          >
            {f.dot && (
              <span
                className="inline-block size-1.5 shrink-0 rounded-full"
                style={{ background: f.dot }}
                aria-hidden="true"
              />
            )}
            {f.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <span className="text-[12px] text-muted-foreground">
        {count} brouillon{count > 1 ? 's' : ''}
      </span>
    </div>
  );
}
