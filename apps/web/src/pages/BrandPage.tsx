import { useEffect, useState } from 'react';
import { Check, Palette, TextT, ImageSquare, Plus, Trash, FileCode, UploadSimple, Quotes, Eye } from '@phosphor-icons/react';
import tokens from '@atelier/tokens';
import { fetchCharte, saveCharte, importCharte, type Charte } from '../api';
import { buildCharteFontLink, DEFAULT_CHARTE, parseCharte, type CharteData } from '../charte';
import { Page, PageHeader } from '../components/ui';

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

/** Role d'une couleur dans l'apercu : fond, texte ou accent. */
type RoleApercu = 'fond' | 'texte' | 'accent';

const ROLE_LABELS: Record<RoleApercu, string> = { fond: 'Fond', texte: 'Texte', accent: 'Accent' };

/** Luminance relative (0..1) d'une couleur CSS, pour trier fond/texte/accent. */
function luminance(valeur: string): number {
  const t = valeur.trim().toLowerCase();
  const hex = t.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    let h = hex[1] ?? '';
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const rgb = t.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgb) {
    const r = (parseFloat(rgb[1] ?? '0') || 0) / 255;
    const g = (parseFloat(rgb[2] ?? '0') || 0) / 255;
    const b = (parseFloat(rgb[3] ?? '0') || 0) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return 0.5;
}

/** Assignation automatique des roles : le plus sombre en fond, le plus clair en texte, le premier restant en accent. */
function rolesAuto(couleurs: Record<string, string>): Record<RoleApercu, string | null> {
  const entries = Object.entries(couleurs);
  if (entries.length === 0) return { fond: null, texte: null, accent: null };
  const tri = [...entries].sort((a, b) => luminance(a[1]) - luminance(b[1]));
  const fond = tri[0]?.[0] ?? null;
  const texte = tri[tri.length - 1]?.[0] ?? null;
  const accent = entries.find(([nom]) => nom !== fond && nom !== texte)?.[0] ?? fond;
  return { fond, texte, accent };
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
  /** Roles fond/texte/accent choisis par l'utilisateur (persistés en localStorage). */
  const [roles, setRoles] = useState<Record<RoleApercu, string | null>>(() => {
    try {
      const raw = localStorage.getItem('atelier.charte.roles');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<RoleApercu, string | null>>;
        return { fond: parsed.fond ?? null, texte: parsed.texte ?? null, accent: parsed.accent ?? null };
      }
    } catch {
      /* localStorage indisponible : roles auto */
    }
    return { fond: null, texte: null, accent: null };
  });

  useEffect(() => {
    try {
      localStorage.setItem('atelier.charte.roles', JSON.stringify(roles));
    } catch {
      /* non bloquant */
    }
  }, [roles]);

  /** Charge les polices de la charte (Google Fonts) pour que l'apercu rende la vraie typo. */
  useEffect(() => {
    const link = buildCharteFontLink(charte);
    if (!link) return;
    if (document.querySelector(`link[data-charte-fonts="${link}"]`)) return;
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = link;
    el.dataset.charteFonts = link;
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [charte.polices.titre, charte.polices.texte]);

  /** Roles effectifs : le choix utilisateur s'il existe encore, sinon l'auto. */
  function rolesEffectifs(): Record<RoleApercu, string | null> {
    const auto = rolesAuto(charte.couleurs);
    return {
      fond: roles.fond && charte.couleurs[roles.fond] ? roles.fond : auto.fond,
      texte: roles.texte && charte.couleurs[roles.texte] ? roles.texte : auto.texte,
      accent: roles.accent && charte.couleurs[roles.accent] ? roles.accent : auto.accent
    };
  }

  const roleValeur = rolesEffectifs();
  const couleurFond = roleValeur.fond ? charte.couleurs[roleValeur.fond] : null;
  const couleurTexte = roleValeur.texte ? charte.couleurs[roleValeur.texte] : null;
  const couleurAccent = roleValeur.accent ? charte.couleurs[roleValeur.accent] : null;
  /** Couleur du texte sur l'accent : noir si l'accent est clair, blanc sinon. */
  const surAccent = couleurAccent ? (luminance(couleurAccent) > 0.55 ? '#0A0A0A' : '#FFFFFF') : '#050505';
  const premierLogo = charte.logos.find((l) => /^https?:\/\//.test(l)) ?? null;
  const premierRayon = Object.values(charte.rayons)[0] ?? null;

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
    return (
      <Page>
        <PageHeader title="Charte graphique" />
        <div className="placeholder">Chargement de la charte...</div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Charte graphique"
        sub="Votre direction artistique, injectee dans le pipeline de rendu et les instructions de vos agents."
        actions={
          <div className="page-actions-group">
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
        }
      />

      <section className="brand-section brand-preview">
        <h3>
          <Eye size={13} /> Apercu en contexte
        </h3>
        <p className="brand-editor-sub">
          Vos couleurs et vos polices rendues comme sur une slide. Assignez chaque role (fond, texte,
          accent) et modifiez un token : l'apercu se met a jour immediatement.
        </p>

        <div className="preview-layout">
          <div className="preview-stage">
            <div
              className="preview-slide"
              style={{
                background: couleurFond ?? '#050505',
                borderRadius: premierRayon ?? '12px',
                fontFamily: charte.polices.texte || undefined
              }}
            >
              {premierLogo && <img src={premierLogo} alt="" className="preview-logo" />}
              <div className="preview-slide-kicker" style={{ color: couleurTexte ?? '#FFFFFF' }}>
                VOTRE MARQUE
              </div>
              <div className="preview-slide-titre" style={{ color: couleurTexte ?? '#FFFFFF', fontFamily: charte.polices.titre || undefined }}>
                Un titre qui donne envie
              </div>
              <div className="preview-slide-texte" style={{ color: couleurTexte ?? '#FFFFFF' }}>
                Quelques lignes de texte pour juger le rendu de la typo et des couleurs en situation reelle.
              </div>
              <div className="preview-slide-cta" style={{ background: couleurAccent ?? '#FFFFFF', color: surAccent }}>
                Decouvrir
              </div>
            </div>
          </div>

          <div className="preview-roles">
            {(['fond', 'texte', 'accent'] as RoleApercu[]).map((role) => (
              <label className="preview-role" key={role}>
                <span className="preview-role-label">{ROLE_LABELS[role]}</span>
                <span className="preview-role-ctrl">
                  <span
                    className="preview-role-dot"
                    style={{
                      background:
                        role === 'fond' ? (couleurFond ?? '#050505') : role === 'texte' ? (couleurTexte ?? '#FFFFFF') : (couleurAccent ?? '#FFFFFF')
                    }}
                  />
                  <select
                    value={roleValeur[role] ?? ''}
                    onChange={(e) => setRoles((r) => ({ ...r, [role]: e.target.value || null }))}
                    aria-label={`Role ${ROLE_LABELS[role]}`}
                  >
                    <option value="">Automatique</option>
                    {Object.entries(charte.couleurs).map(([nom, valeur]) => (
                      <option key={nom} value={nom}>
                        {nom} ({valeur})
                      </option>
                    ))}
                  </select>
                </span>
              </label>
            ))}
            <p className="preview-roles-hint">
              Sans choix manuel, le plus sombre devient le fond, le plus clair le texte, et le premier
              token restant l'accent.
            </p>
          </div>
        </div>
      </section>

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
          <Quotes size={13} /> Ton et brand voice
        </h3>
        <p className="brand-editor-sub">
          Ces instructions sont injectées à l'agent quand il produit du contenu : il écrit dans votre ton,
          jamais à côté.
        </p>
        <div className="field">
          <label htmlFor="ton-voix">Voix (comment on parle)</label>
          <textarea
            id="ton-voix"
            rows={3}
            value={charte.ton.voix}
            onChange={(e) => setCharte((c) => ({ ...c, ton: { voix: e.target.value } }))}
            placeholder="Ex: expert ami, pas agence. Direct, sans jargon IA. Des chiffres, pas des adjectifs."
          />
        </div>
        <div className="field">
          <label htmlFor="mots-eviter">Mots à éviter (séparés par des virgules)</label>
          <input
            id="mots-eviter"
            value={charte.motsEviter.join(', ')}
            onChange={(e) =>
              setCharte((c) => ({
                ...c,
                motsEviter: e.target.value.split(',').map((m) => m.trim()).filter(Boolean)
              }))
            }
            placeholder="Ex: ultra, maximum, clé en main, exceptionnel"
          />
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
    </Page>
  );
}
