import { useEffect, useMemo } from 'react';
import type { Brouillon } from '../api';
import type { Vue } from './ContentListPage';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from './ui/command';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  brouillons: Brouillon[];
  onOpenBrouillon: (id: string) => void;
  onToggleVue: () => void;
  onGoBrouillons: () => void;
  /** Navigation vers la page Blog (les articles ont leur editeur dedie). */
  onGoBlog: () => void;
  /** Ouvre la modale de creation (Nouvelle creation). */
  onOpenCreation: () => void;
  vue: Vue;
}

interface Commande {
  grp: string;
  label: string;
  hint?: string;
  run: () => void;
}

/**
 * Palette ⌘K, socle shadcn (SPEC-SHADCN V1 : CommandPalette maison -> cmdk) :
 * navigation clavier, filtrage et groupes offerts par la primitive.
 * Le composant garde l'API externe (open/onClose) : App.tsx ne change pas.
 */
export function CommandPalette({
  open,
  onClose,
  brouillons,
  onOpenBrouillon,
  onToggleVue,
  onGoBrouillons,
  onGoBlog,
  onOpenCreation,
  vue
}: CommandPaletteProps) {
  const commandes = useMemo<Commande[]>(() => {
    const cmds: Commande[] = [];
    cmds.push({
      grp: 'Action',
      label: 'Nouveau brouillon',
      hint: 'N',
      run: () => {
        onClose();
        onGoBrouillons();
        onOpenCreation();
      }
    });
    cmds.push({
      grp: 'Vue',
      label: `Basculer vers la vue ${vue === 'grille' ? 'liste' : 'grille'}`,
      hint: 'V',
      run: () => {
        onClose();
        onToggleVue();
      }
    });
    cmds.push({
      grp: 'Navigation',
      label: 'Ouvrir le premier brouillon',
      hint: 'Entree',
      run: () => {
        onClose();
        onGoBrouillons();
        if (brouillons[0]) onOpenBrouillon(brouillons[0].id);
      }
    });
    for (const b of brouillons.slice(0, 12)) {
      const estArticle = b.type === 'article';
      cmds.push({
        grp: estArticle ? 'Articles' : 'Publications',
        label: `Ouvrir : ${b.titre}`,
        run: () => {
          onClose();
          if (estArticle) {
            onGoBlog();
          } else {
            onGoBrouillons();
          }
          onOpenBrouillon(b.id);
        }
      });
    }
    return cmds;
  }, [brouillons, onClose, onGoBrouillons, onGoBlog, onOpenBrouillon, onOpenCreation, onToggleVue, vue]);

  // Fermeture par Echap offerte par le Dialog Radix sous-jacent ; ce reset
  // evite de rouvrir la palette sur la derniere requete tapee.
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown() {}
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const groupes = useMemo(() => {
    const map = new Map<string, Commande[]>();
    for (const c of commandes) {
      const liste = map.get(c.grp) ?? [];
      liste.push(c);
      map.set(c.grp, liste);
    }
    return [...map.entries()];
  }, [commandes]);

  return (
    <CommandDialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <CommandInput placeholder="Rechercher une action ou un brouillon" data-testid="cmdk-input" />
      <CommandList>
        <CommandEmpty>Aucun resultat</CommandEmpty>
        {groupes.map(([grp, items]) => (
          <CommandGroup key={grp} heading={grp}>
            {items.map((c) => (
              <CommandItem
                key={`${grp}-${c.label}`}
                value={`${grp} ${c.label}`}
                onSelect={() => c.run()}
              >
                <span>{c.label}</span>
                {c.hint && <CommandShortcut>{c.hint}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
