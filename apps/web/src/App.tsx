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

  const filtered = useMemo(() => {
    if (filtre === 'tous') return brouillons;
    return brouillons.filter((b) => b.statut === filtre);
  }, [brouillons, filtre]);

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
