import { X, Warning } from '@phosphor-icons/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from './ui/alert-dialog';

interface ConfirmModalProps {
  open: boolean;
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
 * Confirmation in-app (remplace window.confirm), socle shadcn (SPEC-SHADCN
 * V1 : ConfirmModal -> AlertDialog Radix). Pattern de confiance du produit :
 * l'agent dit ce qu'il va faire AVANT. Focus sur Annuler (le geste le plus
 * sur evite l'activation accidentelle par Entree), fermeture par Echap ou
 * click overlay offertes par la primitive.
 */
export function ConfirmModal({
  open,
  titre,
  description,
  labelConfirmer = 'Supprimer',
  labelAnnuler = 'Annuler',
  danger = true,
  onConfirm,
  onClose
}: ConfirmModalProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <AlertDialogContent data-testid="confirm-dialog">
        <AlertDialogClose className="absolute top-4 right-4 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 outline-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring/60">
          <X size={14} />
          <span className="sr-only">Fermer</span>
        </AlertDialogClose>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {danger && <Warning size={14} weight="fill" className="mr-1.5 inline text-status-warn" />}
            {titre}
          </AlertDialogTitle>
          {description && <AlertDialogDescription asChild><div>{description}</div></AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{labelAnnuler}</AlertDialogCancel>
          <AlertDialogAction variant={danger ? 'destructive' : 'default'} onClick={onConfirm}>
            {labelConfirmer}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Close sans etre un enfant direct du Content (portail Radix). */
function AlertDialogClose({ children, ...props }: React.ComponentProps<'button'>) {
  return (
    <button type="button" {...props}>
      {children}
    </button>
  );
}
