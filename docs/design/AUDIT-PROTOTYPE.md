# AUDIT PROTOTYPE — améliorations page par page

> 13/08/2026 · Audit visuel des 9 écrans du prototype (design/prototype/), headless + vision.
> Objectif : lister les améliorations concrètes avant implémentation.
> Légende : 🔴 friction · 🟠 ergonomie · 🟢 amélioration · ⚠️ incohérence.

---

## 1. Publications (liste)

### 🔴 Frictions
- **Badges numériques ambigus** (`9`, `1`, `5` sur les visuels) : non explicites — préciser « 9 slides » ou « 1 image »
- **Pas d'actions au survol** : dupliquer / supprimer / changer statut sans ouvrir la fiche
- **Pas de sélection multiple** (bulk) : valider/supprimer plusieurs posts d'un coup
- **Tags réseaux sans logos officiels** : uniquement texte + couleur → lent à scanner

### ⚠️ Incohérences
- **« Validée » et « Publiée » = même vert** : confusion (un contenu validé n'est PAS publié). Validée = bleu/émeraude, Publiée = vert
- **Filtres mélangés** : statuts (Brouillon/À valider...) et formats (Carrousel/Post/Story) dans la même ligne → séparer en 2 segments

### 🟢 Améliorations
- **Tri** : « Trier par : création / publication / statut »
- **Vue liste/grille** (toggle) pour les gros volumes
- **Le bouton « Nouveau » près du titre** (pas perdu en haut à droite)
- **Contraste** : les textes secondaires (gris foncé sur noir) sont sous le seuil WCAG

---

## 2. Détail — Mode CRÉER (chat au centre)

### 🔴 Frictions
- **Chips réseaux cliquables mais le user réécrit en texte** : cliquer un chip devrait valider directement (sélection visuelle), pas forcer à réécrire
- **Pas de bouton Régénérer / Éditer message / Stop** sur les réponses de l'agent
- **Réglages opaques** : l'agent dit « format 4:5, ton pro » mais aucun contrôle UI pour les changer

### 🟢 Améliorations
- **Follow-up prompts suggérés** : sous la réponse de l'agent, des actions 1-clic (« Rendre le hook plus percutant », « Raccourcir la légende LinkedIn », « Changer la charte »)
- **Badges de confirmation interactifs** : cliquer « ✓ 9 slides générées » → scroll sur l'aperçu ; cliquer « ✓ Légende Instagram » → ouvre l'édition
- **Feedback de chargement** : pendant la génération, spinner/progression (pas des coches instantanées)
- **Rééquilibrage** : le chat est trop large, l'aperçu trop étroit (texte tronqué « 2 · Le pro... »)

### ⚠️ Incohérence
- **Stepper « Créer » vs statut « Brouillon »** : deux notions différentes affichées côte à côte — clarifier (l'étape ≠ le statut)

---

## 3. Détail — Mode RÉVISER

### 🔴 Frictions
- **Pas de navigation slides** (pas de flèches ‹ ›, pas de filmstrip) : impossible de passer de la slide 3 à la 4 sans revenir en arrière
- **Pas d'annotation sur l'image** : cliquer un endroit précis du visuel pour commenter (pourtant prévu A2+)

### ⚠️ Incohérences
- **Format « Carré 1080×1080 » annoncé mais slide portrait** : le visuel ne respecte pas le format déclaré → corriger le ratio
- **Stepper ambigu** : « Créer » et « Réviser » ont la même pastille jaune (on ne distingue pas « terminé » de « en cours »)

### 🟢 Améliorations
- **Stepper distinct** : étape terminée = ✓ vert ; active = jaune ; futures = gris
- **CTA adapté** : le bouton le plus visible est « Exporter » alors qu'en révision l'action attendue est « Passer à la validation »
- **Mode focus** : replier la nav supérieure pendant la révision pour maximiser le visuel

---

## 4. Détail — Mode VALIDER

### 🔴 Le manque central : la validation esthétique
- Le panneau ne vérifie que la **conformité technique** (charte, légendes, diff) — il ignore « est-ce beau ? »
- **Le syndrome « conforme mais laid »** : un post peut respecter la charte et être visuellement déséquilibré
- **À ajouter** : un pôle « Directrice artistique / QA visuelle » — « Équilibre visuel OK » (jugement humain) + feedback rapide (Impact : Bon / À retravailler)

### 🔴 Frictions
- **« Diff vérifié (1 zone) » non cliquable** : on ne peut pas surligner la zone modifiée
- **Bouton « Modifs » flou** : retouche ? annotation ? rejet ? → préciser « Demander des retouches »
- **« Approuver » actif sans avoir vu les 9 slides** : activer seulement quand tout est passé en revue

### ⚠️ Incohérences
- **Terminologie** : breadcrumb « Valider », stepper « Valider », statut « À valider », bouton « Approuver » → normaliser
- **« Exporter » actif en « À valider »** : on peut exporter un contenu non validé → désactiver ou remplacer par « Aperçu »
- **Checklist passive** : on ne sait pas si c'est automatique (IA) ou manuel → distinguer

---

## 5. Mode PROGRAMMER
- **Pilule réseau** : montrer le réseau (logo IG/LI) + heure + statut dans chaque événement
- **Créneau suggéré** : indiquer pourquoi (pic, audience) — déjà présent, bien
- **Lien calendrier** : le bouton « Programmer » ouvre le calendrier — déjà relié ✓

---

## 6. Calendrier

### 🔴 Frictions
- **Contrastes WCAG** : pilules illisibles (texte gris/bleu sur fond foncé), numéros de jours trop sombres
- **Drag & drop non suggéré** : l'instruction « glissez une publication » est en bas à droite, invisible ; aucune zone cible au survol
- **Événements pauvres** : pas d'heure, pas de réseau (logo), pas de statut

### ⚠️ Incohérences
- **Jours hors mois identiques** aux jours du mois courant (juillet ressemble à août)
- **Header lourd** : « Calendrier » en topbar + « Calendrier Août 2026 » en titre = double
- **Jaune = CTA ET catégorie** : le doré sert à « Nouveau » et à l'événement Carrousel

### 🟢 Améliorations
- Jours hors mois à 30-40% d'opacité
- Header compact sur une ligne : `Calendrier > Août 2026` | ‹ Aujourd'hui › | Mois/Semaine | recherche | + Nouveau
- Pilules enrichies : `[logo IG] 18:30 · Carrousel [puce statut]`
- Dropzone visible au survol (bordure pointillée)
- Liste « À programmer » : filtres par statut + poignée de glissement (6 points) + micro-copie en haut

---

## 7. Documents

### ⚠️ Incohérences
- **« Nouveau » en double** (topbar + header de grille) → n'en garder qu'un
- **Couleurs des vignettes ≠ couleurs des statuts** : interférence visuelle (vert « Validé » sur fond vert)
- **Aucun aperçu réel** : gros « PDF » générique sans valeur

### 🟢 Améliorations
- Miniature réelle (1ère page du PDF) — reconnaissance instantanée
- Couleur neutre pour la vignette, couleur réservée aux badges de statut
- Menu contextuel ⋮ (Télécharger / Éditer / Supprimer)
- Tri + vue grille/liste (comme Publications)

---

## 8. Bibliothèque

### 🔴 Frictions
- **Thumbnails non fonctionnels** : aplats de couleur avec le nom au centre — une image doit montrer son rendu
- **Dropzone sous la grille** : invisible si 50 assets → drag global sur toute la page (overlay au survol)
- **Carte LinkedIn = note technique brute** : « Poster via l'API = OK. Lire = limité... » — anxiogène. Remplacer par : « Accès partiel : seuls les derniers posts publics sont récupérables » + lien « En savoir plus »
- **« Autre source » noyée** : même style que les cartes connectées → style distinctif (bordure pointillée, + central)

### ⚠️ Incohérences
- **« Nouveau » ambigu** : importer un asset ? une source ? → « + Importer un asset » ou menu déroulant
- **Nom du fichier dupliqué** (dans la vignette ET en dessous)
- **Redondance « Bibliothèque »** (menu + topbar + titre)

### 🟢 Améliorations
- Vraies prévisualisations (JPG/PNG/SVG = rendu ; PDF = 1ère page ; ZIP/HTML = icône)
- Cartes de collecte normalisées : header (logo + nom + badge état Connecté/Non connecté/Limité) / body (1 métrique : « 48 posts analysés · Dernier scan il y a 2h ») / footer (CTA clair : Gérer / Connecter / Resynchroniser)
- Menu ⋮ sur les assets + tri (récent, nom, taille) + vue grille/liste

---

## 9. Charte

### 🟢 Améliorations (la page est la plus « vide »)
- **Couleurs** : clic → « Code HEX copié ! » ; préciser les rôles (Gold = primaire/CTA) ; grille équilibrée ; contraste HEX corrigé
- **Typographie** : pangramme de test, graisses (400/600/700), lien de téléchargement / code @import
- **Ton de voix** : étiqueter « Mots interdits » (pas juste des tags rouges ambigus) + comparatif À dire / À ne pas dire
- **« Nouveau » ambigu** → contextualiser (« + Ajouter une couleur », « + Ajouter une police »)

---

## Synthèse — les 10 chantiers transverses (dédupliqués, toutes pages)

| # | Amélioration | Impact | Pages |
|---|---|---|---|
| 1 | **Navigation slides (flèches + filmstrip)** | 🔴 Critique | Réviser, Valider |
| 2 | **Validation esthétique « est-ce beau »** | 🔴 Critique | Valider (carte A3+ déjà créée) |
| 3 | **Stepper distinct** (✓ vert / actif jaune / futur gris) | 🟠 | Tous modes |
| 4 | **Terminologie normalisée** (Valider/Approuver ; **Validée ≠ Publiée**) | ⚠️ | Toutes |
| 5 | **Chips cliquables = validation directe** | 🟠 | Créer |
| 6 | **Follow-up prompts suggérés** | 🟢 | Créer |
| 7 | **Tri + séparation filtres statut/format + vue grille/liste** | 🟢 | Publications, Documents, Bibliothèque |
| 8 | **Diff cliquable** (surligner la zone) | 🟢 | Valider |
| 9 | **Contrastes WCAG partout** (texte secondaire trop sombre) | ⚠️ | Toutes |
| 10 | **Bouton « Nouveau » contextualisé** (jamais ambigu) | 🟠 | Toutes les pages secondaires |
