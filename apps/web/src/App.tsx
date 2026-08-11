import { useEffect, useMemo, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header, type Vue } from './components/Header';
import { DraftGrid } from './components/DraftGrid';
import { DraftDetail } from './components/DraftDetail';
import { CommandPalette } from './components/CommandPalette';
import { ContentListPage } from './components/ContentListPage';
import { CreationModal } from './components/CreationModal';
import type { TemplateCreation } from './format';
import { CalendarPage } from './pages/CalendarPage';
import { BrandPage } from './pages/BrandPage';
import { ActivityPage } from './pages/ActivityPage';
import { BibliothequePage } from './pages/BibliothequePage';
import { TYPES_CONTENUS, TYPES_DOCUMENTS } from './format';
import { fetchBrouillons, createBrouillon, deleteBrouillon, type Brouillon, type Statut } from './api';

const PAGE_LABELS: Record<string, string> = {
  brouillons: 'Contenus',
  documents: 'Documents',
  calendrier: 'Calendrier',
  bibliotheque: 'Bibliothèque',
  charte: 'Charte graphique',
  activite: 'Activite IA'
};

export default function App() {
  const [page, setPage] = useState('brouillons');
  const [vue, setVue] = useState<Vue>('grille');
  const [filtre, setFiltre] = useState<Statut | 'tous'>('tous');
  const [brouillons, setBrouillons] = useState<Brouillon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [creationOpen, setCreationOpen] = useState(false);

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
      if (page === 'brouillons' && !selectedId) loadSilencieux();
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
  // ont leur propre page.
  const contenus = useMemo(
    () => brouillons.filter((b) => !TYPES_DOCUMENTS.includes(b.type ?? '')),
    [brouillons]
  );

  const crumb = PAGE_LABELS[page] || page;
  const aValider = useMemo(() => brouillons.filter((b) => b.statut === 'a-valider').length, [brouillons]);

  function openBrouillon(id: string) {
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
    const titre = sujet ? `${t.titreDefaut} — ${sujet}` : t.titreDefaut;
    const texte = sujet ? `Sujet : ${sujet}\n\n${t.messageInitial}` : t.messageInitial;
    try {
      const created = await createBrouillon(titre, t.type, [{ role: 'user', texte }]);
      await load();
      openBrouillon(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de création');
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
    const b = brouillons.find((x) => x.id === id);
    if (window.confirm(`Supprimer « ${b?.titre ?? id} » ?`)) handleDelete(id);
  }

  function navigate(nextPage: string) {
    setSelectedId(null);
    setPage(nextPage);
  }

  return (
    <div className="app">
      <Sidebar activePage={page} onNavigate={navigate} aValider={aValider} />
      <div className="shell">
        <Header
          titre={crumb}
          page={page}
          vue={vue}
          onVueChange={setVue}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main>
          {page === 'brouillons' && selectedId && (
            <DraftDetail id={selectedId} onClose={closeBrouillon} onDelete={() => handleDelete(selectedId)} />
          )}

          {page === 'documents' && selectedId && (
            <DraftDetail id={selectedId} onClose={closeBrouillon} onDelete={() => handleDelete(selectedId)} />
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
              emptySub="Pitch deck, flyer, affiche, carte de visite, plaquette — creez le premier livrable avec votre agent."
            />
          )}

          {page === 'calendrier' && <CalendarPage brouillons={brouillons} onOpen={openBrouillon} onRefresh={load} />}
          {page === 'bibliotheque' && <BibliothequePage />}
          {page === 'charte' && <BrandPage />}
          {page === 'activite' && <ActivityPage />}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        brouillons={brouillons}
        onOpenBrouillon={openBrouillon}
        onToggleVue={() => setVue((v) => (v === 'grille' ? 'liste' : 'grille'))}
        onGoBrouillons={() => navigate('brouillons')}
        vue={vue}
      />

      {creationOpen && (
        <CreationModal
          onClose={() => setCreationOpen(false)}
          onPhrase={creerDepuisPhrase}
          onTemplate={creerDepuisTemplate}
        />
      )}
    </div>
  );
}
