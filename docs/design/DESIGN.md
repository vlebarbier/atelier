# DESIGN.md — Atelier

> Direction artistique du produit **Atelier**. Réécrite le 22/08/2026 sur la base du prototype validé
> (`design/prototype/`) et de la session design du 21-22/08 (direction « noir chaud & doré »).
> Remplace la version terracotta du 09/08, jamais implémentée.
> **Anti-référence** : l'ancienne DA Bordeluche (bordeaux/ivoire, Cormorant/Jost) reste celle du
> **contenu client** (slides, documents) — jamais celle du produit.

## Positionnement visuel

**« L'écrin noir, le contenu héros. »** Atelier est un outil **Operate** dark-first : l'interface
s'efface (noir chaud, hairlines teintées, une seule couleur signature), et le contenu du client
garde sa propre charte à l'écran (la slide ivoire Bordeluche reste ivoire dans l'app sombre).
Le produit est l'écrin, jamais le décor.

- Sombre = mode primaire, chaud et premium (pas le noir bleuté façon Linear/Vercel)
- Clair = blanc cassé net et lumineux (pas crème), dessiné à la main — pas une inversion
- L'expression vit dans les détails : hairlines, double-bezel, micro-motions

## Palette

Source canonique : `packages/tokens/tokens.json` (build → `dist/tokens.css`). Ne jamais hardcoder.

| Token | Sombre | Clair | Usage |
|---|---|---|---|
| `bg.deepest` | `#100E0C` | `#FAFAF9` | Fond le plus profond (chat, zones en retrait) |
| `bg.level-1` | `#141210` | `#FFFFFF` | Fond principal |
| `bg.level-2` | `#1C1916` | `#F2F2F0` | Surfaces, nav active |
| `bg.level-3` | `#26221E` | `#E9E9E5` | Cartes, popovers |
| `ink.primary` | `#F2EEE7` | `#1C1C1A` | Texte principal |
| `ink.secondary` | `#A89F92` | `#5A5A55` | Texte secondaire (seuil WCAG AA) |
| `ink.tertiary` | `#6E675C` | `rgba(28,28,26,.52)` | Texte tertiaire |
| `line.*` | `rgba(240,232,218,.09/.15/.22)` | `rgba(28,28,26,.10/.18/.26)` | Hairlines **teintées chaudes**, jamais gris neutre |
| `accent.base` | `#E8C97A` | `#E8C97A` | **Doré unifié** (décision 13/08) : CTA primaires, stepper actif, marque |
| `accent.on-accent` | `#0A0A0A` | `#1C1C1A` | Texte sombre sur le doré |
| `status.warn` | `#D9A441` | `#D97706` | **À valider** — réservé à ce statut |
| `status.validated` | `#4A8FD4` | `#2563A8` | **Validée** — BLEU, distinct de Publiée |
| `status.ok` | `#4CAF7D` | `#16A34A` | **Publiée** + confirmations ✓ + CTA final |
| `status.err` | `#FF5252` | `#DC2626` | Erreur, suppression |
| `status.neutral` | teinte chaude alpha | alpha | **Brouillon** |

### Règles couleur
- Le doré est la **seule couleur signature** : CTA primaire, stepper actif, logo, sparkle agent. Jamais sur un statut.
- Statuts = 4 couleurs réservées (gris / ambre / bleu / vert). « Validée » et « Publiée » ne se confondent jamais.
- Ombres diffuses uniquement (3 couches max) ; pas de dégradés décoratifs dans le produit
  (les dégradés vivent dans le contenu client : covers, slides).

## Typographie

| Rôle | Police | Notes |
|---|---|---|
| Display (titres produit, marque, docs) | **Fraunces** | graisses 400-600, italique occasionnel pour l'accent éditorial |
| UI (tout le reste) | **Plus Jakarta Sans** | 400/500/600/700, base 13px |

**Bannies** : Inter, Roboto, Arial, Open Sans, Helvetica. **Cormorant/Jost bannies du produit**
(elles restent la voix du contenu client Bordeluche, pas de l'outil).

## Icônes — Phosphor

- **`@phosphor-icons/react`, stroke regular 1.8, `currentColor`** — 16px (nav, boutons) / 20px (actions de page)
- **Inactif = regular, ink.secondary · Actif = même glyphe en `fill` + doré** — la graisse fait ressortir, pas une couleur de plus
- `duotone` réservé aux moments vedettes (avatar agent ✦, états vides)
- **Zéro émoji dans l'UI produit** — un émoji ne suit ni la couleur ni l'épaisseur du système
- Logos réseaux (Instagram, LinkedIn, X) = **marques SVG officielles**, pas des icônes UI : couleurs de marque conservées

## Architecture visuelle

### Shell
- Sidebar 220px (rétractable 52px) en 3 groupes : **Travail** (Publications, Documents, Blog, Calendrier) / **Marque** (Bibliothèque, Charte) / **Agents** (Activité IA, Intégrations)
- Topbar 52px : repli à gauche ; recherche, notifications, thème à droite

### Vue détail = 3 colonnes (structure validée du prototype)
- **Contenu** (la slide / le document, charte client intacte) · **Chat agent** (le fil de travail) · **Rail contextuel** selon le mode
- Rétraction cumulative des colonnes en barres de 44px
- Stepper **Créer → Réviser → Programmer** : fait = ✓ vert, en cours = doré, à venir = gris
- Une action primaire par mode (le rail la porte) ; « rien n'est publié sans validation »

### Composants
- **Double-bezel** sur les slides et cartes principales : coquille `radius.shell` 18px / cœur `radius.card` 12px
- Boutons **pilules** (`radius.btn` 999px) : primaire = doré + texte sombre, secondaire = surface + hairline
- **Motion** : `cubic-bezier(0.32, 0.72, 0, 1)` partout, 150-250ms, `transform` + `opacity` uniquement

## États

| Statut | Badge |
|---|---|
| brouillon | `status.neutral`, texte ink.secondary |
| à valider | `status.warn-soft`, texte ambre |
| validée | `status.validated-soft`, texte bleu |
| publiée | `status.ok-soft`, texte vert |

## Anti-patterns absolus (checklist pré-livraison)

- [ ] Aucune police bannie (Inter, Roboto, Arial, Open Sans, Helvetica ; Cormorant/Jost hors contenu client)
- [ ] Aucune bordure gris neutre — hairlines teintées chaudes seulement
- [ ] Aucune ombre dure — diffusion douce seulement
- [ ] Aucune transition linear/ease-in-out — cubic-bezier partout
- [ ] Aucune animation de layout (transform/opacity only)
- [ ] Aucun émoji en guise d'icône — Phosphor partout
- [ ] Le doré jamais sur un statut ; Validée (bleu) ≠ Publiée (vert)
- [ ] Le contenu client n'est jamais re-stylé aux couleurs du produit
- [ ] Mode clair = blanc cassé dessiné à la main, pas une inversion du sombre

## Références

- `design/prototype/` — les 27 maquettes validées : **source de vérité visuelle** pendant le portage
- `docs/design/AUDIT-PROTOTYPE.md` — les 10 chantiers d'amélioration identifiés sur le prototype
- `docs/specs/SPEC-PORTAGE-PROTOTYPE.md` — mapping écran par écran vers l'app React
- `packages/tokens/tokens.json` — valeurs canoniques (tests : `packages/tokens/tokens.test.mjs`)
