import { useEffect, useState, useCallback } from 'react';
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
 */

type FiltreAuteur = 'tous' | 'agent' | 'user';

interface TypeMeta {
  icon: Icon;
  label: string;
}

const TYPE_META: Record<string, TypeMeta> = {
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

export function ActivityPage() {
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

  return (
    <Page>
      <PageHeader
        title="Activite IA"
        count={entries.length}
        sub="Journal reel des actions de vos agents sur les contenus, la bibliotheque et la charte."
      />
      {entries.length > 0 && (
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
            return (
              <div key={e.id} className="activite-item">
                <span className={`activite-ico activite-ico--${e.type}`}>
                  <IconComp size={14} />
                </span>
                <span className="activite-txt">
                  <span className={`activite-auteur ${estAgent ? 'is-agent' : ''}`}>
                    {estAgent ? <Sparkle size={11} weight="fill" /> : <User size={11} />}
                    {AUTEUR_LABELS[e.auteur] || e.auteur}
                  </span>
                  <span className="activite-msg">{e.message}</span>
                </span>
                <span className="when">{relTime(e.at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
