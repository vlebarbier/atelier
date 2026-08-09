import { z } from 'zod';

/** Les 4 statuts du workflow de validation, jamais l'accent cyan sur un statut (regle DA). */
export const STATUTS = ['brouillon', 'a-valider', 'valide', 'publie'] as const;
export type Statut = (typeof STATUTS)[number];

export const statutSchema = z.enum(STATUTS);

export const reseauEntrySchema = z.object({
  caption: z.string().optional(),
  hashtags: z.string().optional(),
  statut: statutSchema.optional()
});

export const reseauxSchema = z.record(z.string(), reseauEntrySchema);

export const updateBrouillonSchema = z
  .object({
    statut: statutSchema.optional(),
    notes: z.string().optional(),
    reseaux: reseauxSchema.optional()
  })
  .refine((data) => data.statut !== undefined || data.notes !== undefined || data.reseaux !== undefined, {
    message: 'Au moins un champ (statut, notes ou reseaux) est requis'
  });

export type UpdateBrouillonInput = z.infer<typeof updateBrouillonSchema>;
