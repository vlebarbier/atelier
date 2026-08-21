# REFONTE-DESIGN.md — Analyse des références + direction pour Atelier (10/08/2026)

> Objectif : Victor n'est pas convaincu de la mise en page actuelle. Ce document analyse
> les design systems de reference (Refero + Mobbin + Dribbble) et propose une direction
> de refonte. Aucun code tant que la direction n'est pas validee.

---

## 1. Diagnostic honnete de la mise en page actuelle

Audit visuel + comparison aux references :

| Defaut | Detail | Reference qui le resout |
|--------|--------|------------------------|
| **Layout "admin template"** | Sidebar + header + grille = structure generique de dashboard CMS. Rien ne dit "atelier de production". | Factory (war room), Linear (command center) |
| **La grille domine, pas le contenu** | Cartes 1:1 avec cover = pattern "galerie d'images", pas "outil de travail". Le brouillon (le document) est secondaire. | Vercel (le deploiement est le heros), Linear (l'issue est le heros) |
| **Bruit de pilules** | Statuts, filtres, badges, categories : beaucoup de petites pilules qui crient. | Linear : un seul accent fonctionnel, le reste est silencieux |
| **Densite insuffisante** | Un outil utilise tous les jours doit etre dense (13-14px, lignes serrees). | Linear (compact 8-12px), Raycast |
| **Header passif** | Breadcrumb + recherche + 3 boutons = beaucoup de place pour peu d'action. | Linear : header integre, actions contextuelles |
| **Couleurs statut partout** | Ambre/vert/rouge disperses dans les cartes = bruit chromatique. | Factory : la couleur est reservee aux etats live, jamais decorative |

**En une phrase** : Atelier ressemble a un dashboard de gestion de fichiers, pas a l'atelier
de production entre l'agent et l'humain. Le document (le brouillon) doit etre le heros,
pas la grille.

---

## 2. Les 5 SaaS de reference

### ⭐ 1. Factory (factory.ai) — LA reference numero 1
**Design system (Refero)** : "Terminal war room at midnight" — noir profond #101010, carte
blanche #eeeeee flottant sur fond noir (contraste figure/ground fort, PAS elevation douce),
Geist 400 avec tracking negatif, 2 accents fonctionnels (orange signal #ee6018, vert metrique
#a0ca92) reserves aux etats live, zero ombre, radius minimes, bordures 1px.

**Pourquoi elle est parfaite pour nous** :
- C'est un produit **concu pour des agents IA** (Factory = AI engineers) — exactement notre public
- Le "war room" : le travail est le heros, tout le reste est silencieux
- Le contraste figure/ground (carte claire sur noir) plutot que des ombres = premium et lisible
- 2 couleurs fonctionnelles seulement (statuts/pulses), zero decoration

**Ce qu'on en prend** : la philosophie du contraste figure/ground, la couleur reservee
aux statuts, l'esthetique "salle de controle".

### ⭐ 2. Linear (linear.app) — la precision
**Design system (Refero)** : "midnight precision instrument" — surfaces #08090a, type blanc
tres serre (tracking -0.022em), poids 400-510 (jamais bold), hairlines 0.5px, radius 6/12px,
compact 8-12px, un seul accent electrique (acid lime #e4f222) utilise avec parcimonie.

**Pourquoi** : le standard de la densite et de la precision. Chaque pixel est machine.
Le modele de l'outil quotidien rapide.

**Ce qu'on en prend** : la densite typographique, les hairlines, la discipline de l'accent
unique, les interactions clavier.

### 3. Raycast — l'outil personnel puissant
**Design** : commande rapide, palette omnipresente, esthetique sobre et fonctionnelle.
**Pourquoi** : Atelier est un outil personnel d'abord (decision Victor). Raycast montre
comment un outil peut etre puissant SANS etre un "dashboard" : tout part de la commande.
**Ce qu'on en prend** : ⌘K comme coeur (deja en place), la sensation "outil" pas "appli",
les listes denses avec actions inline.

### 4. Vercel Dashboard — le contenu comme heros
**Design** : fond sombre, le deploiement (l'objet central) est mis en scene, sidebar etroite,
contenu dense, chaque page est un "espace de travail" pas une "carte".
**Pourquoi** : chez Vercel, la liste de deploiements n'est pas une grille de cartes — c'est
une liste dense ou chaque ligne est un document. Exactement ce qu'Atelier devrait etre
pour les brouillons.
**Ce qu'on en prend** : la liste dense comme vue par defaut (pas la grille), le contenu
comme heros, les onglets de statut comme filtres silencieux.

### 5. Notion — la memoire et la structure
**Design** : sidebar + pages imbriquees, la "bibliotheque" universelle, modale de commande.
**Pourquoi** : notre bibliotheque de contenus (photos, pages, documents) est la memoire
de la marque — Notion est la reference de la memoire organisee. La sidebar 220px + contenu
est le modele de navigation parfait pour nos 5 pages.
**Ce qu'on en prend** : la sidebar etroite (deja la), la distinction structure/memoire,
le "tout est un document".

---

## 3. Direction de refonte recommandee

### Principe : "L'atelier, pas le dashboard"
Atelier est un **atelier de production** : l'agent depose, l'humain revele, le contenu sort.
Pas un CMS. La refonte doit faire ressentir ca.

### Changements concrets (par ordre d'impact)

1. **Le brouillon est le heros** (Factory/Vercel)
   - Vue detail = plein ecran, pas une colonne parmi d'autres
   - La slide (le document) domine : grand format, centree, lumineuse sur fond noir
   - Les notes/checklist/legendes deviennent un panneau lateral droit etroit (360px max)

2. **Liste dense par defaut, grille en option** (Vercel/Linear)
   - Vue "Brouillons" = liste dense (titre, statut silencieux, date, actions inline)
   - La grille actuelle devient un mode secondaire ("galerie")
   - Chaque ligne = un document, pas une carte

3. **La couleur devient fonctionnelle** (Factory)
   - Un seul accent par etat : ambre = a valider, vert = valide/publie
   - Plus de badges partout : le statut est un point ou un liseret, pas une pilule
   - Le reste reste monochrome total

4. **Densite** (Linear)
   - 13px de base, lignes serrees, hairlines 0.5-1px
   - Sidebar 200-220px, header 44-48px
   - Actions inline au survol (pas de boutons visibles en permanence)

5. **Header actif** (Linear)
   - Le breadcrumb disparait (la sidebar dit ou on est)
   - Header = actions contextuelles + ⌘K + recherche

### Ce qu'on GARDE (non negociable)
- DA noire monochrome (accent blanc dark / noir light) — decision Victor
- Statuts semantiques (ambre/vert/neutre)
- Source HTML = le document
- Workflow brouillon → validation → publication
- Geist, 13px dense, hairlines alpha, ⌘K, motion 150-250ms

### Ce qu'on PEUT explorer (si Victor valide)
- Un accent fonctionnel discret (comme Factory : orange signal OU vert metrique) pour les
  etats "live" uniquement — a discuter, la DA noire pure reste la base
- Typo display serif pour le titre du brouillon dans la vue detail (le document merite
  une typo de document) — option "editorial"

---

## 4. Plan d'action propose

| Etape | Contenu | Livrable |
|-------|---------|----------|
| 1. Direction | Valider la direction "atelier, pas dashboard" + les 5 principes | Ce document |
| 2. Mockup | Mockup HTML/CSS de la vue detail (brouillon heros + panneau droit) | Fichier statique a valider |
| 3. Refonte liste | Vue liste dense pour Brouillons + Bibliotheque | PR |
| 4. Refonte detail | Vue detail plein ecran | PR |
| 5. Polish | Densite, hairlines, actions inline, statuts discrets | PR |

Chaque etape est verifiee par capture + vision avant merge. Pas de changement de DA
sans validation Victor.

---

## 5. Validation Victor (10/08)

**Direction VALIDEE** (« ok et ok ») : l'atelier, pas le dashboard. Mockup produit
(`/mockup-refonte.html`) et audite par vision :

- **Ecran 1 (liste dense)** : plus "outil de travail" qu'une grille. Filtres silencieux
  (texte + point colore, pas de pilules) juges elegants. Points a corriger :
  etat selectionne visible dans la liste quand le detail est ouvert.
- **Ecran 2 (brouillon heros)** : la slide lumineuse sur fond noir est clairement
  mise en scene comme document heros (figure/ground, facon Factory). Le panneau droit
  est etroit, silencieux, bien organise. Micro-fixes : contraste des fleches de
  navigation, coherence des icones sidebar, placeholder dans le champ texte.

**Prochaine etape : refonte reelle** (etape 3 : liste dense pour Brouillons, puis
etape 4 : vue detail plein ecran).

---

## 6. Porte d'entrée creation : « Nouvelle création » avec templates (11/08/2026)

La spec complete vit dans `docs/SPEC-CREATION.md`. Resume de la direction (decision
Victor 11/08, Phase 6g) :

- **« Nouveau » devient « Nouvelle création »** : le user decrit son besoin en 1 phrase
  OU choisit un template (carrousel temoignage, post annonce, pitch deck...).
- Atelier cree un brouillon avec une **conversation pre-remplie** (le prompt) → l'agent
  propose un premier jet → les slides apparaissent via le polling 8s existant.
- **C'est le meme moteur que le chat** : aucune nouvelle mecanique d'edition, la porte
  d'entree ne fait que creer un brouillon dont la conversation est amorcee. L'agent
  enchaine get_charte → set_source → regenerer_slides → repondre_brouillon (13 outils MCP
  existants, aucun outil nouveau).
- Template « Idee vague » : l'agent propose 2-3 directions, le user clique, l'agent
  developpe. Zero mecanisme special, tout passe par la conversation.
- Templates v1 (constante front, pas de table) : carrousel-temoignage, post-annonce,
  pitch-deck, carrousel-produit, story-promo, idee-vague.
- Hors perimetre (reaffirme) : pas d'editeur graphique type Canva, pas de templates de
  mise en page (F-30), pas de generation d'images.

Implementation estimee ~2j solo, decoupee en 4 etapes dans la spec (API conversation →
modale → idee vague → affinage prompts + test bout en bout).
