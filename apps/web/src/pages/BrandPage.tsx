import { useEffect, useState } from 'react';
import { Check, Palette, TextT, ImageSquare, Plus, Trash, FileCode, UploadSimple } from '@phosphor-icons/react';
import tokens from '@atelier/tokens';
import { fetchCharte, saveCharte, importCharte, type Charte } from '../api';

interface TokenSwatch {
  name: string;
  value: string;
}

function collectColors(): TokenSwatch[] {
  const swatches: TokenSwatch[] = [];
  const color = (tokens as { color?: Record<string, unknown> }).color;
  if (!color) return swatches;

  function walk(node: Record<string, unknown>, prefix: string) {
    for (const [key, val] of Object.entries(node)) {
      if (val && typeof val === 'object' && '$value' in (val as Record<string, unknown>)) {
        const entry = val as { $value: string };
        swatches.push({ name: `${prefix}${key}`, value: entry.$value });
      } else if (val && typeof val === 'object') {
        walk(val as Record<string, unknown>, `${prefix}${key}-`);
      }
    }
  }
  walk(color, 'color-');
  return swatches;
}

interface CharteData {
  couleurs: Record<string, string>;
  polices: { titre: string; texte: string };
  logos: string[];
}

const DEFAULT_CHARTE: CharteData = {
  couleurs: {},
  polices: { titre: '', texte: '' },
  logos: []
};

function parseCharte(data: string): CharteData {
  try {
    const parsed = JSON.parse(data);
    return {
      couleurs: parsed.couleurs || {},
      polices: { titre: parsed.polices?.titre || '', texte: parsed.polices?.texte || '' },
      logos: Array.isArray(parsed.logos) ? parsed.logos : []
    };
  } catch {
    return DEFAULT_CHARTE;
  }
}

/** La page Charte : editeur de la charte graphique du client (injectee dans le rendu et les agents). */
export function BrandPage() {
  const [charte, setCharte] = useState<CharteData>(DEFAULT_CHARTE);
  const [nom, setNom] = useState('Charte principale');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cssInput, setCssInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<{ couleurs: number; polices: number; rayons: number; logos: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    fetchCharte()
      .then((c: Charte) => {
        setNom(c.nom);
        setCharte(parseCharte(c.data));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function onSave() {
    const ok = await saveCharte(nom, JSON.stringify(charte));
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function onImport() {
    if (!cssInput.trim()) return;
    setImporting(true);
    setImportError(null);
    setImportStats(null);
    try {
      const result = await importCharte(cssInput, nom);
      setCharte(parseCharte(result.data));
      setImportStats(result.stats);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import impossible');
    } finally {
      setImporting(false);
    }
  }

  function setCouleur(key: string, value: string) {
    setCharte((c) => ({ ...c, couleurs: { ...c.couleurs, [key]: value } }));
  }

  function removeCouleur(key: string) {
    setCharte((c) => {
      const couleurs = { ...c.couleurs };
      delete couleurs[key];
      return { ...c, couleurs };
    });
  }

  function addCouleur() {
    setCharte((c) => ({ ...c, couleurs: { ...c.couleurs, [`couleur-${Object.keys(c.couleurs).length + 1}`]: '#6f7f75' } }));
  }

  const swatches = collectColors();
  const fontFamily = (tokens as { font?: { family?: { ui?: { $value?: string } } } }).font?.family?.ui?.$value;
  const radii = (tokens as { radius?: Record<string, { $value: string }> }).radius || {};

  if (loading) {
    return <div className="placeholder">Chargement de la charte...</div>;
  }

  return (
    <div className="brand-page">
      <div className="brand-editor-head">
        <div>
          <h2>Charte graphique</h2>
          <p className="brand-editor-sub">
            Votre direction artistique, injectee dans le pipeline de rendu et les instructions de vos agents.
          </p>
        </div>
        <div className="brand-editor-actions">
          <input
            className="brand-nom-input"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom de la charte"
            aria-label="Nom de la charte"
          />
          <button className="primary" type="button" onClick={onSave}>
            <Check size={14} weight="bold" /> {saved ? 'Enregistre' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <section className="brand-section brand-import">
        <h3>
          <FileCode size={13} /> Importer une charte existante
        </h3>
        <p className="brand-editor-sub">
          Collez le CSS de votre agent, de Claude Design ou d'un export Figma. Atelier le traite et
          extrait couleurs, polices, rayons et logos.
        </p>
        <textarea
          className="brand-import-input"
          value={cssInput}
          onChange={(e) => setCssInput(e.target.value)}
          placeholder={':root {\n  --bordeaux: #422928;\n  --font-titre: "Cormorant Garamond", serif;\n  --radius-card: 12px;\n}'}
          rows={6}
          aria-label="CSS de la charte a importer"
        />
        <div className="brand-import-actions">
          <button className="ghost" type="button" onClick={onImport} disabled={importing || !cssInput.trim()}>
            <UploadSimple size={14} /> {importing ? 'Traitement...' : 'Traiter le CSS'}
          </button>
          {importStats && (
            <span className="brand-import-stats">
              {importStats.couleurs} couleurs, {importStats.polices} polices, {importStats.rayons} rayons, {importStats.logos} logos
            </span>
          )}
        </div>
        {importError && <p className="brand-import-error">{importError}</p>}
      </section>

      <section className="brand-section">
        <h3>
          <Palette size={13} /> Couleurs
        </h3>
        <div className="charte-colors">
          {Object.entries(charte.couleurs).map(([key, value]) => (
            <div className="charte-color-row" key={key}>
              <div className="charte-color-preview" style={{ background: value }} />
              <input
                className="charte-color-name"
                value={key}
                onChange={(e) => {
                  const next: Record<string, string> = {};
                  for (const [k, v] of Object.entries(charte.couleurs)) {
                    next[k === key ? e.target.value : k] = v;
                  }
                  setCharte((c) => ({ ...c, couleurs: next }));
                }}
                aria-label="Nom de la couleur"
              />
              <input
                className="charte-color-value"
                value={value}
                onChange={(e) => setCouleur(key, e.target.value)}
                aria-label="Valeur hex"
              />
              <input
                type="color"
                className="charte-color-picker"
                value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
                onChange={(e) => setCouleur(key, e.target.value)}
                aria-label="Choix de couleur"
              />
              <button className="ghost danger" type="button" onClick={() => removeCouleur(key)} title="Supprimer">
                <Trash size={13} />
              </button>
            </div>
          ))}
          <button className="ghost" type="button" onClick={addCouleur}>
            <Plus size={13} /> Ajouter une couleur
          </button>
        </div>
        {Object.keys(charte.couleurs).length === 0 && (
          <p className="charte-empty">Aucune couleur. Ajoutez votre palette (ex: #422928 pour Bordeluche).</p>
        )}
      </section>

      <section className="brand-section">
        <h3>
          <TextT size={13} /> Typographie
        </h3>
        <div className="charte-polices">
          <div className="field">
            <label htmlFor="police-titre">Police des titres</label>
            <input
              id="police-titre"
              value={charte.polices.titre}
              onChange={(e) => setCharte((c) => ({ ...c, polices: { ...c.polices, titre: e.target.value } }))}
              placeholder="Ex: Cormorant Garamond"
            />
          </div>
          <div className="field">
            <label htmlFor="police-texte">Police du texte</label>
            <input
              id="police-texte"
              value={charte.polices.texte}
              onChange={(e) => setCharte((c) => ({ ...c, polices: { ...c.polices, texte: e.target.value } }))}
              placeholder="Ex: Jost"
            />
          </div>
        </div>
      </section>

      <section className="brand-section">
        <h3>
          <ImageSquare size={13} /> Logos
        </h3>
        <div className="charte-logos">
          {charte.logos.map((logo, i) => (
            <div className="charte-logo-row" key={i}>
              <img src={logo} alt={`Logo ${i + 1}`} className="charte-logo-img" />
              <input
                className="charte-logo-url"
                value={logo}
                onChange={(e) =>
                  setCharte((c) => {
                    const logos = [...c.logos];
                    logos[i] = e.target.value;
                    return { ...c, logos };
                  })
                }
                placeholder="URL du logo (SVG ou PNG)"
                aria-label="URL du logo"
              />
              <button
                className="ghost danger"
                type="button"
                onClick={() => setCharte((c) => ({ ...c, logos: c.logos.filter((_, j) => j !== i) }))}
                title="Supprimer"
              >
                <Trash size={13} />
              </button>
            </div>
          ))}
          <button
            className="ghost"
            type="button"
            onClick={() => setCharte((c) => ({ ...c, logos: [...c.logos, ''] }))}
          >
            <Plus size={13} /> Ajouter un logo
          </button>
        </div>
      </section>

      <section className="brand-section brand-section-ref">
        <h3>Reference : tokens de l'outil</h3>
        <div className="swatch-grid">
          {swatches.map((s) => (
            <div key={s.name} className="swatch">
              <div className="swatch-color" style={{ background: s.value }} />
              <div className="swatch-name">{s.name}</div>
              <div className="swatch-value">{s.value}</div>
            </div>
          ))}
        </div>
        <div className="type-sample" style={{ fontFamily }}>
          Atelier, l'atelier de production de contenu.
        </div>
        <div className="radius-grid">
          {Object.entries(radii).map(([name, def]) => (
            <div key={name} className="radius-sample">
              <div className="radius-box" style={{ borderRadius: def.$value }} />
              <div className="radius-name">{name}</div>
              <div className="radius-value">{def.$value}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
