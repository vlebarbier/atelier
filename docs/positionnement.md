# Note de positionnement — Outil de production de contenu (working title)

## Le problème

Les solopreneurs et community managers freelance utilisent des agents IA (Hermes, Claude Code, Codex) pour **produire** du contenu. Mais le workflow autour de la production reste artisanal :
- Les brouillons traînent dans des dossiers ou des chats
- La validation est un aller-retour texte interminable
- L'adaptation par réseau social (ratio, format, longueur) est refaite à la main
- La charte graphique du client est rarement respectée par les agents
- La publication est déconnectée de la révision

## La solution

**Un atelier de production et de révision du contenu créé avec des agents IA.**

- **Lieu de production** : les agents (via MCP) créent les brouillons directement dans l'outil — carrousels, posts, stories, articles de blog
- **Lieu de visualisation** : grille, liste, plein écran, comparaison de versions, adaptation par réseau
- **Lieu de validation** : statuts (brouillon → à valider → validé → publié), notes, commentaires
- **Respect de la charte** : l'utilisateur uploade sa direction artistique (couleurs, polices, logos) → les agents et le pipeline de rendu la respectent
- **Publication** : connecté à Postiz / plateformes, toujours en brouillon jusqu'à validation humaine

## Cible

| Segment | Besoin | Priorité |
|---|---|---|
| Solopreneurs | Produire vite + valider sans friction | ★★★ |
| Community managers freelance | Multi-clients, chartes multiples, multi-réseaux | ★★★ |
| Petites agences | Workflow d'équipe, validation client | ★★ |
| Conciergeries (usage originel) | Contenu localisé, multi-logements | ★ (origine) |

## Modèle de revenus (open-core)

- **Core open source** (MIT) : moteur local, dashboard, MCP server, pipeline de rendu
- **SaaS hébergé** (optionnel) : multi-utilisateurs, cloud, intégrations premium
- Positionnement : « l'outil gratuit qui se paie par la valeur produite »

## Noms candidats

| Nom | Avis |
|---|---|
| **Atelier** | Français, artisanat + création. Évocateur mais générique (risque de confusion) |
| **Draftdeck** | Brouillon + deck. Clair sur la fonction, SaaS-y |
| **Canevas** | Français, structure de création. Évocateur, distinct |
| **Proofroom** | Anglais, salle de validation. Précis sur le workflow |
| **Folio** | Portfolio/atelier. Court, premium, mais plus vague |

## Différenciateurs vs outils existants (Canva, Notion, Metricool)

1. **Pensé pour l'agent** : le MCP server est la colonne vertébrale — pas un outil « humain » auquel on greffe l'IA
2. **Charte graphique = donnée d'entrée** : la DA du client est injectée dans le rendu, pas un sticker
3. **Validation humaine intégrée** : le workflow brouillon → validation est natif, pas un ajout
4. **Local d'abord** : zéro dépendance cloud pour l'usage solo, open source

## Périmètre MVP

1. Projets multi-format (carrousel, post, story, blog) — le carrousel Bordeluche devient un cas d'usage
2. Charte graphique upload + injection dans le rendu
3. Adaptation par réseau (ratio, légende, format)
4. Dashboard avec nouvelle DA (light/dark), vues grille/liste/détail
5. Serveur MCP générique (contenu + visuels + charte)
6. Intégration Postiz (publication en brouillon)
7. Génération d'images via FAL respectant la charte
8. Blog (import/rendu d'articles)

## Hors périmètre MVP (plus tard)

- Multi-utilisateurs / auth
- Version cloud hébergée
- Team workspace
- Analytics de publication
