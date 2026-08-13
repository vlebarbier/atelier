import { useEffect, useMemo, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import type { Vue } from './components/ContentListPage';
import { DraftGrid } from './components/DraftGrid';
import { DraftDetail } from './components/DraftDetail';
import { CommandPalette } from './components/CommandPalette';
import { ContentListPage } from './components/ContentListPage';
import { CreationModal } from './components/CreationModal';
import { ConfirmModal } from './components/ConfirmModal';
import type { TemplateCreation } from './format';
import { CalendarPage } from './pages/CalendarPage';
import { BrandPage } from './pages/BrandPage';
import { ActivityPage } from './pages/ActivityPage';
import { BibliothequePage } from './pages/BibliothequePage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { BlogPage } from './pages/BlogPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { ArticleEditor } from './components/ArticleEditor';
import { TYPE_ARTICLE, TYPES_CONTENUS, TYPES_DOCUMENTS } from './format';
import { fetchBrouillons, createBrouillon, deleteBrouillon, type Brouillon, type Statut } from './api';

const PAGE_LABELS: Record<string, string> = {
  brouillons: 'Contenus',
  documents: 'Documents',
  blog: 'Blog',
  calendrier: 'Calendrier',
  bibliotheque: 'Bibliothèque',
  charte: 'Charte graphique',
  activite: 'Activite IA',
  integrations: 'Intégrations',
  parametres: 'Paramètres',
  aide: 'Aide'
};

export default function App() {
  const [page, setPage] = useState('brouillons');
  // Vue par defaut : preference Parametres (atelier.vue.defaut), sinon grille.
  const [vue, setVue] = useState<Vue>(() =>
    localStorage.getItem('atelier.vue.defaut') === 'liste' ? 'liste' : 'grille'
  );
  const [filtre, setFiltre] = useState<Statut | 'tous'>('tous');
  const [brouillons, setBrouillons] = useState<Brouillon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [creationOpen, setCreationOpen] = useState(false);
  // Suppression en attente de confirmation in-app (id du brouillon/document).
  const [suppressionId, setSuppressionId] = useState<string | null>(null);
  const [panneauReplie, setPanneauReplie] = useState(false);
  // Sidebar repliee : le bouton vit dans la barre du haut (pattern PushRank).
  const [sidebarRepliee, setSidebarRepliee] = useState(() => localStorage.getItem('atelier.sidebar.collapsed') === '1');
  useEffect(() => {
    localStorage.setItem('atelier.sidebar.collapsed', sidebarRepliee ? '1' : '0');
  }, [sidebarRepliee]);

  // Theme sombre/clair : init depuis localStorage ou le systeme, applique sur <html>.
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('atelier-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('atelier-theme', theme);
  }, [theme]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBrouillons();
      setBrouillons(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  // Recharge sans toucher au state loading : pour le polling silencieux.
  const loadSilencieux = useCallback(async () => {
    try {
      const data = await fetchBrouillons();
      setBrouillons(data);
    } catch {
      /* silencieux : on garde l'etat courant */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Polling silencieux : le receptacle vit, les agents deposent pendant qu'on travaille.
  // Recharge toutes les 30s sans interruption (pas de spinner, pas de flash).
  useEffect(() => {
    const t = setInterval(() => {
      if ((page === 'brouillons' || page === 'blog') && !selectedId) loadSilencieux();
    }, 30000);
    return () => clearInterval(t);
  }, [page, selectedId, loadSilencieux]);

  // Raccourci global Cmd+K / Ctrl+K pour ouvrir la palette de commandes.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // La page Contenus ne montre que les types reseaux sociaux ; les documents
  // ont leur propre page, les articles de blog aussi.
  const contenus = useMemo(
    () => brouillons.filter((b) => !TYPES_DOCUMENTS.includes(b.type ?? '') && b.type !== TYPE_ARTICLE),
    [brouillons]
  );

  const articles = useMemo(() => brouillons.filter((b) => b.type === TYPE_ARTICLE), [brouillons]);

  const aValider = useMemo(() => brouillons.filter((b) => b.statut === 'a-valider').length, [brouillons]);

  function openBrouillon(id: string) {
    setSelectedId(id);
  }

  /** Depuis le journal : navigue vers la page du brouillon (contenu, document ou article). */
  function openDepuisJournal(id: string) {
    const b = brouillons.find((x) => x.id === id);
    const t = b?.type ?? '';
    if (TYPES_DOCUMENTS.includes(t)) setPage('documents');
    else if (t === TYPE_ARTICLE) setPage('blog');
    else setPage('brouillons');
    setSelectedId(id);
  }

  /** Depuis le calendrier : le panneau lateral montre le post, ce bouton ouvre
   *  la vue detail complete (page Contenus/Documents) avec le brouillon ouvert. */
  function openDepuisCalendrier(id: string) {
    const b = brouillons.find((x) => x.id === id);
    const t = b?.type ?? '';
    if (TYPES_DOCUMENTS.includes(t)) setPage('documents');
    else setPage('brouillons');
    setSelectedId(id);
  }

  function closeBrouillon() {
    setSelectedId(null);
    load();
  }

  async function createNew() {
    try {
      const created = await createBrouillon();
      await load();
      openBrouillon(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
    }
  }

  async function createDocument(type: string) {
    try {
      const created = await createBrouillon(undefined, type);
      await load();
      openBrouillon(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création du document');
    }
  }

  /** Phrase libre : le texte devient le titre + le premier message user de la conversation. */
  async function creerDepuisPhrase(texte: string, titre: string, type: string) {
    setCreationOpen(false);
    try {
      const created = await createBrouillon(titre, type, [{ role: 'user', texte }]);
      await load();
      openBrouillon(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
    }
  }

  /** Template : conversation pre-remplie avec le messageInitial (prefixe du sujet si demande). */
  async function creerDepuisTemplate(t: TemplateCreation, sujet?: string) {
    setCreationOpen(false);
    const titre = sujet ? `${t.titreDefaut} - ${sujet}` : t.titreDefaut;
    const texte = sujet ? `Sujet : ${sujet}\n\n${t.messageInitial}` : t.messageInitial;
    try {
      const created = await createBrouillon(titre, t.type, [{ role: 'user', texte }]);
      await load();
      openBrouillon(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
    }
  }

  async function createArticle() {
    try {
      const created = await createBrouillon(undefined, TYPE_ARTICLE);
      await load();
      openBrouillon(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création de l\'article');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteBrouillon(id);
      setSelectedId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression');
    }
  }

  function confirmDelete(id: string) {
    setSuppressionId(id);
  }

  function navigate(nextPage: string) {
    setSelectedId(null);
    setPage(nextPage);
  }

  return (
    <div className="app">
      <Sidebar
        activePage={page}
        onNavigate={navigate}
        aValider={aValider}
        collapsed={sidebarRepliee}
        onToggleCollapse={() => setSidebarRepliee((v) => !v)}
      />
      <div className="shell">
        <Header
          onOpenPalette={() => setPaletteOpen(true)}
          aValider={aValider}
          onOpenNotifications={() => navigate('brouillons')}
          brouillonOuvert={page === 'brouillons' && !!selectedId}
          panneauReplie={panneauReplie}
          onTogglePanneau={() => setPanneauReplie((v) => !v)}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          sidebarRepliee={sidebarRepliee}
          onToggleSidebar={() => setSidebarRepliee((v) => !v)}
        />
        <main>
          {page === 'brouillons' && selectedId && (
            <DraftDetail
              id={selectedId}
              onClose={closeBrouillon}
              onDelete={() => handleDelete(selectedId)}
              panneauReplie={panneauReplie}
            />
          )}

          {page === 'documents' && selectedId && (
            <DraftDetail id={selectedId} onClose={closeBrouillon} onDelete={() => handleDelete(selectedId)} panneauReplie={panneauReplie} />
          )}

          {page === 'blog' && selectedId && (
            <ArticleEditor
              id={selectedId}
              onClose={closeBrouillon}
              onDelete={() => handleDelete(selectedId)}
              onPublished={() => loadSilencieux()}
            />
          )}

          {page === 'brouillons' && !selectedId && (
            <ContentListPage
              titre="Contenus"
              sub="Vos creations pour les reseaux sociaux : carrousels, posts, videos, stories."
              brouillons={contenus}
              loading={loading}
              error={error}
              vue={vue}
              onVueChange={setVue}
              onOpen={openBrouillon}
              onDelete={confirmDelete}
              onCreate={() => setCreationOpen(true)}
              typesFiltrables={TYPES_CONTENUS}
              filtre={filtre}
              onFiltreChange={setFiltre}
              emptyTitle="Pas encore de contenu."
              emptySub="Creez votre premier contenu avec votre agent : il utilisera vos elements de marque."
            />
          )}

          {page === 'documents' && !selectedId && (
            <ContentListPage
              titre="Documents"
              sub="Vos livrables de communication hors reseaux : pitch decks, flyers, affiches, cartes de visite, plaquettes."
              brouillons={brouillons.filter((b) => TYPES_DOCUMENTS.includes(b.type ?? ''))}
              loading={loading}
              error={error}
              vue={vue}
              onVueChange={setVue}
              onOpen={openBrouillon}
              onDelete={confirmDelete}
              onCreate={() => setCreationOpen(true)}
              typesNouveau={TYPES_DOCUMENTS}
              typesFiltrables={TYPES_DOCUMENTS}
              onCreateType={(type) => createDocument(type)}
              filtre={filtre}
              onFiltreChange={setFiltre}
              emptyTitle="Pas encore de document de communication."
              emptySub="Pitch deck, flyer, affiche, carte de visite, plaquette : creez le premier livrable avec votre agent."
            />
          )}

          {page === 'blog' && !selectedId && (
            <BlogPage
              brouillons={articles}
              loading={loading}
              error={error}
              onOpen={openBrouillon}
              onDelete={confirmDelete}
              onCreate={createArticle}
              filtre={filtre}
              onFiltreChange={setFiltre}
            />
          )}

          {page === 'calendrier' && (
            <CalendarPage brouillons={brouillons} onOpen={openDepuisCalendrier} onRefresh={load} />
          )}
          {page === 'bibliotheque' && <BibliothequePage />}
          {page === 'charte' && <BrandPage />}
          {page === 'activite' && <ActivityPage onOpen={openDepuisJournal} />}
          {page === 'integrations' && <IntegrationsPage />}
          {page === 'parametres' && <SettingsPage />}
          {page === 'aide' && <HelpPage />}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        brouillons={brouillons}
        onOpenBrouillon={openBrouillon}
        onToggleVue={() => setVue((v) => (v === 'grille' ? 'liste' : 'grille'))}
        onGoBrouillons={() => navigate('brouillons')}
        onGoBlog={() => navigate('blog')}
        onOpenCreation={() => setCreationOpen(true)}
        vue={vue}
      />

      {creationOpen && (
        <CreationModal
          onClose={() => setCreationOpen(false)}
          onPhrase={creerDepuisPhrase}
          onTemplate={creerDepuisTemplate}
        />
      )}

      {suppressionId && (
        <ConfirmModal
          titre="Supprimer ce contenu ?"
          description={
            <>
              <strong>{brouillons.find((b) => b.id === suppressionId)?.titre ?? 'Ce contenu'}</strong>{' '}
              sera définitivement supprimé. Cette action est irréversible.
            </>
          }
          onConfirm={() => {
            const id = suppressionId;
            setSuppressionId(null);
            handleDelete(id);
          }}
          onClose={() => setSuppressionId(null)}
        />
      )}
    </div>
  );
}
