import { useEffect, useState } from 'react';
import {
  SquaresFour,
  CalendarBlank,
  FolderOpen,
  Palette,
  Sparkle,
  Gear,
  Question,
  SidebarSimple
} from '@phosphor-icons/react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  /** Nombre de brouillons a valider (badge sur Brouillons). */
  aValider?: number;
}

type NavItem = { id: string; label: string; Icon: typeof SquaresFour };

const GROUPES: { label: string; items: NavItem[] }[] = [
  {
    label: 'Travail',
    items: [
      { id: 'brouillons', label: 'Brouillons', Icon: SquaresFour },
      { id: 'calendrier', label: 'Calendrier', Icon: CalendarBlank }
    ]
  },
  {
    label: 'Marque',
    items: [
      { id: 'bibliotheque', label: 'Bibliothèque', Icon: FolderOpen },
      { id: 'charte', label: 'Charte graphique', Icon: Palette }
    ]
  },
  {
    label: 'Agents',
    items: [{ id: 'activite', label: 'Activité IA', Icon: Sparkle }]
  }
];

const STORAGE_KEY = 'atelier.sidebar.collapsed';

export function Sidebar({ activePage, onNavigate, aValider = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* stockage indisponible : ignorer */
    }
  }, [collapsed]);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="brand">
        <span className="mark" />
        {!collapsed && <span className="name">Atelier</span>}
      </div>

      <nav className="side-nav">
        {GROUPES.map((g) => (
          <div className="nav-group" key={g.label}>
            {!collapsed && <div className="nav-group-label">{g.label}</div>}
            {g.items.map(({ id, label, Icon }) => {
              const showBadge = id === 'brouillons' && aValider > 0;
              return (
                <button
                  key={id}
                  className={id === activePage ? 'active' : ''}
                  onClick={() => onNavigate(id)}
                  title={collapsed ? label : undefined}
                  aria-label={label}
                >
                  <Icon size={16} weight="regular" className="nav-ico" />
                  {!collapsed && <span className="nav-label">{label}</span>}
                  {!collapsed && showBadge && (
                    <span className="nav-badge" title="A valider">{aValider}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="nav-footer">
        <button className={activePage === 'parametres' ? 'active' : ''} onClick={() => onNavigate('parametres')} title={collapsed ? 'Parametres' : undefined} aria-label="Parametres">
          <Gear size={16} weight="regular" className="nav-ico" />
          {!collapsed && <span className="nav-label">Paramètres</span>}
        </button>
        <button title={collapsed ? 'Aide' : undefined} aria-label="Aide">
          <Question size={16} weight="regular" className="nav-ico" />
          {!collapsed && <span className="nav-label">Aide</span>}
        </button>
        <button
          className="nav-collapse"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Deplier la barre' : 'Replier la barre'}
          aria-label={collapsed ? 'Deplier la barre laterale' : 'Replier la barre laterale'}
        >
          <SidebarSimple size={16} weight="regular" className="nav-ico" />
          {!collapsed && <span className="nav-label">Replier</span>}
        </button>
      </div>
    </aside>
  );
}
