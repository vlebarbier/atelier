import { MagnifyingGlass, SquaresFour, List, ArrowClockwise, Plus } from '@phosphor-icons/react';

export type Vue = 'grille' | 'liste';

interface HeaderProps {
  crumb: string;
  vue: Vue;
  onVueChange: (vue: Vue) => void;
  onRefresh: () => void;
  refreshing: boolean;
  onOpenPalette: () => void;
  onNew: () => void;
}

export function Header({ crumb, vue, onVueChange, onRefresh, refreshing, onOpenPalette, onNew }: HeaderProps) {
  return (
    <header>
      <div className="crumb">
        <span>Atelier</span>
        <span className="sep">/</span>
        <span className="sub">{crumb}</span>
      </div>
      <div className="actions">
        <button className="cmdk-hint" type="button" onClick={onOpenPalette}>
          <MagnifyingGlass size={14} />
          <span>Rechercher</span>
          <kbd>{'\u2318'}K</kbd>
        </button>
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
        <button className="ghost" onClick={onRefresh} disabled={refreshing}>
          <ArrowClockwise size={14} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Actualisation...' : 'Actualiser'}</span>
        </button>
      </div>
    </header>
  );
}
