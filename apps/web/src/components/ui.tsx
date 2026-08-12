import type { ReactNode } from 'react';
import type { Icon } from '@phosphor-icons/react';

/**
 * Framework de page unifie : chaque page utilise PageHeader + PageSection +
 * EmptyState au lieu de classes ad hoc. Toute la hierarchie (spacing, typo,
 * actions) vit dans styles.css sous .page-* — une seule source de verite.
 */

export function Page({ children }: { children: ReactNode }) {
  return <div className="page">{children}</div>;
}

interface PageHeaderProps {
  title: string;
  /** Compteur discret a cote du titre (ex: nombre d'elements). */
  count?: number;
  sub?: string;
  /** Actions a droite (boutons, menus). */
  actions?: ReactNode;
}

/** En-tete de page unifie : titre + compteur + sous-titre + actions a droite. */
export function PageHeader({ title, count, sub, actions }: PageHeaderProps) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        <div className="page-title">
          <span>{title}</span>
          {count !== undefined && <span className="page-count">{count}</span>}
        </div>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

interface PageSectionProps {
  label?: string;
  children: ReactNode;
}

/** Section verticale avec un label discret (ex: "Notes de revision"). */
export function PageSection({ label, children }: PageSectionProps) {
  return (
    <section className="page-section">
      {label && <div className="page-section-label">{label}</div>}
      {children}
    </section>
  );
}

interface EmptyStateProps {
  icon?: Icon;
  title: string;
  sub?: string;
  /** Contenu supplementaire sous le sous-titre (ex: bouton d'action). */
  children?: ReactNode;
}

/** Etat vide standard : icone + titre + sous-titre. */
export function EmptyState({ icon: IconComp, title, sub, children }: EmptyStateProps) {
  return (
    <div className="empty page-empty">
      {IconComp && <IconComp size={26} />}
      <p>{title}</p>
      {sub && <p className="empty-sub">{sub}</p>}
      {children}
    </div>
  );
}
