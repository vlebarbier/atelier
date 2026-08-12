import { useEffect, useState, useCallback } from 'react';
import {
  PlugsConnected,
  Plug,
  Robot,
  Check,
  WarningCircle,
  ArrowClockwise
} from '@phosphor-icons/react';
import { fetchHealth, fetchJournal, type JournalEntry } from '../api';
import { RESEAUX, RESEAUX_LABELS } from '../format';
import { Page, PageHeader, PageSection } from '../components/ui';
import './settings-help.css';

/**
 * Page Parametres (v1) : profil (nom + avatar initiales), preferences par defaut
 * (theme, vue, reseau) stockees en localStorage, et etat du systeme (API via
 * GET /api/health, agent via l'activite recente du journal).
 * Les clefs localStorage sont celles deja lues par App.tsx (atelier-theme,
 * atelier.vue.defaut) pour que les reglages s'appliquent au prochain chargement.
 */

/** Clefs localStorage des preferences. */
const CLEF_NOM = 'atelier.profil.nom';
const CLEF_THEME = 'atelier-theme';
const CLEF_VUE = 'atelier.vue.defaut';
const CLEF_RESEAU = 'atelier.reseau.defaut';

/** Fenetre de recence pour considerer un agent "actif" (derniere action au journal). */
const FENETRE_ACTIVITE_MS = 60 * 60 * 1000; // 1h

type EtatApi =
  | { status: 'loading' }
  | { status: 'ok'; mode: string; ms: number }
  | { status: 'err'; message: string };

export function SettingsPage() {
  // Profil
  const [nom, setNom] = useState(() => localStorage.getItem(CLEF_NOM) ?? '');

  // Preferences
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    localStorage.getItem(CLEF_THEME) === 'light' ? 'light' : 'dark'
  );
  const [vue, setVue] = useState<'grille' | 'liste'>(() =>
    localStorage.getItem(CLEF_VUE) === 'liste' ? 'liste' : 'grille'
  );
  const [reseau, setReseau] = useState<string>(() => localStorage.getItem(CLEF_RESEAU) ?? 'instagram');

  // Etat du systeme
  const [api, setApi] = useState<EtatApi>({ status: 'loading' });
  const [journal, setJournal] = useState<JournalEntry[]>([]);

  const checkApi = useCallback(async () => {
    setApi({ status: 'loading' });
    const t0 = performance.now();
    try {
      const h = await fetchHealth();
      setApi({ status: 'ok', mode: h.mode, ms: Math.round(performance.now() - t0) });
    } catch (err) {
      setApi({
        status: 'err',
        message: err instanceof Error ? err.message : 'API injoignable'
      });
    }
  }, []);

  useEffect(() => {
    checkApi();
  }, [checkApi]);

  useEffect(() => {
    fetchJournal(50)
      .then(setJournal)
      .catch(() => {
        /* silencieux : l'etat agent reste inconnu */
      });
  }, []);

  function changerTheme(t: 'dark' | 'light') {
    setTheme(t);
    localStorage.setItem(CLEF_THEME, t);
    document.documentElement.setAttribute('data-theme', t);
  }

  function changerVue(v: 'grille' | 'liste') {
    setVue(v);
    localStorage.setItem(CLEF_VUE, v);
  }

  function changerReseau(r: string) {
    setReseau(r);
    localStorage.setItem(CLEF_RESEAU, r);
  }

  function changerNom(v: string) {
    setNom(v);
    localStorage.setItem(CLEF_NOM, v);
  }

  const initiales =
    nom
      .trim()
      .split(/\s+/)
      .map((m) => m.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'A';

  // Agent "actif" si une action agent de moins d'1h figure au journal (meme
  // derivee que la page Integrations : le web ne peut pas interroger le serveur
  // MCP directement, l'activite du journal est le signal le plus fiable).
  const dernierAgent = journal.find((j) => j.auteur === 'agent');
  const agentActif = dernierAgent
    ? Date.now() - new Date(dernierAgent.at).getTime() < FENETRE_ACTIVITE_MS
    : false;

  const modeLabel = api.status === 'ok' ? (api.mode === 'postgres' ? 'cloud (Postgres)' : 'local (SQLite)') : '';

  return (
    <Page>
      <PageHeader
        title="Paramètres"
        sub="Profil, preferences par defaut et etat du systeme. Les reglages sont enregistres sur cet appareil et s'appliquent des la prochaine ouverture."
      />

      <PageSection label="Profil">
        <div className="pref-row">
          <div className="avatar" aria-hidden="true">{initiales}</div>
          <div className="pref-label">
            <strong>Avatar</strong>
            <span>Initiales derivees du nom (photo de profil a venir).</span>
          </div>
          <div className="pref-control">
            <input
              className="settings-input"
              type="text"
              value={nom}
              onChange={(e) => changerNom(e.target.value)}
              placeholder="Votre nom"
              aria-label="Nom affiche dans le profil"
            />
          </div>
        </div>
      </PageSection>

      <PageSection label="Préférences">
        <div className="pref-row">
          <div className="pref-label">
            <strong>Theme par defaut</strong>
            <span>Sombre ou clair a l'ouverture. S'applique immediatement.</span>
          </div>
          <div className="pref-control">
            <select
              className="settings-select"
              value={theme}
              onChange={(e) => changerTheme(e.target.value as 'dark' | 'light')}
              aria-label="Theme par defaut"
            >
              <option value="dark">Sombre</option>
              <option value="light">Clair</option>
            </select>
          </div>
        </div>

        <div className="pref-row">
          <div className="pref-label">
            <strong>Vue par defaut</strong>
            <span>Grille ou liste dense pour la page Contenus.</span>
          </div>
          <div className="pref-control">
            <select
              className="settings-select"
              value={vue}
              onChange={(e) => changerVue(e.target.value as 'grille' | 'liste')}
              aria-label="Vue par defaut"
            >
              <option value="grille">Grille</option>
              <option value="liste">Liste</option>
            </select>
          </div>
        </div>

        <div className="pref-row">
          <div className="pref-label">
            <strong>Reseau par defaut</strong>
            <span>Reseau preselectionne dans le panneau de revision d'un contenu.</span>
          </div>
          <div className="pref-control">
            <select
              className="settings-select"
              value={reseau}
              onChange={(e) => changerReseau(e.target.value)}
              aria-label="Reseau par defaut"
            >
              {RESEAUX.map((r) => (
                <option key={r} value={r}>{RESEAUX_LABELS[r] ?? r}</option>
              ))}
            </select>
          </div>
        </div>
      </PageSection>

      <PageSection label="État du système">
        <div className="sys-row">
          <span className="sys-ico">
            {api.status === 'ok' ? <Check size={16} /> : api.status === 'loading' ? <ArrowClockwise size={16} className="spin" /> : <WarningCircle size={16} />}
          </span>
          <div className="sys-text">
            <strong>API Atelier</strong>
            {api.status === 'loading' && <span>Verification de la connexion...</span>}
            {api.status === 'ok' && <span>API joignable · {modeLabel} · {api.ms} ms.</span>}
            {api.status === 'err' && <span>API injoignable : {api.message}</span>}
          </div>
          <div className="sys-actions">
            {api.status === 'ok' && <span className="sys-badge ok">OK</span>}
            {api.status === 'err' && <span className="sys-badge err">ERREUR</span>}
            <button className="ghost" type="button" onClick={checkApi} disabled={api.status === 'loading'}>
              <ArrowClockwise size={13} /> Tester
            </button>
          </div>
        </div>

        <div className="sys-row">
          <span className="sys-ico">
            {agentActif ? <PlugsConnected size={16} /> : <Plug size={16} />}
          </span>
          <div className="sys-text">
            <strong>Agent (MCP)</strong>
            {agentActif ? (
              <span>Agent actif : derniere action il y a moins d'une heure au journal.</span>
            ) : (
              <span>
                Aucune activite agent recente. L'agent est un acteur externe (Hermes, Claude Code, Codex) :
                il redevient actif des qu'il agit. Voir la page Integrations pour la configuration MCP.
              </span>
            )}
          </div>
          <div className="sys-actions">
            {agentActif ? <span className="sys-badge ok">ACTIF</span> : <span className="sys-badge neutral">INACTIF</span>}
            <span className="sys-agent-ico"><Robot size={14} /></span>
          </div>
        </div>
      </PageSection>
    </Page>
  );
}
