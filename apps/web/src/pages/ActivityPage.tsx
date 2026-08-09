import type { Brouillon } from '../api';
import { relTime } from '../format';

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

  if (items.length === 0) {
    return <div className="placeholder">Aucune activite agent pour l'instant.</div>;
  }

  return (
    <div>
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
    </div>
  );
}
