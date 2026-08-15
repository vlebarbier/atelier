# ROADMAP MVP — Atelier

> Établie le 14/08/2026 après audit complet du code (apps/api + apps/web) et du prototype (27 pages maquettes/).
> Principe : **le produit réel est déjà bien avancé** — la priorité est de combler l'écart
> prototype → code, pas de repartir de zéro.

---

## 1. Où on en est réellement (état vérifié dans le code)

### ✅ Déjà implémenté (en prod ou prêt)
| Domaine | Ce qui existe |
|---|---|
| **API** | 27 routes : brouillons CRUD + dupliquer, charte (+import), ressources, journal d'activité, versions + restauration, slides, ordre, messages, intégrations/statut, publier Postiz, publier CMS |
| **Web** | Toutes les pages React : brouillons (grille/détail/chat), documents, blog (ArticleEditor), calendrier, bibliothèque, charte (BrandPage), activité IA, intégrations, paramètres, aide, ⌘K |
| **Stockage** | SQLite (repo) + PostgreSQL (repo-pg) + Blob (slides, fichiers) |
| **Intégrations** | Postiz (postiz.ts) + Sanity CMS (sanity.ts) branchés |
| **Qualité** | 46 tests verts (39 API + 7 tokens), build OK, lint OK |
| **Déploiement** | Vercel : atelier-web + atelier-api |

### ❌ L'écart prototype → code (ce qui manque pour le MVP)
1. **Post publié** : la page métriques (portée, engagement) n'existe pas en code
2. **Références blog + onboarding** : fichiers md, questionnaire, scan GSC — rien en code
3. **Scans de la bibliothèque** (1×/jour + manuel) — rien en code
4. **Notifications** (dropdown) — la cloche n'est qu'un badge
5. **Panneaux rétractables** (fold cumulatifs) — le DraftDetail a les modes mais pas le fold en barres
6. **Annotations ①② dans le contenu** (mode Réviser) — le diff existe, pas les marqueurs in-situ
7. **Modèles de documents** (documents-references) — rien en code
8. **Agents IA réels** : l'API lit des brouillons depuis un dossier seed (le prototype écrit les fichiers) — **la boucle de génération agent → brouillon n'est pas une vraie intégration MCP**

---

## 2. La roadmap MVP — 3 phases

### Phase 1 — « Faire tourner la boucle » (le cœur, ~1-2 semaines)
**Objectif : un utilisateur (Victor) crée → révise → valide → publie un contenu de bout en bout, réellement.**

| # | Brique | Pourquoi c'est le socle |
|---|---|---|
| 1.1 | **Boucle agent réelle** : remplacer le seed par une vraie génération via agent (Hermes/Claude via MCP) → brouillon + slides + légendes | Sans ça, rien n'est « vivant » — c'est la promesse du produit |
| 1.2 | **Post publié + métriques** (portée, likes, lien) | La boucle se referme : publier → voir le résultat |
| 1.3 | **Rétraction en barres** dans DraftDetail (pattern prototype) | Confort de travail quotidien |
| 1.4 | **Annotations ①② + badge validé** dans Réviser | La confiance dans l'agent |
| 1.5 | **Notifications** : « publié sur Instagram » + « à valider » | Le fil de vie de l'outil |

**Critère de sortie** : Victor crée un carrousel, révise, valide, programme via Postiz, et voit le post publié avec ses métriques.

### Phase 2 — « La mémoire de la marque » (2-3 semaines)
**Objectif : l'utilisateur (débutant ou non) configure une fois, et l'agent produit dans son univers.**

| # | Brique | Pourquoi |
|---|---|---|
| 2.1 | **Onboarding références** (3 chemins : agent / scan site / import) | Sans charte, l'agent produit hors-sol — c'est la promesse « mémoire de la marque » |
| 2.2 | **Fichiers md versionnés** (règles, ton, DA) + affichage | Le cahier des charges vivant de l'agent |
| 2.3 | **Scan du blog existant** (slugs, sujets verrouillés, anti-cannibalisation) | Base de toute rédaction sérieuse |
| 2.4 | **Mots-clés GSC** (connecter l'intégration, positions/volumes) | L'agent vise juste, pas au hasard |
| 2.5 | **Scans bibliothèque** (1×/jour + manuel, badges nouveautés) | La collecte continue |
| 2.6 | **Modèles de documents** (devis, pitch, flyer) | Documents = 2e pilier du produit |

**Critère de sortie** : un nouvel utilisateur configure ses références en 5 min, et l'agent écrit un article dans son ton avec les bons mots-clés.

### Phase 3 — « Amélioration continue » (1-2 semaines)
**Objectif : les références vivent avec les résultats — la machine s'améliore toute seule.**

| # | Brique | Pourquoi |
|---|---|---|
| 3.1 | **Boucle de rétroaction** : mesurer (GSC + engagement) → proposer mise à jour des md → valider → v2 | Le différenciateur du produit |
| 3.2 | **Dashboard post publié enrichi** (comparaison vs moyenne, apprentissages agent) | Le « ce que l'agent en tire » |
| 3.3 | **Première opportunité suggérée** (écart GSC sans article) | L'agent propose, pas seulement exécute |

**Critère de sortie** : les références passent en v2 automatiquement après des résultats probants, et l'agent suggère la prochaine opportunité.

---

## 3. Ce qui n'est PAS dans le MVP (volontairement)

- Gamification (backlog, priorité basse)
- Multi-utilisateurs / rôles avancés (le produit est single-user d'abord)
- Éditeur visuel riche (on reste sur chat + HTML + aperçu)
- Analytics avancés multi-réseaux (métriques de base suffisent)

---

## 4. Risques & points à trancher

1. **La boucle agent (1.1)** est LE point dur technique : comment l'agent écrit-il dans l'API ? (MCP serveur Atelier ? dossier de travail ?) → à designer ensemble
2. **Postiz en local** (localhost:4007) vs déployé — la publication dépend de l'infra
3. **GSC** : accès OAuth déjà présent (memory), reste à brancher la lecture des requêtes
4. **Le prototype vs le code** : chaque brique de la roadmap doit d'abord être validée sur le prototype, puis implémentée — on ne code pas une feature non validée

---

## 5. Ordre de livraison recommandé (sprint 1)

**Sprint 1 (la première semaine)** : 1.1 boucle agent → 1.2 post publié → 1.5 notifications → 1.3 rétraction → 1.4 annotations.
**Sprint 2** : phase 2 complète (onboarding → références → GSC → scans → modèles).
**Sprint 3** : phase 3 (rétroaction → opportunités).

Chaque sprint se termine par : **tests verts + démo à Victor + validation sur le prototype d'abord.**
