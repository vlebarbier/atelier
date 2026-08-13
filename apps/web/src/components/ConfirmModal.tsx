import { useEffect, useRef } from 'react';
import { X, Warning } from '@phosphor-icons/react';

interface ConfirmModalProps {
  titre: string;
  description?: React.ReactNode;
  labelConfirmer?: string;
  labelAnnuler?: string;
  /** Bouton confirmer en rouge plein (suppression) ; false = bouton accent (restauration). */
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Confirmation in-app (remplace window.confirm) : modale alignee sur la DA
 * (tokens --color-*), avec le pattern de confiance du produit : l'agent dit
 * ce qu'il va faire AVANT. Focus sur Annuler (le geste le plus sur evite
 * l'activation accidentelle par Entree), fermeture par Echap ou click overlay.
 */
export function ConfirmModal({
  titre,
  description,
  labelConfirmer = 'Supprimer',
  labelAnnuler = 'Annuler',
  danger = true,
  onConfirm,
  onClose
}: ConfirmModalProps) {
  const annulerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    annulerRef.current?.focus();
  }, []);

  return (
    <div className="modal-overlay modal-overlay-in" onClick={onClose}>
      <div
        className="modal confirm-modal modal-panel-in"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-titre"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="confirm-titre" className="confirm-titre">
            {danger && <Warning size={14} weight="fill" className="confirm-warn" />}
            {titre}
          </h3>
          <button className="modal-x" type="button" onClick={onClose} aria-label="Fermer">
            <X size={14} />
          </button>
        </div>
        <div className="modal-body">
          {description && <p className="confirm-desc">{description}</p>}
        </div>
        <div className="modal-foot">
          <button ref={annulerRef} type="button" className="ghost" onClick={onClose}>
            {labelAnnuler}
          </button>
          <button type="button" className={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {labelConfirmer}
          </button>
        </div>
      </div>
    </div>
  );
}
