# Atelier

**L'atelier de production, révision et validation du contenu créé avec des agents IA.**

Atelier est le lieu de travail entre l'agent qui produit (Hermes, Claude Code, Codex…) et la publication (Postiz, plateformes). Pensé pour les solopreneurs, les community managers freelances et les petites agences.

> **Ceci est une version early-stage** — issue d'un usage réel chez une conciergerie Airbnb (Bordeluche). Le code est fonctionnel mais en cours de refonte produit.

## Ce qu'il fait

| Capacité | Description |
|---|---|
| **Brouillons multi-format** | Carrousels, posts, stories, articles de blog — chaque projet a ses slides, notes, statut |
| **Visualisation** | Grille, liste, plein écran, navigation clavier, filtres par statut |
| **Légendes par réseau** | Caption + hashtags + statut dédiés pour Instagram, LinkedIn, Facebook, X, TikTok |
| **Workflow de validation** | brouillon → à valider → validé → publié — **jamais publié sans validation humaine** |
| **Charte graphique** | Upload de la direction artistique (couleurs, polices, logos) → injectée dans le rendu et les agents |
| **Agents IA** | Serveur MCP : n'importe quel agent peut lire/écrire les brouillons |
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
├── packages/
│   ├── tokens/         # Design tokens (Style Dictionary) → dist/tokens.css + tokens.json
│   └── render/         # Pipeline de rendu HTML → PNG (Playwright)
├── docs/               # DESIGN.md (DA), PRODUCT.md, positionnement, recommandations
└── archive/            # Anciens fichiers prototype (dashboard single-file, MCP Python)
```

## Stack

- **Web** : React 19, TypeScript strict, Vite, @phosphor-icons/react (icônes), design tokens @atelier/tokens
- **API** : Hono, better-sqlite3, Drizzle ORM, Zod (validation)
- **DA** : « Linear du contenu social » — dark-first, accent doré #E8C97A, Plus Jakarta Sans, hairlines alpha
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

## Licence

MIT — voir [LICENSE](LICENSE).

## Roadmap

- [x] Dashboard (grille/liste/détail, légendes par réseau, statuts)
- [x] Serveur MCP (contenu + visuels + Postiz)
- [x] Pipeline de rendu HTML → PNG
- [ ] Upload charte graphique + injection templates
- [ ] Adaptation automatique par réseau (ratio, format)
- [ ] Génération d'images respectant la charte (FAL)
- [ ] Articles de blog
- [ ] Multi-utilisateurs / version cloud
