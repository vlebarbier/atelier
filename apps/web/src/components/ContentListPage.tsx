import { useState } from 'react';
import { FileText, Plus } from '@phosphor-icons/react';
import type { Brouillon, Statut } from '../api';
import { TYPE_LABELS } from '../format';
import { Page, PageHeader, EmptyState } from './ui';
import { DraftGrid, GridSkeleton } from './DraftGrid';
import { Toolbar } from './Toolbar';

interface ContentListPageProps {
  /** Titre de la page (ex: "Contenus", "Documents"). */
  titre: string;
  sub?: string;
  brouillons: Brouillon[];
  /** Pendant le premier chargement : skeleton au lieu de la liste. */
  loading?: boolean;
  error?: string | null;
  vue: 'grille' | 'liste';
  onVueChange: (vue: 'grille' | 'liste') => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  /** Si defini, le bouton "Nouveau" ouvre un menu de choix de type (documents). */
  typesNouveau?: readonly string[];
  onCreateType?: (type: string) => void;
  filtre: Statut | 'tous';
  onFiltreChange: (filtre: Statut | 'tous') => void;
  emptyTitle: string;
  emptySub?: string;
}

/**
 * Structure unifiee de liste de contenus (page Contenus ET page Documents) :
 * PageHeader (titre/compteur/actions) + Toolbar (filtres statut) + DraftGrid.
 * Une seule structure pour les deux — seules les donnees changent.
 */
export function ContentListPage({
  titre,
  sub,
  brouillons,
  loading = false,
  error = null,
  vue,
  onVueChange,
  onOpen,
  onDelete,
  onCreate,
  typesNouveau,
  onCreateType,
  filtre,
  onFiltreChange,
  emptyTitle,
  emptySub
}: ContentListPageProps) {
  const [choixOuvert, setChoixOuvert] = useState(false);

  const filtered = filtre === 'tous' ? brouillons : brouillons.filter((b) => b.statut === filtre);

  return (
    <Page>
      <PageHeader
        title={titre}
        count={brouillons.length}
        sub={sub}
        actions={
          typesNouveau ? (
            <div className="page-actions-group">
              {choixOuvert && (
                <div className="page-choix">
                  {typesNouveau.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setChoixOuvert(false);
                        onCreateType?.(t);
                      }}
                    >
                      <FileText size={12} /> {TYPE_LABELS[t] ?? t}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="primary"
                type="button"
                onClick={() => setChoixOuvert((o) => !o)}
              >
                <Plus size={13} weight="bold" /> Nouveau
              </button>
            </div>
          ) : (
            <button className="primary" type="button" onClick={onCreate}>
              <Plus size={13} weight="bold" /> Nouveau
            </button>
          )
        }
      />
      <Toolbar filtre={filtre} onFiltreChange={onFiltreChange} count={filtered.length} />
      {error && <div className="empty">Erreur, {error}</div>}
      {!error && loading && <GridSkeleton />}
      {!error && !loading && brouillons.length === 0 && (
        <EmptyState title={emptyTitle} sub={emptySub} />
      )}
      {!error && !loading && brouillons.length > 0 && (
        <DraftGrid brouillons={filtered} vue={vue} onOpen={onOpen} onNew={onCreate} onDelete={onDelete} />
      )}
    </Page>
  );
}
