import { SquaresFour, CalendarBlank, PaintBrush, Sparkle } from '@phosphor-icons/react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const NAV_ITEMS = [
  { id: 'brouillons', label: 'Brouillons', Icon: SquaresFour },
  { id: 'calendrier', label: 'Calendrier', Icon: CalendarBlank },
  { id: 'charte', label: 'Charte graphique', Icon: PaintBrush },
  { id: 'activite', label: 'Activite IA', Icon: Sparkle }
];

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="mark" />
        <span className="name">Atelier</span>
      </div>
      <nav className="side-nav">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={id === activePage ? 'active' : ''}
            onClick={() => onNavigate(id)}
          >
            <Icon size={16} weight="regular" className="nav-ico" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
