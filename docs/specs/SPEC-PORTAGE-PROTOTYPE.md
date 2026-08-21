# SPEC-PORTAGE-PROTOTYPE.md — Du prototype HTML vers l'app React

> Pont entre les maquettes validées (`design/prototype/`) et l'app Atelier
> (React + Vite, déployée sur Vercel). Chaque écran validé par Victor est porté
> écran par écran. Le prototype reste la source de vérité visuelle pendant la
> transition.

## Principe

- Le prototype HTML = **cahier des charges visuel** (validation rapide, sans déploiement).
- Le portage = **traduction en composants React** (JSX + tokens + Phosphor).
- Les tokens (`packages/tokens/`) sont la passerelle : définis d'abord, appliqués partout.
- Pipeline : **valider dans le proto → porter en React → vérifier (test/lint/build) → déployer**.
- Ordre : écran par écran, dans l'ordre du tunnel (Publications → Créer → Réviser → Valider → Programmer → Calendrier → Documents → Bibliothèque → Charte → secondaires).

---

## État de l'app réelle (origin/main, 13/08)

| Élément | Statut | Fichier |
|---|---|---|
| Tokens DA (doré #E8C97A, ambre #B45309, fonds, Plus Jakarta) | ✅ Mergé (B1) | `packages/tokens/tokens.json` |
| Sidebar complète (Travail/Marque/Agents + footer) | ✅ Existe | `apps/web/src/components/Sidebar.tsx` |
| Grille + Liste des brouillons | ✅ Existent | `DraftGrid.tsx`, `DraftList.tsx` |
| Header (replier, ⌘K, thème, cloche — Phosphor) | ✅ Existe | `Header.tsx` |
| CommandPalette (⌘K) | ✅ Existe | `CommandPalette.tsx` |
| Framework de page (Page/PageHeader/PageSection/EmptyState) | ✅ Existe | `ui.tsx` |
| ContentListPage partagée | ✅ Existe | `ContentListPage.tsx` |

---

## Mapping écran par écran

### Écran 1 — Publications ✅ VALIDÉ (13/08)

**Maquette** : `design/prototype/publications.html`
**Carte kanban** : t_4b1bfb4c (Héphaïstos, ready)

| Élément maquette | Conversion React | Fichier cible |
|---|---|---|
| Header (titre + badges 6 / 2 à valider + CTA) | PageHeader + badge-count | `PublicationsPage.tsx` (ou ContentListPage) |
| Filtres compacts (3 dropdowns + toggle une ligne) | Toolbar existante à adapter | `Toolbar.tsx` |
| Recherche locale | Input dans la toolbar | `Toolbar.tsx` |
| Badges type (« 9 slides » / « 12 pages ») | Libellé selon `type` + `slideCount` | `DraftCard.tsx` |
| Icônes réseaux SVG + nom | Phosphor (`InstagramLogo`… n'existent pas — SVG inline OK) | `DraftCard.tsx` |
| Statuts distincts (Validée=bleu #4A8FD4 / Publiée=vert) | Classes CSS → tokens | `styles.css` / tokens |
| Actions au survol (dupliquer/supprimer) | Menu contextuel | `DraftCard.tsx` |
| Toggle Grille/Liste fonctionnel | État React (`useState`) — pas script inline | `PublicationsPage.tsx` |
| Tri (récent/statut/titre) | État React + sort | `PublicationsPage.tsx` |

### Écran 2 — Créer (chat au centre) ⏳ À valider

**Maquette** : `design/prototype/detail.html?mode=creer`
**Carte** : A2/A2+ (Apollon)

| Élément | Conversion React | Fichier cible |
|---|---|---|
| Chat agent au centre | Composant chat (existant ?) | `DraftDetail.tsx` (chat agent) |
| Chips réseaux cliquables (validation directe) | Boutons avec état sélection | `DraftDetail.tsx` |
| Confirmation badges (✓ 9 slides générées) | Status chips interactifs | `DraftDetail.tsx` |
| Follow-up prompts suggérés | Chips d'action sous le dernier message | `DraftDetail.tsx` |
| Rail aperçu slides + réseaux choisis | Panneau latéral | `DraftDetail.tsx` |

### Écran 3 — Réviser (contenu au centre) ⏳

**Maquette** : `design/prototype/detail.html?mode=reviser`

| Élément | Conversion React | Fichier cible |
|---|---|---|
| Slide centrale + navigation (flèches, filmstrip) | Stage existant + ajout nav | `DraftDetail.tsx` |
| Captions par réseau (onglets IG/LI) + compteur | Onglets existants | `DraftDetail.tsx` |
| Chat compact en bas du rail | Variante réduite du chat | `DraftDetail.tsx` |
| Format recommandé (carré 1080×1080 · 18-21h) | Info statique | `DraftDetail.tsx` |

### Écran 4 — Valider (conformité + esthétique) ⏳

**Maquette** : `design/prototype/detail.html?mode=valider`
**Carte** : A3 (Héphaïstos) + A3+ (Apollon — « Est-ce beau ? »)

| Élément | Conversion React | Fichier cible |
|---|---|---|
| Cards d'information (Validation/Publication/Conformité/Réseaux) | Composant `InfoCard` réutilisable | `ui.tsx` (nouveau) |
| Checklist verte (conformité) | Liste d'états | `DraftDetail.tsx` |
| Avis esthétique agent + « Est-ce beau ? » (Pas encore/Presque/Oui) | Nouveau composant | `DraftDetail.tsx` / `ValidationPanel.tsx` |
| Approuver / Demander des modifs (note obligatoire) | Actions + modale | `DraftDetail.tsx` |

### Écran 5 — Programmer (créneaux) ⏳

**Maquette** : `design/prototype/detail.html?mode=programmer`
**Carte** : A4 (Athéna)

| Élément | Conversion React | Fichier cible |
|---|---|---|
| Créneaux suggérés (mar 18 · 18:30, pic) | Liste de slots | `DraftDetail.tsx` |
| Réseaux + format dans la card | InfoCard Réseaux | `ui.tsx` |
| Lien calendrier | Navigation | `DraftDetail.tsx` |

### Écran 6 — Calendrier ⏳

**Maquette** : `design/prototype/calendrier.html`

| Élément | Conversion React | Fichier cible |
|---|---|---|
| Vue mois + navigation + aujourd'hui | Existe déjà (feat/calendrier-accents) | `CalendarPage.tsx` |
| Jours hors mois à 30% opacité | CSS | `styles.css` |
| Pilules enrichies (logo réseau + heure + statut) | `CalendarPostPanel.tsx` | à enrichir |
| Liste « À programmer » (filtres + poignée) | Panneau latéral | `CalendarPage.tsx` |
| Header compact | Layout | `CalendarPage.tsx` |

### Écran 7 — Documents ⏳

**Maquette** : `design/prototype/documents.html`

| Élément | Conversion React | Fichier cible |
|---|---|---|
| Grille de docs + miniatures PDF | Composant liste docs (à créer) | `DocumentsPage.tsx` |
| Un seul bouton « Nouveau » (près du titre) | PageHeader + CTA | `DocumentsPage.tsx` |
| Menu ⋮ + tri + vue liste | Comme Publications | `DocumentsPage.tsx` |

### Écran 8 — Bibliothèque + collecte ⏳

**Maquette** : `design/prototype/bibliotheque.html`
**Carte** : D1 (Athéna)

| Élément | Conversion React | Fichier cible |
|---|---|---|
| Grille d'assets + vraies thumbnails | Composant assets | `BibliothequePage.tsx` |
| Drag global + menu ⋮ + tri | Interactions | `BibliothequePage.tsx` |
| **Collecte de la marque** (GitHub/IG/CMS/FB/Notion) | Cards de sources normalisées | `BibliothequePage.tsx` (nouvelle section) |
| Faisabilité : IG=OK, GitHub=OK, CMS=OK, LinkedIn=limité | Backend : API + OAuth | `apps/api` |

### Écran 9 — Charte ⏳

**Maquette** : `design/prototype/charte.html`

| Élément | Conversion React | Fichier cible |
|---|---|---|
| Couleurs (copie HEX, rôles) | Composant swatches | `ChartePage.tsx` |
| Typo (pangramme, graisses, @import) | Composant typo | `ChartePage.tsx` |
| Ton de voix + mots interdits (étiquetés) | Composant ton | `ChartePage.tsx` |
| Comparatif À dire / À ne pas dire | Liste d'exemples | `ChartePage.tsx` |

### Écrans secondaires (Blog, Activité IA, Intégrations, Paramètres, Aide)

**Maquettes** : `design/prototype/{blog,activite,integrations,parametres,aide}.html`

| Écran | Fichier cible | Priorité |
|---|---|---|
| Blog | `BlogPage.tsx` | Moyenne |
| Activité IA | `ActivityPage.tsx` (existe) | Moyenne |
| Intégrations | `IntegrationsPage.tsx` | Haute (collecte) |
| Paramètres | `SettingsPage.tsx` | Moyenne |
| Aide | `HelpPage.tsx` | Faible |

---

## Règles de portage (contraintes de l'app)

1. **Tokens d'abord** : jamais de couleur hardcodée — tout passe par `packages/tokens/`.
2. **Pas de script inline** : la logique vit dans les composants React (état), jamais dans du HTML injecté.
3. **Icônes Phosphor** : utiliser `@phosphor-icons/react` (SquaresFour, FileText, CalendarBlank, FolderOpen, Palette, Sparkle, PlugsConnected, Gear, Question, MagnifyingGlass, Bell, Sun, Moon, CaretDoubleLeft/Right, ArrowsInLineVertical).
4. **Framework de page** : `ui.tsx` (Page/PageHeader/PageSection/EmptyState) + `.page-*` CSS — ne pas réinventer.
5. **Barre du haut = globale** : logo + replier + ⌘K + thème + cloche vivent dans Header, jamais dupliqués par page.
6. **Validation avant merge** : un écran porté n'est mergé qu'après test/lint/build verts ET l'accord visuel de Victor (diff sur le prototype).
7. **Le prototype évolue** : si un écran est modifié dans le proto APRÈS son portage, la carte de mise à jour est re-créée (le proto reste la source de vérité).

## Workflow de portage (par écran)

1. Écran validé par Victor (OK dans le proto) → je crée la carte kanban « PORTER écran X » (assignée à Héphaïstos, priorité selon l'ordre).
2. Héphaïstos traduit en React (composants + tokens + Phosphor), branche + PR.
3. CI verte (test + lint + build) → je montre le diff visuel à Victor → merge.
4. Déploiement Vercel → l'écran est en prod.
5. Retour au proto : on passe à l'écran suivant.

## État du pipeline (13/08)

| Écran | Proto | Portage | Prod |
|---|---|---|---|
| Publications | ✅ validé | 🔄 t_4b1bfb4c (ready) | en attente |
| Créer | ⏳ à valider | — | — |
| Réviser | ⏳ | — | — |
| Valider | ⏳ | A3/A3+ en cours | — |
| Programmer | ⏳ | A4 | — |
| Calendrier | ⏳ | enrichir l'existant | — |
| Documents | ⏳ | — | — |
| Bibliothèque | ⏳ | D1 (collecte) | — |
| Charte | ⏳ | — | — |
| Secondaires | ⏳ | — | — |
