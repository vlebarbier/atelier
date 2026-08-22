# INDEX.md — Documentation Atelier

> Point d'entrée de la documentation. Les règles de travail pour les agents vivent dans **AGENTS.md** à la racine.
> Mis à jour le 22/08/2026 après la restructuration du repo (PR #98).

## À lire en premier

1. `docs/VISION.md` — pourquoi Atelier existe
2. `docs/PRODUCT.md` — le produit en bref
3. `AGENTS.md` (racine) — stack, commandes, règles inaliénables

## Racine de docs/

| Doc | Rôle |
|---|---|
| `VISION.md` | Vision long terme |
| `PRODUCT.md` | Produit et principes |
| `STRATEGY.md` | Stratégie |
| `positionnement.md` | Positionnement |
| `PRIORISATION.md` | **Suivi produit** : priorisation RICE, IDs F-XX — la source de vérité du backlog |
| `ROADMAP-MVP.md` | Cadrage MVP en phases (état vérifié du code) |
| `STRATEGIE-PUBLICATION.md` | Publication Postiz : drafts only, jamais d'auto-publication |
| `references/` | Références externes |

## docs/design/ — design et recherche

| Doc | Rôle |
|---|---|
| `DESIGN.md` | **Source de vérité de la DA** : tokens, typographie, composants, règles |
| `REFONTE-DESIGN.md` | Historique des décisions de refonte |
| `recommandations-DA.md` | Recommandations DA |
| `AUDIT-PROTOTYPE.md` | Audit des 9 écrans du prototype (10 chantiers transverses) |
| `UX-RESEARCH.md` | Recherche UX : modes contextuels, tunnel Créer / Réviser / Programmer |

## docs/specs/ — specs des briques

Les SPEC décrivent le **cible**, pas l'existant : vérifier le code avant de s'y fier.

- `SPEC-CREATION.md` — tunnel de création
- `SPEC-TUNNEL.md` — stepper workflow
- `SPEC-ANNOTATIONS.md` — feedback ancré au visuel
- `SPEC-ASK-USER.md` — questions de l'agent au user
- `SPEC-AGENT-REACTIF.md` — agent réactif
- `SPEC-BLOG.md` — blog
- `SPEC-CHARTE-EVOLUTIVE.md` — cycle charte candidate / proposée / acceptée
- `SPEC-COLLECTEUR.md` — collecte des sources de marque
- `SPEC-CONFORMITE.md` — conformité charte
- `SPEC-GAMIFICATION.md`
- `SPEC-PARTS.md`
- `SPEC-PLAN-VALIDATION.md`
- `SPEC-PORTAGE-PROTOTYPE.md` — pont prototype HTML → app React, écran par écran
- `SPEC-ROTATION-ANGLES.md`
- `SPEC-VALIDATION-ESTHETIQUE.md` — validation « est-ce beau »
- `SPEC-VIDEO-REMOTION.md` *(via PR #96)* — sortie vidéo Remotion

## Hors docs/

| Chemin | Rôle |
|---|---|
| `design/prototype/` | Les 27 maquettes HTML validées + `assets/` (atelier.css, proto.js) : **source de vérité visuelle** pendant le portage |
| `design/captures/` | Captures de référence et de QA |
| `design/mockups/` | Anciennes itérations (mockup-refonte.html) |
| `scripts/qa/` | Boîte à outils de captures Playwright |
| `archive/` | Ancien dashboard — référence historique uniquement |

## Conventions

- **1 issue = 1 feature en cours**, numérotée F-XX, fermée par la PR qui la livre (détail dans AGENTS.md).
- Discussion sans décision de feature → rien à consigner.
- Une livraison qui change un comportement met à jour le doc correspondant dans la même PR.
