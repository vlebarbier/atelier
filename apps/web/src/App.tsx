import { useEffect, useMemo, useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header, type Vue } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { DraftGrid, GridSkeleton } from './components/DraftGrid';
import { DraftDetail } from './components/DraftDetail';
import { CommandPalette } from './components/CommandPalette';
import { CalendarPage } from './pages/CalendarPage';
import { BrandPage } from './pages/BrandPage';
import { ActivityPage } from './pages/ActivityPage';
import { BibliothequePage } from './pages/BibliothequePage';
import { fetchBrouillons, createBrouillon, deleteBrouillon, type Brouillon, type Statut } from './api';

const PAGE_LABELS: Record<string, string> = {
  brouillons: 'Brouillons',
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

  useEffect(() => {
    load();
  }, [load]);

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

  const filtered = useMemo(() => {
    if (filtre === 'tous') return brouillons;
    return brouillons.filter((b) => b.statut === filtre);
  }, [brouillons, filtre]);

  const crumb = PAGE_LABELS[page] || page;

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
      <Sidebar activePage={page} onNavigate={navigate} />
      <div className="shell">
        <Header
          crumb={crumb}
          vue={vue}
          onVueChange={setVue}
          onRefresh={load}
          refreshing={loading}
          onOpenPalette={() => setPaletteOpen(true)}
          onNew={createNew}
        />
        <main>
          {page === 'brouillons' && selectedId && (
            <DraftDetail id={selectedId} onClose={closeBrouillon} onDelete={() => handleDelete(selectedId)} />
          )}

          {page === 'brouillons' && !selectedId && (
            <>
              <Toolbar filtre={filtre} onFiltreChange={setFiltre} count={filtered.length} />
              {error && <div className="empty">Erreur, {error}</div>}
              {!error && loading && <GridSkeleton />}
              {!error && !loading && (
                <DraftGrid brouillons={filtered} vue={vue} onOpen={openBrouillon} onNew={createNew} onDelete={confirmDelete} />
              )}
            </>
          )}

          {page === 'calendrier' && <CalendarPage brouillons={brouillons} />}
          {page === 'bibliotheque' && <BibliothequePage />}
          {page === 'charte' && <BrandPage />}
          {page === 'activite' && <ActivityPage brouillons={brouillons} />}
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
    </div>
  );
}
