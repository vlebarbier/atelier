import { useEffect, useState, useCallback } from 'react';
import {
  Plug,
  PlugsConnected,
  Copy,
  Check,
  Robot,
  TerminalWindow,
  LinkSimple,
  ArrowSquareOut,
  WarningCircle,
  CircleNotch,
  Sparkle
} from '@phosphor-icons/react';
import {
  fetchJournal,
  fetchHealth,
  fetchIntegrationsStatut,
  type JournalEntry,
  type IntegrationsStatut
} from '../api';
import { relTime } from '../format';
import { Page, PageHeader, PageSection, EmptyState } from '../components/ui';
import { TYPE_META } from './ActivityPage';

/**
 * Page Integrations : le user connecte son ou ses agents (Hermes, Claude Code,
 * Codex) a Atelier via MCP. Au chargement, la page ping l'API (GET /api/health)
 * et affiche un badge connecte/deconnecte en temps reel (polling 15s), liste
 * les agents qui ont agi recemment (depuis le journal) et donne le statut reel
 * des canaux de publication (Postiz configure ou non, Sanity, Buffer a venir).
 */

/** Fenetre de recence pour considerer un agent "connecte" (derniere action). */
const FENETRE_CONNEXION_MS = 60 * 60 * 1000; // 1h

/** Nb d'actions agent affichees dans la liste "agents actifs". */
const NB_ACTIONS_LISTE = 8;

type CopieId = 'hermes' | 'claude' | 'codex' | 'url' | null;

type ApiEtat =
  | { status: 'loading' }
  | { status: 'ok'; mode: string; ms: number; at: number }
  | { status: 'err'; message: string };

export function IntegrationsPage() {
  const [copie, setCopie] = useState<CopieId>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [apiEtat, setApiEtat] = useState<ApiEtat>({ status: 'loading' });
  const [canaux, setCanaux] = useState<IntegrationsStatut | null>(null);
  const [canauxErr, setCanauxErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setJournal(await fetchJournal(100));
    } catch {
      /* silencieux */
    }
  }, []);

  const ping = useCallback(async () => {
    const t0 = performance.now();
    try {
      const h = await fetchHealth();
      setApiEtat({ status: 'ok', mode: h.mode, ms: Math.round(performance.now() - t0), at: Date.now() });
    } catch (err) {
      setApiEtat({ status: 'err', message: err instanceof Error ? err.message : 'API injoignable' });
    }
  }, []);

  const loadCanaux = useCallback(async () => {
    try {
      setCanaux(await fetchIntegrationsStatut());
      setCanauxErr(null);
    } catch (err) {
      setCanauxErr(err instanceof Error ? err.message : 'Statut indisponible');
    }
  }, []);

  useEffect(() => {
    load();
    ping();
    loadCanaux();
    // Polling silencieux : l'etat connecte/deconnecte et l'activite des agents
    // doivent rester a jour pendant qu'on regarde la page.
    const t = setInterval(() => {
      load();
      ping();
      loadCanaux();
    }, 15000);
    return () => clearInterval(t);
  }, [load, ping, loadCanaux]);

  // Un agent est "connecte" si le journal contient une action agent de moins d'1h.
  const actionsAgent = journal.filter((j) => j.auteur === 'agent');
  const dernierAgent = actionsAgent[0];
  const recence = dernierAgent
    ? Date.now() - new Date(dernierAgent.at).getTime() < FENETRE_CONNEXION_MS
    : false;
  const connecte = dernierAgent !== undefined && recence;
  const derniereActivite = dernierAgent ? relTime(dernierAgent.at) : null;
  const actionsRecentes = actionsAgent.slice(0, NB_ACTIONS_LISTE);

  const API_URL = import.meta.env.VITE_API_URL || 'https://atelier-api-three.vercel.app';

  // Configs portables : le serveur MCP est un processus stdio lance par l'agent
  // sur SA machine (Mac, instance cloud...). Prerequis identique partout :
  // cloner le repo et builder le package MCP. ATELIER_API_URL pointe sur la
  // prod ; ATELIER_DATA_DIR n'est utile qu'en mode tout-local (SQLite).
  const CONFIG_HERMES = `# ~/.hermes/config.yaml
# Prerequis (sur la machine qui heberge l'agent : Mac, instance cloud...) :
#   git clone https://github.com/vlebarbier/atelier.git && cd atelier
#   npm install && npm run build -w packages/mcp
mcp:
  servers:
    atelier:
      command: node
      args: ["$HOME/atelier/packages/mcp/dist/index.js"]
      env:
        ATELIER_API_URL: "${API_URL}"`;

  const CONFIG_CLAUDE = `# ~/.claude.json (ou config MCP de Claude Code)
# Prerequis : repo clone + npm run build -w packages/mcp (voir bloc Hermes)
{
  "mcpServers": {
    "atelier": {
      "command": "node",
      "args": ["$HOME/atelier/packages/mcp/dist/index.js"],
      "env": {
        "ATELIER_API_URL": "${API_URL}"
      }
    }
  }
}`;

  const CONFIG_CODEX = `# ~/.codex/config.toml
# Prerequis : repo clone + npm run build -w packages/mcp (voir bloc Hermes)
[mcp_servers.atelier]
command = "node"
args = ["$HOME/atelier/packages/mcp/dist/index.js"]
env = { ATELIER_API_URL = "${API_URL}" }`;

  function copier(id: CopieId, texte: string) {
    navigator.clipboard?.writeText(texte).catch(() => {});
    setCopie(id);
    setTimeout(() => setCopie((c) => (c === id ? null : c)), 1800);
  }

  const apiLibelle =
    apiEtat.status === 'ok'
      ? apiEtat.mode === 'postgres'
        ? 'Cloud (Postgres)'
        : 'Local (SQLite)'
      : '';

  return (
    <Page>
      <PageHeader
        title="Intégrations"
        sub="Connectez votre agent a Atelier : il pourra lire vos brouillons, consulter la charte, piocher dans la bibliotheque et repondre a vos demandes dans le chat."
      />

      <PageSection label="État de la connexion">
        <div className="integ-etats">
          <div className={`integ-state${apiEtat.status === 'ok' ? ' on' : apiEtat.status === 'err' ? ' err' : ''}`}>
            {apiEtat.status === 'loading' ? (
              <CircleNotch size={16} className="spin" />
            ) : apiEtat.status === 'ok' ? (
              <PlugsConnected size={16} />
            ) : (
              <Plug size={16} />
            )}
            <div className="integ-state-text">
              <strong>
                {apiEtat.status === 'ok' ? 'API connectée' : apiEtat.status === 'loading' ? 'Test en cours' : 'API déconnectée'}
              </strong>
              <span>
                {apiEtat.status === 'ok'
                  ? `${apiLibelle} · ${apiEtat.ms} ms · vérifié ${relTime(new Date(apiEtat.at).toISOString())}`
                  : apiEtat.status === 'loading'
                    ? 'Ping de l API au chargement...'
                    : `Ping échoué : ${apiEtat.message}. Vérifiez que l instance est démarrée.`}
              </span>
            </div>
            <button
              className="ghost integ-relancer"
              type="button"
              onClick={ping}
              disabled={apiEtat.status === 'loading'}
            >
              {apiEtat.status === 'loading' ? <CircleNotch size={13} className="spin" /> : <ArrowSquareOut size={13} />}
              Relancer
            </button>
          </div>

          <div className={`integ-state${connecte ? ' on' : ''}`}>
            {connecte ? <PlugsConnected size={16} /> : <Plug size={16} />}
            <div className="integ-state-text">
              <strong>{connecte ? 'Agent actif (MCP)' : 'Aucun agent actif récemment'}</strong>
              <span>
                {connecte
                  ? `Dernière action agent ${derniereActivite}, ${actionsAgent.length} action(s) au journal.`
                  : dernierAgent
                    ? `Dernière action agent ${derniereActivite} (plus d'une heure). Il repasse "connecté" des qu'il agit.`
                    : 'Déposez la configuration ci-dessous dans votre agent, puis effectuez une action (lire un brouillon, répondre dans le chat).'}
              </span>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection label="Agents actifs récemment">
        {actionsRecentes.length === 0 ? (
          <EmptyState
            icon={Sparkle}
            title="Aucune action agent récente"
            sub="Des qu'un agent agit (lecture, depot, reponse), son activite apparait ici et dans l'onglet Activite IA."
          />
        ) : (
          <div className="integ-agents">
            {actionsRecentes.map((e) => {
              const meta = TYPE_META[e.type] || { icon: Sparkle, label: 'Action' };
              const IconComp = meta.icon;
              return (
                <div key={e.id} className="activite-item">
                  <span className="activite-ico">
                    <IconComp size={14} />
                  </span>
                  <span className="activite-txt">
                    <span className="activite-auteur is-agent">
                      <Sparkle size={11} weight="fill" /> Agent
                    </span>
                    <span className="activite-msg">{e.message}</span>
                  </span>
                  <span className="when">{relTime(e.at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </PageSection>

      <PageSection label="URL de l'API">
        <div className="integ-block">
          <div className="integ-block-head">
            <span className="integ-agent"><LinkSimple size={14} /> API REST Atelier</span>
            <button className="ghost" type="button" onClick={() => copier('url', API_URL)}>
              {copie === 'url' ? <Check size={13} /> : <Copy size={13} />} {copie === 'url' ? 'Copié' : 'Copier'}
            </button>
          </div>
          <pre className="integ-code"><code>{API_URL}</code></pre>
          <p className="integ-note">
            <ArrowSquareOut size={12} /> Toutes les routes (brouillons, charte, bibliotheque, journal) vivent sous
            cette base. Les agents qui ne passent pas par MCP peuvent l'appeler directement.
          </p>
        </div>
      </PageSection>

      <PageSection label="Connecter Hermes (recommandé)">
        <div className="integ-block">
          <div className="integ-block-head">
            <span className="integ-agent"><Robot size={14} /> Hermes Agent</span>
            <button className="ghost" type="button" onClick={() => copier('hermes', CONFIG_HERMES)}>
              {copie === 'hermes' ? <Check size={13} /> : <Copy size={13} />} {copie === 'hermes' ? 'Copié' : 'Copier'}
            </button>
          </div>
          <pre className="integ-code"><code>{CONFIG_HERMES}</code></pre>
          <p className="integ-note">
            <TerminalWindow size={12} /> Le MCP est lance par l'agent sur sa propre machine : cette config marche
            sur votre Mac comme sur une instance cloud. Ajoutez le bloc a votre configuration MCP, puis redemarrez
            Hermes. Les outils Atelier (lire_brouillon, get_charte, deposer_ressource, repondre_brouillon...)
            apparaissent dans le chat.
          </p>
        </div>
      </PageSection>

      <PageSection label="Connecter Claude Code">
        <div className="integ-block">
          <div className="integ-block-head">
            <span className="integ-agent"><TerminalWindow size={14} /> Claude Code</span>
            <button className="ghost" type="button" onClick={() => copier('claude', CONFIG_CLAUDE)}>
              {copie === 'claude' ? <Check size={13} /> : <Copy size={13} />} {copie === 'claude' ? 'Copié' : 'Copier'}
            </button>
          </div>
          <pre className="integ-code"><code>{CONFIG_CLAUDE}</code></pre>
        </div>
      </PageSection>

      <PageSection label="Connecter Codex">
        <div className="integ-block">
          <div className="integ-block-head">
            <span className="integ-agent"><TerminalWindow size={14} /> OpenAI Codex</span>
            <button className="ghost" type="button" onClick={() => copier('codex', CONFIG_CODEX)}>
              {copie === 'codex' ? <Check size={13} /> : <Copy size={13} />} {copie === 'codex' ? 'Copié' : 'Copier'}
            </button>
          </div>
          <pre className="integ-code"><code>{CONFIG_CODEX}</code></pre>
        </div>
      </PageSection>

      <PageSection label="Canaux de publication">
        <div className="integ-canaux">
          <div className="integ-canal">
            <span className={`integ-dot ${canauxErr || !canaux ? 'off' : canaux.postiz.configure ? (canaux.postiz.joignable ? 'ok' : 'warn') : 'off'}`} />
            <div className="integ-canal-txt">
              <strong>Postiz</strong>
              <span>
                {canauxErr
                  ? `Statut indisponible : ${canauxErr}`
                  : !canaux
                    ? 'Vérification...'
                    : canaux.postiz.configure
                      ? canaux.postiz.joignable
                        ? `Configuré · ${canaux.postiz.canaux ?? 0} canal(aux) connecté(s) · ${canaux.postiz.apiUrl}`
                        : `Configuré mais injoignable : ${canaux.postiz.erreur ?? 'erreur inconnue'}. Postiz self-hosted doit tourner sur votre machine.`
                      : 'Non configuré : renseignez POSTIZ_API_URL et POSTIZ_API_KEY (raccord local self-hosted, brouillons uniquement).'}
              </span>
            </div>
          </div>
          <div className="integ-canal">
            <span className={`integ-dot ${canauxErr || !canaux ? 'off' : canaux.sanity.configure ? 'ok' : 'off'}`} />
            <div className="integ-canal-txt">
              <strong>Sanity (blog CMS)</strong>
              <span>
                {canauxErr
                  ? `Statut indisponible : ${canauxErr}`
                  : !canaux
                    ? 'Vérification...'
                    : canaux.sanity.configure
                      ? 'Configuré : publication des articles vers le blog.'
                      : 'Non configuré : ajoutez SANITY_WRITE_TOKEN pour publier les articles.'}
              </span>
            </div>
          </div>
          <div className="integ-canal">
            <span className="integ-dot off" />
            <div className="integ-canal-txt">
              <strong>Buffer</strong>
              <span>À venir : programmation multi-reseaux depuis le calendrier.</span>
            </div>
          </div>
        </div>
      </PageSection>
    </Page>
  );
}
