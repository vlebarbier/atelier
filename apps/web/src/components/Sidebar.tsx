import { useEffect, useRef, useState } from 'react';
import {
  SquaresFour,
  CalendarBlank,
  FolderOpen,
  Palette,
  Sparkle,
  Gear,
  Question,
  CaretDoubleLeft,
  CaretDoubleRight
} from '@phosphor-icons/react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  /** Nombre de contenus a valider (badge sur Dashboard). */
  aValider?: number;
}

type NavItem = { id: string; label: string; Icon: typeof SquaresFour };

const GROUPES: { label: string; items: NavItem[] }[] = [
  {
    label: 'Travail',
    items: [
      { id: 'brouillons', label: 'Dashboard', Icon: SquaresFour },
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
  const [hovering, setHovering] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* stockage indisponible : ignorer */
    }
  }, [collapsed]);

  // Hover intent : delai de deploiement (150ms) et de repli (250ms) pour eviter
  // le clignotement et le redepoiement immediat apres un clic sur "Replier".
  function enter() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovering(true), 150);
  }
  function leave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHovering(false), 250);
  }
  function toggleCollapse() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovering(false);
    setCollapsed((c) => !c);
  }

  // Deployee = etat persiste OU survol temporaire (pattern epingle).
  const deployee = !collapsed || hovering;

  function goHome() {
    onNavigate('brouillons');
  }

  return (
    <aside
      className={`sidebar${deployee ? '' : ' collapsed'}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <div className="brand">
        <button className="brand-home" onClick={goHome} title="Dashboard" aria-label="Retour au dashboard">
          <span className="mark" />
          {deployee && <span className="name">Atelier</span>}
        </button>
        <button
          className="nav-collapse"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Deplier la barre' : 'Replier la barre'}
          aria-label={collapsed ? 'Deplier la barre laterale' : 'Replier la barre laterale'}
        >
          {collapsed ? (
            <CaretDoubleRight size={13} weight="bold" />
          ) : (
            <CaretDoubleLeft size={13} weight="bold" />
          )}
        </button>
      </div>

      <nav className="side-nav">
        {GROUPES.map((g) => (
          <div className="nav-group" key={g.label}>
            {deployee && <div className="nav-group-label">{g.label}</div>}
            {g.items.map(({ id, label, Icon }) => {
              const showBadge = id === 'brouillons' && aValider > 0;
              return (
                <button
                  key={id}
                  className={id === activePage ? 'active' : ''}
                  onClick={() => onNavigate(id)}
                  title={!deployee ? label : undefined}
                  aria-label={label}
                >
                  <Icon size={16} weight="regular" className="nav-ico" />
                  {deployee && <span className="nav-label">{label}</span>}
                  {deployee && showBadge && (
                    <span className="nav-badge" title="A valider">{aValider}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="nav-footer">
        <button className={activePage === 'parametres' ? 'active' : ''} onClick={() => onNavigate('parametres')} title={!deployee ? 'Parametres' : undefined} aria-label="Parametres">
          <Gear size={16} weight="regular" className="nav-ico" />
          {deployee && <span className="nav-label">Paramètres</span>}
        </button>
        <button title={!deployee ? 'Aide' : undefined} aria-label="Aide">
          <Question size={16} weight="regular" className="nav-ico" />
          {deployee && <span className="nav-label">Aide</span>}
        </button>
      </div>
    </aside>
  );
}
