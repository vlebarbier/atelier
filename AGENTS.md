# AGENTS.md — Atelier

> Règles projet pour les agents travaillant sur Atelier (Hermes, Codex, Claude Code…).
> L'identité et la voix des agents sont définies dans leur SOUL.md — pas ici.

## Contexte

- **Atelier** : l'atelier de production, révision et validation du contenu créé avec des agents IA (brouillons multi-format, légendes par réseau, validation avant publication Postiz).
- **Repo** : `vlebarbier/atelier` (public)
- **Monorepo** : `apps/api` + `apps/web` + `packages/`

## Stack

- **API** (`apps/api`) : Hono + SQLite (better-sqlite3) + Drizzle ORM + Zod. Entry : `src/index.ts`, dev via `tsx watch`.
- **Web** (`apps/web`) : React + TypeScript + Vite (port 5173). Grille de brouillons, DA Linear/cyan actuelle — refonte DA noire monochrome en cours (voir docs/).
- **Build web** : `node ../../packages/tokens/build.mjs && tsc --noEmit && vite build`

## Commandes

- `npm run dev` dans `apps/api` — API locale
- `npm run dev` dans `apps/web` — web local (port 5173)
- `npm run build` + `npm run lint` dans `apps/web` — vérifs avant livraison

## Docs de référence (à lire avant de toucher une feature)

- `docs/PRODUCT.md`, `docs/DESIGN.md`, `docs/PRIORISATION.md`, `docs/REFONTE-DESIGN.md`
- `docs/SPEC-*.md` — specs des briques (création, blog, charte évolutive, conformité, agent réactif, ask-user…)
- La charte et les tokens vivent dans `packages/tokens/` — ne pas hardcoder les couleurs

## Règles

- Brouillon → validation Victor → publication (jamais de publication automatique).
- Ne jamais modifier un titre ou du contenu publié sans diff + validation Victor.
- Ne pas casser la DA : toute déviation visuelle se valide avant intégration.
- Tests/lint verts avant de déclarer une tâche terminée.

## Consignation (features)

- **Le suivi produit vit dans le repo, pas ailleurs** (pas de Notion, pas de Linear) : `docs/PRIORISATION.md` pour prioriser (RICE, IDs F-XX), issues GitHub pour les features en cours, PR pour livrer et fermer.
- Convention issue : **une issue = une feature en cours**, numérotée F-XX en référence, fermée par la PR qui la livre.
- **Discussion sans décision de feature → rien.** Les analyses, avis et non-actions ne se ticketent pas.
- **Lors d'une discussion, si une feature paraît pertinente → la PROPOSER à Victor avant de la consigner.** Il valide, puis on l'ajoute en F-XX dans `docs/PRIORISATION.md`. Jamais de consignation unilatérale en pleine discussion.

## Déploiements

- API : `atelier-api-three.vercel.app` (Neon + Blob privé) · Web : `atelier-web-drab.vercel.app`
- ⚠️ `.env.local` = PROD Neon — ne pas l'écraser avec des valeurs locales.
