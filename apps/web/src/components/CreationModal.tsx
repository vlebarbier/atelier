import { useState } from 'react';
import { X, Sparkle, ArrowRight, Plus } from '@phosphor-icons/react';
import { TEMPLATES_CREATION, type TemplateCreation } from '../format';

interface CreationModalProps {
  onClose: () => void;
  /** Phrase libre soumise : titre + premier message user. */
  onPhrase: (texte: string, titre: string, type: string) => void;
  /** Template choisi : on demande un champ supplementaire si necessaire. */
  onTemplate: (t: TemplateCreation, sujet?: string) => void;
}

/**
 * Porte d'entree « Nouvelle creation » (SPEC-CREATION.md §2) : phrase libre
 * OU grille de templates. Crée un brouillon avec conversation pré-remplie
 * l'agent propose un premier jet, les slides apparaissent via le polling.
 */
export function CreationModal({ onClose, onPhrase, onTemplate }: CreationModalProps) {
  const [phrase, setPhrase] = useState('');
  const [templateActif, setTemplateActif] = useState<TemplateCreation | null>(null);
  const [sujet, setSujet] = useState('');

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
    <div className="modal-overlay modal-overlay-in" onClick={onClose}>
      <div className="modal creation-modal modal-panel-in" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{templateActif ? templateActif.nom : 'Nouvelle création'}</h3>
          <button className="modal-x" type="button" onClick={onClose} aria-label="Fermer">
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          {templateActif && templateActif.demandeChamp ? (
            <div className="field">
              <label htmlFor="c-sujet">Précise ton sujet</label>
              <input
                id="c-sujet"
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') soumettreTemplate(); }}
                placeholder="Ex : la Maison des Mûriers, 2 guests récents"
                autoFocus
              />
              <button className="primary creation-submit" type="button" onClick={soumettreTemplate} disabled={!sujet.trim()}>
                <ArrowRight size={13} weight="bold" /> Lancer
              </button>
            </div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="c-phrase">Décris ton besoin en une phrase</label>
                <textarea
                  id="c-phrase"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); soumettrePhrase(); }
                  }}
                  placeholder="Un carrousel témoignage pour la Maison des Mûriers avec les retours de 2 guests"
                  rows={3}
                  autoFocus
                />
                <button className="primary creation-submit" type="button" onClick={soumettrePhrase} disabled={!phrase.trim()}>
                  <Sparkle size={13} weight="bold" /> Créer
                </button>
              </div>

              <div className="creation-sep"><span className="creation-sep-glyph" aria-hidden="true">/</span> ou choisis un template <span className="creation-sep-glyph" aria-hidden="true">/</span></div>
              <div className="creation-templates">
                {TEMPLATES_CREATION.map((t) => {
                  const Ico = t.icone ?? Sparkle;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className="creation-template"
                      onClick={() => setTemplateActif(t)}
                    >
                      <Ico size={18} className="creation-template-ico" />
                      <span className="creation-template-nom">{t.nom}</span>
                      <span className="creation-template-desc">{t.description}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
