import { useState } from 'react';
import { X, Sparkle, ArrowRight } from '@phosphor-icons/react';
import { TEMPLATES_CREATION, type TemplateCreation } from '../format';
import { Button } from './ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { Input, Label, Textarea } from './ui/form-fields';

interface CreationModalProps {
  open: boolean;
  onClose: () => void;
  /** Phrase libre soumise : titre + premier message user. */
  onPhrase: (texte: string, titre: string, type: string) => void;
  /** Template choisi : on demande un champ supplementaire si necessaire. */
  onTemplate: (t: TemplateCreation, sujet?: string) => void;
}

/**
 * Porte d'entree « Nouvelle creation » (SPEC-CREATION.md §2), socle shadcn
 * (SPEC-SHADCN V1 : modales -> Dialog Radix). Phrase libre OU grille de
 * templates. Cree un brouillon avec conversation pre-remplie : l'agent propose
 * un premier jet, les slides apparaissent via le polling du chat.
 */
export function CreationModal({ open, onClose, onPhrase, onTemplate }: CreationModalProps) {
  const [phrase, setPhrase] = useState('');
  const [templateActif, setTemplateActif] = useState<TemplateCreation | null>(null);
  const [sujet, setSujet] = useState('');

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onClose();
  }

  function soumettrePhrase() {
    const texte = phrase.trim();
    if (!texte) return;
    const titre = texte.length > 60 ? `${texte.slice(0, 57)}...` : texte;
    onPhrase(texte, titre, 'carrousel');
  }

  function soumettreTemplate() {
    if (!templateActif) return;
    if (templateActif.demandeChamp && !sujet.trim()) return;
    onTemplate(templateActif, templateActif.demandeChamp ? sujet.trim() : undefined);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg" data-testid="creation-dialog">
        <DialogClose className="absolute top-4 right-4 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 outline-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring/60">
          <X size={14} />
          <span className="sr-only">Fermer</span>
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{templateActif ? templateActif.nom : 'Nouvelle création'}</DialogTitle>
          {!templateActif && (
            <DialogDescription>
              Décris ton besoin : l'agent produit, tu valides.
            </DialogDescription>
          )}
        </DialogHeader>

        {templateActif && templateActif.demandeChamp ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              soumettreTemplate();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-sujet">Précise ton sujet</Label>
              <Input
                id="c-sujet"
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                placeholder="Ex : la Maison des Mûriers, 2 guests récents"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={!sujet.trim()}>
              <ArrowRight size={13} weight="bold" /> Lancer
            </Button>
          </form>
        ) : (
          <>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                soumettrePhrase();
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="c-phrase">Décris ton besoin en une phrase</Label>
                <Textarea
                  id="c-phrase"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      soumettrePhrase();
                    }
                  }}
                  placeholder="Un carrousel témoignage pour la Maison des Mûriers avec les retours de 2 guests"
                  rows={3}
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={!phrase.trim()}>
                <Sparkle size={13} weight="bold" /> Créer
              </Button>
            </form>

            <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
              ou choisis un template
              <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES_CREATION.map((t) => {
                const Ico = t.icone ?? Sparkle;
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`creation-template-${t.id}`}
                    onClick={() => setTemplateActif(t)}
                    className="flex cursor-pointer flex-col items-start gap-1 rounded-xl border border-border bg-bg-level-2 px-3 py-2.5 text-left transition-[border-color,background-color] duration-150 ease-(--ease-atelier) outline-none hover:border-line-hover hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring/60"
                  >
                    <Ico size={18} className="text-muted-foreground" />
                    <span className="text-[12.5px] font-medium">{t.nom}</span>
                    <span className="line-clamp-2 text-[11px] text-muted-foreground">{t.description}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
