import { useCallback, useEffect, useState } from 'react';
import { ArrowClockwise, CheckCircle, Palette, TextT, Warning } from '@phosphor-icons/react';
import { fetchConformiteBrouillon, type VerdictConformite } from '../api';

/**
 * Section « Conformité » du panneau de révision (F-34) : le verdict de la
 * source HTML face à la charte active + le détail des écarts (couleurs et
 * polices hors charte).
 *
 * F-35 (re-contrôle à chaque modification) : le parent remonte `refreshKey`
 * quand la source change (régénération), la section relance le contrôle.
 * Autonome : elle fetch son propre verdict, le parent ne fait que la poser.
 */
export function ConformiteSection({ brouillonId, refreshKey = 0 }: { brouillonId: string; refreshKey?: number }) {
  const [verdict, setVerdict] = useState<VerdictConformite | null>(null);
  const [chargement, setChargement] = useState(true);

  const controler = useCallback(async () => {
    setChargement(true);
    try {
      setVerdict(await fetchConformiteBrouillon(brouillonId));
    } catch {
      /* silencieux : la section reste discrète si le contrôle échoue */
    } finally {
      setChargement(false);
    }
  }, [brouillonId]);

  useEffect(() => {
    controler();
  }, [controler, refreshKey]);

  if (!verdict) return null;

  return (
    <section className="sp-section conf-section">
      <div className="sp-section-head">
        <span>Conformité</span>
      </div>

      {verdict.statut === 'conforme' && (
        <div className="conf-verdict ok">
          <CheckCircle size={13} weight="bold" /> Conforme à la charte
        </div>
      )}

      {verdict.statut === 'hors-charte' && (
        <>
          <div className="conf-verdict warn">
            <Warning size={13} weight="bold" />
            {verdict.ecarts.length === 1 ? '1 écart avec la charte' : `${verdict.ecarts.length} écarts avec la charte`}
          </div>
          <ul className="conf-ecarts">
            {verdict.ecarts.map((e, i) => (
              <li key={`${e.nature}-${e.valeur}-${i}`}>
                {e.nature === 'couleur' ? <Palette size={11} /> : <TextT size={11} />}
                <code>{e.valeur}</code>
                <span>{e.detail}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {verdict.statut === 'sans-source' && (
        <p className="conf-hint">Pas de source HTML : déposez la source pour contrôler la conformité.</p>
      )}

      {verdict.statut === 'sans-charte' && (
        <p className="conf-hint">Charte vide : importez votre charte (page Charte) pour activer le contrôle.</p>
      )}

      <button type="button" className="ghost conf-refresh" onClick={controler} disabled={chargement}>
        <ArrowClockwise size={12} /> {chargement ? 'Contrôle...' : 'Re-contrôler'}
      </button>
    </section>
  );
}
