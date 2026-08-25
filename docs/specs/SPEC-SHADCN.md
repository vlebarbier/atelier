# SPEC-SHADCN.md : Socle Tailwind v4 + shadcn/ui, tokens Atelier mappés (26/08/2026)

> Refonte UX/UI complète d'Atelier sur le socle **shadcn/ui (Radix + Tailwind v4)**, décision
> Victor du 26/08 : « éviter absolument le fait main, tout l'UI vient d'une librairie »,
> refonte **sans état d'âme, page par page** (pas de coexistence douce avec l'ancienne UI).
> **Ce qui est conservé** : l'identité validée noir chaud & doré (#100E0C / #E8C97A),
> Fraunces + Plus Jakarta Sans, dark + light, Phosphor comme pack d'icônes, la logique
> métier des pages. Tout le reste (primitives maison, styles.css 130 Ko) est REMPLACÉ,
> pas habillé. La source de vérité des couleurs reste `packages/tokens/tokens.json`.
> Pas de code tant que cette spec n'est pas validée par Victor.

---

## 1. Décisions actées

| # | Décision | Justification |
|---|----------|---------------|
| D1 | shadcn/ui = socle unique. Les primitives de `components/ui.tsx` et les classes ad hoc sont remplacées par leurs équivalents shadcn | Contrainte dure Victor 26/08 |
| D2 | Périmètre = 8 pages + vue détail + sidebar/header. Une vague par page, chaque vague remplace intégralement l'UI de la page | Contrainte Victor 26/08 |
| D3 | `styles.css` (130 Ko, 2 424 lignes) et `da-v3.css` se vident au fil des vagues, supprimés à la fin | « passif à démonter, pas une base à conserver » |
| D4 | Seuls tokens de marque (packages/tokens) et logique métier survivent | idem |
| D5 | Le thème bascule de `prefers-color-scheme` vers la classe `.dark` sur `<html>` (convention shadcn). App.tsx et le script inline d'index.html posent/retirent la classe ; le toggle manuel existant continue de fonctionner | Requis par les blocs `:root` / `.dark` de shadcn ; supprime la divergence media-query / data-theme |
| D6 | Icônes : on garde `@phosphor-icons/react` (DESIGN.md). `lucide-react` sera installé par le CLI shadcn mais aucun import ne l'utilise | Un seul pack d'icônes, cohérence visuelle |
| D7 | Couleurs : valeurs **hex/rgba uniquement**, jamais oklch (voir risque R1). Le mapping vit dans le générateur de tokens, pas en dur dans l'app | Protège html-to-image + règle AGENTS.md « ne pas hardcoder » |
| D8 | Chaque vague = une PR avec tests/lint/build verts ET les specs e2e concernées mises à jour | Règle repo + leçon e2e-selectors |

---

## 2. Plan d'installation exact

Tout se passe dans `apps/web` (monorepo npm workspaces, Vite 6, React 19 — compatibles
Tailwind v4 et Radix actuels, rien à upgrader).

### 2.1 Dépendances

```
npm install tailwindcss @tailwindcss/vite -w apps/web
```

Puis init shadcn depuis `apps/web` :

```
cd apps/web && npx shadcn@latest init
```

Réponses à l'init :
- style : **new-york**
- base color : **neutral** (peu importe : toutes les variables sont écrasées par notre mapping en 3.)
- css variables : **oui**

L'init crée `apps/web/components.json` et installe `class-variance-authority`, `clsx`,
`tailwind-merge`, `lucide-react`, `tw-animate-css`. Compléter `tsconfig.json` si l'init ne
le fait pas : `"baseUrl": "."` + `"paths": { "@/*": ["./src/*"] }`.

### 2.2 Vite

`vite.config.ts` : ajouter le plugin, avant `react()` :

```ts
import tailwindcss from '@tailwindcss/vite';
plugins: [tailwindcss(), react()],
```

Les blocs `server.proxy` / `preview.proxy` existants restent inchangés.

### 2.3 Chemin des composants

Le CLI shadcn dépose les composants dans **`apps/web/src/components/ui/`** (un fichier par
composant : `button.tsx`, `dialog.tsx`, …). C'est le répertoire canonique shadcn, on le
garde tel quel. Les composants actuels de `src/components/` (métier) restent où ils sont ;
ils consomment `components/ui` au fil des vagues. L'alias `@/components/ui/button` devient
le standard d'import.

Ajouter au `exports` de `packages/tokens/package.json` une entrée `./shadcn.css` à côté de
l'entrée `./css` existante (même mécanisme, voir 2.4).

### 2.4 Point d'entrée CSS

Nouveau fichier **`apps/web/src/index.css`** (remplace progressivement `styles.css` +
`da-v3.css` dans `main.tsx`) :

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@atelier/tokens/shadcn.css';   /* généré, voir ci-dessous */
@import '@atelier/tokens/css';          /* vars legacy --color-* pendant la migration */

@theme inline {
  --color-background: var(--background);
  /* ... mapping complet section 3 ... */
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground font-sans; }
}

/* overrides densité Atelier (13px) — section 3.4 */
```

**Source de vérité préservée** : `packages/tokens/build.mjs` gagne un troisième format
`css/atelier-shadcn` qui génère `dist/tokens.shadcn.css` : deux blocs (`:root` pour dark,
`.dark` pour light) contenant les variables shadcn (`--background`, `--primary`, …)
résolues depuis `tokens.json` via une table de mapping constante (chemin token → nom de
variable shadcn). Le générateur a déjà la logique `$value` / `$extensions.light` — c'est
une extension mécanique du fichier existant. Conséquence : **aucune couleur codée en dur
dans l'app** ; changer le doré dans tokens.json propage partout, y compris shadcn.

`index.html` : le script inline actuel pose `data-theme` ; il pose désormais (ou en plus
pendant la transition) la classe `dark` par défaut. App.tsx remplace
`setAttribute('data-theme', …)` par `classList.toggle('dark', …)`.

### 2.5 Composants shadcn à ajouter dès le socle (V0)

```
npx shadcn@latest add button badge input textarea select dialog alert-dialog \
  dropdown-menu tooltip tabs sheet sonner command popover checkbox switch \
  toggle-group separator scroll-area label
```

`sonner` requiert `next-themes` côté shadcn (le wrapper Toaster lit le thème) : monter
`<Toaster />` une seule fois dans `App.tsx`, en lui passant explicitement
`theme={theme}` (notre état existant) plutôt que d'introduire next-themes comme provider.

---

## 3. Mapping tokens → variables shadcn

Toutes les valeurs viennent de `packages/tokens/tokens.json` (colonne « Token source » =
chemin DTCG). Le tableau ci-dessous EST la table de mapping à coder dans `build.mjs`.

### 3.1 Thème sombre (bloc `.dark`, posé par défaut)

Convention shadcn conservée telle quelle : `:root` = light, `.dark` = dark. Le script
inline d'index.html pose `.dark` avant le premier rendu (défaut historique dark-first,
zéro flash). App.tsx toggle cette classe.

| Var shadcn | Token source | Valeur | Note |
|---|---|---|---|
| `--background` | color.bg.level-1 | `#141210` | Fond principal, pas deepest (Linear : le contenu sur level-1) |
| `--foreground` | color.ink.primary | `#F2EEE7` | |
| `--card` | color.bg.level-3 | `#26221E` | Cartes, popovers |
| `--card-foreground` | color.ink.primary | `#F2EEE7` | |
| `--popover` | color.bg.level-3 | `#26221E` | |
| `--popover-foreground` | color.ink.primary | `#F2EEE7` | |
| `--primary` | color.accent.base | `#E8C97A` | Doré = CTA primaires, sélection, focus. Jamais un statut |
| `--primary-foreground` | color.accent.on-accent | `#0A0A0A` | |
| `--secondary` | color.bg.level-2 | `#1C1916` | Boutons secondaires, surfaces |
| `--secondary-foreground` | color.ink.primary | `#F2EEE7` | |
| `--muted` | color.bg.level-2 | `#1C1916` | |
| `--muted-foreground` | color.ink.secondary | `#A89F92` | Voir 3.5 pour tertiary |
| `--accent` | color.line.hover (teinte) | `rgba(240,232,218,.15)` | ⚠️ PAS le doré : `accent` shadcn = fond de hover/sélection des items (menus, commandes). Le mettre doré inonderait l'UI |
| `--accent-foreground` | color.ink.primary | `#F2EEE7` | |
| `--destructive` | color.status.err | `#FF5252` | |
| `--border` | color.line.default | `rgba(240,232,218,.09)` | Hairline teintée chaude, jamais gris neutre |
| `--input` | color.line.strong | `rgba(240,232,218,.22)` | Bordure de champ plus visible |
| `--ring` | color.accent.base | `#E8C97A` | Focus ring doré |
| `--chart-1..5` | status.warn / validated / ok / err / neutral | voir tokens | Graphiques futurs = couleurs statut |
| `--radius` | radius.card | `12px` | Base du scale shadcn |

### 3.2 Thème clair (bloc `:root`)

Mêmes chemins de tokens, colonne `$extensions.light` : background `#FFFFFF`, foreground
`#1C1C1A`, card/popover `#E9E9E5`, secondary/muted `#F2F2F0`, muted-foreground `#5A5A55`,
primary `#E8C97A` (doré UNIFIÉ, décision 13/08), primary-foreground `#1C1C1A`,
destructive `#DC2626`, border `rgba(28,28,26,.10)`, input `rgba(28,28,26,.26)`, accent
`rgba(28,28,26,.18)`.

### 3.3 Extensions Atelier hors scale shadcn

Déclarées dans `@theme inline` (générées aussi par le format shadcn de build.mjs) pour
rester consommables en classes Tailwind (`bg-status-warn`, `rounded-shell`…) :

- `--color-status-warn/-ok/-validated/-err` (+ variantes `-soft`) → statuts
- `--color-bg-deepest/-level-2/-level-3`, `--color-ink-*`, `--color-line-*` → usage interne pendant migration
- `--radius-btn: 999px` · `--radius-card: 12px` · `--radius-input: 8px` · `--radius-panel: 16px` · `--radius-shell: 18px`
- `--font-sans: 'Plus Jakarta Sans', …` · `--font-display: 'Fraunces', Georgia, serif`
- `--ease-atelier: cubic-bezier(0.32, 0.72, 0, 1)` · durées 150/250ms
- ombres `--shadow-sm/md/lg` (valeurs tokens existantes)

### 3.4 Densité et formes (overrides @theme)

- `--text-base: 13px` avec line-height 1.55 (densité Linear, DESIGN.md). Les autres
  échelles xs..xl reprennent les `font.size` des tokens.
- Boutons pilules : le variant par défaut de `button.tsx` passe `rounded-full`
  (`--radius-btn`). C'est l'unique retouche locale d'un composant shadcn — application de
  token, pas du fait main.
- Radius : `--radius: 12px` donne sm 8 / md 10 / lg 14 via les calc shadcn ; les rayons
  sémantiques (panel 16, shell 18) passent par les extensions 3.3.

### 3.5 Règle contraste (reprise d'AUDIT-PROTOTYPE)

`ink.tertiary` (#6E675C) rate WCAG AA sur level-1 (~4.0:1) : réservé aux métadonnées
décoratives (timestamps). Tout texte de guidance passe par `muted-foreground`
(#A89F92, ≥ 7:1). À appliquer telle quelle dans les ports shadcn.

---

## 4. Inventaire : primitives remplacées, custom conservés

### 4.1 Primitives actuelles → équivalents shadcn (REMPLACEMENT)

| Actuel (fait main) | Fichiers touchés | Remplacé par |
|---|---|---|
| ConfirmModal (confirm in-app) | ConfirmModal.tsx + appels (DraftDetail, listes) | `AlertDialog` |
| Palette ⌘K maison | CommandPalette.tsx | `Command` dans `CommandDialog` (cmdk) ; navigation clavier et groupes offerts par la primitive |
| Menus déroulants maison (statut global `.statut-menu`, sélecteur type, cloche notifications, menu « Nouveau document », menus ArticleEditor) | DraftDetail, NotificationBell, ArticleEditor, DocumentsPage | `DropdownMenu` |
| Onglets du panneau de révision (`.panel-tabs` Agent/Réseaux/Slides/Source) et onglet réseaux | DraftDetail | `Tabs` |
| Panneau droit / colonnes rétractables de la vue détail | DraftDetail | `Sheet` (side right/left) + `Tabs` ; la rétraction cumulative en barres 44px est reprise par Sheet contrôlé |
| Modales (CreationModal, modale Programmer, archivage Bibliotheque) | CreationModal, CalendarPostPanel, BibliothequePage | `Dialog` |
| Tooltips natifs `title=` (72 occurrences, à trier : actions icônes seulement) | dispersé | `Tooltip` |
| Toasts/messages volants (`.calendar-toast`, messages inline ok/err Source/régénération) | CalendarPage, DraftDetail | `Sonner` (toast.success/error) |
| Boutons `.button.primary/ghost/danger` | tous | `Button` (variants default=doré, secondary, ghost, destructive, outline ; forme pill) |
| Badges statuts + pills de filtre | ReseauBadge, Toolbar, ContentListPage | `Badge` + `ToggleGroup` (filtres silencieux : le style « texte + point, actif souligné » s'obtient en styland les items ToggleGroup, pas en recréant un composant) |
| Inputs/selects/textareas stylés à la main | formulaires divers | `Input`, `Select` (Radix), `Textarea`, `Label` |
| Checkboxes checklist révision | DraftDetail | `Checkbox` |
| Stepper Créer→Réviser→Programmer (tunnel) | DraftDetail | conservé en composition (pas de primitive shadcn dédiée) mais reconstruit en Tailwind + tokens, hors styles.css |

### 4.2 Custom À CONSERVER (logique métier, restylés Tailwind)

- **Framework de page** `ui.tsx` : `Page`, `PageHeader`, `PageSection`, `EmptyState`.
  Aucun équivalent shadcn (ce sont des patterns de mise en page). Ils restent LA structure
  commune, réécrits en classes Tailwind + tokens, sortis de styles.css.
- **Vue détail** : stage polymorphe image/vidéo, capture html-to-image, chat agent +
  polling 8s, annotations au pixel, conformité (ConformiteSection), suggestions de
  créneaux — logique intacte, habillage shadcn.
- **Sidebar rétractable** avec hover-intent à délais (150ms/250ms, leçon Phase 6e) :
  logique conservée, coquille en Tailwind ; version mobile via `Sheet`.
- **Liste dense / grille** des brouillons, dropzone Bibliothèque, grille Calendrier :
  contenu métier, styles portés en Tailwind.
- **format.ts, api.ts, diff.ts, export.ts, charte.ts** : hors périmètre UI.

---

## 5. Ordre de migration par vagues + impact e2e

Ordre validé par Victor (26/08). Une vague = une PR = une page intégralement basculée +
suppression des sections styles.css correspondantes + e2e mis à jour + golden regénérées
(`npm run test:e2e:update -w apps/web` puis `test:e2e`). Après chaque merge touchant du
CSS : `grep -rn "^<<<<<<<\|^=======\|^>>>>>>>" apps/ packages/` → 0 (piège vécu PR #44).

| Vague | Contenu | Sortie de styles.css |
|---|---|---|
| **V0 Socle** | Install §2, mapping tokens §3, index.css, toggle `.dark`, composants de base, test anti-oklch, smoke visuel dark+light | 0 ligne (cohabitation le temps d'une vague max) |
| **V1 Contenus (liste)** | ContentListPage + Toolbar (filtres → ToggleGroup) + DraftList/DraftGrid/DraftCard + ConfirmModal → AlertDialog + CreationModal → Dialog | ~30 % |
| **V2 Vue détail** | DraftDetail complet : panneau → Tabs/Sheet, statut → DropdownMenu, toasts → Sonner, checklist → Checkbox, palette ⌘K → CommandDialog | ~45 % cumulé |
| **V3 Bibliothèque** | BibliothequePage (dropzone, cartes, Dialog) | ~55 % |
| **V4 Calendrier** | CalendarPage + CalendarPostPanel (Popover/Dialog, Sonner) | ~65 % |
| **V5 Blog** | ArticleEditor + BlogPage | ~75 % |
| **V6 Charte** | BrandPage (éditeur + import CSS → Dialog/Tabs) | ~85 % |
| **V7 Intégrations** | IntegrationsPage | ~90 % |
| **V8 Activité + Settings/Help** | ActivityPage, SettingsPage, HelpPage | ~95 % |
| **V9 Démolition** | Suppression styles.css + da-v3.css + imports main.tsx ; retrait des vars legacy `--color-*` de l'app (restent générées pour MCP/render si besoin) ; self-host polices (R2) ; audit vision final dark+light | 100 % |

### Impact selectors e2e (référence : skill atelier, references/e2e-selectors.md)

Leçon actée : après refonte, les tests cassent sur des sélecteurs introuvables. Deux
mesures structurelles :

1. **Hooks stables** : chaque vague pose des `data-testid` sémantiques sur les points
   testés (ex. `filtre-statut-a-valider`, `onglet-agent`, `statut-bouton`,
   `planif-section`). Les specs e2e migrent vers ces hooks AUSSI TÔT (dès que la page est
   touchée), afin que les vagues suivantes ne recassent plus les tests.
2. **Règle de correction** : ne jamais deviner un libellé ; lire le DOM réel depuis le
   snapshot d'erreur Playwright (error-context.md) puis corriger le test dans la même PR.

Mapping prévisible des ruptures :
- `filtre-persistance.spec.mjs` : `.filtre-pills .pill` → ToggleGroup de V1 (role radio /
  data-testid).
- `smoke-a1-modes.mjs` : `.panel-tabs button`, `.sp-section`, `.planif-section`,
  `.stage-empty-guide`, `.tunnel-step.current`, `.list-row`/`.card` → hooks V1/V2.
- `snapshots.spec.mjs` : golden regénérées à CHAQUE vague (maxDiffPixelRatio 0.02 inchangé,
  animations disabled déjà configuré). Attention portails Radix : les menus/modales se
  rendent en fin de `body` → privilégier getByRole/data-testid aux sélecteurs hiérarchiques.

---

## 6. Risques et parades

| # | Risque | Sévérité | Parade décidée |
|---|--------|----------|----------------|
| R1 | **html-to-image vs oklch/color-mix** : Tailwind v4 et shadcn émettent par défaut des couleurs oklch ; le clone calculé par html-to-image peut mal sérialiser oklch/color-mix → slides capturées noires/transparentes (la régénération de slides est une feature cœur, F-28) | HAUTE | Les tokens restent en **hex/rgba** (c'est déjà le cas dans tokens.json — interdire toute conversion oklch). Test ajouté à packages/tokens : échec si `oklch(` apparaît dans dist/tokens.css, dist/tokens.shadcn.css ou src/index.css. Non-régression V0 obligatoire : régénérer les slides d'un brouillon test (pattern test-f29-mecanique.cjs) et vérifier le PNG. Note : la slide capture la charte CLIENT (hex de la charte Bordeluche injectée), le risque réel porte sur le chrome produit autour — mais on verrouille quand même tout le pipeline |
| R2 | **Polices** : aujourd'hui Google Fonts CDN (cross-origin → workaround fetch/link dans la capture, DraftDetail.tsx ~L686). Le brief évoque Fontshare : **Fraunces n'est PAS sur Fontshare** (Google Fonts only) ; Plus Jakarta Sans y est | MOYENNE | Self-host des DEUX familles via google-webfonts-helper : woff2 dans `apps/web/public/fonts/` + `@font-face` locaux dans index.css. Supprime la dépendance réseau ET le workaround skipFonts/filter de la capture (les feuilles même-origine sont lisibles par html-to-image). Fait en V9 (ou en V0 si trivial) |
| R3 | **Densité** : les tailles par défaut shadcn (text-sm 14px) divergent des 13px Atelier | FAIBLE | Override `--text-base` + échelle tokens (§3.4) ; règle : jamais de taille brute dans les composants métier |
| R4 | **Portails Radix × tests** : contenu rendu hors du parent → sélecteurs hiérarchiques cassent | FAIBLE | Hooks data-testid + getByRole (§5) |
| R5 | **Golden snapshots** instables pendant la transition (deux systèmes CSS cohabitent le temps d'une vague) | FAIBLE | Cohabitation limitée à UNE vague (chaque PR bascule sa page entière) ; golden regénérées par vague |
| R6 | **Deux packs d'icônes** (lucide installé par défaut, Phosphor projet) | FAIBLE | D6 : zéro import lucide. Si on veut faire propre : retirer lucide-react des dependencies à la fin de V0 (le CLI ne le réinstallera pas si présent… vérifier ; sinon le laisser, non importé) |
| R7 | **Compat versions** : React 19 + Vite 6 + Radix actuels | FAIBLE | Supportés par @tailwindcss/vite (^6) et Radix courant. Vérifier au V0 que le build CI passe (ordre build.mjs tokens AVANT tsc, piège connu) |

---

## 7. Hors périmètre

- Aucun changement API/MCP/base de données.
- Aucun changement de DA (couleurs/fonts/statuts figés par DESIGN.md et tokens.json — le
  test tokens existant continue de verrouiller).
- Pas de nouvelles features UI pendant les vagues (les cartes en cours comme la conformité
  restent livrées sur l'existant et seront portées avec leur page).
