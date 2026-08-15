import { MagnifyingGlass, ArrowsInLineVertical, Sun, Moon, CaretDoubleLeft, CaretDoubleRight } from '@phosphor-icons/react';
import { NotificationBell, type NotifEvent } from './NotificationBell';

interface HeaderProps {
  onOpenPalette: () => void;
  /** Evenements de la cloche : a valider + publies recemment. */
  notifs: NotifEvent[];
  onOpenNotification: (id: string) => void;
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
 * toutes les pages : volet sidebar, recherche ⌘K, theme, replier la page,
 * notifications. Les controles contextuels (toggle vue, filtres, Nouveau)
 * vivent dans la page.
 */
export function Header({ onOpenPalette, notifs, onOpenNotification, brouillonOuvert, panneauReplie, onTogglePanneau, theme, onToggleTheme, sidebarRepliee, onToggleSidebar }: HeaderProps) {
  return (
    <header className="app-bar">
      <div className="app-bar-left">
        <button className="icon-btn" type="button" onClick={onToggleSidebar} title={sidebarRepliee ? 'Déplier la barre latérale' : 'Replier la barre latérale'}>
          {sidebarRepliee ? <CaretDoubleRight size={15} /> : <CaretDoubleLeft size={15} />}
        </button>
      </div>
      <div className="actions">
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
        <NotificationBell events={notifs} onOpen={onOpenNotification} />
      </div>
    </header>
  );
}
