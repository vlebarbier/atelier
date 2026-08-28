# Mockup shadcn — écran Brouillons (validation visuelle)

Mockup statique HTML/CSS de l'écran Brouillons sur le socle shadcn/ui, thème Atelier.
Prépare la vague V1/V2 de SPEC-SHADCN.md (`docs/specs/SPEC-SHADCN.md`, branche
docs/spec-tailwind-shadcn, PR #115). Aucune intégration apps/web à ce stade.

## Fichiers

- `mockup-brouillons.html` — le mockup autonome (CSS embarqué, fonts Google CDN).
  Ouvrable directement dans un navigateur ; `.dark` posé sur `<html>` par défaut,
  le retirer pour basculer en light (convention shadcn :root/.dark).
- `render.cjs` — rendu PNG dark+light via Playwright + Chrome système :
  `node render.cjs` → `design/captures/shadcn-brouillons-{dark,light}.png` (2880px).
- `check-notes.cjs` — sonde DOM utilisée pour vérifier les débordements de texte.

## Ce que montre le mockup

Écran 01 — Brouillons liste dense : sidebar rétractable, header (⌘K, toggle vue,
Nouveau brouillon pill dorée), filtres ToggleGroup « texte + point, actif souligné »
(décision spec §4.1), rows avec Badge statut soft (warn/valide/ok), actions au hover.

Écran 02 — Détail : header avec DropdownMenu statut rendu ouvert (popover card),
stage héros (slide shell 18px), Sheet side=right avec Tabs Agent/Réseaux/Slides/Source,
chat agent polling 8 s, checklist Checkbox, programmation Postiz.

## Mapping tokens (source packages/tokens/tokens.json)

Identique à la table §3 de la spec : background level-1 (#141210/#FFFFFF),
card level-3, primary = doré #E8C97A unifié dark+light, accent = hover teinté chaud
(pas le doré), border hairline teintée, ring doré, radius 12px, boutons pill,
base 13px Fraunces titres / Plus Jakarta Sans UI. Hex/rgba uniquement (garde-fou
html-to-image R1).

## Points ouverts pour la validation Victor

1. Le souligné doré du filtre actif (vs simple changement de poids).
2. La densité des rows (padding 10px) et la largeur Sheet 340px.
3. Le chat agent dans l'onglet Agent : position dans la hiérarchie du panneau.
