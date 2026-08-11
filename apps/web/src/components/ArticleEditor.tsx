import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CaretDown, Check, Trash, Article as ArticleIcon, ArrowUpRight } from '@phosphor-icons/react';
import { fetchBrouillon, updateBrouillon, publierCms, parseArticle, type BrouillonDetail, type ArticleMeta, type Statut } from '../api';
import { CATEGORIES_ARTICLE, CATEGORIES_ARTICLE_LABELS, STATUT_LABELS, STATUTS_ORDRE } from '../format';

interface ArticleEditorProps {
  id: string;
  onClose: () => void;
  onDelete: () => void;
  /** Appelé après une publication CMS réussie (la liste doit se rafraîchir). */
  onPublished?: () => void;
}

/** Slugify simple : minuscules, sans accents, tirets. */
export function slugifyArticle(titre: string): string {
  return titre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

/**
 * Éditeur d'article de blog (type 'article'). Le modèle :
 *   titre (brouillon.titre), chapo + SEO + catégorie + dates (article JSON),
 *   corps HTML (brouillon.sourceHtml, le « réceptacle »).
 * La publication vers le CMS (Sanity) ne se fait que sur un article 'valide' :
 * c'est l'acte humain qui clôt le workflow brouillon → validation → publication.
 */
export function ArticleEditor({ id, onClose, onDelete, onPublished }: ArticleEditorProps) {
  const [brouillon, setBrouillon] = useState<BrouillonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statutOpen, setStatutOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Champs article en cours d'édition (copie locale, persistée à la sauvegarde).
  const [meta, setMeta] = useState<ArticleMeta>({});
  const [corps, setCorps] = useState('');
  const [titre, setTitre] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBrouillon(id);
      setBrouillon(data);
      setTitre(data.titre);
      setMeta(parseArticle(data.article) ?? {});
      setCorps(data.sourceHtml || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  /** Persiste les champs de l'article (titre, article JSON, corps HTML). */
  async function onEnregistrer() {
    if (!brouillon || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Le slug est auto-généré depuis le titre s'il est vide.
      const slug = meta.slug?.trim() || slugifyArticle(titre);
      await updateBrouillon(id, {
        titre,
        article: JSON.stringify({ ...meta, slug }),
        sourceHtml: corps
      });
      setMeta((m) => ({ ...m, slug }));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      if (brouillon.titre !== titre) {
        setBrouillon({ ...brouillon, titre });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function onStatut(s: Statut) {
    if (!brouillon) return;
    setStatutOpen(false);
    setBrouillon({ ...brouillon, statut: s });
    try {
      await updateBrouillon(id, { statut: s });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de statut');
    }
  }

  async function onPublierCms() {
    if (!brouillon || publishing) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await publierCms(id);
      setMeta((m) => ({ ...m, cmsId: res.cmsId, cmsUrl: res.cmsUrl, cmsSlug: res.slug }));
      setBrouillon({ ...brouillon, statut: 'publie' });
      onPublished?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publication impossible');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <div className="empty">Chargement...</div>;
  if (error && !brouillon) return <div className="empty">Erreur, {error}</div>;
  if (!brouillon) return <div className="empty">Article introuvable</div>;

  const slug = meta.slug?.trim() || slugifyArticle(titre);
  const peutPublier = brouillon.statut === 'valide' && slug && corps.trim().length > 0;

  return (
    <div id="detail" className="detail-shell article-editor">
      <header className="detail-bar">
        <div className="l">
          <button className="back" type="button" onClick={onClose}>
            <ArrowLeft size={13} /> Blog
          </button>
          <span className="sep">/</span>
          <span className="title" title={titre}>{titre || 'Sans titre'}</span>
        </div>
        <div className="r">
          <div className="statut-control">
            <button
              type="button"
              className={`statut-btn on--${brouillon.statut}`}
              onClick={() => setStatutOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={statutOpen}
            >
              <span className={`dot dot--${brouillon.statut}`} />
              <span className="statut-label">{STATUT_LABELS[brouillon.statut] ?? brouillon.statut}</span>
              <CaretDown size={12} className="statut-caret" />
            </button>
            {statutOpen && (
              <div className="statut-menu" role="listbox">
                <div className="statut-menu-label">Changer le statut</div>
                {STATUTS_ORDRE.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="option"
                    aria-selected={brouillon.statut === s}
                    className={brouillon.statut === s ? 'on' : ''}
                    onClick={() => onStatut(s as Statut)}
                  >
                    <span className={`dot dot--${s}`} />
                    {STATUT_LABELS[s]}
                    {brouillon.statut === s && <Check size={12} className="statut-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className="primary"
            onClick={onPublierCms}
            disabled={!peutPublier || publishing}
            title={peutPublier ? 'Publier vers le CMS (Sanity)' : 'Un article valide avec slug et corps se publie vers le CMS'}
          >
            {publishing ? 'Publication...' : 'Publier vers le CMS'}
          </button>
          <button type="button" className="delete" onClick={() => { if (window.confirm('Supprimer cet article ? Cette action est definitive.')) onDelete(); }} title="Supprimer l'article">
            <Trash size={13} /> Supprimer
          </button>
        </div>
      </header>

      {error && <div className="article-error">{error}</div>}

      <div className="detail-body article-body">
        <div className="article-form">
          <section className="article-section">
            <div className="article-section-label">Article</div>
            <label className="article-field">
              <span>Titre</span>
              <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre de l'article" />
            </label>
            <label className="article-field">
              <span>Slug URL</span>
              <input
                value={slug}
                onChange={(e) => setMeta((m) => ({ ...m, slug: e.target.value }))}
                placeholder="auto-genere depuis le titre"
              />
              <small>bordeluche.com/blog/{slug || '...'}</small>
            </label>
            <label className="article-field">
              <span>Chapo (résumé)</span>
              <textarea
                rows={3}
                value={meta.chapo ?? ''}
                onChange={(e) => setMeta((m) => ({ ...m, chapo: e.target.value }))}
                placeholder="150-200 caractères, affiché sur la carte du listing blog"
              />
            </label>
            <div className="article-grid2">
              <label className="article-field">
                <span>Catégorie</span>
                <select value={meta.category ?? ''} onChange={(e) => setMeta((m) => ({ ...m, category: e.target.value }))}>
                  <option value="">Non classé</option>
                  {CATEGORIES_ARTICLE.map((c) => (
                    <option key={c} value={c}>{CATEGORIES_ARTICLE_LABELS[c]}</option>
                  ))}
                </select>
              </label>
              <label className="article-field">
                <span>Date de publication</span>
                <input
                  type="date"
                  value={meta.publishedAt ?? ''}
                  onChange={(e) => setMeta((m) => ({ ...m, publishedAt: e.target.value }))}
                />
              </label>
            </div>
            <label className="article-field">
              <span>Temps de lecture (min)</span>
              <input
                type="number"
                min={1}
                max={60}
                value={meta.readingTime ?? ''}
                onChange={(e) => setMeta((m) => ({ ...m, readingTime: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="6"
              />
            </label>
          </section>

          <section className="article-section">
            <div className="article-section-label">SEO</div>
            <label className="article-field">
              <span>Title (balise &lt;title&gt;)</span>
              <input
                value={meta.seoTitle ?? ''}
                onChange={(e) => setMeta((m) => ({ ...m, seoTitle: e.target.value }))}
                placeholder="Max 60 caractères, sinon le titre avec suffixe | Bordeluche"
              />
            </label>
            <label className="article-field">
              <span>Meta description</span>
              <textarea
                rows={3}
                value={meta.seoDescription ?? ''}
                onChange={(e) => setMeta((m) => ({ ...m, seoDescription: e.target.value }))}
                placeholder="Max 155 caractères, sinon le chapo"
              />
            </label>
          </section>

          <section className="article-section">
            <div className="article-section-label">Corps de l'article</div>
            <label className="article-field">
              <span>Source HTML (le corps, rendu par le site)</span>
              <textarea
                rows={14}
                value={corps}
                onChange={(e) => setCorps(e.target.value)}
                placeholder={'<p>Introduction...</p>\n\n<h2>Une section</h2>\n<p>...</p>'}
                className="article-corps"
              />
            </label>
          </section>

          <div className="article-actions">
            <button type="button" className="primary" onClick={onEnregistrer} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            {savedFlash && <span className="saved-flash">Enregistré</span>}
            {meta.cmsUrl && (
              <a className="ghost cms-link" href={meta.cmsUrl} target="_blank" rel="noreferrer">
                <ArrowUpRight size={13} /> Voir l'article publié
              </a>
            )}
          </div>
        </div>
        <div className="article-preview">
          <div className="article-section-label">Aperçu</div>
          {corps.trim() ? (
            <div className="article-preview-content" dangerouslySetInnerHTML={{ __html: corps }} />
          ) : (
            <div className="empty">
              <ArticleIcon size={22} />
              <p>Le corps de l'article apparaîtra ici.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
