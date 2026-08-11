import { MagnifyingGlass, Bell, ArrowsInLineVertical, Sun, Moon, CaretDoubleLeft, CaretDoubleRight } from '@phosphor-icons/react';

interface HeaderProps {
  onOpenPalette: () => void;
  /** Nombre de brouillons a valider — badge de la cloche. */
  aValider: number;
  onOpenNotifications: () => void;
  /** Vue detail ouverte : on peut replier le panneau d'edition pour voir la slide en grand. */
  brouillonOuvert: boolean;
  panneauReplie: boolean;
  onTogglePanneau: () => void;
  /** Theme sombre/clair (toggle manuel). */
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  /** Sidebar repliee (le volet vit ici, pattern PushRank). */
  sidebarRepliee: boolean;
  onToggleSidebar: () => void;
}

/**
 * Barre d'actions GLOBALE (pattern PushRank/Linear) : ce qui est vrai sur
 * toutes les pages — volet sidebar, recherche ⌘K, theme, replier la page,
 * notifications. Les controles contextuels (toggle vue, filtres, Nouveau)
 * vivent dans la page.
 */
export function Header({ onOpenPalette, aValider, onOpenNotifications, brouillonOuvert, panneauReplie, onTogglePanneau, theme, onToggleTheme, sidebarRepliee, onToggleSidebar }: HeaderProps) {
  return (
    <header className="app-bar">
      <div className="actions">
        <button className="icon-btn" type="button" onClick={onToggleSidebar} title={sidebarRepliee ? 'Déplier la barre latérale' : 'Replier la barre latérale'}>
          {sidebarRepliee ? <CaretDoubleRight size={15} /> : <CaretDoubleLeft size={15} />}
        </button>
        <button className="cmdk-hint" type="button" onClick={onOpenPalette}>
          <MagnifyingGlass size={14} />
          <span>Rechercher</span>
          <kbd>{'\u2318'}K</kbd>
        </button>
        <button className="icon-btn" type="button" onClick={onToggleTheme} title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        {brouillonOuvert && (
          <button
            className={`icon-btn${panneauReplie ? ' on' : ''}`}
            type="button"
            onClick={onTogglePanneau}
            title={panneauReplie ? 'Déplier le panneau d\'édition' : 'Replier le panneau d\'édition'}
          >
            <ArrowsInLineVertical size={15} />
          </button>
        )}
        <button className="icon-btn notif-btn" type="button" onClick={onOpenNotifications} title="Notifications">
          <Bell size={15} />
          {aValider > 0 && <span className="notif-badge">{aValider}</span>}
        </button>
      </div>
    </header>
  );
}
