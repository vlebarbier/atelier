import { useState } from 'react';
import { FileText, Plus, CaretDown, SquaresFour, List } from '@phosphor-icons/react';
import type { Brouillon, Statut } from '../api';
import { TYPE_LABELS } from '../format';
import { Page, PageHeader, EmptyState } from './ui';
import { DraftGrid, GridSkeleton } from './DraftGrid';
import { Toolbar } from './Toolbar';

export type Vue = 'grille' | 'liste';

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
  /** Types filtrables affiches dans un select discret (ex: les 5 documents). */
  typesFiltrables?: readonly string[];
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
  typesFiltrables,
  filtre,
  onFiltreChange,
  emptyTitle,
  emptySub
}: ContentListPageProps) {
  const [choixOuvert, setChoixOuvert] = useState(false);
  const [filtreType, setFiltreType] = useState<string>('tous');

  // Filtre par statut, puis par type (si des types filtrables sont proposes).
  const filtered = brouillons.filter(
    (b) =>
      (filtre === 'tous' || b.statut === filtre) &&
      (filtreType === 'tous' || b.type === filtreType)
  );

  const typesEffectifs = typesFiltrables ?? (typesNouveau as readonly string[] | undefined);

  return (
    <Page>
      <PageHeader
        title={titre}
        count={brouillons.length}
        sub={sub}
        actions={
          <div className="page-actions">
            <div className="view-toggle">
              <button className={vue === 'grille' ? 'on' : ''} onClick={() => onVueChange('grille')} title="Grille">
                <SquaresFour size={15} />
              </button>
              <button className={vue === 'liste' ? 'on' : ''} onClick={() => onVueChange('liste')} title="Liste">
                <List size={15} />
              </button>
            </div>
            {typesNouveau ? (
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
            )}
          </div>
        }
      />
      <div className="liste-filtres">
        <Toolbar filtre={filtre} onFiltreChange={onFiltreChange} count={filtered.length} />
        {typesEffectifs && typesEffectifs.length > 1 && (
          <label className="type-filter">
            <span>Type</span>
            <select value={filtreType} onChange={(e) => setFiltreType(e.target.value)} aria-label="Filtrer par type">
              <option value="tous">Tous</option>
              {typesEffectifs.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
              ))}
            </select>
          </label>
        )}
      </div>
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
