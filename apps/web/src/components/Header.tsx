import { MagnifyingGlass, SquaresFour, List } from '@phosphor-icons/react';

export type Vue = 'grille' | 'liste';

interface HeaderProps {
  vue: Vue;
  onVueChange: (vue: Vue) => void;
  onOpenPalette: () => void;
  /** La page courante permet de n'afficher les actions contextuelles que la ou elles servent. */
  page: string;
}

/**
 * Barre d'actions globale (pattern Linear) : PAS de titre ici — le titre et le
 * sous-titre vivent dans le PageHeader de chaque page. Cette barre ne porte que
 * les actions contextuelles : recherche ⌘K + toggle de vue (sur les listes).
 */
export function Header({ vue, onVueChange, onOpenPalette, page }: HeaderProps) {
  const surListe = page === 'brouillons' || page === 'documents';
  return (
    <header className="app-bar">
      <div className="actions">
        <button className="cmdk-hint" type="button" onClick={onOpenPalette}>
          <MagnifyingGlass size={14} />
          <span>Rechercher</span>
          <kbd>{'\u2318'}K</kbd>
        </button>
        {surListe && (
          <div className="view-toggle">
            <button className={vue === 'grille' ? 'on' : ''} onClick={() => onVueChange('grille')} title="Grille">
              <SquaresFour size={15} />
            </button>
            <button className={vue === 'liste' ? 'on' : ''} onClick={() => onVueChange('liste')} title="Liste">
              <List size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
