# SPEC-GAMIFICATION.md : points et jalons (12/08/2026)

> Spec de la gamification Atelier (idée Victor, carte t_0464e4d3, **basse priorité** :
> le cœur tunnel/worker/confiance d'abord). Points gagnés après le setup, après les
> premiers posts créés, selon les types de contenus produits (carrousel, vidéo, post,
> story), après validation, après publication. Objectif : engagement et sentiment de
> progression. Cette spec répond aux 4 axes de la carte : **où stocker les points**
> (réponse : pas de colonne, une table `jalons` de déblocages + tout le reste dérivé
> du journal et de l'état des brouillons), **quels jalons** (catalogue de 17 jalons
> en 4 familles, un tableau de pondération des actions), **comment les afficher**
> (chip discrète dans le footer de la sidebar + page Progression dédiée),
> **jamais intrusif** (zéro toast, zéro confetti, zéro modal, un seul signal actif :
> un point sur l'icône si un jalon s'est débloqué depuis la dernière visite).
> Reliée à : le tunnel (SPEC-TUNNEL.md, les étapes du tunnel sont les jalons),
> le journal d'activité (page Activité IA, source des événements),
> PRIORISATION.md (idée nouvelle, pas encore dans les 55 features),
> REFONTE-DESIGN.md (sidebar groupes + footer figé, Phase 6e du skill atelier).

---

## 1. Contexte et vision

### 1.1 Le problème

Atelier est un outil de production : le user dépose, révise, valide, programme,
publie. C'est un travail répétitif à court terme (chaque contenu suit le même tunnel
Demander → Réviser → Valider → Programmer). À l'usage, trois frictions apparaissent :

1. **Pas de sentiment de progression.** Le user ne voit pas ce que son travail
   accumule. Les 3 premiers contenus validés, la première vidéo, la première
   publication : rien ne marque ces paliers. Le dashboard montre l'état courant,
   jamais le chemin parcouru.
2. **L'onboarding est muet.** Le setup (connecter l'agent, importer la charte,
   déposer la première ressource) n'est ni guidé ni récompensé. Un nouvel espace
   paraît vide sans dire ce qu'il reste à faire pour le rendre utile.
3. **Le risque de sur-gamification.** Une gamification intrusive (confettis, toasts,
   streaks à maintenir, classements) dégrade un outil de travail sérieux. Le produit
   est dark-first, dense, « l'atelier, pas le dashboard » (REFONTE-DESIGN.md) : la
   gamification doit tenir dans cette DA ou ne pas exister.

L'objectif est donc : **donner un sentiment de progression discret et durable**,
récompenser les comportements qui font vivre l'espace (setup, production, validation,
publication, diversité des formats), sans jamais interrompre le workflow.

### 1.2 La décision (cadrage)

1. **Pas de colonne sur `brouillons` : une table `jalons` + tout le reste dérivé.**
   Le codebase a déjà tranché ce genre de question : l'état dérivé bat le flag
   (worker asynchrone §3.2, question en attente SPEC-ASK-USER §1.2, crash-safe, zéro
   orphelin). On applique la même philosophie. Le **journal** (append-only, source de
   vérité des événements, ligne conservée même après suppression du brouillon) et
   l'état courant des `brouillons` suffisent à calculer les points. La seule table
   ajoutée, `jalons`, ne stocke QUE les déblocages (cle + date), rien d'autre.
2. **Points d'action = pondération du journal.** Chaque entrée journal pertinente
   vaut des points (créer +5, valider +10, publier +15...). Dérivé d'événements
   discrets : crash-safe, idempotent, zéro double comptage. Le total ne se stocke
   jamais, il se calcule.
3. **Jalons = catalogue en code + déblocage idempotent.** Le catalogue (cle,
   libellé, condition) vit dans une constante ; la table `jalons` ne garde que les
   clés débloquées. Un « recompute » (fonction pure) évalue toutes les conditions et
   fait des `INSERT OR IGNORE` : chaque jalon ne se débloque qu'une fois, même si le
   recompute tourne cent fois.
4. **Affichage : chip discrète + page dédiée.** Un compteur silencieux
   (`Trophy 145 pts`) dans le footer de la sidebar, à côté de Paramètres/Aide, ouvre
   la page « Progression ». C'est le seul élément permanent. Un point accent sur la
   chip signale « un jalon s'est débloqué depuis ta dernière visite » (lastSeen en
   localStorage). Rien d'autre : pas de toast, pas de confetti, pas de modal.
5. **Niveaux simples à seuils fixes.** Six niveaux (Croquis → Atelier) pour le
   sentiment de progression long terme, dérivés du total.
6. **Fonction pure isolée, basse priorité.** Le calcul ne dépend d'aucun workflow :
   zéro route mutatrice touchée, zéro garde-fou branché sur les points. La spec est
   prête, l'implémentation se fera dans un sprint dédié après S4 (Postiz) et le
   chantier chat/worker, quand le cœur sera stable.

### 1.3 Périmètre v1

- 17 jalons en 4 familles (Setup, Production, Types, Impact), catalogue en code.
- Pondération des actions du journal (table §4).
- `GET /api/progression` : recompute au read + réponse complète (total, niveau,
  jalons). Aucune route d'écriture publique.
- UI : chip sidebar (footer) + page Progression + point de nouveauté.
- Mise à jour de la chip via le polling silencieux existant (30 s, Phase 6e), zéro
  mécanisme temps réel nouveau.
- Hors périmètre : multi-utilisateurs/classement, streaks, récompenses réelles,
  réglage des seuils par le user, gamification de l'agent lui-même, notifications
  push, points récurrents sur programme échu (voir limites §12).

---

## 2. Vocabulaire (figé)

| Terme | Définition |
|---|---|
| **point d'action** | points récurrents dérivés d'une entrée journal (créer, déposer, valider, publier...) |
| **jalon** | récompense one-shot (achievement), cataloguée, débloquée une seule fois |
| **famille** | groupe de jalons (Setup, Production, Types, Impact) |
| **déblocage** | `INSERT OR IGNORE` d'une clé dans la table `jalons` pendant le recompute |
| **recompute** | passage de calcul (fonction pure) : évalue toutes les conditions, débloque les jalons atteints, journalise les déblocages |
| **total** | points d'action + points des jalons débloqués (jamais stocké, toujours calculé) |
| **niveau** | tranche de total définie par des seuils fixes (6 niveaux) |
| **prochain jalon** | premier jalon non débloqué dans l'ordre du catalogue, mis en avant sur la page |
| **dernière visite** | timestamp `atelier.gamif.lastSeen` (localStorage), posé à l'ouverture de la page Progression |

---

## 3. Stockage : la table `jalons`, tout le reste dérivé

### 3.1 Pourquoi pas une colonne `points` sur `brouillons`

Une colonne `points` (ou un compteur global) sur les tables métier pose trois
problèmes :

1. **Désynchronisation.** Le total devient un état à maintenir à chaque mutation
   (création, statut, suppression). Un oubli dans une route = compteur faux sans
   aucun moyen de le détecter.
2. **Double comptage.** Une reprise d'erreur, un retry HTTP ou une mutation
   réexécutée incrémentent deux fois. Il faudrait un flag « déjà compté » par
   brouillon : encore de l'état.
3. **Historique perdu.** Supprimer un brouillon effacerait ses points. Or un contenu
   validé puis supprimé a compté dans le parcours du user (le journal le conserve,
   une colonne non).

Le journal existe déjà et est append-only : il est la source d'événements parfaite.
Les points sont une **fonction** du journal et de l'état des brouillons, pas une
**donnée**.

### 3.2 La table `jalons` (déblocages uniquement)

```ts
// apps/api/src/db/schema.ts (et schema-pg.ts, legacy.ts, migrate-pg.ts : règle des 4 fichiers)
export const jalons = sqliteTable('jalons', {
  cle: text('cle').primaryKey(),          // clé du catalogue, ex: 'premiere-validation'
  famille: text('famille').notNull(),     // 'setup' | 'production' | 'types' | 'impact'
  points: integer('points').notNull(),    // points accordés par ce jalon (figé au déblocage)
  debloqueAt: text('debloque_at').notNull() // ISO, posé par le recompute
});
```

- **La table ne stocke que les déblocages.** Le catalogue (libellés, conditions,
  points) vit dans une constante de code (`GAMIFICATION_JALONS`), pas en base. On
  peut donc ajouter un jalon au catalogue sans migration : il s'évaluera au prochain
  recompute.
- **`points` est figé au déblocage** : si le catalogue change (points du jalon
  re-pondérés), les jalons déjà débloqués gardent leur valeur d'époque. Un jalon
  retiré du catalogue disparaît du calcul (limite assumée, §12).
- **Pas d'index supplémentaire** : la table fait quelques dizaines de lignes max.

### 3.3 Le calcul : une fonction pure

```
recompute(repo) :
  totalActions  = Σ pondération(journal)                 // §4, journal append-only
  pour chaque jalon du catalogue :
    si condition(jalon) satisfaite ET cle absente de jalons :
      INSERT OR IGNORE jalons {cle, famille, points, debloqueAt: now}
      journaliser { type: 'jalon_debloque', auteur: 'system', message: "a débloqué le jalon X" }  // poids 0, §4
  total = totalActions + Σ points(jalons débloqués)
```

- **Exécuté au read** : le `GET /api/progression` lance le recompute puis renvoie le
  résultat. Pas de hook sur les routes mutatrices, pas de job : si le process meurt
  entre une action et le GET, le GET suivant rattrape tout (crash-safe par
  construction).
- **Idempotent** : `INSERT OR IGNORE` sur la PK `cle`. Cent recomputes = un seul
  déblocage.
- **Conditions** : évaluées sur le journal (événements « ever » : créations,
  validations, publications, actions agent, imports) et sur l'état courant des
  brouillons (types distincts présents). Détail par jalon en §5.

### 3.4 La journalisation des déblocages

Le déblocage écrit une entrée journal `type: 'jalon_debloque'` (auteur `system`,
message « a débloqué le jalon X », détails `{cle, points}`). Deux raisons :

1. **Traçabilité** : la page Activité IA montre le parcours du user, c'est le fil
   narratif de la progression.
2. **Pas de boucle** : `jalon_debloque` a un poids de **0** dans la pondération
   (§4), donc journaliser un déblocage ne crée jamais de points (et donc jamais de
   nouveau déblocage en cascade).

---

## 4. Points d'action : pondération du journal

Chaque entrée journal (table `journal`, types existants + `publication_cms` +
`jalon_debloque`) vaut un nombre de points. La pondération est une constante de code
(`PONDERATION_JOURNAL`), appliquée pendant le recompute.

| journal.type | points | commentaire |
|---|---|---|
| `creation` | +5 | chaque brouillon créé (contenu ou document) |
| `depot_source` | +5 | la source HTML du document est déposée (le réceptacle vit) |
| `regeneration` | +3 | slides régénérées depuis la source |
| `changement_statut` vers `a-valider` | +2 | le contenu entre en revue |
| `changement_statut` vers `valide` | +10 | validation |
| `publication_cms` | +15 | publication réelle vers le CMS (Sanity), événement discret |
| `reponse_chat` | +2 | l'agent répond dans la conversation (le complément d'agent travaille) |
| `depot_ressource` | +2 | la bibliothèque s'enrichit |
| `charte_import` | +5 | la charte est importée et traitée |
| `message_user`, `charte_maj`, `suppression`, `reorganisation`, `jalon_debloque` | 0 | actions de maintenance, aucun point |

Règles :

- **Le type `changement_statut` est pondéré selon la cible** (`details.de` /
  `details.vers`, déjà structuré au journal) : vers `a-valider` +2, vers `valide`
  +10, vers `publie` (via `publication_cms`, pas un changement_statut manuel) rien
  de spécial. Les autres transitions (brouillon → brouillon, retour en brouillon) :
  0.
- **Zéro point pour les événements non discrets.** Le programme échu (date/heure
  passée sur `brouillons.programme`) n'est PAS une source de points d'action : ce
  n'est pas un événement, c'est un état continu (il serait re-compensé à chaque
  recompute). La publication réelle (CMS) et la publication programmée one-shot
  (jalon `premiere-publication`, condition sur état) couvrent le besoin v1. Limite
  notée §12.

---

## 5. Les jalons (catalogue v1)

Cle = identifiant stable du catalogue. Famille, libellé, points, condition.

### Famille « Setup » (mise en place de l'espace)

| Cle | Libellé | Points | Condition |
|---|---|---|---|
| `bienvenue` | Bienvenue dans l'atelier | +10 | au moins une entrée journal `creation` |
| `agent-connecte` | Agent connecté | +15 | au moins une entrée journal d'**auteur `agent`** (première action réelle de l'agent) |
| `marque-en-place` | Marque en place | +10 | au moins une entrée journal `charte_import` (charte importée et traitée) |
| `premiere-ressource` | Mémoire alimentée | +5 | au moins une entrée journal `depot_ressource` |

### Famille « Production » (les contenus créés)

| Cle | Libellé | Points | Condition |
|---|---|---|---|
| `premier-contenu` | Premier contenu | +10 | au moins une entrée journal `creation` avec un brouillon de type réseau (`TYPES_CONTENUS`) |
| `premier-document` | Premier document | +10 | au moins une entrée journal `creation` avec un brouillon de type document (`TYPES_DOCUMENTS`) |
| `trois-brouillons` | Trois créations | +15 | au moins 3 entrées journal `creation` |
| `dix-brouillons` | Dix créations | +25 | au moins 10 entrées journal `creation` |

### Famille « Types » (la diversité des formats)

| Cle | Libellé | Points | Condition |
|---|---|---|---|
| `premier-carrousel` | Premier carrousel | +5 | un brouillon courant de type `carrousel` |
| `premiere-video` | Première vidéo | +10 | un brouillon courant de type `video` |
| `premier-post` | Premier post | +5 | un brouillon courant de type `post` |
| `premiere-story` | Première story | +10 | un brouillon courant de type `story` |
| `tous-les-types` | Tous les formats | +40 | les 4 types réseau (`carrousel`, `video`, `post`, `story`) présents parmi les brouillons courants |

Note : la famille Types s'évalue sur l'état **courant** des brouillons (types
distincts présents), contrairement aux autres familles qui comptent les événements
« ever » du journal. Une fois débloqué, le jalon reste débloqué (la table le garde),
même si l'unique vidéo est supprimée ensuite.

### Famille « Impact » (validation et publication)

| Cle | Libellé | Points | Condition |
|---|---|---|---|
| `premiere-validation` | Première validation | +25 | au moins une entrée journal `changement_statut` vers `valide` |
| `cinq-validations` | Cinq contenus validés | +30 | au moins 5 entrées journal `changement_statut` vers `valide` |
| `premiere-publication` | Première publication | +40 | au moins une entrée journal `publication_cms` **ou** un brouillon courant avec `programme` échu (date+heure passée) |
| `trois-publications` | Trois publications | +50 | au moins 3 entrées journal `publication_cms` **ou** au moins 3 brouillons courants avec `programme` échu |

Pour `premiere-publication` et `trois-publications`, le programme échu est une
condition d'état (idempotente par `INSERT OR IGNORE`, sans risque de re-récompense).
Les publications CMS comptent par événement journal. Les deux sources se cumulent
pour atteindre le seuil.

**Total catalogue : 315 points.**

---

## 6. Niveaux (sentiment de progression long terme)

Le total (actions + jalons) place le user dans un niveau, par seuils fixes :

| Niveau | Libellé | Seuil (total ≥) |
|---|---|---|
| 1 | Croquis | 0 |
| 2 | Ébauche | 60 |
| 3 | Esquisse | 150 |
| 4 | Œuvre | 280 |
| 5 | Signature | 450 |
| 6 | Atelier | 650 |

- **Dérivés du total** : le niveau n'est jamais stocké.
- La page Progression affiche `Niveau X · Libellé`, la barre de progression vers le
  seuil suivant (`prochainNiveau.restant`), et le total.
- Les seuils sont des constantes (`SEUILS_NIVEAUX`), modifiables sans migration.

---

## 7. API

### 7.1 GET /api/progression

Recompute puis réponse. 200 :

```json
{
  "total": 123,
  "pointsActions": 58,
  "pointsJalons": 65,
  "niveau": { "numero": 2, "libelle": "Ébauche", "seuilMin": 60, "seuilMax": 150 },
  "prochainNiveau": { "numero": 3, "seuil": 150, "restant": 27 },
  "jalons": [
    { "cle": "bienvenue", "famille": "setup", "libelle": "Bienvenue dans l'atelier",
      "points": 10, "condition": "Créer votre premier brouillon",
      "debloque": true, "debloqueAt": "2026-08-12T09:00:00.000Z" },
    { "cle": "premiere-validation", "famille": "impact", "libelle": "Première validation",
      "points": 25, "condition": "Valider votre premier contenu",
      "debloque": false, "debloqueAt": null }
  ]
}
```

- **Les jalons sont triés par famille puis par ordre du catalogue** (l'ordre du
  catalogue EST l'ordre d'affichage et le calcul du « prochain jalon » : premier non
  débloqué dans cet ordre).
- `condition` : texte humain court affiché sur les jalons verrouillés (« Créer votre
  premier brouillon »), fourni par le catalogue.
- **Pas de route d'écriture** : le déblocage est un effet de bord interne du GET.
- **Robustesse** : le recompute est enveloppé dans un try/catch ; en cas d'erreur,
  le GET renvoie 500 avec un message clair et **n'affecte aucune autre route**
  (aucune route mutatrice ne l'appelle).

### 7.2 Règle des 4 fichiers (rappel Phase 4)

Toute évolution de schéma (ici la table `jalons`) touche ENSEMBLE :
`schema.ts` + `schema-pg.ts` (pgTable) + `legacy.ts` (`CREATE TABLE IF NOT EXISTS`
SQLite) + `migrate-pg.ts` (CREATE TABLE IF NOT EXISTS Postgres), puis les types
repo (`JalonRow`/`NewJalon`) et les méthodes `getJalons()` / `insertJalonIgnore()`
dans `repo.ts` + les 2 implémentations (sqlite + pg). Oublier un fichier = erreur
runtime en local (SqliteError) ou en prod, invisible au lint.

### 7.3 Côté web

- `apps/web/src/api.ts` : `fetchProgression()` → GET /api/progression, type
  `Progression` (total, pointsActions, pointsJalons, niveau, prochainNiveau,
  jalons: `Jalon[]`).
- `GAMIFICATION_JALONS` et `SEUILS_NIVEAUX` vivent côté API (le web ne fait
  qu'afficher la réponse : le catalogue n'est pas dupliqué dans le bundle).

---

## 8. Affichage : jamais intrusif

### 8.1 La chip du footer (le seul élément permanent)

Dans le footer de la sidebar (`.nav-footer`, Phase 6e), au-dessus de
Paramètres/Aide :

```
┌─────────────┐
│ Atelier  ★ 145 pts   │   ← .gamif-chip, cliquable → page Progression
└─────────────┘
```

- Structure : `button.gamif-chip` = icône `Trophy` (13 px) + texte `145 pts`
  (12 px, `--color-ink-secondary`), padding 4 px 10 px, radius pill (999 px),
  hairline `--color-line`, hover fond `--color-bg-level-2`. Silencieux : aucune
  animation, aucune pulsation.
- **Mise à jour sans mécanisme nouveau** : la chip se rafraîchit avec le polling
  silencieux existant (30 s, Phase 6e `loadSilencieux`), qui fetch aussi
  `/api/progression`. Zéro WebSocket, zéro intervalle supplémentaire.
- **Le point de nouveauté** : si un jalon a `debloqueAt > lastSeen`
  (localStorage `atelier.gamif.lastSeen`), un point accent de 6 px
  (`--color-accent-base`) s'affiche en haut à droite de la chip. C'est **le seul**
  signal actif de toute la gamification. Il disparaît dès l'ouverture de la page
  Progression (`lastSeen` mis à jour au chargement).

### 8.2 La page Progression (page dédiée)

Nouvelle page sidebar : groupe **TRAVAIL** (Contenus / Documents / Calendrier /
Progression), icône `Trophy`, id interne `progression`. Contenu :

1. **Header** : titre « Progression » + sous-titre « 123 pts · Niveau 2 · Ébauche ».
2. **Carte niveau** : libellé du niveau, barre de progression vers le seuil suivant
   (largeur = `(total - seuilMin) / (seuilMax - seuilMin)`, fond level-2 + fill
   accent), texte « Encore 27 pts pour Esquisse ».
3. **Prochain jalon** : carte en avant (bordure accent hairline) avec le premier
   jalon non débloqué du catalogue et sa condition.
4. **Les 4 familles** : sections Setup / Production / Types / Impact, chacune sa
   liste de jalons. Rendu par ligne : icône (CheckCircle vert si débloqué, Circle
   gris si verrouillé), libellé, `+N pts`, date de déblocage (format relatif) si
   débloqué, condition en ink-tertiary si verrouillé. Le total de la famille
   s'affiche en tête (« 40 / 40 pts »).
5. **Empty state** : si aucun jalon débloqué, la page affiche le total (0) et le
   prochain jalon avec sa condition : la page guide l'onboarding sans le forcer.

La page est statique après chargement : pas de polling dédié (le polling global
rafraîchit les données si on y revient).

### 8.3 Anti-patterns (ce que la gamification ne fait JAMAIS)

1. **Zéro toast, zéro confetti, zéro modal** au déblocage. Le déblocage se voit
   uniquement sur la page et via le point de nouveauté.
2. **Zéro son**, zéro haptique.
3. **Zéro streak à maintenir** (une série qui se casse = anxiété, contraire à
   l'objectif).
4. **Zéro classement** (pas de comparaison, espace mono-user de toute façon).
5. **Zéro animation de la chip** (pas de pulsation, pas de flash au changement de
   total). `prefers-reduced-motion` : sans objet, aucune motion n'est introduite.
6. **Le total n'est jamais un gate** : aucune fonctionnalité ne dépend des points.
7. **Pas de « +5 » flottant** sur les actions du dashboard (cela briserait la
   densité du tunnel). Les points se voient sur la page, pas dans le flux de
   travail.

---

## 9. Garde-fous

1. **Idempotence absolue** : `INSERT OR IGNORE` sur la PK `cle` ; le recompute peut
   être appelé en parallèle (deux GET simultanés) sans double déblocage.
2. **Zéro écriture de points** : aucun champ `points`/`xp` sur `brouillons`,
   `ressources`, `chartes`. Le total est toujours calculé, jamais stocké.
3. **Journal = seule source des événements** : pas de compteur incrémental. Un
   crash entre l'action et le recompute est rattrapé par le GET suivant.
4. **Le recompute ne modifie que `jalons` (+ journal de déblocage)** : aucun side
   effect sur les brouillons, aucun changement de statut, aucune route métier
   touchée.
5. **Échec silencieux** : une erreur du recompute renvoie 500 sur
   `/api/progression` uniquement et logge ; tout le reste de l'app continue.
6. **Pondération nulle par défaut** : tout nouveau type de journal introduit à
   l'avenir vaut 0 tant que la pondération ne le mentionne pas (aucun point
   accidentel).
7. **Perf** : un scan du journal par recompute (quelques centaines de lignes à
   l'échelle v1, trivial). Si le journal dépasse ~10k lignes, ajouter un cache 30 s
   ou un agrégat stocké (évolution §12).

---

## 10. Observabilité

- Les déblocages apparaissent dans la page Activité IA (entrées `jalon_debloque`,
  auteur `system`).
- `GET /api/progression` renvoie `pointsActions` et `pointsJalons` séparément : en
  cas de doute sur un total, la décomposition est visible d'un coup d'œil.
- Pas de métrique dédiée v1 ; si la feature est adoptée, logguer le taux
  d'activation (espace ayant débloqué ≥ 1 jalon) et le palier médian atteint.

---

## 11. Test de bout en bout (acceptance)

Base de test : SQLite temporaire (`API_DB_PATH`, jamais Postgres de prod, règle
Phase 6). Scénario :

1. **Espace vide** : `GET /api/progression` → `{ total: 0, pointsActions: 0,
   pointsJalons: 0, niveau: { numero: 1 }, jalons: 17 dont 0 débloqués }`.
2. **Création** : `POST /api/brouillons` (type par défaut carrousel) → GET →
   jalons `bienvenue` + `premier-contenu` débloqués, `total = 10 + 10 + 5 = 25`
   (jalons + action `creation`).
3. **Source + régénération** : POST sourceHtml puis POST slides → GET → `total =
   25 + 5 + 3 = 33`.
4. **Validation** : POST statut `valide` → GET → `total = 33 + 10 + 25 = 68` (action
   + jalon `premiere-validation`), `niveau: { numero: 2 }` (seuil 60 atteint).
5. **Publication CMS** : (article) `POST /publier-cms` → GET → `total = 68 + 15 +
   40 = 123`, jalon `premiere-publication` débloqué.
6. **Idempotence** : deux GET consécutifs → total identique, aucun jalon re-débloqué
   (les `debloqueAt` n'ont pas changé).
7. **Suppression** : DELETE du brouillon → GET → total inchangé (le journal
   conserve les événements).
8. **Types** : créer un brouillon `video` → jalon `premiere-video` (+10) ; créer
   `post` et `story` → jalon `tous-les-types` (+40) une fois les 4 types présents.
9. **UI** : chip du footer affiche le total ; un déblocage récent (debloqueAt >
   lastSeen) affiche le point accent ; ouvrir la page Progression → point disparu ;
   au déblocage, aucun élément toast/confetti dans le DOM (assertion : zéro
   `.toast`, zéro keyframe d'apparition sur la chip).
10. **Robustesse** : stub d'erreur sur le recompute → GET /api/progression 500,
    les autres routes répondent normalement.

---

## 12. Limites connues & évolutions

1. **Programme échu ≠ événement discret** : pas de points d'action récurrents pour
   la publication programmée (seul le jalon one-shot). Évolution : marqueur
   d'état `comptabilise_pub` sur brouillons (une colonne, acceptée car elle
   n'est pas un compteur de points) ou événement webhook Postiz quand le draft
   devient publié.
2. **Backfill naturel** : les actions antérieures à l'installation comptent (le
   premier GET peut débloquer plusieurs jalons d'un coup sur un espace existant).
   C'est voulu (aucune punition du passé), mais le « bienvenue » se débloque dès le
   premier GET si un brouillon existe déjà.
3. **Jalon retiré du catalogue** : ses points disparaissent du total (le catalogue
   est la vérité, la table ne garde que les déblocages). Assumé.
4. **Mono-espace** : la gamification est par espace/instance (pas de user accounts
   en v1). Multi-user = ajouter `user_id` sur `jalons` + l'historique de lecture.
5. **Seuils et pondérations fixes** : pas de réglage par le user en v1 (constantes
   en code, modifiables sans migration).
6. **Évolutions possibles** : streaks hebdomadaires (à valider : risque d'anxiété),
   badge exportable (image PNG générée, pipeline render existant), récompenses
   réelles (hors produit), gamification de l'agent (l'agent gagne aussi des
   points : « l'agent qui a produit le plus de contenus validés »).

---

## 13. Séquencement (basse priorité, assumée)

- **Cette spec est isolée par construction** : le calcul est une fonction pure,
  aucune route mutatrice ni aucun composant du tunnel n'est modifié. Elle peut être
  implémentée sans risque de régression sur le cœur (tunnel, worker, confiance).
- **Ordre d'implémentation recommandé** (sprint dédié, ~1,5 j) : 1) table `jalons`
  + pondération + recompute (`apps/api`), 2) `GET /api/progression` + tests API,
  3) chip sidebar + point de nouveauté, 4) page Progression, 5) captures Playwright
  + vérif DA (zéro em-dash, zéro accent couleur hors statuts, tokens monochrome).
- Ne pas démarrer avant : S4 (Postiz) et le chantier chat/worker stabilisés. La
  carte kanban t_0464e4d3 reste en file basse priorité jusqu'à ce signal.
