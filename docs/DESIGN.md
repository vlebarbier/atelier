# DESIGN.md — Atelier

> Direction artistique du produit **Atelier**. Générée 09/08/2026 (impeccable + high-end-visual-design).
> **Remplacer l'ancienne DA Bordeluche** (bordeaux/ivoire/gold, Cormorant/Jost) — anti-référence.

## Positionnement visuel

**« L'atelier éditorial chaud »** — un outil de création qui se sent comme un atelier d'artisan premium, pas comme un dashboard SaaS froid.

- Archetype : **Editorial Luxury** (high-end-visual-design)
  - Crèmes chauds / espresso profond, grain de papier subtil
  - Serif à contraste élevé pour les titres massifs
  - Lignes fines (hairlines), double-bezel sur les cartes
- Mode produit : **Operate** (dashboard) — scanabilité, cohérence, détails premium ; l'expression vit dans les détails, pas dans le décor

## Palette

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `--paper` | `#FBF9F6` (crème) | `#121110` (espresso) | Fond principal |
| `--surface` | `#FFFFFF` | `#1B1A18` | Cartes, panneaux |
| `--surface-2` | `#F4F1EA` | `#262422` | Surfaces secondaires, hover |
| `--ink` | `#211D19` (espresso) | `#F2EFE9` (crème clair) | Texte principal |
| `--ink-2` | `#6B6459` | `#A89F91` | Texte secondaire |
| `--ink-3` | `#9A9184` | `#6E675C` | Texte tertiaire |
| `--line` | `#E7E1D6` | `#34312C` | Hairlines (bordures fines) |
| `--line-2` | `#D5CCBB` | `#4A463F` | Hairlines fortes, focus |
| `--accent` | `#C2410C` (terracotta) | `#F97316` (terracotta clair) | Actions, focus, sélection |
| `--accent-hover` | `#9A3412` | `#FB923C` | Hover |
| `--accent-soft` | `#FBEBD9` | `#3A2415` | Fonds accent doux (badges) |
| `--ok` | `#4D7C0F` | `#A3C97F` | Validé |
| `--warn` | `#B45309` | `#E9B96C` | À valider |
| `--err` | `#B91C1C` | `#F08787` | Erreur |

### Règles couleur (high-end-visual-design)
- **Jamais de bordures `1px solid gray`** — uniquement des hairlines teintées (`--line`)
- **Jamais d'ombres dures** (`shadow-md` générique) — ombres diffuses, très douces, 3 couches max
- **Jamais de dégradés décoratifs** — accent plat terracotta uniquement
- Sélection/focus = accent terracotta, jamais de bleu système

## Typographie

| Rôle | Police | Notes |
|---|---|---|
| Display (titres, marque) | **Fraunces** (serif, axes optiques) | `opsz 72-144`, graisse 500-600, italique occasionnel |
| UI (interface) | **Plus Jakarta Sans** (ou Geist) | graisses 400/500/600, lisible en corps 13-14px |
| Mono (éventuel) | Geist Mono | jamais indispensable |

**Inter est BANNI** (remplacé : Plus Jakarta Sans). Cormorant/Jost BANNIS (DA Bordeluche).

Échelle : 12 / 13 / 14 / 16 / 20 / 28 / 40. Titres de dashboard en Fraunces 28, jamais plus grand que nécessaire (Operate).

## Architecture visuelle

### Double-bezel (cartes, panneaux)
```
┌─ shell (fond surface-2, hairline --line, padding 1-2px, radius 18px)
│  ┌─ core (fond surface, highlight interne inset, radius 14px)
│  │   contenu
│  └─
└─
```

### Boutons
- Pilule (radius full), padding généreux
- Primary : fond accent terracotta, texte blanc/crème
- Secondaire : fond surface, hairline
- Icône dans cercle imbriqué si flèche (button-in-button)
- Hover : `transform: scale(0.98)`, transition cubic-bezier

### Motion
- **Toutes** les transitions : `cubic-bezier(0.32, 0.72, 0, 1)` (ou similaire mass-spring) — jamais `linear`/`ease-in-out`
- Entrées : fade-up doux avec blur (`translateY 16px + blur 8px → 0`, 700ms)
- Stagger léger sur les listes (delay 40ms par item, max 5)
- Animations uniquement `transform` + `opacity` (jamais top/left/width/height)
- `backdrop-blur` réservé aux éléments fixed/sticky (nav, modales)

### Grain / texture
- Overlay film-grain subtil : pseudo-élément `fixed`, `pointer-events: none`, `opacity: 0.03`, z-index bas — **jamais** sur un conteneur scrollable

### Layout
- Sidebar fine (240px) : navigation, marque Fraunces
- Zone principale : grille de projets (asymétrique autorisée : un grand + plusieurs petits)
- Espace blanc généreux (py-24+ équivalent), densité moyenne
- Mobile : collapse colonne unique, `min-h-100dvh` jamais `h-screen`

## États

| Statut | Badge |
|---|---|
| brouillon | surface-2, texte ink-2 |
| à-valider | accent-soft, texte accent |
| validé | ok-soft, texte ok |
| publié | ok, texte blanc |

## Anti-patterns absolus (checklist pré-livraison)

- [ ] Aucune police bannie (Inter, Roboto, Arial, Open Sans, Helvetica, Cormorant, Jost)
- [ ] Aucune bordure 1px gris neutre — hairlines teintées seulement
- [ ] Aucune ombre dure — diffusion douce seulement
- [ ] Aucune transition linear/ease-in-out — cubic-bezier partout
- [ ] Aucune animation de layout (transform/opacity only)
- [ ] Aucun backdrop-blur sur conteneur scrollable
- [ ] Double-bezel sur les cartes principales
- [ ] Mode sombre natif (prefers-color-scheme)
- [ ] Accent unique terracotta
