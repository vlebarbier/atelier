# Recommandations DA & UX — Atelier (outil de production de contenu avec agents IA)

> Document de direction rédigé avant la refonte (09/08/2026). Références marché + principes actionnables.
> Objectif : une DA « moderne » qui inspire confiance chez des power-users (solopreneurs, CM freelances) et met le contenu au centre.

---

## 1. Ce que la 1re DA a raté (leçon)

La direction « atelier éditorial chaud » (crème/espresso/terracotta/Fraunces) évoquait **boutique artisanale**, pas outil SaaS. Problèmes :
- Palette chaude = chaleureux mais **pas « tech moderne »**
- Serif display partout = littéraire, pas productif
- Grain + ombres douces = « site vitrine », pas « outil sérieux »
- Terracotta = couleur de marque (Bordeluche-adjacent), pas couleur d'outil

**Conclusion** : un outil de production de contenu doit ressembler à un outil que des créateurs **et** des technophiles respectent. Référence : la génération Linear / Vercel / Raycast / Height, pas la génération « template créatif ».

---

## 2. Références marché — ce qui compte vraiment

### Observation Mobbin (09/08/2026, captures dans `docs/references/`)

Exploration des catégories **Social Media Dashboard** et **Schedule** :
- **Aucun exemple en dark mode** dans « Social Media Dashboard » — tout est blanc/gris, accents bleus/violets, cartes pastel. Le marché de la gestion de contenu social est **resté dans le « bright corporate » daté** (Buffer, Later, Metricool, Sprout Social).
- Les **modales de planification** (date/heure/fuseau) suivent un pattern propre mais classique : stack vertical, labels au-dessus, boutons bas-droite.
- Les seuls exemples **modernes/sombres** viennent d'outils tech (Front, Better Stack) — pas du social media.
- **Conclusion** : l'opportunité est béante — être le premier outil de contenu social avec la rigueur dark premium de Linear/Vercel. Les concurrents directs ne peuvent pas suivre facilement (leur identité de marque est claire/bright).

### Niveau 1 : les modèles absolus (outils de productivité premium)

| Outil | Ce qu'il fait de remarquable | À voler pour Atelier |
|---|---|---|
| **Linear** | Densité parfaite, dark mode somptueux, micro-interactions exquises, palette de commandes ⌘K, zéro chrome | L'état d'esprit « chaque pixel est fonctionnel » |
| **Raycast** | Rapide, minimal, dark-first, commandes puissantes | La sensation « l'outil va plus vite que moi » |
| **Height** | Très moderne, vivant mais propre, onboarding qui donne envie | Les statuts/états visuels forts, la fraîcheur |
| **Vercel** | Dark-first, typo Geist, gradients subtils, « developer-first premium » | La rigueur typographique, le dark mode de référence |
| **Zed** | Éditeur ultra-rapide, UI dense et élégante | La densité assumée sans surcharge |

### Niveau 2 : les concurrents directs (planification/validation de contenu)

| Outil | Leçon |
|---|---|
| **Buffer / Later / Metricool** | Leur UX est **datée** (bright, cartes pastel, icônes cartoon). Opportunité : être le « Linear de la planification sociale ». |
| **Planable / Kontentino** | Prouvent le besoin d'approval workflow, mais UI moyenne. |
| **Figma / Miro** | Le canvas collaboratif comme horizon (phase 3), pas le MVP. |

### Niveau 3 : le nouveau genre (outils « agent-first »)

Cursor, Windsurf, Claude Code, ChatGPT canvas, **v0** : ils ont installé le **dark-first + accent vif + activité de l'agent visible**. Atelier doit s'inscrire dans ce registre : **l'agent est un collaborateur visible, pas une boîte noire**.

---

## 3. Principes directeurs (recommandations fortes)

### 3.1 Dark-first, light impeccable
- Le **dark mode est la première impression** (Linear, Vercel, Cursor, Zed…). L'outil doit être somptueux en sombre.
- Le light mode doit exister et être impeccable (beaucoup de CM travaillent en journée), mais le dark est la vitrine.
- **Neutres profonds** (pas de noir pur : `#0E0E0F`-`#1A1A1C`, légèrement chauds ou froids selon l'accent) + **une seule surface élevée** par niveau.
- Contrastes : texte primaire ~15:1, secondaire ~7:1 minimum.

### 3.2 Un accent unique, « digital », vif
- L'accent doit être un **signal d'action**, pas une couleur de marque.
- Les candidats forts : **indigo/violet** (Linear, familier mais risqué de paraître cliché), **vert émeraude/lime** (fraîcheur, distinctif), **ambre/jaune électrique** (audacieux, chaud sans être terracotta), **cyan/bleu glacier** (tech).
- **Recommandation : ambre doré électrique (`#F5B841`-`#FFC53D`) ou vert lime (`#B8F23A`)** — distinctif, vivant, fonctionne sur fond sombre, jamais vu dans les outils de planification sociale.
- Règle : l'accent est réservé aux actions, sélections, focus et statuts « actifs ». Jamais en fond de section décoratif.

### 3.3 Typographie : une famille UI forte, pas de serif partout
- **Une seule famille sans-serif de caractère** pour toute l'UI : `Geist` (Vercel, moderne), `Space Grotesk` (personnalité), ou `Plus Jakarta Sans`.
- **Recommandation : Geist ou Space Grotesk** (gratuites, chargées localement).
- Le **serif (Fraunces ou autre) est réservé à la marque** (logo, éventuel titre d'accueil), jamais dans l'UI fonctionnelle.
- Corps 13-14px, titres 16-20px, jamais de titres énormes dans un dashboard (mode Operate).

### 3.4 Le contenu est la star, l'UI s'efface
- Les visuels (slides, images) en **pleine largeur, sur fond neutre**, avec des ombres portées douces qui les « posent ».
- Le chrome (bordures, badges, padding) doit **disparaître** quand on regarde un visuel.
- Pas de dégradés décoratifs, pas d'illustrations, pas de mascottes, pas de grain omniprésent.

### 3.5 Densité : moyenne-haute, jamais sparse
- Les CM comparent beaucoup de contenu : la **grille compacte** (miniatures + infos au survol) prime.
- Vue liste dense avec colonnes alignées (statut, réseau, date, actions).
- Macro-whitespace « landing page » interdit dans l'outil ; l'espace blanc est fonctionnel (séparation), pas décoratif.

### 3.6 Le workflow de validation est le cœur → états visuels forts
- 4 statuts avec **couleurs sémantiques claires** : brouillon (neutre), à valider (accent/jaune), validé (vert), publié (vert plein ou badge plein).
- Les changements de statut doivent être **visibles en un coup d'œil** (dot colorée + libellé).
- Animation de transition de statut (micro-interaction) = moment de satisfaction.

### 3.7 L'agent est visible (le différenciateur)
- Afficher ce que l'agent a produit : **badge « généré par Hermes · il y a 2 min »** sur les brouillons.
- Fil d'activité : « l'agent a régénéré la slide 3 · a adapté la légende pour LinkedIn · a créé le brouillon Postiz ».
- C'est ce que Cursor/Windsurf ont fait pour le code : rendre l'IA tangible. Personne ne le fait pour le contenu social → **avantage compétitif net**.

### 3.8 Micro-interactions : la marque du premium
- Transitions **150-300ms**, `cubic-bezier` personnalisé, uniquement `transform`/`opacity`.
- Hover sur cartes : élévation + accent discret, jamais de scale agressif.
- ⌘K / palette de commandes (recherche de brouillon, changement de statut rapide).
- Focus clavier visible (accent).

### 3.9 Anti-patterns absolus (ne jamais faire)
- ❌ Inter/Roboto/Arial par défaut (choisir une famille à caractère)
- ❌ Bordures `1px solid gray` → hairlines teintées
- ❌ Ombres dures `shadow-md` génériques → ombres diffuses multi-couches
- ❌ Dégradés décoratifs, glassmorphism gratuit, grain partout
- ❌ `linear`/`ease-in-out` sur les transitions
- ❌ Icônes épaisses par défaut → traits fins (Phosphor Light, Remix Line)
- ❌ Layout « landing page » dans l'outil (sparse, énorme whitespace)

---

## 4. Direction recommandée pour Atelier (synthèse)

> **« Linear du contenu social » — dark-first, dense, agent-visible.**

- **Fond** : noir profond légèrement chaud `#0F0F0E` / surfaces `#171716`-`#1E1E1C` (dark) ; gris chaud clair `#F7F6F3` / blanc `#FFFFFF` (light)
- **Encre** : `#F2F1ED` (dark) / `#171615` (light)
- **Accent** : ambre électrique `#F5B841` (ou vert lime `#B8F23A`) — à trancher
- **Typo** : `Geist` (UI) + éventuellement `Fraunces` réservé au logo « Atelier »
- **Layout** : sidebar fine (nav) + grille compacte (projets) + vue détail en split (visuel à gauche, légendes/statuts à droite)
- **Signatures** : badge agent sur les brouillons, fil d'activité, ⌘K, statuts colorés

---

## 5. Décisions à trancher avant la refonte

| Décision | Options | Recommandation |
|---|---|---|
| Accent | Ambre `#F5B841` · Lime `#B8F23A` · Indigo `#7C6CFF` | **Ambre** (chaud, vivant, distinctif, fonctionne en dark+light) |
| Typo UI | Geist · Space Grotesk · Plus Jakarta | **Geist** (moderne, premium, gratuite) |
| Dark-first | Oui · Non | **Oui** (vitrine), light impeccable en parallèle |
| Grain | Oui subtil · Non | **Non** (on le retire — ça datait la 1re DA) |
| Serif | Logo seulement · Nulle part | **Logo seulement** (Fraunces en marque) |
| Badge agent | Oui · Non | **Oui** (différenciateur n°1) |
| ⌘K palette | MVP · Plus tard | **MVP** (petit effort, gros impact power-user) |
