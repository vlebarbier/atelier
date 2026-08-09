# PRODUCT.md — Atelier

> Capturé 09/08/2026 via `$impeccable init` (vérité produit, pas de décisions visuelles ici).

## What this product is

**Atelier** est un atelier de production, révision et validation du contenu créé avec des agents IA. C'est le « lieu de travail » entre l'agent qui produit (Hermes, Claude Code, Codex) et la publication (Postiz, plateformes).

## Who it's for

- Solopreneurs (contenu personnel/marque)
- Community managers freelances (multi-clients, chartes multiples, multi-réseaux)
- Petites agences (workflow d'équipe léger)
- Cas d'usage originel : conciergeries (Bordeluche) — un client parmi d'autres, pas la cible principale

## Jobs to be done

1. **Produire** : les agents créent les brouillons directement dans l'outil via MCP (carrousels, posts, stories, articles de blog)
2. **Visualiser** : grille, liste, plein écran, comparaison de versions, adaptation par réseau
3. **Valider** : workflow brouillon → à valider → validé → publié (jamais publié sans validation humaine)
4. **Respecter la charte** : l'utilisateur uploade sa direction artistique (couleurs, polices, logos) → injectée dans le pipeline de rendu et les instructions agents
5. **Publier** : intégration Postiz — le brouillon validé part en draft, la publication reste manuelle

## Content types (MVP)

- Carrousel (multi-slides, IG/LinkedIn)
- Post simple (image + légende)
- Story (9:16)
- Article de blog (texte + images)

## Hard constraints

- **Jamais publier sans validation humaine** (workflow inaliénable)
- La charte graphique du client est une donnée d'entrée, pas un sticker
- Zéro dépendance cloud pour l'usage solo (local d'abord)
- MCP server = colonne vertébrale (n'importe quel agent peut lire/écrire les brouillons)
- Open source (MIT), repo dans le dossier GitHub de Victor
- DA du produit distincte de Bordeluche (pas de bordeaux/ivoire/gold)

## Non-goals (MVP)

- Multi-utilisateurs/auth (plus tard)
- Version cloud hébergée (plus tard)
- Team workspace (plus tard)
- Analytics de publication (plus tard)

## Success criteria

- Un CM peut créer un carrousel avec un agent, le voir dans le dashboard, l'adapter par réseau, le valider et l'envoyer en brouillon Postiz — sans quitter l'outil
- La DA du client est respectée par le rendu et les agents
