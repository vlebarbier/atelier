import { useEffect, useState, useCallback } from 'react';
import { Plug, PlugsConnected, Copy, Check, Robot, TerminalWindow, LinkSimple, ArrowSquareOut } from '@phosphor-icons/react';
import { fetchJournal, type JournalEntry } from '../api';
import { relTime } from '../format';
import { Page, PageHeader, PageSection, EmptyState } from '../components/ui';

/**
 * Page Integrations : le user connecte son ou ses agents (Hermes, Claude Code,
 * Codex) a Atelier via MCP. Affiche la config a copier, l'etat de connexion
 * (derive du journal : y a-t-il des actions agent recentes ?) et les canaux
 * de publication a venir (Postiz, connexions natives).
 */
export function IntegrationsPage() {
  const [copie, setCopie] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  const load = useCallback(async () => {
    try {
      setJournal(await fetchJournal(100));
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Un agent est "connecte" si le journal contient des actions agent recentes (< 1h).
  const actionsAgent = journal.filter((j) => j.auteur === 'agent');
  const dernierAgent = actionsAgent[0];
  const connecte = dernierAgent !== undefined;
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

  function copier(texte: string) {
    navigator.clipboard?.writeText(texte).catch(() => {});
    setCopie(true);
    setTimeout(() => setCopie(false), 1800);
  }

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
            <strong>{connecte ? 'Agent connecté' : 'Aucun agent connecté'}</strong>
            <span>
              {connecte
                ? `Dernière action agent ${derniereActivite} — ${actionsAgent.length} action(s) au journal.`
                : 'Déposez la configuration ci-dessous dans votre agent, puis effectuez une action (lire un brouillon, répondre dans le chat).'}
            </span>
          </div>
        </div>
      </PageSection>

      <PageSection label="Connecter Hermes (recommandé)">
        <div className="integ-block">
          <div className="integ-block-head">
            <span className="integ-agent"><Robot size={14} /> Hermes Agent</span>
            <button className="ghost" type="button" onClick={() => copier(CONFIG_HERMES)}>
              {copie ? <Check size={13} /> : <Copy size={13} />} {copie ? 'Copié' : 'Copier'}
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
            <button className="ghost" type="button" onClick={() => copier(CONFIG_CLAUDE)}>
              <Copy size={13} /> Copier
            </button>
          </div>
          <pre className="integ-code"><code>{CONFIG_CLAUDE}</code></pre>
        </div>
      </PageSection>

      <PageSection label="Connecter Codex">
        <div className="integ-block">
          <div className="integ-block-head">
            <span className="integ-agent"><TerminalWindow size={14} /> OpenAI Codex</span>
            <button className="ghost" type="button" onClick={() => copier(CONFIG_CODEX)}>
              <Copy size={13} /> Copier
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
          <div className="integ-canal">
            <ArrowSquareOut size={14} />
            <span>API REST publique — {API_URL}</span>
          </div>
        </div>
      </PageSection>

      {journal.length === 0 && (
        <EmptyState title="Le journal est vide" sub="Des qu'un agent agit (lecture, depot, reponse), son activite apparait ici et dans l'onglet Activite IA." />
      )}
    </Page>
  );
}
