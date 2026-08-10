import { MagnifyingGlass, SquaresFour, List, Plus } from '@phosphor-icons/react';

export type Vue = 'grille' | 'liste';

interface HeaderProps {
  titre: string;
  vue: Vue;
  onVueChange: (vue: Vue) => void;
  onOpenPalette: () => void;
  onNew: () => void;
  /** La page courante permet de n'afficher les actions contextuelles que la ou elles servent. */
  page: string;
}

export function Header({ titre, vue, onVueChange, onOpenPalette, onNew, page }: HeaderProps) {
  const surBrouillons = page === 'brouillons';
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
        {surBrouillons && (
          <>
            <div className="view-toggle">
              <button className={vue === 'grille' ? 'on' : ''} onClick={() => onVueChange('grille')} title="Grille">
                <SquaresFour size={15} />
              </button>
              <button className={vue === 'liste' ? 'on' : ''} onClick={() => onVueChange('liste')} title="Liste">
                <List size={15} />
              </button>
            </div>
            <button className="primary" onClick={onNew} title="Nouveau brouillon">
              <Plus size={14} weight="bold" />
              <span>Nouveau</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
