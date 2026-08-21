# SPEC-AMELIORATION-CONTINUE.md : boucle mesure → proposition → v2 + opportunité GSC (15/08/2026)

> Spec produit de la phase 3 du MVP (« Amélioration continue », ROADMAP-MVP.md 3.1 + 3.3) :
> les fichiers de référence du blog (regles-redaction.md, ton-de-voix.md, da-images.md,
> mots-cles-gsc.md) vivent avec les résultats. L'agent mesure (GSC + engagement),
> propose une mise à jour d'un fichier, Victor valide → le fichier passe en v2 et
> guide le contenu suivant. En parallèle, l'agent suggère la prochaine opportunité
> (écart GSC : requête positionnée sans article dédié).
> Vision : VISION.md (mémoire de marque + complément d'agent). Priorisation :
> PRIORISATION.md + ROADMAP-MVP.md (phase 3). Direction design : REFONTE-DESIGN.md.
> Socle technique : SPEC-CHARTE-EVOLUTIVE.md (même moteur de cycle de vie des
> propositions, étendu aux fichiers de référence) et SPEC-BLOG.md (articles + CMS).

---

## 1. Contexte et vision

### 1.1 Le problème

La phase 2 (onboarding références, SPEC-… à venir côté implémentation) crée les
fichiers de référence du blog : règles de rédaction, ton de voix, DA des images,
mots-clés GSC ciblés. Une fois générés et chargés par l'agent à chaque production,
ces fichiers sont **figés** : l'agent écrit, Victor valide, le contenu est publié,
des résultats arrivent (positions Google, engagement), et rien ne remonte dans les
références.

C'est la promesse manquée du produit : la « mémoire de marque » (VISION.md) doit
s'ENRICHIR des résultats, pas seulement des intentions. Sans cette boucle, l'agent
ré-applique des règles figées alors que les données disent ce qui marche :
un hook chiffré qui surperforme (+22 % d'engagement), un mot-clé qui grimpe en
position, un format de carrousel qui convertit. Tout est perdu, chaque production
repart du même état.

### 1.2 La décision (la boucle, humain au centre)

Les références vivent avec les résultats selon un mécanisme de **proposition +
validation Victor**, jamais d'auto-modification :

1. **Mesurer** : périodiquement (1×/jour, même cadence que le scan GSC de la phase 2),
   l'agent agrège les résultats des contenus publiés : GSC (positions, volumes,
   impressions, clics par requête) + engagement (portée, likes, commentaires,
   sauvegardes, clics profil, comparaison vs moyenne).
2. **Analyser** : l'analyseur croise les contenus publiés avec leurs résultats et
   extrait des signaux récurrents (« les hooks chiffrés performent »,
   « le mot-clé X est passé de 23 à 11 »).
3. **Proposer** : chaque signal qui dépasse un seuil devient une **proposition de
   mise à jour** d'un fichier md (`proposee`), visible dans la page Références blog
   avec la raison sourcée (données à l'appui) et le diff proposé (v1 → v2).
4. **Valider** : Victor applique (→ le fichier passe en v2, versionné) ou rejette
   (→ la proposition est enterrée, elle ne ressort pas).
5. **Boucler** : les fichiers v2 sont chargés par l'agent à la production suivante
   (`get_charte`/lecture des références). Le contenu produit ensuite alimente à son
   tour la mesure. C'est la boucle d'amélioration continue.

**Principe fondateur : l'humain au centre.** Identique à SPEC-CHARTE-EVOLUTIVE
(VISION.md D5) : l'analyseur propose, Victor dispose. La seule différence est la
cible : la charte évolutive enrichit la CHARTE (couleurs, ton, formats) ; la
présente spec fait évoluer les FICHIERS DE RÉFÉRENCE du blog, c'est-à-dire les
documents texte versionnés que l'agent charge avant chaque article.

### 1.3 La suggestion d'opportunité (3.3)

En complément de la boucle de mise à jour, la page Références blog affiche en
permanence la **prochaine opportunité** : l'écart GSC le plus rentable sans article
dédié (requête positionnée 11-30 avec volume, aucun article du blog ne la couvre).
Un clic pré-remplit un brouillon article ciblé sur ce mot-clé. C'est « l'agent
propose, pas seulement exécute » (ROADMAP-MVP.md 3.3) : le prototype l'a déjà
dessiné (design/prototype/blog-references.html, carte « Prochaine opportunité »).

### 1.4 Hors périmètre (v1)

- **Réécriture automatique** : aucun fichier md ne se modifie sans validation
  Victor. La boucle s'arrête à la proposition.
- **Dashboard post publié enrichi** (3.2) : la carte t_9cdecdda (1.2) livre la page
  post publié avec métriques de base ; l'enrichissement « comparaison vs moyenne +
  apprentissages agent » est la source de mesure de la présente spec (section 3.2)
  mais l'UI complète du dashboard est traitée dans cette même carte. Ici on ne
  spécifie que ce que la boucle consomme (les métriques comparées).
- **Multi-réseaux d'engagement** : le v1 mesure l'engagement des contenus publiés
  sur les réseaux connectés (métriques remontées par l'intégration, même source que
  la carte 1.2). Pas d'agrégation cross-réseaux normalisée.
- **Analyse sémantique profonde** : les signaux sont des heuristiques
  reproductibles (comme SPEC-CHARTE-EVOLUTIVE), pas une IA qui « comprend » le
  contenu. L'agent rédige la proposition de diff, l'analyseur reste déterministe.

---

## 2. Le mécanisme en 5 étapes

### 2.1 La boucle complète

```
contenus publiés ──► mesure (GSC + engagement) ──► analyseur ──► propositions (proposee)
                                                                     │
                                          Victor applique ──────────┴──► fichier md v2 (versionné)
                                          Victor rejette ─────────────► enterrée (ne ressort pas)
                                                                             │
        production suivante ◄── l'agent charge les fichiers v2 (références enrichies)
```

### 2.2 Déclencheur : périodique (1×/jour) + manuel

L'analyse se déclenche :

1. **Automatiquement, 1×/jour** : même cadence et même mécanisme que le scan GSC
   de la phase 2 (cron API / route interne appelée par le scan). Quand des résultats
   sont disponibles (GSC mis à jour ou nouvelles métriques de posts publiés),
   l'analyse tourne sur la fenêtre des **28 derniers jours**.
2. **Manuellement** : bouton « Analyser maintenant » sur la section Amélioration
   continue de la page Références blog (prototype : bandeau 🔄).

Idempotence : si l'analyse re-tourne avec les mêmes données, aucune nouvelle
proposition n'est créée ; les occurrences sont mises à jour (section 4.1).

### 2.3 La mesure : deux sources

| Source | Données | Fenêtre | Fournie par |
|---|---|---|---|
| **GSC** | positions, volumes, impressions, clics par requête ciblée (mots-cles-gsc.md) + requêtes non ciblées qui montent | 28 jours | scan GSC phase 2 (déjà branché) |
| **Engagement** | portée, likes, commentaires, sauvegardes, clics profil de chaque post publié, comparés à la moyenne du compte | depuis publication | carte 1.2 (post-publié + métriques) |

### 2.4 L'analyseur : extraction de signaux

L'analyseur (`apps/api/src/amelioration-continue.ts`, à créer) produit une liste de
signaux bruts à partir de la mesure d'UNE fenêtre :

- **perf_engagement** : contenus publiés dont une métrique dépasse la moyenne du
  compte de X % (ex. portée +20 %), avec le trait commun détecté (hook chiffré,
  format avant/après, mot-clé présent, slide count, CTA).
- **perf_position** : requêtes GSC ciblées dont la position s'améliore de N rangs
  sur la fenêtre (ex. 23 → 11), ou qui entrent dans le top 10.
- **gsc_ecart** : requêtes positionnées 11-30 avec volume ≥ seuil, non couvertes
  par un article (slugs du scan blog phase 2) : c'est la matière de l'opportunité.
- **regle_obsolete** : règle existante d'un fichier md contredite par les données
  (ex. « on ne fait pas de chiffres dans les hooks » alors que les hooks chiffrés
  surperforment).

L'analyseur ne décide PAS seul : chaque signal est présenté à l'agent (via le
même canal que la boucle agent 1.1) qui rédige la **proposition de diff** texte,
avec la raison sourcée. En l'absence d'agent disponible (pas de boucle 1.1 active),
le système propose un diff générique à partir de la donnée brute (mode dégradé,
section 7.3).

### 2.5 La proposition et sa validation

Une proposition de mise à jour porte :

| Champ | Contenu |
|---|---|
| `fichier` | le fichier md ciblé (regles-redaction.md, ton-de-voix.md, da-images.md, mots-cles-gsc.md) |
| `diff` | le texte ajouté/remplacé (v1 → v2), en diff unifié |
| `raison` | la donnée sourcée (« hooks chiffrés : +22 % d'engagement sur 3 contenus (28 j) ») |
| `sources` | les ids des contenus publiés / requêtes GSC qui appuient |
| `statut` | candidate → proposee → acceptee | rejetee |

Victor, dans la page Références blog : « Voir la proposition » (ouvre le diff),
« Appliquer en v2 » (→ le fichier passe en v2, versionné, l'agent le chargera),
« Rejeter » (→ enterrée). Rien ne change dans les fichiers sans cette décision.

---

## 3. La suggestion d'opportunité (3.3)

### 3.1 L'écart GSC : définition

Une requête est une **opportunité** si :

1. Position actuelle dans **11-30** (page 2-3 : visible, pas encore rentable).
2. Volume mensuel **≥ seuil configurable** (défaut : 100 recherches/mois, constant
   `SEUIL_VOLUME_OPPORTUNITE`).
3. **Aucun article dédié** : aucun slug du scan blog (phase 2) ne contient le
   mot-clé ou un de ses composants signifiants (anti-cannibalisation, sujets
   verrouillés).
4. Tendance : position stable ou en amélioration sur 28 jours (une requête qui
   dégringole est un risque, pas une opportunité).

L'agent classe les opportunités par **score = volume × (1/position)**, la
meilleure est la « prochaine opportunité » affichée.

### 3.2 L'affichage et l'action

Dans la page Références blog (prototype : carte « Prochaine opportunité », bordure
verte, badge « suggéré par l'agent ») :

- Requête, position, volume, raison (« 0 article dédié, page commune déjà en
  place »).
- Bouton **« Créer l'article → »** : crée un brouillon `type: 'article'` (spec
  SPEC-BLOG) pré-rempli — titre orienté mot-clé, slug, chapo générique, `article`
  JSON avec la requête cible — et ouvre l'éditeur ArticleEditor. Victor rédige/révise
  comme d'habitude, aucune publication automatique.

### 3.3 Non-répétition

Une opportunité affichée puis « consommée » (article créé depuis elle) disparaît de
la liste (l'article créé la couvre désormais : le scan blog la verra comme un slug
existant). Une opportunité rejetée explicitement (bouton « Pas pour l'instant »)
est enterrée 30 jours avant de pouvoir ressortir.

---

## 4. Modèle de données

### 4.1 Table `retroactions` (nouvelle)

Table nouvelle : les 4 fichiers ENSEMBLE (`schema.ts`, `schema-pg.ts`, `legacy.ts`,
`migrate-pg.ts` + types repo `repo.ts` + méthodes `listRetroactions` /
`getRetroaction` / `upsertRetroaction` / `setRetroactionStatut` dans `repo-sqlite.ts`
et `repo-pg.ts`) :

```ts
retroactions = sqliteTable('retroactions', {
  id: text('id').primaryKey(),
  fichier: text('fichier').notNull(),       // regles-redaction.md | ton-de-voix.md | da-images.md | mots-cles-gsc.md
  diff: text('diff').notNull(),             // texte de la MAJ proposée (v1 → v2), diff unifié
  raison: text('raison').notNull(),         // « hooks chiffrés : +22 % d'engagement sur 3 contenus (28 j) »
  sources: text('sources').notNull().default('[]'),  // JSON array : ids brouillons / requêtes GSC
  statut: text('statut').notNull().default('candidate'),
  // candidate (sous le seuil, invisible) | proposee | acceptee | rejetee
  version: integer('version').notNull().default(2),  // version cible (v2, v3…)
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  decidedAt: text('decided_at')             // date d'application/rejet par Victor
});
```

- **Déduplication** : clé naturelle `(fichier, diff)` pour `proposee`/`candidate`.
  À chaque analyse, si une ligne identique existe, on met à jour `raison`/`sources`
  (occurrences fusionnées dans `sources`), pas de doublon.
- **Enterrement** : `rejetee` est terminal, comme SPEC-CHARTE-EVOLUTIVE (une MAJ
  rejetée n'est jamais re-proposée telle quelle).
- **Conservation** : les acceptées restent en base (`decidedAt`), elles portent
  l'historique des passages v1 → v2 (préparation d'un futur audit « ce que la
  boucle a appris »).

### 4.2 Le versionnage des fichiers de référence

La phase 2 (athena) livre les fichiers md versionnés (v1, v2…) dans l'espace marque.
« Appliquer en v2 » = :

1. Écrire le contenu v2 (contenu v1 + diff accepté) dans le fichier.
2. Incrémenter le compteur de version (v1 → v2, pattern identique au versionnage
   des brouillons, `apps/api/src/versions.ts`).
3. Journaliser `retroaction_appliquee` dans le journal d'activité (avec fichier,
   version cible, id de la proposition).

Le format de stockage est celui de la phase 2 (table `references` ou Blob + colonne
version selon la décision d'implémentation d'athena) : la présente spec ne change
pas le contrat de stockage, elle ajoute l'étape d'écriture v2.

### 4.3 Règle des 4 fichiers + pièges connus

- Table nouvelle → `CREATE TABLE IF NOT EXISTS` dans `legacy.ts` ET
  `migrate-pg.ts`, schéma dans `schema.ts` ET `schema-pg.ts` (règle Phase 4 du
  skill atelier).
- Piège TypeScript `noUncheckedIndexedAccess` : tout accès tableau (ex. parsing de
  `sources`) exige `?? ''` / gardes (règle en place).

---

## 5. Changements API

### 5.1 GET /api/retroactions

```
GET /api/retroactions?statut=proposee   (défaut : proposee)
→ { retroactions: [{ id, fichier, diff, raison, sources, statut, version, createdAt, updatedAt, decidedAt }] }
```

Tri : `updatedAt` desc. Filtre optionnel `statut` (proposee | acceptee | rejetee).

### 5.2 POST /api/retroactions/:id/decision

```
POST /api/retroactions/:id/decision
{ decision: 'acceptee' | 'rejetee' }

acceptee → 1. lit la rétroaction (404 si absente, 409 si déjà décidée)
           2. écrit le fichier v2 (contenu v1 + diff) + incrémente la version
           3. statut acceptee + decidedAt + journal retroaction_appliquee
rejetee  → statut rejetee + decidedAt, aucune écriture
→ 200 { id, statut, fichier, version }   (version = nouvelle version si acceptee)
```

Garde-fou : une `candidate` ne peut pas être décidée (409). Seule une `proposee`
est décidable (cohérent avec SPEC-CHARTE-EVOLUTIVE).

### 5.3 GET /api/opportunites

```
GET /api/opportunites
→ { opportunite: {
    requete, position, volume, tendance, score,
    raison,         // « 0 article dédié, page commune déjà en place »
    articleExistant: null | { id, titre, slug }   // si une ébauche couvre déjà
  } | null }        // null si aucune opportunité (filtres GSC vides)
```

La logique : scan GSC (phase 2) + scan blog (phase 2) + heuristique de score
(section 3.1). Route en lecture seule.

### 5.4 POST /api/opportunites/:id/article

```
POST /api/opportunites/:id/article
→ 201 { id, type: 'article', titre, statut: 'brouillon' }
```

Crée un brouillon article pré-rempli (titre orienté mot-clé, slug, chapo générique,
`article.cibleGsc = requete`) et marque l'opportunité « consommée » (elle
n'apparaît plus dans GET /api/opportunites). Aucune publication (règle
STRATEGIE-PUBLICATION.md).

### 5.5 Déclenchement de l'analyse

`POST /api/scan/retroaction` (interne, appelé par le scan journalier GSC ou par le
bouton « Analyser maintenant ») : exécute mesure → analyse → upsert des
rétroactions candidates/proposées. Réponse : `{ analysé: true, nouvelles: n,
proposees: m }`.

---

## 6. MCP : l'agent lit les v2, l'agent rédige les propositions

### 6.1 Lecture (production suivante)

Le point d'entrée existant qui injecte les références à l'agent (get_charte /
lecture des fichiers de référence de la phase 2) doit rendre la **version courante**
des fichiers md (v2 si elle existe). Aucun outil nouveau : c'est la même route,
qui lit la dernière version.

### 6.2 Rédaction des propositions (boucle agent 1.1)

Quand la boucle agent (carte t_27e91641, 1.1) est active, la rédaction du `diff`
des propositions est confiée à l'agent via un outil MCP :

`proposer_retroaction(fichier, diff, raison, sources[])` → crée la rétroaction
en `proposee` (si le seuil est franchi) ou `candidate` (sinon). L'agent reçoit en
entrée la mesure brute (résultats GSC + engagement de la fenêtre) par un outil de
lecture (`lire_mesure` : agrégats 28 jours, même shape que la carte 1.2).

Mode dégradé : si l'outil MCP n'est pas appelé (pas d'agent actif), l'analyseur
génère lui-même le diff générique à partir des données (section 2.4) — la boucle
reste fonctionnelle, les propositions sont moins fines.

---

## 7. UI : la page Références blog devient le lieu de la boucle

### 7.1 Section « Amélioration continue » (prototype : bandeau 🔄)

En bas de la page Références blog (design/prototype/blog-references.html), un bandeau
visible seulement si des rétroactions `proposee` existent :

- Titre : « Amélioration continue » + compteur (« 1 mise à jour proposée »).
- Sous-texte : la synthèse de l'analyse (« Basée sur les 28 derniers contenus :
  les hooks chiffrés performent (+22 % d'engagement) — le ton s'enrichit »).
- Boutons : « Voir la proposition » (ouvre le diff), « Appliquer en v2 » (primaire),
  et si plusieurs : liste des propositions (titre du fichier + raison).
- Bouton discret « Analyser maintenant » (relance l'analyse manuellement).
- Pied : le principe en une phrase (« Chaque contenu publié alimente les
  références : l'agent mesure, propose, vous validez → v2 »).

### 7.2 La vue proposition (diff v1 → v2)

Modale ou panneau latéral (pattern existant de la vue détail) :

- En-tête : fichier ciblé + version actuelle → version cible (« ton-de-voix.md :
  v1 → v2 »).
- Raison sourcée en évidence (« +22 % d'engagement sur 3 contenus (28 j) ») +
  liste des sources cliquables (ouvre le brouillon publié / la requête GSC).
- Le diff : ancien texte (barré) / nouveau texte (vert), format diff unifié rendu
  simplement.
- Actions : « Appliquer en v2 » (primaire), « Rejeter » (ghost). Anti-double-clic
  pendant la requête, erreur réseau inline.

### 7.3 La carte « Prochaine opportunité »

Visible en permanence dans la grille (prototype : carte ✨ à bordure verte), même
sans rétroactions en attente :

- Requête + position + volume + tendance.
- Raison (« écart GSC : position 23, 120 recherches/mois, 0 article dédié »).
- Bouton primaire « Créer l'article → » (5.4) ; bouton ghost « Pas pour
  l'instant » (enterrement 30 j).
- Si aucune opportunité : la carte affiche « Aucun écart rentable pour l'instant —
  l'agent surveille les positions chaque jour. »

### 7.4 Détails DA (REFONTE-DESIGN.md)

- Bandeau et cartes sur `bg-level-2`/`bg-level-3` + hairline, radius 12px, mêmes
  tokens que la page Références (phase 2).
- Vert réservé aux gains mesurés (badges « +22 % », « suggéré par l'agent »),
  tokens status existants ; zéro couleur d'accent sur un statut.
- Zéro em-dash partout, y compris dans les textes de raison générés par
  l'analyseur et par l'agent.

---

## 8. Edge cases

| Cas | Comportement |
|---|---|
| Aucune donnée GSC / engagement (pas de posts publiés) | L'analyse ne produit rien, bandeau absent, opportunité `null` avec le message d'attente |
| Même diff re-détecté à l'analyse suivante | Déduplication `(fichier, diff)` : sources fusionnées, pas de doublon |
| Proposition rejetée puis le même signal réapparait | Enterrée définitivement : jamais re-proposée telle quelle (filtre statut rejetee) |
| V2 appliquée puis le signal faiblit | La règle v2 reste (l'humain l'a validée) ; une future analyse peut proposer une v3 inverse |
| Rétroaction candidate (sous le seuil) | Invisible dans l'UI, pas décidable (409), occurrences conservées en base |
| Plusieurs propositions sur le même fichier | Chacune est indépendante ; appliquer l'une n'écrase pas l'autre (écritures séquentielles v2 puis v3) |
| Article déjà en cours sur l'opportunité (brouillon non publié) | `articleExistant` remonté dans GET /api/opportunites, la carte affiche « déjà en cours » et lie le brouillon |
| Scan GSC non connecté | Opportunité `null`, bandeau retroaction masqué, le bouton « Analyser maintenant » répond 503 « GSC non configuré » |
| Agent MCP indisponible | Mode dégradé (diff générique par l'analyseur), la boucle reste fonctionnelle |
| Analyse lente (grosse fenêtre) | Synchronisée mais en tâche différée (setTimeout), jamais bloquante sur le scan journalier |

---

## 9. Découpage d'implémentation (ordre recommandé, ~3j solo)

| Étape | Contenu | Effort | Critère d'acceptation |
|---|---|---|---|
| 1 | Table `retroactions` (4 fichiers + types repo + méthodes sqlite/pg) + GET /api/retroactions + POST /:id/decision (écriture v2 + version + journal) | 0.75j | Tests API : création/liste/décision (acceptee écrit le fichier v2, rejetee n'écrit rien) ; tests existants verts ; build api ok |
| 2 | Analyseur `amelioration-continue.ts` (perf_engagement, perf_position, gsc_ecart, regle_obsolete, seuils) + déclenchement scan journalier + POST /api/scan/retroaction | 1j | Test réel : 2 contenus publiés avec métriques au-dessus de la moyenne → proposition `proposee` avec raison sourcée ; accepter → le fichier passe en v2 |
| 3 | Opportunités : GET /api/opportunites + POST /:id/article (création brouillon pré-rempli) | 0.5j | Test API : opportunité détectée (requête 11-30, volume ≥ seuil, 0 slug couvrant), article créé → l'opportunité disparaît |
| 4 | UI : bandeau Amélioration continue + vue diff + carte Opportunité (page Références blog) + bouton Analyser maintenant | 0.75j | Capture Playwright dark + light : bandeau avec compteur, diff v1→v2 rendu, appliquer met à jour le fichier + badge v2, 0 erreur console |
| 5 | MCP : `proposer_retroaction` + `lire_mesure` (si boucle agent active) + lecture version courante des fichiers | 0.5j | Test stdio : l'agent appelle proposer_retroaction → rétroaction proposee visible dans l'UI ; get_charte rend la v2 |

Chaque étape = PR + capture + `vision_analyze` (process en place). Rappels : zéro
em-dash, DA monochrome + tokens status, tests + lint verts, `npm run build -w
apps/api` et `-w apps/web` avant merge, `hermes mcp restart atelier` après rebuild
du MCP. Dépendance : la table `references` / le scan GSC / le scan blog de la
phase 2 (t_b4d7187e) doivent être mergés avant l'étape 2.

---

## 10. Questions ouvertes pour Victor

1. **Seuils d'opportunité** : position 11-30 et volume ≥ 100/mois vous semblent-ils
   bons pour démarrer ? (Constants ajustables sans migration, reco : oui pour
   démarrer vite, on affinera avec les données réelles.)
2. **Enterrement de l'opportunité** : « Pas pour l'instant » enterre 30 jours, est-ce
   la bonne durée ? (Alternative : enterrement définitif comme les rétroactions.)
3. **Diff générique vs agent** : sans la boucle agent 1.1 active, les propositions
   génériques (mode dégradé) sont-elles utiles, ou faut-il attendre l'agent pour
   proposer ? (Reco : garder le mode dégradé, il rend la boucle démontrable dès la
   phase 3.)
4. **Versionnage des fichiers** : la phase 2 versionne les fichiers md ; la
   présente spec incrémente la version à chaque application. OK pour garder le
   même compteur (v1 → v2 → v3) ?
5. **Placement UI** : la boucle vit dans la page Références blog (reco, le
   prototype le montre) ou mérite-t-elle sa propre page « Apprentissages » ?
