# Atelier

**L'atelier de production, révision et validation du contenu créé avec des agents IA.**

Atelier est la mémoire de la marque et le complément de l'agent : l'identité (charte, ton) et les contenus (photos, pages, archives) y vivent une fois pour toutes, l'agent les lit pour produire conforme, et l'humain valide tout avant publication.

> **MVP livré, en usage réel** — né chez une conciergerie (Bordeluche), pensé pour les créateurs agent-first (Hermes, Claude Code, Codex).

## Documentation produit

La vision, la feuille de route, le journal des décisions, le marché et le design system vivent dans Notion : espace **Projet — Atelier** (référence lisible, tenue au fil de l'eau). Ce repo garde le détail technique : **[docs/INDEX.md](docs/INDEX.md)** est le point d'entrée (specs dans `docs/specs/`, design dans `docs/design/`).

## Ce qu'il fait

| Capacité | Description |
|---|---|
| **Brouillons multi-format** | Carrousels, posts, stories, vidéos, articles de blog — chaque projet a ses slides, notes, statut |
| **Visualisation** | Grille, liste, détail 3 colonnes, navigation clavier, filtres persistants |
| **Légendes par réseau** | Caption + hashtags + statut dédiés pour Instagram, LinkedIn, Facebook, X, TikTok |
| **Workflow de validation** | brouillon → à valider → validé → publié — **jamais publié sans validation humaine** |
| **Révision avancée** | Notes par slide/réseau, checklist, annotations au pixel, diff avant/après, aperçu publié |
| **Charte graphique** | Import CSS → tokens, éditeur, export — injectée dans les instructions agents (MCP `get_charte`) |
| **Bibliothèque** | Photos, pages, documents : la mémoire de la marque, lisible par l'agent |
| **Agents IA** | Serveur MCP : n'importe quel agent peut lire/écrire les brouillons |
| **Worker asynchrone** | L'agent surveille les conversations en attente et répond seul (cron + monitor, sans jamais valider ni publier) |
| **Calendrier** | Planification par jour, glisser-déposer, créneaux conseillés |
| **Blog** | Articles créés avec la charte, publiés vers le CMS (Sanity) |
| **Publication** | Intégration Postiz (draft d'abord, publication manuelle) |

## Démarrage rapide (local)

```bash
# 1. Installer les dépendances (racine du monorepo)
npm install

# 2. Lancer API (4310) + Web (5173) en parallèle
npm run dev
#    → Web : http://localhost:5173
#    → API : http://localhost:4310/api/brouillons

# 3. Tests
npm test                 # unitaires (API + tokens)
npm run test:e2e -w apps/web   # visual regression (golden images DA)
npm run test:e2e:update -w apps/web  # régénérer les golden images
```

> La base SQLite est seedée automatiquement depuis le prototype (brouillons + slides copiés au premier démarrage).

## Architecture (monorepo npm workspaces)

```
Atelier/
├── apps/
│   ├── web/            # Dashboard React 19 + TS + Vite (grille, liste, détail,
│   │                   #   légendes par réseau, ⌘K, Calendrier, Charte, Activité IA)
│   └── api/            # API Hono + SQLite (better-sqlite3) + Drizzle + Zod
│                       #   (Neon Postgres en prod)
├── packages/
│   ├── tokens/         # Design tokens (Style Dictionary) → dist/tokens.css + tokens.json
│   └── render/         # Pipeline de rendu HTML → PNG (Playwright)
├── docs/               # INDEX.md (point d'entrée), specs/, design/, references/
├── design/             # prototype/ (27 maquettes validées), captures/, mockups/
└── scripts/qa/         # Boîte à outils de captures Playwright
```

## Stack

- **Web** : React 19, TypeScript strict, Vite, @phosphor-icons/react (icônes), design tokens @atelier/tokens
- **API** : Hono, better-sqlite3, Drizzle ORM, Zod (validation) ; Neon Postgres en prod
- **DA v3** : « l'écrin noir, le contenu héros » — noir chaud #141210, accent doré unique #E8C97A, Plus Jakarta Sans + Fraunces (titres), hairlines teintées
- **Visual regression** : Playwright snapshots (golden images dark + light) — toute dérive DA fait échouer les tests

## Outils MCP exposés

| Outil | Rôle |
|---|---|
| `creer_brouillon` | Crée un brouillon (titre, type, demande initiale pré-remplie) — la porte d'entrée de la boucle agent |
| `liste_brouillons` | Liste des brouillons + statuts |
| `lire_brouillon` | Détail complet (slides, notes, légendes, conversation) |
| `set_statut` | brouillon / a-valider / valide / publie |
| `set_notes` | Notes de révision |
| `set_legende` | Caption + hashtags par réseau |
| `set_source` | Dépose le HTML source (le document de travail, source de vérité) |
| `deposer_slides` | Remplace les slides depuis des dataURL (stockage via l'API : Blob en prod, disque en local) |
| `regenerer_slides` | Régénère les visuels depuis le HTML source (rendu local) |
| `repondre_brouillon` | Répond dans la conversation du brouillon |
| `creer_brouillon_postiz` | Envoie le brouillon validé en draft Postiz |
| `get_charte` | Charte graphique active transformée en instructions marque |
| `lister_ressources` / `lire_ressource` / `deposer_ressource` | Bibliothèque (mémoire de la marque) |
| `lire_journal` | Journal des actions agents |

**La boucle agent réelle** : `creer_brouillon` (demande initiale) → `set_source` (HTML) → `deposer_slides` (visuels via l'API) → `set_legende` → `repondre_brouillon`. La production passe par cette boucle MCP ; le seed depuis un dossier local n'existe plus (opt-in `API_BROUILLONS_SEED_DIR` pour migration ponctuelle).

## Philosophie

- **Local d'abord** : zéro dépendance cloud pour l'usage solo, open source
- **L'agent est un citoyen de première classe** : le MCP server est la colonne vertébrale
- **La validation humaine est inaliénable** : le workflow brouillon → validation est natif
- **La charte du client est une donnée d'entrée** : pas un sticker posé après coup
- **On rend, on ne génère pas** : la génération d'images reste chez les agents et FAL

## Licence

MIT — voir [LICENSE](LICENSE).

## Roadmap

Livrées :

- [x] Dashboard (grille/liste/détail, légendes par réseau, statuts)
- [x] Serveur MCP (contenu + visuels + charte + bibliothèque + Postiz)
- [x] Pipeline de rendu HTML → PNG
- [x] Charte graphique : import CSS, éditeur, export, instructions agents
- [x] Bibliothèque de contenus (mémoire de la marque)
- [x] Calendrier + draft Postiz
- [x] Articles de blog (CMS Sanity)
- [x] Worker asynchrone (l'agent répond seul)

Prochaines étapes (ordre recommandé, détail dans l'issue #107 et `docs/PRIORISATION.md`) :

- [ ] Score d'authenticité anti-AI-slop (#93)
- [ ] Carrousel validé → vidéo animée (#88)
- [ ] Lien de révision partagé sans compte (#90)
- [ ] Boucle idées Hermes → brouillon prérempli (#94)
- [ ] Injection de la charte dans le rendu + badge de conformité (#3)
- [ ] Adaptation automatique par réseau (ratio, format) (#4)
- [ ] Multi-utilisateurs / version cloud — après preuve d'usage

Hors périmètre acté : génération d'images, publication automatique, auth avant preuve d'usage, IA conversationnelle dans l'outil.
