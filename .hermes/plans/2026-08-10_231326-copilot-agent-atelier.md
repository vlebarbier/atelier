# Copilot Hermes dans Atelier — Plan d'intégration

> **Pour Hermes :** exécuter ce plan tâche par tâche (subagent-driven-development ou en direct), en respectant les règles du skill `atelier` (DA noire monochrome, zéro em-dash, règle des 4 fichiers pour tout changement de schéma, `hermes mcp restart atelier` après rebuild du MCP).

**Goal :** intégrer Hermes comme copilot in-app dans le dashboard Atelier — un chat streamé qui produit/révise du contenu en utilisant les outils MCP Atelier existants (charte, brouillons, ressources).

**Architecture :** instance Hermes headless exposée via l'**API server** (OpenAI-compatible, HTTP + SSE, Bearer token). Le front React parle à `apps/api` (Hono) qui proxy vers Hermes — le token ne sort jamais côté navigateur. L'agent est branché sur le serveur MCP Atelier (12 outils) : il lit la charte, liste/consulte les brouillons et ressources, et peut écrire (statuts, légendes, source).

**Tech stack :** Hono (proxy), React 19 + Vite (UI), SSE, `deepseek/deepseek-v4-flash-0731` (modèle par défaut, coût maîtrisé), cloudflared (démo) / VPS (prod).

---

## Contexte et décisions actées

- **Pourquoi pas AG-UI :** la PR #65845 (adaptateur AG-UI) est non mergée (label `needs-decision`, P3). L'API server de Hermes couvre déjà le besoin web : `/v1/runs` (stateful), `/v1/runs/{id}/events` (SSE), `/v1/runs/{id}/stop`, `/v1/runs/{id}/approval`. AG-UI reste une évolution future (UI générative) quand la PR sera mergée.
- **D1 — Hébergement :** tunnel cloudflared depuis le Mac pour la v1/démo (30 min, zéro coût, tunnel déjà en place pour Postiz) ; VPS (Hetzner ~4 €/mois) dès que le produit tient la route. Décision finale : Victor.
- **D2 — Proxy obligatoire :** les appels passent par `apps/api`. Le `HERMES_API_TOKEN` n'est jamais mis dans le bundle Vite.
- **D3 — Périmètre v1 :** chat + outils MCP Atelier (lecture + écriture via les outils existants). **Pas de terminal, pas de skills métier lourds** : profil Hermes dédié avec toolsets restreints (`mcp`, `web`).
- **D4 — Modèle :** `deepseek/deepseek-v4-flash-0731` (n°2 coding arena, ~10× moins cher que Sonnet — consigne consommation respectée).
- **D5 — Isolation :** profil Hermes dédié `atelier` (`~/.hermes/profiles/atelier/`), sa propre config/mémoire. Le routage multi-profil `/p/atelier/...` permet de servir le profil via le même gateway avec sa propre clé.

---

## Phase 0 — Instance Hermes dédiée (aucun code Atelier)

### T0.1 Créer le profil dédié
- Vérifier la commande : `hermes profile --help` (ou doc profiles) puis créer le profil `atelier`.
- Vérif : `~/.hermes/profiles/atelier/` existe avec `config.yaml` + `.env`.

### T0.2 Configurer le modèle et le provider
- `hermes config set model deepseek/deepseek-v4-flash-0731` (dans le profil atelier).
- S'assurer que le provider Nous est authentifié (abonnement déjà actif).
- Vérif : `hermes model` dans le profil → deepseek-v4-flash-0731.

### T0.3 Activer l'API server (env du profil)
Dans `~/.hermes/profiles/atelier/.env` :
```
API_SERVER_ENABLED=true
API_SERVER_KEY=<openssl rand -hex 24>
API_SERVER_CORS_ORIGINS=http://localhost:5173,http://localhost:4173
```
- **Règle :** clé = secret, uniquement dans `.env`, jamais commitée.

### T0.4 Restreindre les toolsets (sécurité — le copilot n'a PAS besoin de terminal)
Dans `config.yaml` du profil : limiter les toolsets exposés à l'API server à `mcp` + `web` (la clé exacte est à vérifier dans la doc config, ex. `gateway.platforms.api_server.toolsets` ou équivalent — le PR AG-UI utilise une section `agui.toolsets`, l'API server a son pendant).
- Objectif : un compromis de sécurité ne fait pas tourner de shell depuis une app web.

### T0.5 Brancher le MCP Atelier sur le profil
```
hermes mcp add atelier --command node --args /Users/victorlebarbier/Atelier/packages/mcp/dist/index.js --env ATELIER_API_URL=http://localhost:4310 --env ATELIER_DATA_DIR=/Users/victorlebarbier/Atelier/apps/api/data/brouillons
```
répondre Y au prompt « Enable all 12 tools? ».
- Vérif : `hermes mcp test atelier` → `✓ Connected` + `Tools discovered: 12`.
- **Note prod (Phase 4) :** `ATELIER_API_URL` devra pointer `https://atelier-api-three.vercel.app` sur le serveur.

### T0.6 Lancer et vérifier l'API server
- `hermes gateway` (profil atelier, en tâche de fond) → attendre « [API Server] API server listening on http://127.0.0.1:8642 ».
- Vérifs curl :
  1. `GET http://127.0.0.1:8642/health` → `{"status":"ok"}`
  2. `GET /v1/capabilities` avec Bearer → `run_submission`, `run_events_sse`, `run_stop` à `true`
  3. `POST /v1/chat/completions` avec `{"model":"hermes-agent","messages":[{"role":"user","content":"Salut"}]}` → 200
  4. `POST /v1/runs` avec `{"input":"Salut"}` → `{run_id, status:"started"}` (202)
  5. `GET /v1/runs/{id}/events` → flux SSE
- **Test agentic (le plus important) :** `POST /v1/runs` avec `{"input":"Utilise l'outil get_charte puis résume les couleurs de la charte"}` → les events SSE montrent un `tool_call` sur `mcp_atelier__get_charte` puis la réponse. C'est la preuve que le copilot sait utiliser Atelier.

---

## Phase 1 — Tunnel cloudflared (démo)

### T1.1 Ajouter un ingress au tunnel existant
- Dans la config du tunnel cloudflared déjà utilisé pour Postiz, ajouter un hostname (ex. `copilot-atelier.<domaine>` ou sous-domaine dédié) avec `service: http://localhost:8642`.
- Relancer le tunnel ; vérifier `cloudflared tunnel list` / logs.

### T1.2 Vérifier le flux complet via le tunnel
- `curl https://<hostname>/health` → ok
- `POST https://<hostname>/v1/runs` avec Bearer → `run_id`
- Cette URL devient `HERMES_API_URL` pour la Phase 2 (en dev local : `http://localhost:8642`).

---

## Phase 2 — Proxy copilot dans apps/api (Hono)

Fichiers :
- Modify : `apps/api/src/app.ts` (enregistrer les routes)
- Create : `apps/api/src/routes/copilot.ts` (ou dans app.ts si convention du repo)
- Create/Modify : `apps/api/src/index.ts` / `src/server.ts` (env)
- Test : `apps/api/test/` (convention vitest existante)

### T2.1 Env vars
- `HERMES_API_URL` (défaut `http://localhost:8642`), `HERMES_API_TOKEN`.
- Ajouter à `~/Atelier/.env.local` (racine) ET aux env Vercel du projet `atelier-api` (voir skill Phase 4b pour la copie d'env entre projets).

### T2.2 Route POST /api/copilot/runs
- Body : `{ input: string, sessionId?: string }`
- Forward : `POST {HERMES_API_URL}/v1/runs` avec header `Authorization: Bearer {HERMES_API_TOKEN}` et `X-Hermes-Session-Id: {sessionId}` (si fourni).
- Réponse : `{ runId }` (ne jamais exposer le token ni l'URL interne).

### T2.3 Route GET /api/copilot/runs/:id/events (proxy SSE)
- `fetch` vers `{HERMES_API_URL}/v1/runs/{id}/events` avec Bearer, puis renvoyer le flux tel quel (`text/event-stream`). Sur Hono : `c.body(upstream.body, { headers: {'content-type':'text/event-stream'} })`.
- **Piège Vercel :** valider le streaming des serverless functions (fluid compute) ; en dev local ça marche directement.

### T2.4 Route POST /api/copilot/runs/:id/stop
- Forward vers `/v1/runs/{id}/stop` → renvoyer le JSON upstream.

### T2.5 Tests + vérification
- Test unitaire du proxy avec un mock HTTP (ou l'instance Hermes locale en dev).
- Vérif manuelle : `curl POST /api/copilot/runs` → `runId`, puis `curl -N GET /api/copilot/runs/{id}/events` → events SSE.

---

## Phase 3 — UI copilot dans apps/web (React)

Fichiers :
- Create : `apps/web/src/components/CopilotPanel.tsx`
- Create : `apps/web/src/hooks/useCopilot.ts`
- Modify : `apps/web/src/api.ts` (fonctions `copilotStart`, `copilotEvents`, `copilotStop` via `apiUrl()`)
- Modify : layout/sidebar (bouton d'ouverture)

### T3.1 Hook useCopilot
- `start(input)` → POST `/api/copilot/runs` → récupère `runId` → ouvre `GET /api/copilot/runs/{runId}/events` via `fetch` + `ReadableStream` (parser SSE maison : buffer sur `\n\n`, gérer `data:` lignes, `[DONE]`) — **pas** d'`EventSource` (impossible de passer des headers, et on passe par notre proxy même-origine de toute façon).
- État exposé : `messages[]` (text deltas), `status` (`idle|running|stopping|done|error`), `toolActivity` (dernier outil appelé, ex. « l'agent consulte la charte »), `stop()`.
- Session : `sessionId` stable par conversation (localStorage) envoyé en `X-Hermes-Session-Id` → continuité multi-tours côté Hermes.

### T3.2 Composant CopilotPanel
- DA noire monochrome obligatoire : tokens existants (`--color-*`), texte 13px, Geist, boutons pill, zéro em-dash, zéro accent couleur.
- États complets : vide (invite + exemples de prompts), chargement, erreur (message + retry), running (bouton stop), done.
- Affichage : markdown léger (vérifier si une lib existe déjà ; sinon rendre brut avec `white-space: pre-wrap` pour la v1 — pas de nouvelle dépendance par défaut).
- Indicateur d'activité outil (chip « Agent · consulte la charte »).
- Icône d'ouverture : vérifier l'existence dans Phosphor AVANT (`grep -oE "Nom" node_modules/@phosphor-icons/react/dist/*.d.ts`) — règle Phase 2b/6b.
- Instructions système par défaut (envoyées en `instructions` au run) : « Tu es le copilot d'Atelier, assistant de production de contenu. Utilise les outils MCP Atelier (get_charte, liste_brouillons, lire_brouillon...) avant de répondre sur un contenu. Réponds en français, ton expert-ami, zéro jargon IA. »

### T3.3 Vérification
- `npm run build -w apps/web` + `npm run lint -w apps/web`
- Test manuel dev (API SQLite + instance Hermes locale) : question « Récupère la charte et donne-moi les couleurs » → chip outil + réponse complète.
- `grep -rn "—" apps/ packages/` → 0.

---

## Phase 4 — Validation de bout en bout + passage prod

### T4.1 Boucle complète en local
- web dev (5173) + API SQLite (4310) + Hermes local (8642) : chat complet avec au moins un appel d'outil MCP réel.

### T4.2 Prod (selon D1)
- **Tunnel :** brancher le web de prod sur le hostname tunnel (env `HERMES_API_URL` côté atelier-api) — OK pour une démo, fragile (Mac éteint = agent down).
- **VPS (recommandé pour la prod) :** Hetzner + installation Hermes (profil atelier) + `hermes gateway` en systemd + TLS (Caddy ou cloudflared) + `ATELIER_API_URL=https://atelier-api-three.vercel.app` sur le MCP + env Vercel mises à jour.
- Vérif prod : `GET /health/detailed` (readiness) + un run réel depuis l'UI déployée.

### T4.3 Filet qualité
- `npm test` (apps/api + tokens), `npm run build`, lint, grep em-dash = 0, capture Playwright du panneau (dark + light) + `vision_analyze` (méthode d'audit Phase 4g), puis PR.

---

## Phase 5 — Évolutions (plus tard, hors v1)

- **Approbation humaine :** quand l'agent veut faire une action gated (ex. `set_statut` vers « publie »), exposer `POST /v1/runs/{id}/approval` dans l'UI (interrupt natif).
- **Contexte par brouillon :** injecter le contenu du brouillon courant (`lire_brouillon`) dans `instructions` → le copilot raisonne sur le document ouvert.
- **AG-UI** quand la PR sera mergée : UI générative (composants React rendus par l'agent), état partagé.
- **Sessions par utilisateur** si Atelier devient multi-compte : `X-Hermes-Session-Key` pour scoper la mémoire longue.

---

## Risques et points ouverts

1. **Sécurité (critique) :** un bind réseau sur un agent à terminal = RCE. Mesures : token Bearer obligatoire, bind 127.0.0.1 + TLS via tunnel/Caddy, toolsets restreints (pas de terminal), jamais de token dans le front. Le profil dédié limite la casse (mémoire/config isolées).
2. **SSE à travers Vercel serverless :** le streaming long peut être contraint (maxDuration, buffering). À valider en Phase 2 ; fallback : appeler Hermes directement depuis le navigateur avec `API_SERVER_CORS_ORIGINS` en allowlist (acceptable en démo, pas en prod multi-clients).
3. **Coût :** flash est bon marché mais un chat itératif avec historique complet coûte. v1 : `conversation_history` limité à N tours (ex. 10) côté front.
4. **MCP local vs prod :** le serveur MCP Atelier en stdio est lancé par l'instance Hermes ; en prod il doit pointer l'API distante (env `ATELIER_API_URL`).
5. **Open question :** le profil dédié doit-il dupliquer les skills Bordeluche/Atelier (charte vivante, brand voice) ? v1 : charger le skill `atelier` + `get_charte` suffit (le MCP donne la charte).
6. **Open question :** VPS vs tunnel pour la v1 → décision Victor (le plan est écrit pour les deux, le tunnel étant le chemin de démo le plus rapide).

---

## Ordre d'exécution recommandé

1. Phase 0 (0.5 j) → 2. Phase 1 (0.25 j) → 3. Phase 2 (0.5 j) → 4. Phase 3 (1 j) → 5. Phase 4 (0.25 j en tunnel, +0.5 j si VPS) → Phase 5 au fil de l'eau.
