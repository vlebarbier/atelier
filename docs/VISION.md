# VISION.md — Atelier : vision, mission, PRD (draft de travail — 10/08/2026)

> Ce document challenge la vision. Il est fait pour être discuté, pas adopté tel quel.
> Statut : **hypothèses à valider avec Victor**. Rien ici n'est gravé.

---

## Partie A — Ce qu'on croyait, et pourquoi c'est fragile

### A1. « Le goulot est la révision, pas la production »

Le STRATEGY.md actuel part de : « l'IA est rapide, l'humain est lent, donc le goulot est la révision ».

**Challenge** : est-ce vérifié chez le solopreneur cible ? Aujourd'hui, la plupart des solopreneurs qui font du contenu avec des agents :
- produisent peu (1-3 posts/semaine), donc le temps de révision n'est pas encore un goulot douloureux ;
- révisent dans le chat de l'agent (Claude/Hermes) et copient-collent le résultat — « zéro outil » est leur workflow actuel.

Le vrai goulot n'est peut-être pas la *révision*, c'est la **cohérence** : chaque prompt ré-explique la charte, chaque sortie ressemble à une sortie d'agent (générique), et rien ne garantit que ça ressemble à la marque. Si on vend « gagne du temps en révision », on vend un besoin faible. Si on vend « ton contenu IA ressemble enfin à ta marque », on vend une promesse émotionnelle forte.

### A2. « Le HTML source est le document » — un argument de dev, pas d'achat

C'est techniquement magnifique (versionnable, multi-ratio, régénérable). Mais personne n'achète un produit parce que « le HTML est la source de vérité ». C'est un *enabler*, pas une *value proposition*. Il faut le garder dans l'architecture, le sortir du pitch.

### A3. Le marché est un marché d'innovateurs — tôt, pas tard

« Solopreneur agent-first » = ceux qui produisent leur contenu avec des agents *aujourd'hui*. C'est une population réelle mais jeune (2026). Les gros (Buffer, Metricool, Canva) ajoutent tous de l'IA générative. Le risque n'est pas qu'ils copient notre workflow agent → c'est qu'ils servent le besoin « contenu de marque » avant nous, avec leur base d'utilisateurs.

MAIS : ils sont construits autour de la *programmation* et du *prompt dans une UI*. Aucun n'est construit pour des **agents qui écrivent le contenu ailleurs** et le déposent. C'est une étagère vide aujourd'hui, mais la fenêtre se referme à mesure que les agents deviennent mainstream.

### A4. Open source MIT — pour quoi faire ?

Le repo est public + MIT. Deux lectures honnêtes :
- **Aimant à agents** : les agents (Hermes, Claude Code) peuvent lire le code, s'y brancher (MCP open), le trust est total. Pour une communauté « agent-first », c'est un vrai avantage.
- **Frein à la monétisation** : si le cœur est open, on vend quoi ? Réponse classique : le cœur open (parser, MCP, SDK) + le SaaS (dashboard, équipe, historique). À clarifier — ce n'est pas décidé.

### A5. Le piège « un outil de plus »

Chaque CM a déjà 5 outils. Le pitch « atelier de révision » risque de répondre « j'ai déjà Notion + ChatGPT + Canva, ça suffit ». Il faut soit une douleur aiguë non servie, soit une promesse qui change la donne.

---

## Partie B — Trois visions possibles (avec trade-offs)

### Vision A — « Le réceptacle » (la vision actuelle)

> Un atelier où les agents déposent leur production, où l'humain révise, valide, publie.

- **Cœur** : workflow agent → révision → validation → publication (brouillon, détail, calendrier).
- **Fort** : clair, construisible, déjà à moitié bâti.
- **Faible** : répond à un besoin doux (réviser) ; risque « outil de plus » ; la charte reste une feature parmi d'autres.

### Vision B — « La couche marque » (recommandée)

> Atelier transforme la production IA en contenu de marque. L'identité (charte, ton, contexte) est injectée partout : dans les instructions des agents, dans le rendu, dans le contrôle avant validation.

- **Cœur** : la **charte graphique n'est pas une feature, c'est le produit**.
  - Importer sa marque une fois (CSS/agent/Claude Design/Figma) — livré (PR #16).
  - L'injecter dans les prompts des agents → production conforme d'emblée.
  - L'injecter dans le rendu → chaque slide ressemble à la marque.
  - Vérifier chaque brouillon → badge « conforme / hors charte ».
  - L'humain garde la main : rien ne part sans validation.
- **Fort** : promesse émotionnelle (« ne publie plus jamais quelque chose qui ne te ressemble pas ») ; différenciateur dur à copier (pipeline agent + rendu + contrôle) ; parfait pour la communauté agent-first ; et c'est une **vitrine exceptionnelle** pour ton positionnement freelance (démo complète du pipeline).
- **Faible** : le « contrôle de marque » est un marché à créer ; la valeur est diffuse tant que l'injection rendu/prompts n'est pas livrée.

### Vision C — « La gouvernance des agents de contenu »

> L'outil qui orchestre, trace et audite la production IA : qui a produit quoi, versions, conformité, historique — pour CM et agences.

- **Cœur** : activité IA (journal), versions, multi-chartes, rôles.
- **Fort** : marché plus gros (CM/agences paient pour la traçabilité) ; moins de risque « outil de plus » (c'est un layer de contrôle).
- **Faible** : concurrentiel (LangSmith et consorts sur l'observabilité) ; beaucoup plus de scope (auth, rôles, multi-clients) ; dilue le différenciateur.

### Verdict

**A est le piège** (bien construit, besoin doux). **C est le piège inverse** (marché gros, scope énorme, solo dev). **B est le pari juste** : une promesse forte, un différenciateur défendable, aligné avec la communauté agent-first, et construisible solo en 4-6 semaines. B est aussi la seule vision où ce qui est déjà livré (import charte) est *le* produit et pas une fonctionnalité.

---

## Partie C — Vision, mission, positionnement (révisé après décisions Victor)

> Réponses Victor (10/08) : outil personnel d'abord (utile pour d'autres ensuite) · open source cœur + SaaS
> validé · promesse « ne publie plus jamais quelque chose qui ne te ressemble pas » validée · badge = feature
> (pas le produit) · premier utilisateur = Victor · **l'outil doit être un complément de l'agent (Hermes)** ·
> **la charte évolue avec les contenus déjà créés** · **bibliothèque de contenus (site, photos) servant de source à l'agent**.

### Vision (ce que le monde devient)

**Un monde où n'importe qui peut produire du contenu avec des agents IA sans jamais perdre son identité de marque — parce que la marque vit dans un endroit que l'agent et l'humain partagent.**

### Mission (ce qu'Atelier fait)

**Atelier est la mémoire de la marque et le complément de l'agent : il stocke l'identité (charte, ton) et les contenus (photos, pages, archives) une fois pour toutes, les met à disposition de l'agent pour produire conforme, et garde l'humain au centre de la validation.**

### Ce qui change par rapport à la vision B pure

1. Le badge conformité reste **une feature parmi d'autres** (pas LE produit).
2. Le produit = **système de mémoire + contexte** : la bibliothèque est aussi importante que la charte.
3. **La charte est vivante** : elle s'enrichit des contenus validés (détection de couleurs/polices récurrentes → suggestions d'extension).
4. **L'agent est un pair** : il lit (charte, ressources), il écrit (dépose ses productions, archive des pages du site), il reçoit (feedback de validation). Atelier est son espace de travail partagé avec l'humain.
5. « Outil personnel » = pas de multi-clients avant longtemps ; l'UX est celle d'un outil pour soi, efficace, pas d'un SaaS à onboarding lourd.

### Positionnement (Geoffrey Moore, révisé)

- **Pour** les créateurs qui produisent leur contenu avec des agents IA (Hermes, Claude Code, Codex)
- **qui ont besoin** d'un endroit qui garde leur identité (charte, ton) et leurs contenus (photos, pages, archives) pour que l'agent produise conforme et que l'humain valide sereinement
- **Atelier est** la mémoire de marque et l'atelier de validation qui complète l'agent
- **qui** stocke la DA et les contenus une fois, les injecte dans la production de l'agent, vérifie la conformité, et fait passer chaque contenu par une validation humaine avant publication
- **contrairement à** Buffer/Later/Metricool (programmation, pas de mémoire de marque) et aux templates IA (Canva AI, contenu jetable)
- **Atelier fournit** le seul endroit où l'identité, les contenus et les productions des agents cohabitent, se nourrissent et se valident — avec l'humain au centre.

---

## Partie D — PRD (découlant de la vision révisée)

### D1. Executive Summary

Atelier est la mémoire de marque et le complément de l'agent : on y importe sa charte (CSS d'agent, Claude Design, Figma) et ses contenus (photos, pages de site, archives) une fois pour toutes. L'agent les lit pour produire conforme, le rendu les applique, la validation humaine reste au centre, et rien ne part sans elle. La charte évolue en apprenant des contenus validés. Pour Victor d'abord, pour les créateurs agent-first ensuite.

### D2. Problème

**Qui** : Victor d'abord (outil personnel), puis les créateurs qui produisent avec des agents.

**Quoi** : l'identité et les contenus d'une marque sont dispersés (prompts, disque, site, chats). Chaque production d'agent repart de zéro : charte ré-expliquée, photos re-cherchées, contexte re-donné. Résultat : contenu générique, incohérent, et un humain qui ressaisit.

**Pourquoi douloureux** :
- Émotionnel : « ça ne me ressemble pas » → frustration, reprise manuelle.
- Temps : tout re-expliquer à chaque prompt, re-uploader les visuels, recadrer par réseau.
- Perte : les bons contenus validés ne nourrissent jamais les suivants (pas d'apprentissage).

### D3. Personas & JTBD (révisé)

**Persona 0 — Victor (le user d'abord)**
- Produit avec Hermes, publie pour Bordeluche, a une DA existante (tokens, brand voice).
- JTBD : « Quand mon agent produit du contenu pour moi, je veux qu'il ait accès à ma charte et à mes contenus une fois pour toutes, et que je valide tout avant publication. »
- Pains actuels (vécus) : re-expliquer la DA à chaque session, retrouver les photos, vérifier que ça ressemble, décliner par réseau.
- Gains : une mémoire qui s'enrichit, un agent qui produit juste du premier coup, une validation rapide.

**Persona 1 — Le créateur agent-first** (secondaire, après validation par l'usage)
- Même JTBD, sans l'historique de Victor.

### D4. Contexte stratégique

- Outil personnel d'abord → **l'usage réel de Victor est le test** : si Atelier ne lui fait pas gagner de temps sur son propre contenu, il ne le fera pour personne.
- Open source cœur (parser, MCP, SDK) + SaaS (dashboard, historique, multi-chartes) — modèle validé.
- Marché : émergent mais la fenêtre se referme (les gros ajoutent de l'IA). L'angle « mémoire de marque + complément d'agent » n'est pris par personne.

### D5. Solution (parcours)

1. **Importer sa marque** : charte (CSS → tokens) + contenus (photos, pages, archives) → la bibliothèque.
2. **L'agent s'y connecte** : outils MCP (lire la charte, lire les ressources, déposer des fichiers, archiver des pages du site).
3. **L'agent produit** : il lit charte + ressources → dépose sa production (HTML source).
4. **Atelier rend + vérifie** : slides avec la charte, badge de conformité.
5. **L'humain révise et valide** : notes, statuts par réseau, versionnage, journal.
6. **La charte apprend** : les contenus validés enrichissent la charte (suggestions).
7. **La sortie** : calendrier, export, draft Postiz — jamais automatique.

### D6. Métriques

- **Primaire** : temps de la boucle « demande d'un contenu → validé » chez Victor (cible : < 15 min pour un post simple).
- **Secondaires** : % de productions conformes du premier coup ; nombre de contenus archivés dans la bibliothèque ; % de charte couverte par les contenus validés.
- **Garde-fou** : validation humaine jamais automatique.

### D7. User stories P0 (dans l'ordre, ~4 semaines)

1. **US-1 Déposer une source via l'UI** — coller/déposer le HTML d'un agent dans un brouillon → slides régénérées.
2. **US-2 Bibliothèque de contenus** — uploader photos/pages/PDF, les retrouver (recherche), l'agent peut les lire (MCP get_resource) et les déposer (MCP put_resource).
3. **US-3 Bloc « instructions marque » pour l'agent** — la charte devient un bloc structuré lisible par l'agent (MCP get_charte) : couleurs, polices, rayons, logos, ton, mots à éviter.
4. **US-4 Injection charte dans le rendu** — les slides rendues appliquent les tokens de la charte (fallback si manquant).
5. **US-5 Contrôle de conformité** — badge « ✓ conforme / ⚠ hors charte » + détail des écarts.
6. **US-6 Charte évolutive** — analyse des contenus validés → suggestions d'extension de charte (couleurs récurrentes, polices).
7. **US-7 Journal d'activité** — qui (agent) a produit quoi, quand ; filtre par agent/brouillon.
8. **US-8 Archivage de pages web** — l'agent (ou l'UI) archive une page du site du user dans la bibliothèque (texte + images), pour servir de source.

### D8. Hors périmètre

- Génération d'images (on rend, on ne génère pas)
- Programmation automatique de la publication
- Auth/multi-clients (tant que Victor est le user)
- IA conversationnelle

### D9. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Outil personnel → jamais utilisé par d'autres | Moyen | Open source + communauté agent ; la démo « Victor gagne du temps » est la preuve |
| La bibliothèque devient un fourre-tout | Moyen | Typologie claire (visuels / textes / pages / archives) + recherche |
| Charte évolutive = scope glissant | Moyen | V1 : suggestions simples (couleurs/polices récurrentes), pas de ML |
| Injection rendu dure (polices, fallbacks) | Moyen | V1 : couleurs + polices système avec fallback, webfonts plus tard |

### D10. Décisions actées

1. Outil personnel d'abord, produit ensuite (le test = l'usage de Victor).
2. Open source cœur + SaaS — validé.
3. Promesse « ne publie plus jamais quelque chose qui ne te ressemble pas » — validée.
4. Badge conformité = feature parmi d'autres.
5. Premier user = Victor.
6. **Complément d'agent** : l'agent lit/écrit dans Atelier (MCP), pas seulement l'inverse.
7. **Charte vivante** : nourrie par les contenus validés.
8. **Bibliothèque de contenus** : photos, pages de site, archives — source pour l'agent.

---

## Partie E — Grande liste de features (à prioriser)

> Format : **F-xxx** · nom · problème résolu · taille (S/M/L) · dépendances.
> Les tailles sont des ordres de grandeur solo-dev. Rien n'est ordonné ici — la priorisation vient après.

### E1. Bibliothèque de contenus (le socle mémoire — NOUVEAU pilier)

| ID | Feature | Problème résolu | Taille | Dépend de |
|---|---|---|---|---|
| F-01 | **Upload de fichiers** (photos, PDF, documents, images) | « Mes visuels sont éparpillés sur mon disque » — tout au même endroit | S | Blob déjà en place |
| F-02 | **Typologie des contenus** (visuel / texte / page web / archive) | « Je retrouve ce que je cherche » — filtres par type | S | F-01 |
| F-03 | **Tags + recherche plein texte** | « Retrouver la photo de la terrasse » sans défilement | M | F-01, index texte |
| F-04 | **Prévisualisation** (vignettes, aperçu PDF, métadonnées) | « C'est quoi ce fichier déjà ? » — confiance avant usage | S | F-01 |
| F-05 | **MCP list_resources / get_resource** | L'agent lit les contenus du user pour produire juste | M | F-01 |
| F-06 | **MCP put_resource** (upload depuis l'ordi de l'agent) | « Mon agent peut déposer des fichiers pour moi » | M | F-01, MCP |
| F-07 | **Archivage de pages web** (URL → texte + images + métadonnées) | « Le contenu de mon site doit servir de source à l'agent » — sans copier-coller | L | F-01, fetch serveur |
| F-08 | **Collection « inspirations »** (moodboards, références) | « Ces visuels que j'aime doivent guider la charte » | M | F-01 |
| F-09 | **Sélection dans un brouillon** (piocher une photo de la bibliothèque dans une slide) | « Je remplace cette image par la vraie photo du logement » | M | F-01, rendu |

### E2. Charte graphique (import livré → charte vivante)

| ID | Feature | Problème résolu | Taille | Dépend de |
|---|---|---|---|---|
| F-10 | **Import CSS → tokens** (couleurs, polices, rayons, logos) | ✅ LIVRÉ (PR #16) | — | — |
| F-11 | **Éditeur de charte** (nom, couleurs, polices, logos) | ✅ LIVRÉ | — | — |
| F-12 | **Bloc « instructions marque » pour l'agent** (MCP get_charte) : couleurs, polices, ton, mots à éviter, exemples | « L'agent produit conforme du premier coup » — le contexte n'est plus ré-expliqué | M | F-10/11 |
| F-13 | **Ton & brand voice dans la charte** (texte libre + mots à éviter + exemples bons/mauvais) | La charte couvre le fond, pas que la forme | S | F-11 |
| F-14 | **Charte vivante : suggestions d'extension** depuis les contenus validés (couleurs récurrentes, polices détectées) | « Ma charte apprend de ce que je valide » | M | F-01, contrôle conformité |
| F-15 | **Versionnage de la charte** (historique, restaurer) | « J'ai cassé ma charte, je reviens en arrière » | M | F-11 |
| F-16 | **Multi-chartes** (une par projet/client) | Pour plus tard (CM), PAS maintenant | L | auth |
| F-17 | **Export de la charte** (JSON tokens, CSS régénéré) | « Je repars avec ma charte dans un autre outil » | S | F-11 |

### E3. Complément agent (le MCP grandit — pilier « l'agent est un pair »)

| ID | Feature | Problème résolu | Taille | Dépend de |
|---|---|---|---|---|
| F-18 | **MCP create_brouillon** (déjà via API) | L'agent ouvre un brouillon lui-même | S | existant |
| F-19 | **MCP set_source** (HTML source) | ✅ LIVRÉ | — | — |
| F-20 | **MCP get_charte** (instructions marque) | « L'agent connaît ma charte sans que je lui explique » | M | F-12 |
| F-21 | **MCP set_statut / add_note** | L'agent met à jour le statut et les notes qu'il propose | S | existant |
| F-22 | **MCP archive_url** (l'agent archive une page du site du user) | « L'agent remplit ma bibliothèque tout seul » | M | F-07 |
| F-23 | **Feedback de validation à l'agent** (ce qui a été validé/rejeté + pourquoi) | « L'agent apprend de mes décisions » — boucle qui se referme | M | journal, charte vivante |
| F-24 | **SDK Atelier** (paquet npm pour agents) | « Un agent se branche en 5 min » — facilité d'adoption | L | MCP, API |
| F-25 | **Webhooks / événements** (brouillon créé, validé, modifié) | « Mon agent réagit à ce qui se passe dans Atelier » | M | API |

### E4. Réceptacle & production (le brouillon)

| ID | Feature | Problème résolu | Taille | Dépend de |
|---|---|---|---|---|
| F-26 | **Déposer une source via l'UI** (coller le HTML / uploader un fichier) | « Je n'ai pas besoin du MCP pour déposer » | S | sourceHtml existant |
| F-27 | **Rendu multi-ratio** (IG carré, story 9:16, LinkedIn paysage, X) | « Un contenu, tous les formats » | M | render existant |
| F-28 | **Régénération des slides depuis la source** | « J'édite la source, les visuels suivent » | S | F-26 |
| F-29 | **Injection charte dans le rendu** (tokens → slides) | « Le rendu ressemble à ma marque, pas à un template générique » | M | F-10/11, render |
| F-30 | **Templates de mise en page** (basés sur la charte) | « Je choisis une composition, pas un thème jetable » | M | F-29 |
| F-31 | **Édition légère des textes sur les slides** (titre, sous-titre inline) | « Je corrige sans rouvrir le HTML » | M | render |
| F-32 | **Brouillons liés à une charte** (le brouillon sait quelle charte l'a produit) | « Je sais quelle identité ce contenu doit respecter » | S | F-10 |

### E5. Conformité (feature, pas produit)

| ID | Feature | Problème résolu | Taille | Dépend de |
|---|---|---|---|---|
| F-33 | **Badge « ✓ conforme / ⚠ hors charte »** sur chaque brouillon | « Je sais d'un coup d'œil si c'est publiable » | M | F-29, F-32 |
| F-34 | **Détail des écarts** (couleur inconnue, police hors charte, logo absent) | « Je sais quoi corriger, pas juste que c'est faux » | M | F-33 |
| F-35 | **Re-contrôle à chaque modification** | « Le badge est toujours à jour » | S | F-33 |

### E6. Révision & validation (l'humain au centre)

| ID | Feature | Problème résolu | Taille | Dépend de |
|---|---|---|---|---|
| F-36 | **Notes par slide et par réseau** (existant, à compléter) | « Mes remarques suivent le contenu » | S | existant |
| F-37 | **Statuts par réseau** (existant) | ✅ LIVRÉ | — | — |
| F-38 | **Versionnage des brouillons** (historique sourceHtml, diff, restaurer) | « Je compare la v2 à la v1 sans peur » | M | sourceHtml |
| F-39 | **Journal d'activité par brouillon** (agent, action, timestamp) | « Qui a fait quoi, quand ? » | M | API logs |
| F-40 | **Checklist de validation** (charte ✓, textes ✓, liens ✓, formats ✓) | « Je n'oublie plus rien avant de publier » | S | F-33 |

### E7. Sortie & publication (le raccord)

| ID | Feature | Problème résolu | Taille | Dépend de |
|---|---|---|---|---|
| F-41 | **Calendrier : brouillons par jour + réseau** | « Je vois ma semaine d'un coup d'œil » | M | statuts |
| F-42 | **Glisser-déposer un brouillon validé sur une date** | « Je planifie sans ouvrir chaque brouillon » | M | F-41 |
| F-43 | **Rappel de publication** (notification le jour J) | « Je n'oublie pas de publier » | S | F-41, notifications |
| F-44 | **Export** (PNG, PDF, HTML source, package complet) | « Je récupère mes contenus proprement » | S | render |
| F-45 | **Postiz : draft automatique** (issue #5) | « Le validé part en draft, je publie à la main » | M | Postiz, statut validé |

### E8. Expérience & confiance

| ID | Feature | Problème résolu | Taille | Dépend de |
|---|---|---|---|---|
| F-46 | **Onboarding « importer ta marque »** (3 étapes : charte, contenus, premier brouillon) | « Je comprends le produit en 2 min » | S | F-10, F-01, F-26 |
| F-47 | **Recherche globale ⌘K** (brouillons, contenus, chartes) | « Je retrouve tout sans naviguer » | M | F-03 |
| F-48 | **Empty states guidés partout** | « Je sais quoi faire quand c'est vide » | S | — |
| F-49 | **Activité IA globale** (page : tout ce que les agents ont fait) | « J'audite la production de mes agents » | M | F-39 |
| F-50 | **Mode démo / exemples** (contenu de démonstration) | « Je comprends le produit avant de mettre mes données » | S | — |

### E9. Fondations (plus tard, bloquantes pour le produit, pas pour l'usage perso)

| ID | Feature | Problème résolu | Taille | Dépend de |
|---|---|---|---|---|
| F-51 | **Auth (email + magic link)** | « Mes données sont à moi » — prérequis produit | L | — |
| F-52 | **Espace de stockage par user** (quota Blob) | « Chaque user a sa bibliothèque » | M | F-51, F-01 |
| F-53 | **Notifications** (email/Slack : brouillon déposé, rappel, validé) | « Je suis au courant sans surveiller » | M | F-51 |
| F-54 | **Multi-chartes par projet** | CM multi-clients | L | F-51, F-16 |
| F-55 | **Rôles** (éditeur / validateur) | Petites équipes | L | F-51 |

---

## Partie F — Lecture de la liste (ce qui ressort)

1. **La bibliothèque (E1) est un vrai pilier** : 9 features, dont 2 MCP (l'agent lit et remplit). C'est la « mémoire » que rien d'autre n'offre.
2. **Le MCP devient le produit visible pour les agents** : 8 features (E3). L'agent qui connaît la charte + les contenus + le feedback = la boucle complète.
3. **La charte vivante (F-14) + le feedback (F-23) forment le moteur d'apprentissage** : ce que tu valides nourrit la charte qui guide l'agent. C'est LE mécanisme différenciant.
4. **Beaucoup de S rapides** (F-26, F-28, F-35, F-40, F-44, F-46, F-48, F-50) qui rendent le produit utilisable tout de suite.
5. **Le calendrier (E7) reste un raccord** : utile, mais pas ce qui fait la différence.
