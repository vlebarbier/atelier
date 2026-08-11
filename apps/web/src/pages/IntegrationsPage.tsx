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
  CircleNotch
} from '@phosphor-icons/react';
import { fetchJournal, fetchHealth, type JournalEntry } from '../api';
import { relTime } from '../format';
import { Page, PageHeader, PageSection, EmptyState } from '../components/ui';

/**
 * Page Integrations : le user connecte son ou ses agents (Hermes, Claude Code,
 * Codex) a Atelier via MCP. Affiche la config a copier, l'URL de l'API, un test
 * de connexion (GET /api/health), l'etat de connexion (derive du journal : y
 * a-t-il des actions agent recentes < 1h ?) et les canaux de publication a
 * venir (Postiz, connexions natives).
 */

/** Fenetre de recence pour considerer un agent "connecte" (derniere action). */
const FENETRE_CONNEXION_MS = 60 * 60 * 1000; // 1h

type CopieId = 'hermes' | 'claude' | 'codex' | 'url' | null;

type TestEtat =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; mode: string; ms: number }
  | { status: 'err'; message: string };

export function IntegrationsPage() {
  const [copie, setCopie] = useState<CopieId>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [test, setTest] = useState<TestEtat>({ status: 'idle' });

  const load = useCallback(async () => {
    try {
      setJournal(await fetchJournal(100));
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => {
    load();
    // Polling silencieux : les agents travaillent pendant qu'on regarde la page.
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Un agent est "connecte" si le journal contient une action agent de moins d'1h.
  const actionsAgent = journal.filter((j) => j.auteur === 'agent');
  const dernierAgent = actionsAgent[0];
  const recence = dernierAgent
    ? Date.now() - new Date(dernierAgent.at).getTime() < FENETRE_CONNEXION_MS
    : false;
  const connecte = dernierAgent !== undefined && recence;
  const derniereActivite = dernierAgent ? relTime(dernierAgent.at) : null;

  const API_URL = import.meta.env.VITE_API_URL || 'https://atelier-api-three.vercel.app';

  const CONFIG_HERMES = `# ~/.hermes/config.yaml
mcp:
  servers:
    atelier:
      command: node
      args: ["/Users/victorlebarbier/Atelier/packages/mcp/dist/index.js"]
      env:
        ATELIER_API_URL: "${API_URL}"
        ATELIER_DATA_DIR: "/Users/victorlebarbier/Atelier/apps/api/data/brouillons"`;

  const CONFIG_CLAUDE = `# ~/.claude.json (ou config MCP de Claude Code)
{
  "mcpServers": {
    "atelier": {
      "command": "node",
      "args": ["/Users/victorlebarbier/Atelier/packages/mcp/dist/index.js"],
      "env": {
        "ATELIER_API_URL": "${API_URL}"
      }
    }
  }
}`;

  const CONFIG_CODEX = `# ~/.codex/config.toml
[mcp_servers.atelier]
command = "node"
args = ["/Users/victorlebarbier/Atelier/packages/mcp/dist/index.js"]
env = { ATELIER_API_URL = "${API_URL}" }`;

  function copier(id: CopieId, texte: string) {
    navigator.clipboard?.writeText(texte).catch(() => {});
    setCopie(id);
    setTimeout(() => setCopie((c) => (c === id ? null : c)), 1800);
  }

  async function tester() {
    setTest({ status: 'loading' });
    const t0 = performance.now();
    try {
      const h = await fetchHealth();
      setTest({ status: 'ok', mode: h.mode, ms: Math.round(performance.now() - t0) });
    } catch (err) {
      setTest({
        status: 'err',
        message: err instanceof Error ? err.message : 'API injoignable'
      });
    }
  }

  const MODE_LABEL = test.status === 'ok' ? (test.mode === 'postgres' ? 'cloud (Postgres)' : 'local (SQLite)') : '';

  return (
    <Page>
      <PageHeader
        title="Intégrations"
        sub="Connectez votre agent a Atelier : il pourra lire vos brouillons, consulter la charte, piocher dans la bibliotheque et repondre a vos demandes dans le chat."
      />

      <PageSection label="État de la connexion">
        <div className={`integ-state${connecte ? ' on' : ''}`}>
          {connecte ? <PlugsConnected size={16} /> : <Plug size={16} />}
          <div className="integ-state-text">
            <strong>{connecte ? 'Agent connecté' : 'Aucun agent actif récemment'}</strong>
            <span>
              {connecte
                ? `Dernière action agent ${derniereActivite} — ${actionsAgent.length} action(s) au journal.`
                : dernierAgent
                  ? `Dernière action agent ${derniereActivite} (plus d'une heure). L'agent repasse "connecté" des qu'il agit.`
                  : 'Déposez la configuration ci-dessous dans votre agent, puis effectuez une action (lire un brouillon, répondre dans le chat).'}
            </span>
          </div>
        </div>
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

      <PageSection label="Tester la connexion">
        <div className="integ-block">
          <div className="integ-block-head">
            <span className="integ-agent"><PlugsConnected size={14} /> Vérifier que l'API répond</span>
            <button className="ghost" type="button" onClick={tester} disabled={test.status === 'loading'}>
              {test.status === 'loading' ? <CircleNotch size={13} className="spin" /> : <ArrowSquareOut size={13} />}
              {test.status === 'loading' ? 'Test en cours…' : 'Tester la connexion'}
            </button>
          </div>
          {test.status === 'idle' && (
            <p className="integ-note">
              <LinkSimple size={12} /> Interroge GET /api/health et affiche le mode de stockage et la latence.
            </p>
          )}
          {test.status === 'ok' && (
            <p className="integ-note integ-test-ok">
              <Check size={12} /> API joignable — {MODE_LABEL} — {test.ms} ms.
            </p>
          )}
          {test.status === 'err' && (
            <p className="integ-note integ-test-err">
              <WarningCircle size={12} /> API injoignable : {test.message}. Vérifiez l'URL et que l'instance est
              démarrée.
            </p>
          )}
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
            <TerminalWindow size={12} /> Ajoutez ce bloc a votre configuration MCP, puis redemarrez Hermes. Les
            outils Atelier (lire_brouillon, get_charte, deposer_ressource, repondre_brouillon...) apparaissent dans le chat.
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

      <PageSection label="Canaux de publication (a venir)">
        <div className="integ-canaux">
          <div className="integ-canal">
            <LinkSimple size={14} />
            <span>Postiz — publication vers les reseaux (draft uniquement, workflow inalienable)</span>
          </div>
          <div className="integ-canal">
            <LinkSimple size={14} />
            <span>Connexions natives (Instagram, LinkedIn, GMB, blog CMS) — strategie publiee dans STRATEGIE-PUBLICATION.md</span>
          </div>
        </div>
      </PageSection>

      {journal.length === 0 && (
        <EmptyState title="Le journal est vide" sub="Des qu'un agent agit (lecture, depot, reponse), son activite apparait ici et dans l'onglet Activite IA." />
      )}
    </Page>
  );
}
