import { useState } from 'react';
import { Plus, Article, ArrowRight, Trash } from '@phosphor-icons/react';
import type { Brouillon, Statut } from '../api';
import { parseArticle } from '../api';
import { CATEGORIES_ARTICLE_LABELS, STATUT_LABELS, relTime } from '../format';
import { Page, PageHeader, EmptyState } from '../components/ui';
import { Toolbar } from '../components/Toolbar';

interface BlogPageProps {
  brouillons: Brouillon[];
  loading?: boolean;
  error?: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  filtre: Statut | 'tous';
  onFiltreChange: (filtre: Statut | 'tous') => void;
}

/** Les couleurs de statut : points discrets (mêmes tokens que la liste dense). */
const STATUT_DOT: Record<string, string> = {
  brouillon: 'var(--color-ink-tertiary)',
  'a-valider': 'var(--color-status-warn)',
  valide: 'var(--color-status-validated)',
  publie: 'var(--color-status-ok)'
};

/**
 * Page Blog : les articles de blog (type 'article'), créés avec la charte et
 * publiés vers le CMS Sanity. Chaque ligne montre le titre, le chapo, la
 * catégorie et un badge « publié » quand l'article est parti au CMS.
 */
export function BlogPage({ brouillons, loading = false, error = null, onOpen, onDelete, onCreate, filtre, onFiltreChange }: BlogPageProps) {
  const [filtreCategorie, setFiltreCategorie] = useState<string>('tous');

  const filtered = brouillons.filter(
    (b) =>
      (filtre === 'tous' || b.statut === filtre) &&
      (filtreCategorie === 'tous' || parseArticle(b.article)?.category === filtreCategorie)
  );

  return (
    <Page>
      <PageHeader
        title="Blog"
        count={brouillons.length}
        sub="Vos articles de blog, créés avec la charte et publiés vers le CMS (Sanity)."
        actions={
          <button className="primary" type="button" onClick={onCreate}>
            <Plus size={13} weight="bold" /> Nouvel article
          </button>
        }
      />
      <div className="liste-filtres">
        <Toolbar filtre={filtre} onFiltreChange={onFiltreChange} count={filtered.length} />
        <label className="type-filter">
          <span>Catégorie</span>
          <select value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)} aria-label="Filtrer par catégorie">
            <option value="tous">Toutes</option>
            {Object.entries(CATEGORIES_ARTICLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <div className="empty">Erreur, {error}</div>}
      {!error && loading && <div className="empty">Chargement...</div>}
      {!error && !loading && brouillons.length === 0 && (
        <EmptyState
          icon={Article}
          title="Pas encore d'article de blog."
          sub="Creez votre premier article avec votre agent : il utilisera la charte et la bibliothèque, puis vous publierez vers le CMS."
        />
      )}
      {!error && !loading && brouillons.length > 0 && (
        <div className="list-view">
          {filtered.map((b) => {
            const meta = parseArticle(b.article);
            const categorie = meta?.category ? CATEGORIES_ARTICLE_LABELS[meta.category] ?? meta.category : null;
            return (
              <div
                key={b.id}
                className="list-row"
                role="button"
                tabIndex={0}
                onClick={() => onOpen(b.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpen(b.id);
                }}
              >
                <div className="thumb thumb-empty article-thumb">
                  <Article size={16} />
                </div>
                <div className="info">
                  <div className="titre">{b.titre}</div>
                  <div className="meta">
                    {categorie && <span className="article-cat">{categorie}</span>}
                    {meta?.slug && <span className="article-slug">{meta.slug}</span>}
                    <span>{relTime(b.updated)}</span>
                  </div>
                  {meta?.chapo && <div className="chapo">{meta.chapo}</div>}
                </div>
                <div className="status-dot" title={STATUT_LABELS[b.statut as Statut] ?? b.statut}>
                  <span className="dot status-pop" style={{ background: STATUT_DOT[b.statut] ?? 'var(--color-ink-tertiary)' }} />
                  {STATUT_LABELS[b.statut as Statut] ?? b.statut}
                </div>
                {meta?.cmsUrl && (
                  <a className="agent-badge cms-badge" href={meta.cmsUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} title="Article publié, ouvrir">
                    <span className="dot status-pop" style={{ background: 'var(--color-status-ok)' }} />
                    Publié
                  </a>
                )}
                <div className="row-actions">
                  <button type="button" className="ghost" onClick={(e) => { e.stopPropagation(); onOpen(b.id); }} title="Ouvrir">
                    <ArrowRight size={13} />
                  </button>
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={(e) => { e.stopPropagation(); onDelete(b.id); }}
                    title="Supprimer"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <EmptyState title="Aucun article ne correspond à ce filtre." sub="Changez de filtre ou créez un nouvel article." />
          )}
        </div>
      )}
    </Page>
  );
}
