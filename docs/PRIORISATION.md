# PRIORISATION.md — Atelier : classement RICE + MVP bout en bout (10/08/2026)

> Suite directe de VISION.md (Partie E : 55 features). Méthode RICE, dimensionné
> **outil perso** (le test = l'usage de Victor) puis produit. Objectif MVP :
> **un workflow de bout en bout qui permet une publication.**

---

## 1. Classement RICE complet (51 features notées ; 4 déjà livrées)

### Tableau complet, du plus haut au plus bas

| Rang | ID | Feature | RICE | Effort | Pilier |
|---|---|---|---|---|---|
| 1 | F-18 | MCP create_brouillon | 25.6 | 0.5j | Agent |
| 2 | F-28 | Régénération slides depuis source | 25.6 | 0.5j | Réceptacle |
| 3 | F-32 | Brouillon lié à une charte | 25.6 | 0.5j | Réceptacle |
| 4 | F-01 | Upload fichiers (photos, PDF) | 20.2 | 1j | Bibliothèque |
| 5 | F-26 | Déposer source via UI | 20.2 | 1j | Réceptacle |
| 6 | F-02 | Typologie contenus | 19.2 | 0.5j | Bibliothèque |
| 7 | F-13 | Ton & brand voice dans la charte | 18.0 | 1j | Charte |
| 8 | F-21 | MCP set_statut / add_note | 16.8 | 0.5j | Agent |
| 9 | F-35 | Re-contrôle à chaque modification | 16.8 | 0.5j | Conformité |
| 10 | F-40 | Checklist de validation | 14.7 | 0.5j | Révision |
| 11 | F-17 | Export charte (JSON/CSS) | 14.4 | 0.5j | Charte |
| 12 | F-20 | MCP get_charte (agent connaît la charte) | 14.4 | 1.5j | Agent |
| 13 | F-48 | Empty states guidés | 14.4 | 0.5j | Expérience |
| 14 | F-36 | Notes par slide et réseau | 12.8 | 1j | Révision |
| 15 | F-44 | Export (PNG/PDF/HTML) | 12.8 | 1j | Sortie |
| 16 | F-05 | MCP list/get_resource (agent lit) | 12.0 | 1.5j | Bibliothèque |
| 17 | F-12 | Bloc instructions marque (get_charte) | 10.8 | 2j | Charte |
| 18 | F-04 | Prévisualisation | 9.6 | 1j | Bibliothèque |
| 19 | F-46 | Onboarding « importer ta marque » | 8.4 | 1j | Expérience |
| 20 | F-33 | Badge conforme / hors charte | 7.0 | 2j | Conformité |
| 21 | F-06 | MCP put_resource (agent dépose) | 6.5 | 1.5j | Bibliothèque |
| 22 | F-34 | Détail des écarts | 6.5 | 1.5j | Conformité |
| 23 | F-03 | Tags + recherche plein texte | 5.6 | 2j | Bibliothèque |
| 24 | F-09 | Sélection bibliothèque dans brouillon | 5.6 | 2.5j | Bibliothèque |
| 25 | F-29 | Injection charte dans le rendu | 5.4 | 3j | Réceptacle |
| 26 | F-43 | Rappel de publication | 5.4 | 1j | Sortie |
| 27 | F-39 | Journal d'activité par brouillon | 4.9 | 2j | Révision |
| 28 | F-31 | Édition légère textes sur slides | 4.2 | 2j | Réceptacle |
| 29 | F-45 | **Postiz draft automatique** | 4.2 | 4j | Sortie |
| 30 | F-27 | Rendu multi-ratio | 4.0 | 3j | Réceptacle |
| 31 | F-49 | Activité IA globale | 3.6 | 2j | Expérience |
| 32 | F-23 | Feedback de validation à l'agent | 3.3 | 3j | Agent |
| 33 | F-47 | Recherche globale ⌘K | 3.1 | 2j | Expérience |
| 34 | F-14 | Charte vivante (suggestions) | 2.9 | 3j | Charte |
| 35 | F-22 | MCP archive_url | 2.8 | 3j | Agent |
| 36 | F-52 | Espace de stockage par user | 2.8 | 3j | Fondations |
| 37 | F-07 | Archivage pages web (URL→contenu) | 2.6 | 4j | Bibliothèque |
| 38 | F-50 | Mode démo / exemples | 2.5 | 1j | Expérience |
| 39 | F-38 | Versionnage des brouillons | 2.4 | 3j | Révision |
| 40 | F-41 | Calendrier brouillons par jour | 2.4 | 3j | Sortie |
| 41 | F-30 | Templates de mise en page | 2.3 | 3j | Réceptacle |
| 42 | F-15 | Versionnage de la charte | 2.2 | 2j | Charte |
| 43 | F-08 | Collection inspirations | 1.9 | 2j | Bibliothèque |
| 44 | F-42 | Glisser-déposer sur date | 1.9 | 2j | Sortie |
| 45 | F-53 | Notifications | 1.8 | 3j | Fondations |
| 46 | F-51 | Auth | 1.4 | 10j | Fondations |
| 47 | F-24 | SDK npm pour agents | 1.2 | 5j | Agent |
| 48 | F-25 | Webhooks / événements | 1.2 | 3j | Agent |
| 49 | F-54 | Multi-chartes par projet | 0.5 | 10j | Fondations |
| 50 | F-55 | Rôles | 0.3 | 10j | Fondations |

**Déjà livrées** : F-10 (import CSS) · F-11 (éditeur charte) · F-19 (MCP set_source) · F-37 (statuts par réseau).

### Lecture honnête du RICE

1. Le RICE récompense les **quick wins à 0.5j** (F-18, F-28, F-32, F-02, F-21, F-35, F-40, F-48) — c'est normal, ils ferment des micro-boucles.
2. **Les différenciateurs stratégiques sont plus bas** (F-20 get_charte : 14.4 ; F-29 injection rendu : 5.4 ; F-45 Postiz : 4.2 ; F-23 feedback : 3.3) — ils coûtent plus cher. Le RICE seul ne suffit donc PAS pour décider du MVP : il faut le chemin critique.
3. **La bibliothèque est étonnamment bien classée** (F-01 #4, F-02 #6, F-05 #16) — petit effort, fort usage. C'est le socle « mémoire » confirmé par les chiffres.

---

## 2. Le MVP : workflow de bout en bout avec publication

### Le principe

Le RICE classe des features ; le MVP classe des **étapes d'une chaîne**. La chaîne cible :

```
1. JE DEPOSE      Un agent (Hermes) produit → dépose dans Atelier (MCP set_source ✅ / UI F-26)
2. L'AGENT SAIT   Il a lu la charte (F-20 get_charte) et les contenus (F-05 get_resource)
3. ON REND        Les slides sont rendues avec la charte (F-29 injection) + régénération (F-28)
4. ON VERIFIE     Badge conforme/hors charte (F-33) + détail (F-34) + re-contrôle (F-35)
5. ON VALIDE      Notes (F-36), checklist (F-40), statuts par réseau (✅ F-37)
6. ON PUBLIE      Postiz draft (F-45) → Victor publie à la main (workflow inaliénable)
```

**Chaque maillon manquant casse la chaîne.** Le RICE seul mettrait F-45 (4.2) loin derrière F-18 (25.6) — mais sans F-45, on n'a PAS de publication, donc pas de bout en bout. Le MVP est donc défini par le chemin critique, pas par le RICE.

### Le MVP minimal viable (10 features, ~10 jours de dev)

| Étape | Features | Effort | Pourquoi c'est nécessaire |
|---|---|---|---|
| **1. Déposer** | F-26 (source via UI) + F-28 (régénération) | 1.5j | Sans le dépôt UI, tout passe par le MCP (déjà là, mais l'UI rend la boucle utilisable par l'humain) |
| **2. Contexte agent** | F-20 (MCP get_charte) + F-12 (bloc instructions marque) | 3.5j | L'agent doit connaître la charte SANS qu'on la lui ré-explique — le cœur différenciant |
| **3. Rendu charte** | F-29 (injection rendu) + F-32 (brouillon lié charte) | 3.5j | Les slides doivent ressembler à la marque, et le brouillon doit savoir quelle charte le régit |
| **4. Vérifier** | F-33 (badge) + F-34 (détail écarts) + F-35 (re-contrôle) | 4j | La preuve « conforme/hors charte » avant validation |
| **5. Valider** | F-36 (notes) + F-40 (checklist) + ✅ F-37 | 1.5j | L'humain au centre, sans oublier les étapes |
| **6. Publier** | **F-45 (Postiz draft)** + F-44 (export) | 5j | LA publication. Postiz = le validé part en draft ; export = le filet de sécurité si Postiz tombe |
| **Bonus bibliothèque** | F-01 (upload) + F-05 (get_resource) + F-02 (typologie) | 3j | « L'agent a accès à mes photos » — sans ça, l'agent produit sans matière |

**Total chemin critique : ~19 jours** (avec le bonus bibliothèque) / **~16 jours** sans.
**Total si on coupe Postiz : ~15 jours** — mais on n'a alors que de l'export, pas une publication.

### Pourquoi F-45 (Postiz) est dans le MVP et pas « plus tard »

- Sans publication, la chaîne s'arrête à « contenu prêt » — c'est un atelier, pas un workflow de publication.
- Postiz est déjà opérationnel chez Victor (self-hosted, canal IG connecté, workflow brouillon → validation → publication) — le raccord API existe (issue #5, skill `bordeluche-social-publishing`).
- Le workflow reste inaliénable : Atelier pousse un **draft**, Victor publie à la main.

### Ce qui sort du MVP (et pourquoi)

| Feature | Raison de l'exclusion |
|---|---|
| F-07 Archivage de pages web | 4j pour un cas d'usage secondaire ; le user peut uploader les fichiers lui-même en attendant |
| F-14 Charte vivante | Dépend de l'historique de validations ; viendra après 2 semaines d'usage réel |
| F-23 Feedback de validation | Même logique : nourrit la charte vivante, arrive après |
| F-38 Versionnage brouillons | Confort de révision, pas bloquant pour publier |
| F-41 Calendrier | La sortie se fait par Postiz ; le calendrier est un confort |
| F-51 Auth | Victor est le seul user ; auth = 10j pour rien aujourd'hui |
| F-24 SDK / F-25 Webhooks | Adoption externe ; pas nécessaire pour l'usage perso |

---

## 3. Séquençage recommandé (4 sprints)

### Sprint 1 — « La boucle humaine » (~4j)
F-26 (déposer UI) · F-28 (régénération) · F-32 (brouillon lié charte) · F-36 (notes) · F-40 (checklist)
→ À la fin : un brouillon se crée, reçoit une source, régénère ses slides, se révise. Utilisable par l'humain.

### Sprint 2 — « L'agent sait » (~4j)
F-20 (MCP get_charte) · F-12 (bloc instructions marque) · F-13 (ton & brand voice) · F-21 (MCP set_statut)
→ À la fin : Hermes produit avec la charte en tête, dépose, et peut poser des notes/statuts.

### Sprint 3 — « La mémoire » (~4j)
F-01 (upload) · F-02 (typologie) · F-05 (MCP get_resource) · F-06 (MCP put_resource) · F-04 (prévisualisation)
→ À la fin : la bibliothèque existe, l'agent lit et remplit, les photos du user servent de matière.

### Sprint 4 — « Le contrôle + la sortie » (~6j)
F-29 (injection rendu) · F-33 (badge) · F-34 (détail écarts) · F-35 (re-contrôle) · **F-45 (Postiz draft)** · F-44 (export)
→ À la fin : les slides portent la charte, le badge dit « conforme », et le validé part en draft Postiz. **Bout en bout.**

**Total : ~18j de dev solo → MVP complet avec publication.**

---

## 4. Après le MVP (backlog priorisé par RICE)

1. F-18 (MCP create_brouillon) · F-48 (empty states) — 1j, quick wins de confort
2. F-03 (tags + recherche) · F-09 (sélection bibliothèque dans brouillon) — la bibliothèque devient puissante
3. F-39 (journal d'activité) · F-49 (activité IA) — la confiance
4. F-23 (feedback) → F-14 (charte vivante) — le moteur d'apprentissage (2 semaines d'usage d'abord)
5. F-41 (calendrier) · F-43 (rappel) — la planification
6. F-27 (multi-ratio) · F-30 (templates) — le rendu avancé
7. F-38 (versionnage) · F-15 (versionnage charte) — la sérénité
8. F-07 (archivage web) · F-22 (MCP archive_url) — l'autonomie de l'agent
9. F-51 (auth) + F-52 (stockage par user) — quand on passe produit
10. F-54 (multi-chartes) · F-55 (rôles) · F-24 (SDK) · F-25 (webhooks) — l'expansion

---

## 5. Décision demandée à Victor

1. **Le MVP inclut-il Postiz (F-45) ?** → Ma reco : OUI, sinon pas de « publication » au sens propre (juste de l'export). 4j.
2. **La bibliothèque est-elle dans le MVP ou après ?** → Ma reco : DANS (Sprint 3), car l'agent sans matière produit du générique — c'est le pilier « mémoire ».
3. **Séquençage 4 sprints ~18j** : on lance Sprint 1 maintenant ?

*Note : les tailles sont des ordres de grandeur solo-dev. Les tests/lint restent verts à chaque étape (process en place).*
