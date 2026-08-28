import { useState } from 'react';
import { FileText, Plus, SquaresFour, List } from '@phosphor-icons/react';
import type { Brouillon, Statut, StatutConformite } from '../api';
import { TYPE_LABELS } from '../format';
import { Page, PageHeader, EmptyState } from './ui';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { DraftGrid, GridSkeleton } from './DraftGrid';
import { useListeFiltres, type Tri } from './useListeFiltres';

export type Vue = 'grille' | 'liste';

const TRIS: { id: Tri; label: string }[] = [
  { id: 'recent', label: 'Plus recents' },
  { id: 'statut', label: 'Par statut' },
  { id: 'titre', label: 'Par titre' }
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
  /** Types filtrables affiches dans le select (ex: les 5 documents). */
  typesFiltrables?: readonly string[];
  filtre: Statut | 'tous';
  onFiltreChange: (filtre: Statut | 'tous') => void;
  /** Nombre de contenus a valider (affiche "N · X a valider" pres du titre). */
  aValider?: number;
  /** Verdicts de conformite a la charte par brouillon (F-33) : badge sur les covers. */
  conformite?: Record<string, StatutConformite>;
  emptyTitle: string;
  emptySub?: string;
}

/**
 * Ecran de liste des publications (page Contenus ET page Documents), socle
 * shadcn (SPEC-SHADCN V1) : PageHeader + filtres statut en ToggleGroup
 * (texte + point, actif souligne dore), selects Radix, toggle vue et bouton
 * Nouveau (DropdownMenu si plusieurs types).
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
  conformite,
  emptyTitle,
  emptySub
}: ContentListPageProps) {
  const [_, setChoixOuvert] = useState(false);
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
          typesNouveau ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button data-testid="nouveau-menu">
                  <Plus size={13} weight="bold" /> Nouveau
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {typesNouveau.map((t) => (
                  <DropdownMenuItem key={t} onSelect={() => onCreateType?.(t)}>
                    <FileText size={12} /> {TYPE_LABELS[t] ?? t}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button type="button" onClick={onCreate}>
              <Plus size={13} weight="bold" /> {labelNouveau}
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Filtres silencieux : texte + point colore, actif souligne dore. */}
        <ToggleGroup
          type="single"
          value={filtre}
          onValueChange={(v) => {
            if (v) onFiltreChange(v as Statut | 'tous');
          }}
          aria-label="Filtrer par statut"
        >
          {([
            ['tous', 'Toutes'],
            ['brouillon', 'Brouillon'],
            ['a-valider', 'À valider'],
            ['valide', 'Validées'],
            ['publie', 'Publiées']
          ] as [Statut | 'tous', string][]).map(([id, label]) => (
            <ToggleGroupItem
              key={id}
              value={id}
              variant="quiet"
              data-testid={`filtre-statut-${id}`}
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        {typesEffectifs && typesEffectifs.length > 0 && (
          <Select value={filtreType} onValueChange={(v) => setFiltreType(v)} >
            <SelectTrigger className="w-[170px]" aria-label="Filtrer par type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tous les types</SelectItem>
              {typesEffectifs.map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t] ?? t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span className="flex-1" />
        <div className="flex items-center gap-3">
          <Select value={tri} onValueChange={(v) => setTri(v as Tri)}>
            <SelectTrigger className="w-[130px]" aria-label="Trier">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIS.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            value={vue}
            onValueChange={(v) => {
              if (v) onVueChange(v as Vue);
            }}
            aria-label="Mode d'affichage"
          >
            <ToggleGroupItem value="grille" variant="quiet" data-testid="vue-grille" title="Grille">
              <SquaresFour size={15} />
            </ToggleGroupItem>
            <ToggleGroupItem value="liste" variant="quiet" data-testid="vue-liste" title="Liste">
              <List size={15} />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      {error && <div className="empty">Erreur, {error}</div>}
      {!error && loading && <GridSkeleton />}
      {!error && !loading && brouillons.length === 0 && (
        <EmptyState title={emptyTitle} sub={emptySub} />
      )}
      {!error && !loading && brouillons.length > 0 && (
        <DraftGrid brouillons={filtered} vue={vue} onOpen={onOpen} onNew={onCreate} onDuplicate={onDuplicate} onDelete={onDelete} conformite={conformite} />
      )}
    </Page>
  );
}
