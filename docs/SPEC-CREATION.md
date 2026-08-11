# SPEC-CREATION.md : Porte d'entrée « Nouvelle création » avec templates (11/08/2026)

> Spec d'idéation pour la porte d'entrée de création. Décision Victor validée le 11/08
> (Phase 6g du skill atelier) : Atelier n'édite PAS le contenu, il rend visible et
> pilotable ce que l'agent fait. L'espace de création = l'entrée du workflow, pas un
> éditeur graphique type Canva (océan rouge, et ça tue le différenciateur).
> Direction design : REFONTE-DESIGN.md. Vision produit : VISION.md. Priorisation : PRIORISATION.md.

---

## 1. Contexte et vision

### 1.1 Le problème

Aujourd'hui le bouton « Nouveau » crée un brouillon vide : titre par défaut, zéro slide,
conversation vide. L'utilisateur doit sortir d'Atelier, ouvrir son agent, re-expliquer
son besoin, attendre la production, puis déposer le HTML à la main. La boucle est cassée
pour le persona **créatif** (celui qui veut produire depuis Atelier, de l'idée à la
validation) : seule la moitié du parcours (révision) est dans l'outil.

### 1.2 La décision (Phase 6g, validée)

1. **« Nouveau » devient « Nouvelle création »** : le user décrit son besoin en 1 phrase
   OU choisit un template (carrousel témoignage, post annonce, pitch deck...).
2. Atelier **crée un brouillon avec une conversation pré-remplie** → l'agent propose un
   premier jet → **les slides apparaissent via le polling existant** (8s) → le user itère
   dans le chat.
3. **Deux usages cohabitent** : le user *créatif* fait tout dans Atelier (idéation →
   création → validation → publication) ; le user *agent-first* arrive avec son brouillon
   fini. Le réceptacle reste ouvert aux deux.
4. **Idéation** : template « Idée vague » → l'agent propose 2-3 directions → le user clique
   celle qu'il préfère → l'agent développe.
5. **Templates** : presets de structure, peu coûteux, font le « harnais de bout en bout ».

**Principe technique fondateur : c'est le MÊME moteur que le chat existant** (conversation
+ stage + charte + bibliothèque). On ne construit AUCUN nouveau mécanisme d'édition : la
porte d'entrée ne fait que créer un brouillon dont la conversation est déjà amorcée, puis
le workflow standard prend le relais (agent → set_source → regenerer_slides → repondre_brouillon).

### 1.3 Hors périmètre (rappels)

- Pas d'éditeur graphique (toile, drag & drop de blocs) : Canva existe, ce n'est pas nous.
- Pas de génération d'images : on rend, on ne génère pas (VISION.md D8).
- Pas de templates de MISE EN PAGE (F-30, backlog) : ici les templates sont des
  **presets de structure et de prompt**, pas des layouts HTML pré-faits.
- Pas d'auth / multi-users (Victor est seul user).

---

## 2. Parcours utilisateur

### 2.1 Les deux entrées

```
┌─ Nouvelle création ─────────────────────────────┐
│                                                │
│  Décris ton besoin en une phrase               │
│  ┌──────────────────────────────────────────┐  │
│  │ Un carrousel témoignage pour la Maison   │  │
│  │ des Mûriers avec les retours de 2 guests │  │
│  └──────────────────────────────────────────┘  │
│  [ Créer ]                                     │
│                                                │
│  ── ou choisis un template ──                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Carrousel │ │ Post     │ │ Pitch    │       │
│  │ témoignage│ │ annonce  │ │ deck     │       │
│  └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Carrousel│ │ Story    │ │ Idée     │       │
│  │ produit  │ │ promo    │ │ vague    │       │
│  └──────────┘ └──────────┘ └──────────┘       │
└────────────────────────────────────────────────┘
```

- **Entrée A (phrase libre)** : un champ texte, une phrase. Le texte devient le titre du
  brouillon (tronqué à ~60 caractères) et le premier message user de la conversation,
  enveloppé dans le squelette de prompt générique (voir 4.2).
- **Entrée B (template)** : grille de cartes. Le clic crée le brouillon avec la
  conversation pré-remplie du template, sans passage par le champ texte (le template
  peut ouvrir un sous-champ « précise ton sujet » : voir 4.3).

### 2.2 Le flux complet (template ou phrase libre)

1. Le user clique « Nouvelle création » (header, page Contenus ou Documents).
2. La modale s'ouvre : champ phrase + grille de templates (section 3).
3. Le user envoie sa phrase OU clique un template.
4. `POST /api/brouillons` crée le brouillon avec `conversation` pré-remplie → le web ouvre
   la vue détail (existant : `openBrouillon`).
5. La vue détail s'ouvre sur l'onglet **Agent** (défaut existant pour les contenus) :
   la demande du user est visible dans le feed, marquée « en attente » tant que l'agent
   n'a pas répondu.
6. L'agent (Hermes / Claude Code / Codex connectés via le MCP) voit la demande :
   `lire_brouillon` → `get_charte` → `lister_ressources` si utile → produit le HTML →
   `set_source` → `regenerer_slides` → `repondre_brouillon` (message de synthèse).
7. **Les slides apparaissent toutes seules** via le polling 8s de la conversation
   (existant, DraftDetail). Le user itère dans le chat.

**Critère de succès produit** (VISION.md D6) : boucle « demande → premier jet visible »
en moins de 15 minutes pour un post simple, sans sortir d'Atelier.

---

## 3. Catalogue de templates v1

### 3.1 Les 6 templates du v1

| id | Nom | type brouillon | Pour qui | Cas d'usage type |
|----|-----|----------------|----------|------------------|
| `carrousel-temoignage` | Carrousel témoignage | carrousel | Conciergerie, commerces | Mettre en scène des avis clients en carrousel (1 avis par slide ou 1 guest par slide) |
| `post-annonce` | Post annonce | post | Tous | Annoncer un nouveau produit / service / logement / événement |
| `pitch-deck` | Pitch deck | pitch-deck (Document) | Freelances, startups | Un deck de présentation (page 1 = cover, puis problème, solution, preuves, CTA) |
| `carrousel-produit` | Carrousel produit | carrousel | E-commerce, LCD | Présenter un bien / produit : accroche, caractéristiques, photos, CTA |
| `story-promo` | Story promo | story | Tous | Une story d'offre / rappel, verticale, un message, un CTA |
| `idee-vague` | Idée vague | carrousel (défaut) | Tous | Le user a une intention floue : l'agent propose 2-3 directions à trancher |

Les templates `pitch-deck` et `plaquette` (documents) partagent la même mécanique ; seul
`pitch-deck` entre au v1 pour limiter la portée (la liste peut s'étendre sans code nouveau,
voir 3.3).

### 3.2 Structure d'un template (donnée)

```ts
interface TemplateCreation {
  id: string;                    // 'carrousel-temoignage'
  nom: string;                   // 'Carrousel témoignage'
  type: string;                  // 'carrousel' | 'post' | 'story' | 'pitch-deck' | ...
  emoji?: string;                // icône de carte (texte, pas de librairie)
  description: string;           // 1 ligne, affichée sous le nom
  titreDefaut: string;           // 'Carrousel témoignage' (titre du brouillon si non précisé)
  demandeChamp?: boolean;        // true si le template demande un champ « précise ton sujet »
  messageInitial: string;        // le premier message user (le prompt, cf. 4.2)
}
```

### 3.3 Stockage des templates

**v1 : constante TypeScript partagée** `TEMPLATES_CREATION` dans `apps/web/src/format.ts`
(à côté de TYPES_CONTENUS / TYPES_DOCUMENTS). Aucune table en base, aucun endpoint :
les templates sont du contenu produit, pas de la donnée runtime. L'agent ne voit que la
conversation pré-remplie (pas besoin de connaître l'id du template).

Évolution (hors v1) : si les templates deviennent éditables par le user ou partagés,
les déplacer vers une table `templates` + endpoint GET (F-30 templating, backlog).

---

## 4. La conversation pré-remplie (le cœur de la spec)

### 4.1 Format existant (inchangé)

La colonne `conversation` (JSON, `[{ role: 'user'|'agent', texte, at }]`, 200 derniers
messages) et l'endpoint `POST /api/brouillon/:id/message` existent déjà. La porte
d'entrée ne fait que **créer le brouillon avec une conversation non vide**.

### 4.2 Le squelette de prompt générique (entrée phrase libre)

Le message initial construit à partir de la phrase du user :

```
[Demande] <la phrase du user>

[Contexte] Je veux un contenu pour <ma marque>. Utilise la charte graphique
d'Atelier (couleurs, polices, ton, mots à éviter) et la bibliothèque si des
éléments sont pertinents.

[Attendu] Propose un premier jet : dépose la source HTML avec set_source,
régénère les slides avec regenerer_slides, puis résume tes choix en 5 lignes
max dans ta réponse.

[Règles] Respecte les contraintes du format (dimensions, nombre de slides).
Ne publie rien : je valide d'abord ici.
```

C'est un **message user unique** : l'agent le lit comme une demande ordinaire dans le chat.
Pas de champ caché, pas de métadonnée : tout passe par la conversation (le MCP
`lire_brouillon` renvoie déjà `conversation`).

### 4.3 Le message initial par template

Chaque template définit `messageInitial` : un prompt complet, prêt à être envoyé, qui
**inclut le squelette générique** et ajoute la structure attendue. Exemple
`carrousel-temoignage` :

```
[Demande] Crée un carrousel témoignage pour <marque>.

[Structure attendue]
- Slide 1 : accroche (« Ils ont testé, ils racontent » + nom de la marque)
- Slides 2 à N : un témoignage par slide (nom + prénom ou initiale, provenance,
  citation, note éventuelle)
- Dernière slide : CTA (réserver / découvrir / en savoir plus)

[Contenu] Si des témoignages existent dans la bibliothèque, utilise-les.
Sinon, propose des emplacements réalistes marqués [À REMPLACER].

[Contexte + Attendu + Règles : squelette générique]
```

Les templates avec `demandeChamp: true` (ex. `carrousel-temoignage`, `post-annonce`)
préfixent le message avec le champ du user : « Sujet : <champ> ». Les autres
(`idee-vague`) n'ont pas de champ.

### 4.4 Le cas particulier « Idée vague » (2-3 directions)

Le template `idee-vague` utilise un message initial dédié :

```
[Demande] J'ai une intention encore floue : <champ optionnel>.

[Attendu] Ne produis pas tout de suite. Propose 2-3 directions de contenu
différentes (format, angle, promesse), chacune en 2-3 lignes avec un titre.
Je choisirai, puis tu développeras la direction retenue en un premier jet complet.
```

Le user clique / répond « direction 2 » dans le chat → l'agent développe. **Zéro
mécanisme spécial** : c'est le chat qui fait la négociation, exactement comme la Phase 6g
l'a décidé (« le user clique celle qu'il préfère → l'agent développe »).

---

## 5. Changements API et MCP

### 5.1 API : POST /api/brouillons étendu

Actuel : `{ titre?: string; type?: string }`. Nouveau :

```ts
{ titre?: string; type?: string; conversation?: MessageChat[] }
```

- `conversation` : optionnel, `z.array(z.object({ role: z.enum(['user','agent']),
  texte: z.string(), at: z.string() }))`. Pré-rempli dans `insertBrouillon`
  (les deux implémentations repo : `repo-sqlite.ts` et `repo-pg.ts`).
- **Règle des 4 fichiers respectée** : rien de nouveau côté schéma (la colonne
  `conversation` existe depuis Phase 6f) → aucun changement sur
  `schema.ts` / `schema-pg.ts` / `legacy.ts` / `migrate-pg.ts`. Seuls
  `NewBrouillon.conversation?` (types repo) + `app.ts` (lecture du body) bougent.
- Le `at` des messages initiaux est généré serveur (`new Date().toISOString()`), jamais
  envoyé par le client (évite les timestamps clients incohérents).

### 5.2 MCP : aucun outil nouveau

Les 13 outils couvrent déjà le flux : `lire_brouillon` (lit la conversation), `get_charte`,
`lister_ressources` / `lire_ressource`, `set_source`, `regenerer_slides`,
`repondre_brouillon`. **La seule chose qui change côté MCP est documentaire** : la
description de `lire_brouillon` mentionne que la conversation peut contenir une demande
de création issue de la porte d'entrée (l'agent doit répondre avec un premier jet complet).
Voir section 6 pour le contrat agent exact.

### 5.3 Pas de nouveau endpoint

Pas de `GET /api/templates` au v1 (constante front, section 3.3). Pas de webhook : le
polling 8s existant fait le travail (l'agent n'a pas besoin de notifier, il écrit, le
feed se met à jour).

---

## 6. Contrat avec l'agent (ce que fait Hermes / Claude Code / Codex)

Lorsque l'agent lit un brouillon dont la conversation contient une demande de création :

1. `get_charte` → récupère la charte active (couleurs, polices, ton, mots à éviter).
2. `lister_ressources` → cherche de la matière pertinente (photos, témoignages, pages
   archivées) ; `lire_ressource` sur les éléments utiles.
3. Produit le document HTML source conforme à la charte et à la structure demandée.
4. `set_source` (dépose le HTML) → `regenerer_slides` (PNG dérivés).
5. `repondre_brouillon` : message de synthèse (ce qui a été fait, les choix, ce qui
   reste à valider / remplacer).

Cas « Idée vague » : l'agent répond d'abord avec les 2-3 directions (étape 5 uniquement,
sans production), attend le choix du user, puis exécute 1-5.

**Recommandation de délégation** : c'est le workflow exact du skill `atelier` Phase 6b
(F-20 get_charte avant de produire). Aucun nouveau skill nécessaire pour Hermes ;
un paragraphe dans le skill atelier (Phase 6g → Phase 7) documentera la porte d'entrée.

---

## 7. UI : la modale « Nouvelle création »

### 7.1 Ouverture et placement

- Bouton header « Nouveau » → **« Nouvelle création »** (page Contenus).
- Page Documents : le menu déroulant existant (« Nouveau document » avec choix du type)
  **reste tel quel** (les types de documents sont déjà un menu, y ajouter les templates
  serait redondant) ; la modale est pour les Contenus. (Décision à confirmer avec Victor :
  on peut aussi ouvrir la modale depuis Documents avec les templates documents seuls.)
- Raccourci ⌘K : entrée « Nouvelle création » dans la palette.

### 7.2 Composition (DA noire monochrome, REFONTE-DESIGN.md)

- Modale 520px max, fond `bg-level-3`, radius 12px, double-bezel (shell + hairline),
  ombre `--color-shadow-lg`.
- Titre : « Nouvelle création » (13px, poids 510).
- Champ phrase : input 8px radius, placeholder « Décris ton besoin en une phrase... »,
  bouton « Créer » (primary, disabled tant que le champ est vide).
- Séparateur hairline + label « OU CHOISIS UN TEMPLATE » (ink-tertiary, 11px, tracking).
- Grille de templates : cartes compactes (icône/emoji + nom + description 1 ligne),
  hover `bg-level-2` + hairline, clic = création immédiate.
- Le clic (phrase ou template) désactive le bouton/la carte pendant la requête
  (anti-double-clic, pattern existant).
- Fermeture : ESC, clic hors modale, X. Rien n'est perdu : le brouillon n'est créé
  qu'au submit.

### 7.3 La vue détail après création

- L'onglet Agent est actif par défaut (déjà le cas pour les contenus).
- Le feed montre le message user (la demande) ; tant que l'agent n'a pas répondu, le
  message est suivi d'un indicateur discret « En attente de l'agent » (texte ink-tertiary
  + point neutre ; PAS de spinner plein écran, PAS de nouvelle couleur).
- **Aucun changement au polling** : le mécanisme 8s existant fait apparaître les slides
  et la réponse. (Si le brouillon a 0 slide et une conversation non vide, le stage
  affiche l'empty state existant : « L'agent n'a pas encore déposé de slides ».)

---

## 8. Edge cases

| Cas | Comportement |
|-----|--------------|
| Agent non connecté (pas de MCP) | Le brouillon est créé avec la demande. L'empty state de l'onglet Agent (existant : « Ne fonctionne que si votre agent est connecté ») s'affiche. Rien ne casse. |
| L'agent ne répond jamais | La demande reste « En attente ». Le user peut relancer (message), modifier le titre, ou supprimer le brouillon (existant). |
| Phrase vide | Bouton « Créer » disabled. |
| Double clic sur « Créer » | Désactivation pendant la requête (pattern existant) → un seul brouillon. |
| Template document (pitch-deck) | Brouillon type `pitch-deck` → l'onglet par défaut devient `slides` (déjà géré Phase 6h), pas d'onglet Réseaux, pas de programmation. |
| Charte absente / incomplète | L'agent produit avec `get_charte` qui renvoie les tokens disponibles ; le squelette de prompt dit « style neutre si token manquant » (déjà la règle get_charte). |
| Témoignages sans vraie matière | Le template demande des emplacements `[À REMPLACER]` au lieu d'inventer des citations réelles (règle Bordeluche : jamais de faux chiffres). |
| Conversation > 200 messages | Le slice(-200) existant s'applique (inchangé). |

---

## 9. Découpage d'implémentation (ordre recommandé, ~2j solo)

| Étape | Contenu | Effort | Critère d'acceptation |
|-------|---------|--------|----------------------|
| 1 | Constante `TEMPLATES_CREATION` dans format.ts + `POST /api/brouillons` accepte `conversation` (types repo + app.ts + zod) | 0.5j | Test API : POST avec conversation → GET détail renvoie la conversation pré-remplie ; 11 tests existants verts |
| 2 | Modale « Nouvelle création » (phrase libre + grille templates) branchée sur le header Contenus + création + ouverture du détail | 0.5j | Capture Playwright : modale rendue (dark + light), création → détail onglet Agent avec demande visible, 0 erreur console |
| 3 | Template « Idée vague » : message initial dédié (2-3 directions) | 0.5j | Test réel avec Hermes connecté : l'agent répond avec 2-3 directions, puis développe la direction choisie |
| 4 | Affinage des prompts par template + indicateur « En attente de l'agent » | 0.5j | Test réel bout-en-bout : phrase libre → premier jet (slides + synthèse) < 15 min ; au moins 1 template document (pitch-deck) testé |

Chaque étape = PR + capture Playwright + `vision_analyze` (process en place). Rappels :
zéro em-dash partout (y compris dans les prompts de template), DA monochrome, tests +
lint verts, `npm run build -w apps/api` et `-w apps/web` avant merge.

---

## 10. Questions ouvertes pour Victor

1. **Documents** : la modale s'ouvre-t-elle aussi depuis la page Documents (avec les
   templates documents : pitch deck, plaquette) ou reste-t-elle réservée aux Contenus ?
   (Reco : oui, mêmes templates mais filtrés `TYPES_DOCUMENTS`.)
2. **Emoji des cartes** : OK pour des emoji simples (💬 🚀 📣 🛍️ ✨) ou zéro emoji,
   icônes Phosphor uniquement ? (DA : le monochrome tolère mal les emoji colorés.)
3. **Squelette de prompt** : le « [Contexte] » mentionne « ma marque » générique.
   Faut-il injecter le NOM réel de la charte (ex. « Bordeluche ») si elle existe ?
4. **« En attente de l'agent »** : suffisant comme feedback, ou faut-il un timestamp
   « envoyé il y a 2 min » (relTime existe déjà) ?
