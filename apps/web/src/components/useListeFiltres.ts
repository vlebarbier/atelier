import { useMemo, useState } from 'react';
import type { Brouillon, Statut } from '../api';
import { STATUTS_ORDRE } from '../format';

export type Tri = 'recent' | 'statut' | 'titre';

/**
 * Filtrage + tri de la liste de publications, isole dans un hook pour que la
 * logique ne soit pas dispersee en script inline (maquette publications.html).
 * - filtreStatut : rangee de pills (Toutes / Brouillon / A valider / ...)
 * - filtreType   : volet deroulant (Tous les types / Carrousel / Post / ...)
 * - tri          : recent (updated desc) / statut (ordre workflow) / titre (alpha)
 */
export function useListeFiltres(brouillons: Brouillon[], filtreStatut: Statut | 'tous') {
  const [filtreType, setFiltreType] = useState<string>('tous');
  const [tri, setTri] = useState<Tri>('recent');

  const filtered = useMemo(() => {
    const resultats = brouillons.filter(
      (b) =>
        (filtreStatut === 'tous' || b.statut === filtreStatut) &&
        (filtreType === 'tous' || b.type === filtreType)
    );

    const copie = [...resultats];
    if (tri === 'recent') {
      copie.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
    } else if (tri === 'statut') {
      const ordre = (s: string) => {
        const i = STATUTS_ORDRE.indexOf(s);
        return i === -1 ? STATUTS_ORDRE.length : i;
      };
      copie.sort((a, b) => ordre(a.statut) - ordre(b.statut) || (b.updated || '').localeCompare(a.updated || ''));
    } else {
      copie.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
    }
    return copie;
  }, [brouillons, filtreStatut, filtreType, tri]);

  return { filtered, filtreType, setFiltreType, tri, setTri };
}
