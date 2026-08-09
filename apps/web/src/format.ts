export const RESEAUX: readonly string[] = ['instagram', 'linkedin', 'facebook', 'x', 'tiktok'];

export const RESEAUX_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  x: 'X (Twitter)',
  tiktok: 'TikTok'
};

export const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  'a-valider': 'A valider',
  valide: 'Valide',
  publie: 'Publie'
};

export const STATUTS_ORDRE: readonly string[] = ['brouillon', 'a-valider', 'valide', 'publie'];

/** Temps relatif en francais, style "il y a 3 h". Sans dependance externe. */
export function relTime(iso: string | null): string {
  if (!iso) return "a l'instant";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(min)) return "a l'instant";
  if (min < 1) return "a l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}
