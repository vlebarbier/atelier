import { useRef, useState } from 'react';
import {
  SquaresFour,
  CalendarBlank,
  FolderOpen,
  Palette,
  Sparkle,
  Gear,
  Question,
  FileText,
  PlugsConnected
} from '@phosphor-icons/react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  /** Nombre de contenus a valider (badge sur Dashboard). */
  aValider?: number;
  /** Etat controle par la barre du haut (le bouton replier y vit, pattern PushRank). */
  collapsed: boolean;
  onToggleCollapse: () => void;
}

type NavItem = { id: string; label: string; Icon: typeof SquaresFour };

const GROUPES: { label: string; items: NavItem[] }[] = [
  {
    label: 'Travail',
    items: [
      { id: 'brouillons', label: 'Contenus', Icon: SquaresFour },
      { id: 'documents', label: 'Documents', Icon: FileText },
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
    items: [
      { id: 'activite', label: 'Activité IA', Icon: Sparkle },
      { id: 'integrations', label: 'Intégrations', Icon: PlugsConnected }
    ]
  }
];

export function Sidebar({ activePage, onNavigate, aValider = 0, collapsed, onToggleCollapse }: SidebarProps) {
  const [hovering, setHovering] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    onToggleCollapse();
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
