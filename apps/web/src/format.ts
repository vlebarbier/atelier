export const RESEAUX: readonly string[] = ['instagram', 'linkedin', 'facebook', 'x', 'tiktok', 'gmb'];

/** Types de contenu reseaux sociaux (programmables, publics). */
export const TYPES_CONTENUS: readonly string[] = ['carrousel', 'video', 'post', 'story'];

/** Types de documents (livrables hors reseaux : pitch deck, flyers...). */
export const TYPES_DOCUMENTS: readonly string[] = [
  'pitch-deck',
  'flyer',
  'affiche',
  'carte-visite',
  'plaquette'
];

/** Type article de blog (livrable CMS : Sanity pour Bordeluche). */
export const TYPE_ARTICLE = 'article';

/** Categories du blog Bordeluche (miroir du schema Sanity post.category). */
export const CATEGORIES_ARTICLE: readonly string[] = [
  'rentabilite',
  'reglementation',
  'optimisation',
  'marche',
  'gestion',
  'experience',
  'fiscalite'
];

export const CATEGORIES_ARTICLE_LABELS: Record<string, string> = {
  rentabilite: 'Rentabilité',
  reglementation: 'Réglementation',
  optimisation: 'Optimisation',
  marche: 'Marché Bordelais',
  gestion: 'Gestion & Ops',
  experience: 'Expérience voyageur',
  fiscalite: 'Fiscalité'
};

export const TYPE_LABELS: Record<string, string> = {
  carrousel: 'Carrousel',
  video: 'Vidéo',
  post: 'Post',
  story: 'Story',
  article: 'Article de blog',
  'pitch-deck': 'Pitch deck',
  flyer: 'Flyer',
  affiche: 'Affiche',
  'carte-visite': 'Carte de visite',
  plaquette: 'Plaquette commerciale'
};

/** Squelette de prompt generique injecte dans chaque message initial (SPEC-CREATION.md §4.2). */
const SQUELETTE_PROMPT = `[Contexte] Je veux un contenu pour ma marque. Utilise la charte graphique d'Atelier (couleurs, polices, ton, mots a eviter) et la bibliotheque si des elements sont pertinents.

[Attendu] Propose un premier jet : depose la source HTML avec set_source, regenere les slides avec regenerer_slides, puis resume tes choix en 5 lignes max dans ta reponse.

[Règles] Respecte les contraintes du format (dimensions, nombre de slides). Ne publie rien : je valide d'abord ici.`;

/** Template de creation (SPEC-CREATION.md §3) : preset de structure + prompt, pas de layout. */
export interface TemplateCreation {
  id: string;
  nom: string;
  type: string;
  emoji?: string;
  description: string;
  titreDefaut: string;
  /** true si le template demande un champ « precise ton sujet ». */
  demandeChamp?: boolean;
  messageInitial: string;
}

const TEMPLATE_GROUPE = (structure: string, contenu: string) =>
  `[Structure attendue]\n${structure}\n\n[Contenu]\n${contenu}\n\n${SQUELETTE_PROMPT}`;

export const TEMPLATES_CREATION: TemplateCreation[] = [
  {
    id: 'carrousel-temoignage',
    nom: 'Carrousel témoignage',
    type: 'carrousel',
    emoji: '⭐',
    description: 'Avis clients en carrousel : un guest par slide',
    titreDefaut: 'Carrousel témoignage',
    demandeChamp: true,
    messageInitial: `[Demande] Crée un carrousel témoignage.\n\n${TEMPLATE_GROUPE(
      `- Slide 1 : accroche (« Ils ont testé, ils racontent » + nom de la marque)
- Slides 2 à N : un témoignage par slide (nom ou initiale, provenance, citation, note éventuelle)
- Dernière slide : CTA (réserver / découvrir / en savoir plus)`,
      `Si des témoignages existent dans la bibliothèque, utilise-les. Sinon, propose des emplacements réalistes marqués [À REMPLACER].`
    )}`
  },
  {
    id: 'post-annonce',
    nom: 'Post annonce',
    type: 'post',
    emoji: '📣',
    description: 'Annoncer un produit, service, logement ou événement',
    titreDefaut: 'Post annonce',
    demandeChamp: true,
    messageInitial: `[Demande] Crée un post d'annonce.\n\n${TEMPLATE_GROUPE(
      `- Slide 1 : accroche forte (le problème que ça résout ou la promesse)
- Slide 2 : ce qui est annoncé (produit / service / logement / événement)
- Slide 3 : 3 arguments concrets (chiffres, preuves)
- Slide 4 : CTA clair (réserver / écrire / en savoir plus)`,
      `Utilise les éléments de la bibliothèque s'ils illustrent l'annonce.`
    )}`
  },
  {
    id: 'pitch-deck',
    nom: 'Pitch deck',
    type: 'pitch-deck',
    emoji: '📊',
    description: 'Deck de présentation : cover, problème, solution, preuves, CTA',
    titreDefaut: 'Pitch deck',
    messageInitial: `[Demande] Crée un pitch deck.\n\n${TEMPLATE_GROUPE(
      `- Page 1 : cover (nom + positionnement en une phrase)
- Page 2 : le problème (concret, vécu)
- Page 3 : la solution (ce que je fais, comment)
- Page 4 : preuves (chiffres, clients, réalisations)
- Page 5 : CTA (ce que je demande : rdv, contact, investissement)`,
      `Document de communication : pas de contraintes réseau. Sois sobre et précis, chaque page porte une seule idée.`
    )}`
  },
  {
    id: 'carrousel-produit',
    nom: 'Carrousel produit',
    type: 'carrousel',
    emoji: '🏠',
    description: 'Présenter un bien ou produit : accroche, caractéristiques, photos',
    titreDefaut: 'Carrousel produit',
    demandeChamp: true,
    messageInitial: `[Demande] Crée un carrousel produit.\n\n${TEMPLATE_GROUPE(
      `- Slide 1 : accroche (le bien / produit + ce qui le rend unique)
- Slide 2 : les caractéristiques clés (chiffres, surfaces, specs)
- Slide 3 : les photos ou points forts
- Slide 4 : CTA (visiter / acheter / demander plus d'infos)`,
      `Utilise les photos de la bibliothèque si le bien y est.`
    )}`
  },
  {
    id: 'story-promo',
    nom: 'Story promo',
    type: 'story',
    emoji: '✨',
    description: 'Story verticale : un message, un CTA',
    titreDefaut: 'Story promo',
    demandeChamp: true,
    messageInitial: `[Demande] Crée une story promo.\n\n${TEMPLATE_GROUPE(
      `- Format vertical 9:16, un seul message par écran
- Écran 1 : accroche (l'offre en une phrase)
- Écran 2 : le détail (conditions, dates)
- Écran 3 : CTA (lien, swipe up, contact)`,
      `Texte court et lisible : la story se lit en quelques secondes.`
    )}`
  },
  {
    id: 'idee-vague',
    nom: 'Idée vague',
    type: 'carrousel',
    emoji: '💡',
    description: 'Une intention floue ? L\'agent propose 2-3 directions',
    titreDefaut: 'Idée vague',
    messageInitial: `[Demande] J'ai une intention encore floue.

[Attendu] Ne produis pas tout de suite. Propose 2-3 directions de contenu différentes (format, angle, promesse), chacune en 2-3 lignes avec un titre. Je choisirai, puis tu développeras la direction retenue en un premier jet complet.

[Règles] Ne publie rien : je valide d'abord ici.`
  }
];

export const RESEAUX_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  x: 'X (Twitter)',
  tiktok: 'TikTok',
  gmb: 'Google Business Profile'
};

export const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  'a-valider': 'A valider',
  valide: 'Valide',
  publie: 'Publie'
};

export const STATUTS_ORDRE: readonly string[] = ['brouillon', 'a-valider', 'valide', 'publie'];

/** Jour de la semaine, convention JS : 0 = dimanche ... 6 = samedi. */
export interface Creneau {
  jour: number;
  /** Heure de debut au format HH:MM. */
  heure: string;
  /** Fenetre d'audience (ex. '18-20h') pour l'infobulle du chip. */
  fenetre: string;
}

export const JOURS_COURTS: readonly string[] = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/**
 * Creneaux conseilles (heures de pointe) par reseau, pour la modale Programmer.
 * Sources de bonnes pratiques courantes de publication par plateforme :
 * Instagram pic mercredi/jeudi 18-20h + samedi matin ; LinkedIn matins
 * professionnels en semaine ; Facebook mi-journee en semaine + samedi ;
 * X en debut de matinee ; TikTok soiree + vendredi midi ; Google Business
 * Profile (gmb) en matinee, quand la recherche locale est la plus active.
 * Suggestion par defaut = premier element du tableau ; le user garde la main
 * (les champs date/heure restent editables dans la modale).
 */
export const CRENEAUX_PAR_RESEAU: Record<string, Creneau[]> = {
  instagram: [
    { jour: 3, heure: '18:00', fenetre: '18-20h' },
    { jour: 4, heure: '18:00', fenetre: '18-20h' },
    { jour: 6, heure: '10:00', fenetre: '10-12h' },
    { jour: 6, heure: '18:00', fenetre: '18-20h' }
  ],
  linkedin: [
    { jour: 2, heure: '09:00', fenetre: '9-11h' },
    { jour: 3, heure: '09:00', fenetre: '9-11h' },
    { jour: 4, heure: '09:00', fenetre: '9-11h' }
  ],
  facebook: [
    { jour: 3, heure: '13:00', fenetre: '13-15h' },
    { jour: 4, heure: '13:00', fenetre: '13-15h' },
    { jour: 6, heure: '10:00', fenetre: '10-12h' }
  ],
  x: [
    { jour: 2, heure: '09:00', fenetre: '9-11h' },
    { jour: 3, heure: '09:00', fenetre: '9-11h' },
    { jour: 4, heure: '09:00', fenetre: '9-11h' },
    { jour: 5, heure: '09:00', fenetre: '9-11h' }
  ],
  tiktok: [
    { jour: 2, heure: '19:00', fenetre: '19-21h' },
    { jour: 4, heure: '19:00', fenetre: '19-21h' },
    { jour: 5, heure: '12:00', fenetre: '12-14h' }
  ],
  gmb: [
    { jour: 2, heure: '10:00', fenetre: '10-12h' },
    { jour: 3, heure: '10:00', fenetre: '10-12h' },
    { jour: 4, heure: '10:00', fenetre: '10-12h' }
  ]
};

/** Prochaine occurrence d'un jour de la semaine (0 = dim ... 6 = sam) depuis
 *  aujourd'hui, au format YYYY-MM-DD local (attendu par <input type="date">). */
export function prochainJour(jour: number, ref: Date = new Date()): string {
  const d = new Date(ref);
  const delta = (jour - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + delta);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${j}`;
}

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
