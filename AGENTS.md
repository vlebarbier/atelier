# AGENTS.md — Projet Atelier

> Instructions pour les agents IA travaillant sur ce repo. **À lire en premier**, avant toute issue ou PR.

## Contexte

- **Atelier** : l'atelier de production, révision et validation du contenu créé avec des agents IA — le lieu de travail entre l'agent qui produit (Hermes, Claude Code, Codex…) et la publication (Postiz, plateformes).
- **Cible** : solopreneurs, community managers freelances, petites agences. Cas d'usage originel : la conciergerie Bordeluche (un client parmi d'autres, pas la cible principale).
- **Repo** : `vlebarbier/atelier` · open source MIT · early-stage, en cours de refonte produit.
- **Monorepo** npm workspaces (node >= 22) :
  - `apps/web` — dashboard React 19 + TS strict + Vite
  - `apps/api` — API Hono + SQLite (better-sqlite3) + Drizzle + Zod
  - `packages/mcp` — serveur MCP (15 outils), la colonne vertébrale
  - `packages/render` — pipeline de rendu HTML → PNG (Playwright)
  - `packages/tokens` — design tokens (Style Dictionary)

## Documents de référence (sources de vérité)

| Doc | Rôle |
|---|---|
| `docs/PRODUCT.md` | Vérité produit : JTBD, contraintes, non-goals |
| `docs/DESIGN.md` | **Source de vérité visuelle** : tokens, typo, anti-patterns |
| `docs/ROADMAP-MVP.md` | État réel du code + roadmap 3 phases |
| `docs/PRIORISATION.md` | RICE des 55 features + chemin critique MVP |
| `docs/INDEX.md` | Index complet de la documentation |
| `README.md` | Démarrage, architecture, table des outils MCP |

## Règles produit (inaliénables)

1. **Jamais de publication sans validation humaine** — workflow `brouillon → a-valider → valide → publie`. Postiz ne reçoit que des drafts ; la publication reste manuelle.
2. **L'agent est un citoyen de première classe** — toute capacité produit doit être exposée au serveur MCP (`packages/mcp`), pas seulement à l'UI.
3. **La charte du client est une donnée d'entrée**, pas un sticker posé après coup.
4. **Local d'abord** — zéro dépendance cloud pour l'usage solo. Le seed prototype est opt-in (`API_BROUILLONS_SEED_DIR`) ; jamais de chemin personnel hardcodé au boot.

## Boucle agent (canonique)

```
creer_brouillon (demande initiale pré-remplie)
  → set_source (HTML, source de vérité du contenu)
  → deposer_slides (dataURL via l'API : Blob en prod, disque en local)
  → set_legende (caption + hashtags par réseau)
  → repondre_brouillon
```

- `regenerer_slides` = rendu **local** uniquement ; en prod, passer par `deposer_slides`.
- Table complète des 15 outils MCP : voir `README.md`.

## Design system

- Source de vérité : `docs/DESIGN.md` + tokens compilés dans `packages/tokens/dist`.
- **Ne jamais hardcoder les couleurs** — utiliser les tokens `@atelier/tokens`.
- Accent unique **terracotta** (`--accent`), hairlines teintées (`--line`), pas d'ombres dures, pas de dégradés décoratifs.
- Transitions : `cubic-bezier(0.32, 0.72, 0, 1)` partout ; animations `transform` + `opacity` uniquement.
- Polices : **Fraunces** (display) + **Plus Jakarta Sans** (UI). **Inter, Cormorant et Jost sont bannis.**
- Double-bezel sur les cartes principales ; grain subtil en overlay fixe (jamais sur conteneur scrollable).
- Badges de statut selon `docs/DESIGN.md` § États.

## Commandes

```bash
npm install
npm run dev                          # API :4310 + Web :5173 en parallèle
npm test                             # unitaires (API + tokens)
npm run test:e2e -w apps/web         # régression visuelle (golden images dark + light)
npm run test:e2e:update -w apps/web  # régénère les golden images (dérive voulue uniquement)
npm run lint
```

## Tests & qualité

- Unitaires : Vitest côté API + tokens (46 tests au 15/08/2026).
- **Régression visuelle** : snapshots Playwright — toute dérive DA fait échouer les tests. Ne régénérer les golden images que si la dérive est intentionnelle et validée.
- Tests verts + lint OK avant toute PR.

## Intégrations

- **Postiz** (self-hosted, `POSTIZ_API_URL`, défaut `http://localhost:4007/api`) : drafts uniquement, jamais de publication directe.
- **Sanity CMS** : publication blog côté API.
- **Blob** : stockage slides/fichiers en prod ; disque en local.
- Variables d'environnement : copier `.env.example` → `.env`.

## Déploiement

- Vercel : `atelier-web` (front, build `apps/web`, voir `vercel.json`) + `atelier-api`.

## Workflow de contribution

- **Issues GitHub = file de travail des agents.** Préfixe d'epic dans le titre ; **1 issue = 1 PR**.
- Lire l'issue + les docs de référence concernés avant de coder.
- Chaque brique de roadmap est d'abord validée sur le prototype/les maquettes, puis implémentée — **on ne code pas une feature non validée**.
- Les docs `docs/SPEC-*.md` décrivent des capacités cibles : vérifier dans `docs/ROADMAP-MVP.md` ce qui est réellement implémenté avant de s'y fier.
