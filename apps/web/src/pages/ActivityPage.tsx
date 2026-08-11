import { Sparkle } from '@phosphor-icons/react';
import type { Brouillon } from '../api';
import { relTime } from '../format';
import { Page, PageHeader, EmptyState } from '../components/ui';

interface ActivityPageProps {
  brouillons: Brouillon[];
}

/** Fil d'activite simule a partir des brouillons reels, alimente en Phase 3 par le serveur MCP. */
export function ActivityPage({ brouillons }: ActivityPageProps) {
  const items = brouillons.slice(0, 8).map((b) => ({
    id: b.id,
    txt: `Hermes a genere le brouillon "${b.titre}"`,
    when: relTime(b.updated)
  }));

  return (
    <Page>
      <PageHeader
        title="Activite IA"
        sub="Chronologie des actions de vos agents sur les brouillons."
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Sparkle}
          title="Aucune activite agent pour l'instant"
          sub="Des qu'un agent generera ou modifiera un brouillon, son action apparaitra ici."
        />
      ) : (
        <>
          <div className="activite-feed">
            {items.map((i) => (
              <div key={i.id} className="activite-item">
                <span className="dot" />
                <span className="txt">
                  <strong>Hermes</strong> {i.txt.replace('Hermes ', '')}
                </span>
                <span className="when">{i.when}</span>
              </div>
            ))}
          </div>
          <div className="activite-note">Alimente par le serveur MCP Atelier (lecture/ecriture des brouillons par les agents).</div>
        </>
      )}
    </Page>
  );
}
