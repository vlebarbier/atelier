# STRATEGIE-PUBLICATION.md — Raccord de publication : Postiz, connexions natives OAuth ou agrégateur tiers ?

> Réflexion stratégique (carte kanban t_e46fcace, 11/08/2026). Document de travail à discuter avec Victor, comme VISION.md.
> Question posée : « Atelier se connecte directement aux réseaux sociaux (auth OAuth) + CMS/blog, avec option de brancher Buffer/Hootsuite/Metricool si le user préfère. Comparer avec le raccord Postiz (issue #5). »
> Garde-fou inaliénable (rappel) : le workflow est brouillon → validation → publication. **Jamais de publication automatique.**

---

## 1. La question, cadrée

Le MVP (PRIORISATION.md, Sprint 4 « le contrôle + la sortie ») prévoit **F-45 Postiz draft** (~4j) comme sortie de la chaîne : le contenu validé part en *draft* Postiz, Victor publie à la main.

La carte de cette réflexion propose une alternative : remplacer Postiz par des **connexions natives** (Atelier fait lui-même le flux OAuth vers chaque réseau + les CMS/blog), avec la possibilité de brancher un agrégateur (Buffer/Hootsuite/Metricool) si le user préfère.

Ce document compare les trois options, spec le flux OAuth et l'abstraction de publication (adaptateurs), et liste les risques. Il ne tranche pas seul : il finit par des décisions à prendre (section 9).

---

## 2. Ce qu'est le raccord Postiz aujourd'hui (statut quo)

- **Postiz self-hosted** (Docker, `~/postiz`, port 4007) : hub de publication open source, canal Instagram connecté, workflow draft → validation → publication (décision actée 09/08, voir skill `bordeluche-social-publishing`).
- **Dans Atelier** : l'outil MCP `creer_brouillon_postiz` (`packages/mcp/src/index.ts:290`) uploade chaque slide via `postiz upload` (le CLI exige un upload préalable, IG/TikTok/YouTube rejettent les URLs non vérifiées), puis `posts:create -t draft -s <date ISO>` avec l'intégration cible.
- **Workflow réel** : l'agent ou l'UI pousse un draft Postiz ; Victor publie à la main depuis Postiz.

### Forces
- **Déjà opérationnel** : zéro développement réseau, canal IG branché, testé en réel.
- **Zéro app review** : Postiz (et ses utilisateurs) a déjà fait le travail OAuth vers les réseaux. C'est *lui* qui détient les approuvations Meta.
- **Multi-réseaux possible** : on ajoute des intégrations dans l'UI Postiz (LinkedIn, X, TikTok…) sans toucher à Atelier.
- **Gratuit et open source**, données chez soi.

### Faiblesses
- **Infra locale** : Postiz tourne en Docker sur la machine de Victor. Ce n'est pas scalable pour d'autres users : un futur user d'Atelier n'aura ni Postiz ni l'envie de le self-hoster.
- **CLI shell-out dans le MCP** : dépend de `postiz` installé + `POSTIZ_CLI_ENV` + la clé API. Fonctionne chez Victor, fragile ailleurs.
- **Pas de CMS/blog** : Postiz ne publie pas sur WordPress/Ghost. La vision « + les CMS/blog » de la carte n'est pas couverte.

---

## 3. Option B : connexions natives OAuth (le scénario de la carte)

Principe : Atelier fait lui-même le flux OAuth vers chaque réseau, stocke les tokens, publie via les APIs officielles. C'est l'architecture des Buffer/Hootsuite/Postiz eux-mêmes, mais en interne.

### 3.1 La réalité par réseau (vérifiée, états API 2026)

| Réseau | Coût d'entrée | App review | Durée tokens | Particularités |
|---|---|---|---|---|
| **Instagram** (Meta Graph) | 0 € mais lourd | **OUI**, ~1-2 semaines solo dev, screencast d'usage requis | **60 jours**, refresh via Facebook Login | Compte Business/Creator + Facebook Page liée + permissions `instagram_business_content_publish` ; carrousel = containers séquentiels (create → publish) |
| **Facebook** (Pages) | 0 € | OUI (mêmes permissions Meta) | 60 jours | `pages_read_engagement` + publish |
| **LinkedIn** | 0 € pour profil perso | Partiel : **profil perso via Posts API sans partner approval** ; pages organisation = `w_organization_social` + Community Management API (partner program) | 365 jours | API versionnée (`Linkedin-Version: YYYYMM`) |
| **X** | **PAYANT** : ~0,010-0,015 $/post, **0,20 $ si lien** | Non (pas d'app review, mais payant) | OAuth 2.0 | Plus de free tier write ; Basic legacy $100-200/mois ; le seul réseau qui facture chaque post |
| **TikTok** | 0 € | OUI (Content Posting API, approval) | tokens + webhooks | Vidéo seulement, approval app |
| **WordPress** (CMS) | 0 € | **AUCUNE app review** | Application Passwords (jetons par user) | REST API simple ; de loin le plus facile |
| **Ghost** | 0 € | Non | Admin API keys | API simple, pages + posts |

### 3.2 Spec du flux OAuth générique

1. **Initiation** : le user clique « Connecter Instagram » → Atelier redirige vers l'URL d'autorisation du réseau : `client_id`, `redirect_uri`, `scope`, `state` (nonce aléatoire, anti-CSRF), `code_challenge`/`code_challenge_method=S256` (PKCE obligatoire côté SPA).
2. **Callback** : le réseau redirige vers `GET /api/integrations/callback/:provider?code=...&state=...`.
   - Vérifier `state` (sinon 400, risque CSRF).
   - Échanger `code` → `access_token` + `refresh_token` **côté serveur uniquement** (le code ne transite jamais par le bundle Vite).
3. **Stockage** (table `integrations`, cf. section 7) : provider, label du compte, `access_token` **chiffré** (AES-GCM, clé en env), `refresh_token` chiffré, `expires_at`, scopes, `account_id` externe, statut.
4. **Refresh** : job périodique (cron) ou refresh lazy à chaque usage si `expires_at` proche. Particularités : Meta = 60 jours (refresh via Facebook Login), LinkedIn = 365 jours, X = OAuth 2.0 avec refresh.
5. **Révocation** : bouton « Déconnecter » → `DELETE /api/integration/:id` + appel de révocation du réseau si dispo.
6. **Sécurité** : tokens jamais exposés au front (proxy API), secrets en env Vercel, `redirect_uri` whitelistée côté réseau ET côté serveur, PKCE systématique.

### 3.3 Ce que ça coûte vraiment (ordre de grandeur solo-dev)

- **Instagram direct** : 1-2 semaines d'app review Meta (screencast, dossier), compte Business requis, maintenance des tokens 60j, flux containers carrousel à implémenter et à maintenir. Risque de refus/re-soumission réel.
- **X direct** : coût **récurrent par post** (0,20 $/post avec lien). Aucun sens économique en direct pour un volume de 1-3 posts/semaine, sauf à passer par un agrégateur qui amortit.
- **LinkedIn direct** : faisable pour un profil perso (Posts API), mais les pages entreprise (le cas Bordeluche/agence) passent par le partner program.
- **Chaque réseau = un adaptateur + un flux OAuth + une UI de connexion + une maintenance** (breaking changes, versions API).
- **Total réaliste pour IG + LinkedIn + TikTok + X** : 15-25 jours de dev + review Meta + coût X récurrent. Pour un besoin actuel de 1-3 publications/semaine.

---

## 4. Option C : agrégateur tiers (Buffer / Hootsuite / Metricool)

L'agrégateur a déjà fait toutes les app reviews : on branche **un seul OAuth** et on publie sur 15+ plateformes.

- **Buffer** : API publique. Plan Free = 3 canaux, 10 posts programmés/canal, 3 000 requêtes/30j. Team ≈ 10 $/canal/mois. Un appel API publie/programme sur toutes les plateformes connectées au compte Buffer. C'est l'option la plus viable des trois.
- **Hootsuite** : API historiquement fermée/enterprise, à écarter.
- **Metricool** : **déjà écarté** (décision actée 09/08 dans `bordeluche-social-publishing`) : plan Free exclut X et LinkedIn.

### Forces
- **Un seul OAuth** (Buffer), zéro app review, couverture multi-réseaux immédiate.
- Draft + scheduling inclus, pas d'infra à héberger.
- C'est la voie « produit » : un user d'Atelier a (ou crée) un compte Buffer gratuit, et Atelier n'a aucun réseau à intégrer.

### Faiblesses
- **Abonnement récurrent** (ou plafonds Free) : frottement pour les users.
- **Dépendance à un tiers** : changements de pricing/API (leçon X 2023-2026) ; Buffer bride parfois les usages d'automatisation.
- **Moins de contrôle** sur les formats spécifiques (carrousels IG, reels, stories).
- **Pas de CMS/blog** non plus (Buffer = réseaux sociaux uniquement).

---

## 5. Comparaison structurée

| Critère | Postiz (statut quo) | Connexions natives | Buffer |
|---|---|---|---|
| Effort MVP | 0 (déjà en place) | 15-25j + review Meta | 3-5j |
| Coût récurrent | 0 (self-host) | X = 0,20 $/post avec lien ; 0 sinon | ~10 $/canal/mois ou Free limité |
| Couverture réseaux | via intégrations Postiz (IG branché, autres à ajouter) | réseau par réseau, un par un | 15+ d'un coup |
| App review | 0 (portée par Postiz) | Meta obligatoire pour IG/TikTok | 0 (portée par Buffer) |
| Dépendance infra | Docker local (non scalable multi-user) | aucune | SaaS tiers |
| Contrôle / formats | moyen (API Postiz) | total | moyen |
| CMS/blog | non | oui (WordPress = application passwords, zéro review) | non |
| Alignement vision (mémoire de marque + complément d'agent) | OK (raccord) | OK+ (contrôle total) | OK- (couche de plus, abonnement) |

---

## 6. Recommandation

**Ne pas remplacer Postiz par les connexions natives au MVP. Construire l'abstraction d'adaptateurs (section 7) maintenant, garder Postiz comme adaptateur n°1, ajouter Buffer comme adaptateur n°2 (la voie produit multi-user), et ne faire du direct OAuth que réseau par réseau, quand l'usage réel le justifie.**

Raisons :

1. **Le goulot n'est pas la publication** (1-3 posts/semaine chez Victor), c'est la cohérence marque (VISION.md, section A1). Investir 15-25 jours de direct OAuth ne sert pas la promesse « ne publie plus jamais quelque chose qui ne te ressemble pas ».
2. **L'app review Meta est un risque de blocage réel** (1-2 semaines, screencast, refus possibles) pour un bénéfice non démontré. Postiz a déjà ce fardeau, et c'est gratuit pour nous.
3. **X coûte de l'argent par post** ; aucun intérêt en direct vs via un agrégateur qui amortit.
4. **Le produit doit rester « mémoire de marque + complément d'agent »** : la sortie doit être un raccord fiable, pas un deuxième produit (hub de publication).
5. **MAIS l'architecture doit le permettre plus tard** : interface Publisher + table `integrations`, pour que les users sans Postiz branchent Buffer, et que le direct IG arrive quand le produit aura des users (l'app review se justifie alors).

### Séquence recommandée

- **Sprint 4 (MVP, inchangé ~4j)** : refactor `creer_brouillon_postiz` derrière l'interface Publisher (adaptateur `postiz`), workflow draft conservé.
- **Post-MVP immédiat** : adaptateur `buffer` (3-5j, la voie multi-user sans self-host) + adaptateur `wordpress` (2-3j, **zéro app review** via Application Passwords, aligné avec la sortie « documents/blog » de la vision).
- **Plus tard (si usage réel + users)** : `instagram-direct` (prévoir 2 semaines de review Meta), `linkedin-direct` (profil perso d'abord, pages via partner si agence), `tiktok-direct`.
- **Jamais seul** : `x-direct` (coût par post prohibitif ; toujours via Postiz/Buffer).

---

## 7. Spec : abstraction de publication (adaptateurs)

### 7.1 Interface Publisher

```ts
interface Publisher {
  provider: string;                        // 'postiz' | 'buffer' | 'instagram' | 'linkedin' | 'wordpress' | ...
  connect(): Promise<Integration>;         // flux OAuth ou config (Postiz : API key, WordPress : application password)
  disconnect(id: string): Promise<void>;
  isConnected(id: string): Promise<boolean>;
  publishDraft(input: PublishInput): Promise<Publication>;
  // PublishInput = { brouillonId, reseau, caption, mediaUrls[], scheduledFor? }
  getStatus(publicationId: string): Promise<PublicationStatus>;
}
```

- **La couche métier ne connaît pas le réseau** : elle appelle `publishDraft` avec une cible `{ reseau, integrationId }`. C'est l'adaptateur qui sait faire l'upload média, les containers (IG), le multipart (LinkedIn), les webhooks de statut.
- **Toujours en DRAFT** : aucun adaptateur ne publie directement. Le workflow inaliénable (brouillon → validation → draft) reste dans la couche métier, pas dans l'adaptateur.

### 7.2 Modèle de données (2 tables)

- **`integrations`** : id, provider, label, account_id_externe, access_token (chiffré AES-GCM), refresh_token (chiffré), expires_at, scopes, statut (connected/expired/revoked), created_at.
- **`publications`** : id, brouillon_id (FK), integration_id (FK), reseau, statut (draft/scheduled/published/failed), post_id_externe, scheduled_for, published_at, error.
- **Routes API** : `GET/POST/DELETE /api/integrations`, `POST /api/brouillon/:id/publier` (crée un draft via l'adaptateur cible).
- **MCP** : remplacer `creer_brouillon_postiz` par `publier_brouillon` (routé par adaptateur) + `lister_integrations` (l'agent sait ce qui est branché). Rappel process : rebuild + `hermes mcp restart atelier` + vérif `grep -c` du dist.

### 7.3 Adaptateurs (ordre de priorité)

| Adaptateur | Voie | Effort | Notes |
|---|---|---|---|
| `postiz` | CLI existant refactoré | ~1j | Bouge pas chez Victor ; le draft Postiz reste la sortie perso |
| `buffer` | API HTTP | 3-5j | La voie produit multi-user ; un OAuth Buffer, 15+ réseaux |
| `wordpress` | REST + Application Passwords | 2-3j | Zéro app review ; sortie blog/documents ; premier adaptateur direct à faire |
| `instagram` | Meta Graph (containers) | 5-7j + review | Post-MVP, quand il y aura des users |
| `linkedin` | Posts API | 3-5j | Profil perso d'abord ; pages = partner program |
| `tiktok` | Content Posting API | 4-6j + review | Vidéo seulement |
| `x` | API payante | — | Ne pas faire en direct (coût) |

---

## 8. Risques

| Risque | Impact | Mitigation |
|---|---|---|
| App review Meta refusée/lente (IG/TikTok) | Bloquant pour le direct | Postiz/Buffer en attendant ; dossier de review sérieux le jour venu |
| Tokens qui expirent (Meta 60j, LinkedIn 365j) | Publication cassée en silence | Refresh auto + badge « reconnecter X » dans l'UI (statut intégration) |
| Coût X par post (0,20 $ si lien) | Coût récurrent non nul | Jamais de direct X ; toujours via Postiz/Buffer |
| Changements de pricing/API (leçon X 2023-2026) | Adaptateur cassé du jour au lendemain | Abstraction + veille ; jamais tout le produit sur un seul réseau |
| Sécurité des tokens | Fuite = compte compromis | Chiffrement AES-GCM, secrets en env, tokens jamais au front, PKCE, redirect_uri whitelistée |
| Navigateur automatisé | Violation CGU, ban de compte | Interdit (déjà acté 09/08) |
| Scope creep (N réseaux × carrousels/stories/reels/vidéos) | Atelier devient un hub de publication | La sortie reste un raccord draft ; les formats avancés = F-27 multi-ratio, plus tard |
| Postiz = infra Docker locale | Non scalable multi-user | Buffer = la voie multi-user ; Postiz reste la voie perso |
| Postiz seul = dépendance à la machine de Victor | Postiz down = pas de sortie | Export (F-44) déjà dans le MVP comme filet ; Buffer en option |

---

## 9. Décisions demandées à Victor

1. **On garde Postiz comme sortie MVP** (reco : oui, ~4j, déjà acté dans PRIORISATION.md) et on construit l'abstraction Publisher derrière (reco : oui, ~1j de refactor) ?
2. **L'adaptateur Buffer** (pour les futurs users sans Postiz) : post-MVP immédiat (reco) ou on attend les premiers users ?
3. **L'adaptateur WordPress** (Application Passwords, zéro app review) pour la sortie blog/documents : pertinent maintenant (reco : oui, 2-3j) ?
4. **Le direct OAuth IG** : on le programme comme pari post-users (reco), ou on le tente dès que possible malgré la review Meta ?

*Notes : tailles en jours solo-dev, ordres de grandeur. Faits API vérifiés en ligne (états 2026 : app review Meta, pay-per-use X, Posts API LinkedIn, API Buffer). Le workflow brouillon → validation → publication reste inaliénable quelle que soit l'option.*
