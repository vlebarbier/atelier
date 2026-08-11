import { MagnifyingGlass, SquaresFour, List } from '@phosphor-icons/react';

export type Vue = 'grille' | 'liste';

interface HeaderProps {
  titre: string;
  vue: Vue;
  onVueChange: (vue: Vue) => void;
  onOpenPalette: () => void;
  /** La page courante permet de n'afficher les actions contextuelles que la ou elles servent. */
  page: string;
}

export function Header({ titre, vue, onVueChange, onOpenPalette, page }: HeaderProps) {
  const surListe = page === 'brouillons' || page === 'documents';
  return (
    <header>
      <div className="crumb">
        <span className="sub">{titre}</span>
      </div>
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
