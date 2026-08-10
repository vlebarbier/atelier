# STRATEGY.md — Atelier : session de stratégie produit (10/08/2026)

> Produit : **STRATEGY** (positionnement, problème, priorités, roadmap).
> Méthodologie : product-strategy-session + roadmap-planning + positioning-statement + ux-designer (skills PM/UX).
> Pas de décisions visuelles ici (voir DESIGN.md). Vérité produit.

---

## 1. Positionnement (Geoffrey Moore)

### Value Proposition

**Pour** les solopreneurs et community managers freelances qui produisent du contenu avec des agents IA (Hermes, Claude Code, Codex)

- **qui ont besoin** de transformer la production brute des agents en contenu validé, cohérent avec leur charte, prêt à publier — sans perdre le contrôle humain sur ce qui part en ligne
- **Atelier**
- **est un** atelier de révision et validation de contenu créé par des agents
- **qui** fait passer un contenu d'« agent a produit » à « humain a validé » en une seule boucle : réception, visualisation, adaptation, validation, publication — avec la charte graphique du client injectée dès la production

### Differentiation Statement

- **Contrairement à** Buffer / Later / Metricool (outils de programmation, pas de production) et aux templates de génération IA (Canva AI, générateurs de posts)
- **Atelier**
- **fournit** le seul workflow où des agents qui connaissent déjà la DA, le ton et le contexte du client déposent leur production dans un outil de révision pensé pour la valider — le HTML source est le document, les visuels sont des artefacts dérivés, rien ne se publie sans validation humaine.

### Stress-test

| Question | Verdict |
|---|---|
| Un client se reconnaît-il ? | Oui : « je fais du contenu avec des agents, je veux le valider proprement » |
| Le besoin est-il défendable ? | Oui — le gap « agent produit / humain valide » est réel chez tout solopreneur qui utilise Claude/Hermes |
| La catégorie aide-t-elle ? | Oui : « atelier de révision » est une étagère vide, distincte des schedulers |
| La différenciation est-elle durable ? | Le **HTML source + charte injectée** est difficile à copier en 6 mois (nécessite le pipeline agent + rendu + révision) |

---

## 2. Personas & JTBD

### Persona 1 : Le solopreneur « agent-first » (cible principale)

- Crée son contenu avec des agents IA depuis plusieurs mois
- Publie sur 2-3 réseaux, parfois plusieurs fois par semaine
- A déjà une charte (couleurs, typo, ton) mais doit la ré-expliquer à chaque prompt
- **JTBD** : « Quand je produis mon contenu avec un agent, je veux qu'il respecte ma charte et que je puisse tout vérifier avant publication, pour ne jamais poster quelque chose qui ne me ressemble pas. »
- **Pains** : refaire les prompts, vérifier slide par slide, recadrer manuellement par réseau, copier-coller des textes entre outils
- **Gains** : une seule boucle, zéro oubli de charte, publication en 1 clic (draft Postiz)

### Persona 2 : Le CM freelance multi-clients (cible secondaire)

- Gère 3-6 clients, chacun avec sa charte et ses réseaux
- Produit avec des agents pour tenir le volume
- **JTBD** : « Quand je produis pour un client, je veux que la charte du client soit appliquée automatiquement et que la validation soit traçable, pour ne jamais mélanger les identités. »
- **Pains** : mélange des chartes, pas de traçabilité, temps de reprise manuelle
- **Gains** : chartes par projet, historique de validation, gain de temps ×3

### Persona 3 : La petite agence (exploration)

- Équipe légère (2-5), workflow de validation interne
- Besoin : rôles, notifications, historique
- **Ne pas adresser avant H3** (voir roadmap)

---

## 3. Problème (Problem Statement)

**Pour** les créateurs de contenu assistés par IA,
**le problème est** que la production IA génère du volume sans cohérence ni garde-fou :
la charte graphique est ré-expliquée à chaque prompt, la validation est un patchwork d'outils (Figma, drive, chat), et chaque réseau exige un format différent — donc le goulot d'étranglement est passé de la *production* (l'IA est rapide) à la *révision* (l'humain est lent).

**Le produit réussit quand** : un contenu produit par un agent est visible, adaptable, validé et prêt à publier en moins de 10 minutes, charte respectée, sans sortir de l'outil.

**Nous ne travaillerons pas sur** : la génération d'images (on rend, on ne génère pas), la programmation des posts (Postiz le fait), l'IA conversationnelle.

---

## 4. Priorités : RICE

Hypothèses de notation (solo dev, scale 1-10 pour Reach=nombre de cas d'usage touchés par mois, Impact 0.25-3, Confiance %).

| # | Épic | Reach | Impact | Conf | Effort (jours) | RICE | Rationale |
|---|---|---|---|---|---|---|---|
| 1 | **Nouveau brouillon depuis l'UI** (vide + déposer source HTML) | 8 | 2.0 | 0.8 | 1.5 | 8.5 | Rend le produit utilisable SANS MCP : le réceptacle devient tangible |
| 2 | **Empty states + onboarding** (premier lancement guidé) | 8 | 2.0 | 0.7 | 1 | 11.2 | « Time to first value » : comprendre le produit en 60s |
| 3 | **Charte graphique (issue #3)** : upload DA + injection rendu/prompts | 7 | 3.0 | 0.7 | 10 | 1.5 | LE différenciateur ; gros effort mais défendable |
| 4 | **Adaptation réseau (issue #4)** : ratios + recadrage auto par réseau | 7 | 2.5 | 0.6 | 6 | 1.75 | Différenciateur n°2, dépend de la charte |
| 5 | **Postiz (issue #5)** : publication en draft | 6 | 2.0 | 0.8 | 3 | 3.2 | Ferme la boucle bout-en-bout |
| 6 | **Auth + multi-utilisateur** | 3 | 2.5 | 0.6 | 15 | 0.3 | Commercialisation ; PAS maintenant (solo) |
| 7 | **Activité IA** (journal des actions agents) | 5 | 1.5 | 0.6 | 3 | 1.5 | Confiance et traçabilité |
| 8 | **Historique de versions** | 4 | 2.0 | 0.7 | 4 | 1.4 | Révision sereine |

**Lecture honnête** : les RICE les plus élevés sont les quick wins UX (empty states, création UI). Le différenciateur stratégique (charte) a un RICE faible car l'effort est lourd — c'est normal : c'est un pari stratégique, pas un quick win. Le séquençage doit faire les deux : **vite les quick wins (semaines 1-2), puis le pari (semaines 3-6)**.

---

## 5. Roadmap (Now / Next / Later)

### NOW — Semaines 1-2 (activable, ~3 jours de dev)

- **Empty states + onboarding guidé** : premier lancement → 3 étapes illustrées (1. Un agent dépose son contenu, 2. Vous révisez, 3. Vous validez et publiez) + CTA « Créer un brouillon » + bouton « Déposer une source HTML »
- **Créer un brouillon depuis l'UI** : bouton Nouveau → brouillon vide → zone de dépôt source HTML (coller/upload) → slides regénérées
- **État de chargement** (skeleton) sur la grille au lieu d'un écran vide

### NEXT — Semaines 3-6 (le pari stratégique)

- **Charte graphique (issue #3)** : upload (couleurs, polices, logos) → stockage → injection dans le pipeline de rendu ET dans les prompts agents (via MCP) → badge « conforme charte » par brouillon
- **Adaptation réseau (issue #4)** : déclinaison auto par réseau (ratios IG/LinkedIn/X/Story), recadrage intelligent, prévisualisation côte à côte

### LATER — Trimestre 2 (dépend de l'adoption)

- **Postiz (issue #5)** : le brouillon validé part en draft Postiz, publication manuelle (workflow inaliénable)
- **Activité IA** : journal horodaté des actions des agents (qui a produit quoi, quand)
- **Historique de versions** : comparer/restaurer une version
- **Auth + multi-clients** (déclenché par la demande CM freelance)

### Hors roadmap (expliqué)

- Génération d'images (on rend, on ne génère pas — FAL/agents le font)
- Programmation automatique des posts (Postiz le fait, on s'y branche)
- IA conversationnelle dans l'outil

---

## 6. Risques & paris

| Risque | Impact | Mitigation |
|---|---|---|
| « Encore un outil de plus » (perception) | Élevé | Positionnement « atelier », pas « scheduler » ; la démo doit montrer la boucle agent→validation en 60s |
| L'effort charte (10j) ne paie pas | Moyen | Livrer d'abord l'injection dans le rendu (visible immédiatement), l'injection prompts agents ensuite |
| Dépendance au MCP pour la démo | Moyen | Empty states + création UI rendent le produit utilisable sans agent |
| Solo dev = capacité | Élevé | Roadmap NOW = 3 jours. Tout est dimensionné solo-first |

---

## 7. Métriques de succès (définies à froid)

- **Activation** : ≥ 60 % des premiers visiteurs créent ou reçoivent un brouillon en ≤ 5 min
- **Boucle complète** : ≥ 1 contenu passe brouillon → publié par semaine chez un utilisateur actif
- **Charte respectée** : 100 % des brouillons produits après setup charte portent le badge « conforme »
- **Qualité perçue** : pas de retour « ça ne ressemble pas à ma charte » après setup

---

## 8. Problèmes à résoudre + features prioritaires, page par page

> Méthode : pour chaque page, on nomme le problème utilisateur concret (pas le feature),
> puis les features classées P0 (débloque le cœur), P1 (renforce), P2 (polish/scale).
> Révisé le 10/08/2026 après livraison de l'import de charte (issue #3).

### Page Brouillons (grille + détail) — LE cœur du produit

**Problèmes utilisateur**
1. Je ne sais pas d'où vient ce brouillon, qui l'a produit, quand. (traçabilité)
2. Je dois valider un contenu vite, mais la révision slide par slide + par réseau est dispersée.
3. Un agent m'envoie son HTML : je ne sais pas où le déposer, ni si le rendu sera fidèle.
4. Je veux savoir si ce brouillon respecte ma charte avant de le valider.
5. Je publie sur plusieurs réseaux : je perds du temps à décliner/adapter chaque format.

**Features**
- P0 — **Déposer la source** : bouton « Déposer le HTML » (coller/fichier) dans la vue détail → met à jour sourceHtml → régénère les slides. (Aujourd'hui seul le MCP set_source le fait ; l'UI rend le réceptacle utilisable sans agent.)
- P0 — **Badge charte** sur chaque carte : « ✓ conforme » ou « ⚠ hors charte » selon les couleurs/polices détectées vs charte active. (La charte est stockée ; il manque le contrôle automatisé sur les slides/source.)
- P1 — **Journal d'activité par brouillon** : qui (agent ? nom), quand, quelle action (déposé, modifié, validé). Alimenté par l'API, lu dans le détail.
- P1 — **Filtre par agent** dans la grille (à côté des filtres de statut) : « tous / Hermes / Claude / manuel ».
- P1 — **Comparaison de versions** : voir la diff entre deux versions de sourceHtml, restaurer.
- P2 — Recherche plein texte dans les brouillons (titre, notes, source).

### Page Calendrier — la sortie (publication)

**Problèmes**
1. Je ne sais pas quand chaque contenu part, ni sur quel réseau.
2. Je veux planifier ma semaine d'un coup d'œil sans ouvrir chaque brouillon.
3. La publication est manuelle (workflow inaliénable) : il me faut un rappel fiable.

**Features**
- P0 — **Carte brouillon par jour + réseau** : chaque jour affiche les brouillons validés programmés (titre, réseau, statut).
- P1 — **Glisser-déposer** d'un brouillon validé sur une date → planifie.
- P1 — **Rappel de publication** : notification (email/Slack) quand un brouillon validé est programmé le jour J.
- P2 — Vue semaine/mois, zones de temps par réseau.

### Page Charte graphique — le différenciateur (livré : import + éditeur)

**Problèmes**
1. J'ai une DA (CSS d'agent, Claude Design, Figma) et je ne veux pas la ressaisir.
2. Je ne sais pas si les productions de mes agents respectent ma charte.
3. Ma charte évolue : je dois pouvoir la mettre à jour sans casser le pipeline.

**Features**
- ✅ P0 — **Importer un CSS** : collage → parsing (couleurs, polices, rayons, logos) → stockage. (LIVRÉ, PR #16.)
- ✅ P0 — **Éditer** : nom, couleurs (hex/picker), polices, logos. (LIVRÉ.)
- P1 — **Injection dans le rendu** : les slides générées utilisent les tokens de la charte (polices/couleurs) — la charte devient réellement la source du rendu.
- P1 — **Injection dans les prompts agents** : l'agent qui produit reçoit la charte dans ses instructions (via MCP) → production conforme d'emblée.
- P1 — **Détection de conformité** : badge « conforme / hors charte » sur les brouillons (alimente le badge P0 de la grille).
- P2 — Import depuis Figma (fichier .fig/.json de tokens), historique de versions de la charte.

### Page Activité IA — la confiance

**Problèmes**
1. Les agents travaillent sans que je voie ce qu'ils font.
2. Je ne peux pas auditer : qu'est-ce qui a été produit par qui, quand, et est-ce resté conforme ?

**Features**
- P0 — **Journal horodaté** : liste des actions (agent, brouillon, action, timestamp) — alimentée par l'API à chaque écriture.
- P1 — **Filtres** : par agent, par brouillon, par type d'action.
- P2 — Métriques : volume produit par agent/semaine, taux de validation.

### Hors périmètre (rappel, pour éviter le scope creep)

- Génération d'images (on rend, on ne génère pas)
- Programmation auto de la publication (Postiz s'y branche, workflow manuel conservé)
- IA conversationnelle dans l'outil
- Auth/multi-clients tant que le MVP n'a pas prouvé la boucle

---

## 9. Ordre d'implémentation recommandé (prochaines 2 semaines)

1. **Déposer la source via l'UI** (P0 grille) — ~2j, rend le réceptacle complet sans MCP.
2. **Journal d'activité + filtre agent** (P1) — ~2j, la confiance.
3. **Injection charte dans le rendu** (P1 charte) — ~3j, le différenciateur devient visible.
4. **Badge conformité** (P0 grille + P1 charte) — ~2j, boucle charte bouclée.
5. **Calendrier : carte + glisser-déposer** (P0) — ~2j, la sortie.

---

*Généré via skills PM (product-strategy-session, roadmap-planning, positioning-statement). À revoir après 2 semaines d'usage réel.*
