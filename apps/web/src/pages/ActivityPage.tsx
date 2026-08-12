import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Sparkle,
  User,
  Plus,
  Code,
  ArrowClockwise,
  ChatCircleText,
  ChatText,
  CheckCircle,
  FolderOpen,
  PaintBrush,
  Trash,
  ListChecks,
  CalendarCheck,
  CaretRight,
  type Icon
} from '@phosphor-icons/react';
import { fetchJournal, type JournalEntry } from '../api';
import { relTime } from '../format';
import { Page, PageHeader, EmptyState } from '../components/ui';

/**
 * Page Activite IA : le journal REEL des actions agents, lu depuis l'API
 * (GET /api/journal). Plus de fil simule : chaque depot de source, regeneration,
 * reponse chat, changement de statut, depot de ressource est inscrit par l'API
 * (le client MCP envoie x-atelier-auteur: agent, l'UI web est user).
 * Polling silencieux 30s : les actions des agents apparaissent en direct.
 * En tete : les stats du jour (actions agents, creations, temps de reponse
 * moyen). Chaque entree liee a un brouillon est cliquable et l'ouvre.
 */

type FiltreAuteur = 'tous' | 'agent' | 'user';

interface TypeMeta {
  icon: Icon;
  label: string;
}

export const TYPE_META: Record<string, TypeMeta> = {
  creation: { icon: Plus, label: 'Creation' },
  depot_source: { icon: Code, label: 'Source' },
  regeneration: { icon: ArrowClockwise, label: 'Regeneration' },
  reponse_chat: { icon: ChatCircleText, label: 'Reponse agent' },
  message_user: { icon: ChatText, label: 'Message' },
  changement_statut: { icon: CheckCircle, label: 'Statut' },
  depot_ressource: { icon: FolderOpen, label: 'Bibliotheque' },
  charte_import: { icon: PaintBrush, label: 'Charte' },
  charte_maj: { icon: PaintBrush, label: 'Charte' },
  suppression: { icon: Trash, label: 'Suppression' },
  reorganisation: { icon: ListChecks, label: 'Slides' },
  programmation: { icon: CalendarCheck, label: 'Programmation' }
};

const AUTEUR_LABELS: Record<string, string> = {
  agent: 'Agent',
  user: 'Vous',
  system: 'Systeme'
};

const FILTRES: { id: FiltreAuteur; label: string }[] = [
  { id: 'tous', label: 'Tous' },
  { id: 'agent', label: 'Agents' },
  { id: 'user', label: 'Vous' }
];

/** Les entrees du jour uniquement (les stats sont "du jour"). */
function estAujourdhui(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

/**
 * Temps de reponse moyen de l'agent : ecart entre un message_user et la
 * reponse_chat suivante sur le meme brouillon. Retourne des minutes
 * arrondies, ou null si aucun couple message/reponse n'est disponible.
 */
function tempsMoyenReponse(entries: JournalEntry[]): number | null {
  const ordonnees = [...entries].sort((a, b) => +new Date(a.at) - +new Date(b.at));
  const enAttente = new Map<string, number>();
  const ecarts: number[] = [];
  for (const e of ordonnees) {
    if (!e.brouillonId) continue;
    if (e.type === 'message_user') {
      enAttente.set(e.brouillonId, +new Date(e.at));
    } else if (e.type === 'reponse_chat') {
      const debut = enAttente.get(e.brouillonId);
      if (debut !== undefined) {
        ecarts.push(+new Date(e.at) - debut);
        enAttente.delete(e.brouillonId);
      }
    }
  }
  if (!ecarts.length) return null;
  return Math.round(ecarts.reduce((a, b) => a + b, 0) / ecarts.length / 60000);
}

/** "1 min", "45 min", "1 h 12" : duree lisible sans en-dash ni em-dash. */
function formatDuree(min: number): string {
  if (min < 1) return '< 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

export function ActivityPage({ onOpen }: { onOpen?: (id: string) => void }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<FiltreAuteur>('tous');

  const load = useCallback(async () => {
    try {
      const data = await fetchJournal(100);
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  // Polling silencieux : les agents travaillent pendant qu'on regarde la page.
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const visibles = filtre === 'tous' ? entries : entries.filter((e) => e.auteur === filtre);

  // Stats du jour, recalculees a chaque refresh du journal.
  const duJour = useMemo(() => entries.filter((e) => estAujourdhui(e.at)), [entries]);
  const actionsAgents = duJour.filter((e) => e.auteur === 'agent').length;
  const creations = duJour.filter((e) => e.type === 'creation').length;
  const tempsMoyen = tempsMoyenReponse(duJour);

  return (
    <Page>
      <PageHeader
        title="Activite IA"
        count={entries.length}
        sub="Journal reel des actions de vos agents. Cliquez sur une entree pour ouvrir le brouillon concerne."
      />
      {entries.length > 0 && (
        <>
          <section className="page-section activite-stats-section" aria-label="Stats du jour">
            <div className="page-section-label">Aujourd'hui</div>
            <div className="activite-stats">
              <div className="activite-stat">
                <span className="activite-stat-label">Actions agents</span>
                <span className="activite-stat-value">{actionsAgents}</span>
              </div>
              <div className="activite-stat">
                <span className="activite-stat-label">Creations</span>
                <span className="activite-stat-value">{creations}</span>
              </div>
              <div className="activite-stat">
                <span className="activite-stat-label">Temps de reponse moyen</span>
                <span className="activite-stat-value">{tempsMoyen === null ? '-' : formatDuree(tempsMoyen)}</span>
              </div>
            </div>
          </section>
          <div className="toolbar-quiet activite-filtres" role="tablist" aria-label="Filtrer par auteur">
            {FILTRES.map((f) => (
              <button
                key={f.id}
                className={filtre === f.id ? 'on' : ''}
                data-f={f.id}
                onClick={() => setFiltre(f.id)}
              >
                {f.label}
              </button>
            ))}
            <span className="count">{visibles.length} action{visibles.length > 1 ? 's' : ''}</span>
          </div>
        </>
      )}
      {loading ? (
        <div className="page-section">
          <div className="activite-skeleton" aria-hidden="true" />
          <div className="activite-skeleton" aria-hidden="true" />
          <div className="activite-skeleton" aria-hidden="true" />
        </div>
      ) : error ? (
        <EmptyState
          icon={Sparkle}
          title="Journal indisponible"
          sub={`Impossible de charger l'activite : ${error}`}
        />
      ) : visibles.length === 0 ? (
        filtre === 'tous' ? (
          <EmptyState
            icon={Sparkle}
            title="Aucune activite agent pour l'instant"
            sub="Des qu'un agent deposera une source, regenerea des slides ou repondra dans une conversation, son action apparaitra ici."
          />
        ) : (
          <EmptyState
            icon={Sparkle}
            title="Aucune action de ce cote"
            sub="Changez de filtre pour voir toute l'activite."
          />
        )
      ) : (
        <div className="activite-feed">
          {visibles.map((e) => {
            const meta = TYPE_META[e.type] || { icon: Sparkle, label: 'Action' };
            const IconComp = meta.icon;
            const estAgent = e.auteur === 'agent';
            // Ouvrable si l'entree pointe vers un brouillon existant encore.
            const ouvrable = !!onOpen && !!e.brouillonId && e.type !== 'suppression';
            // Le titre du brouillon en ligne tertiaire, sauf s'il est deja dans le message.
            const titreCible =
              e.brouillonTitre && e.brouillonId && !e.message.includes(e.brouillonTitre)
                ? e.brouillonTitre
                : null;
            const inner = (
              <>
                <span className={`activite-ico activite-ico--${e.type}`}>
                  <IconComp size={14} />
                </span>
                <span className="activite-txt">
                  <span className={`activite-auteur ${estAgent ? 'is-agent' : ''}`}>
                    {estAgent ? <Sparkle size={11} weight="fill" /> : <User size={11} />}
                    {AUTEUR_LABELS[e.auteur] || e.auteur}
                  </span>
                  <span className="activite-msg">{e.message}</span>
                  {titreCible && (
                    <span className="activite-cible">
                      <FolderOpen size={11} />
                      {titreCible}
                    </span>
                  )}
                </span>
                <span className="when">{relTime(e.at)}</span>
                {ouvrable && <CaretRight size={13} className="activite-chevron" />}
              </>
            );
            return ouvrable ? (
              <button
                key={e.id}
                type="button"
                className="activite-item is-link"
                onClick={() => onOpen(e.brouillonId!)}
              >
                {inner}
              </button>
            ) : (
              <div key={e.id} className="activite-item">
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
