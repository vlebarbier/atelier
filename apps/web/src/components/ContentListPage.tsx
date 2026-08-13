import { useState } from 'react';
import { FileText, Plus, SquaresFour, List } from '@phosphor-icons/react';
import type { Brouillon, Statut } from '../api';
import { TYPE_LABELS } from '../format';
import { Page, PageHeader, EmptyState } from './ui';
import { DraftGrid, GridSkeleton } from './DraftGrid';
import { useListeFiltres, type Tri } from './useListeFiltres';

export type Vue = 'grille' | 'liste';

/** Pills de statut (maquette publications.html) : Toutes / Brouillon / ... */
const STATUTS: { id: Statut | 'tous'; label: string }[] = [
  { id: 'tous', label: 'Toutes' },
  { id: 'brouillon', label: 'Brouillon' },
  { id: 'a-valider', label: 'À valider' },
  { id: 'valide', label: 'Validées' },
  { id: 'publie', label: 'Publiées' }
];

const TRIS: { id: Tri; label: string }[] = [
  { id: 'recent', label: 'Trier : recent' },
  { id: 'statut', label: 'Trier : statut' },
  { id: 'titre', label: 'Trier : titre' }
];

interface ContentListPageProps {
  /** Titre de la page (ex: "Publications", "Documents"). */
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
  onDuplicate: (id: string) => void;
  onCreate: () => void;
  /** Libelle du bouton de creation (ex: "Nouvelle publication"). */
  labelNouveau?: string;
  /** Si defini, le bouton "Nouveau" ouvre un menu de choix de type (documents). */
  typesNouveau?: readonly string[];
  onCreateType?: (type: string) => void;
  /** Types filtrables affiches dans le volet deroulant (ex: les 5 documents). */
  typesFiltrables?: readonly string[];
  filtre: Statut | 'tous';
  onFiltreChange: (filtre: Statut | 'tous') => void;
  /** Nombre de contenus a valider (affiche "N · X a valider" pres du titre). */
  aValider?: number;
  emptyTitle: string;
  emptySub?: string;
}

/**
 * Ecran de liste des publications (page Publications ET page Documents) :
 * PageHeader (titre/compteur/actions) + rangée de filtres séparés (pills statut
 * + volet type + tri + toggle vue) + DraftGrid. Reproduction de la maquette
 * publications.html validee Victor 13/08.
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
  onDuplicate,
  onCreate,
  labelNouveau = 'Nouvelle publication',
  typesNouveau,
  onCreateType,
  typesFiltrables,
  filtre,
  onFiltreChange,
  aValider = 0,
  emptyTitle,
  emptySub
}: ContentListPageProps) {
  const [choixOuvert, setChoixOuvert] = useState(false);
  const { filtered, filtreType, setFiltreType, tri, setTri } = useListeFiltres(brouillons, filtre);

  // Le compteur du header reflete ce qui est visible : le total quand aucun
  // filtre n'est actif, filtered.length des qu'un filtre (statut ou type) l'est.
  // Sans filtre, filtered == brouillons, mais la condition est explicite pour
  // que le sens du nombre affiche reste stable si un filtre externe apparait.
  const filtreActif = filtre !== 'tous' || filtreType !== 'tous';

  const typesEffectifs = typesFiltrables ?? (typesNouveau as readonly string[] | undefined);
  // Sans filtre actif, le compteur reprend la maquette publications.html :
  // total + attention "X a valider". Des qu'un filtre (statut ou type) est
  // actif, on montre filtered.length (coherence PR #77, le nombre reflete ce
  // qui est visible).
  const count = filtreActif
    ? filtered.length
    : aValider > 0
      ? `${brouillons.length} · ${aValider} à valider`
      : `${brouillons.length}`;

  return (
    <Page>
      <PageHeader
        title={titre}
        count={count}
        sub={sub}
        actions={
          <div className="page-actions">
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
                <Plus size={13} weight="bold" /> {labelNouveau}
              </button>
            )}
          </div>
        }
      />
      <div className="filtres">
        <div className="filtre-pills">
          {STATUTS.map((s) => (
            <span
              key={s.id}
              className={`pill${filtre === s.id ? ' on' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => onFiltreChange(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onFiltreChange(s.id);
              }}
            >
              {s.label}
            </span>
          ))}
        </div>
        <span className="filtre-sep" aria-hidden="true" />
        {typesEffectifs && typesEffectifs.length > 0 && (
          <div className="filtre-type">
            <select
              className="select"
              value={filtreType}
              onChange={(e) => setFiltreType(e.target.value)}
              aria-label="Filtrer par type"
            >
              <option value="tous">Tous les types</option>
              {typesEffectifs.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
              ))}
            </select>
          </div>
        )}
        <span className="spacer" />
        <div className="liste-tools">
          <select
            className="select"
            value={tri}
            onChange={(e) => setTri(e.target.value as Tri)}
            aria-label="Trier"
          >
            {TRIS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <div className="view-toggle">
            <button className={vue === 'grille' ? 'on' : ''} onClick={() => onVueChange('grille')} title="Grille">
              <SquaresFour size={15} />
            </button>
            <button className={vue === 'liste' ? 'on' : ''} onClick={() => onVueChange('liste')} title="Liste">
              <List size={15} />
            </button>
          </div>
        </div>
      </div>
      {error && <div className="empty">Erreur, {error}</div>}
      {!error && loading && <GridSkeleton />}
      {!error && !loading && brouillons.length === 0 && (
        <EmptyState title={emptyTitle} sub={emptySub} />
      )}
      {!error && !loading && brouillons.length > 0 && (
        <DraftGrid brouillons={filtered} vue={vue} onOpen={onOpen} onNew={onCreate} onDuplicate={onDuplicate} onDelete={onDelete} />
      )}
    </Page>
  );
}
