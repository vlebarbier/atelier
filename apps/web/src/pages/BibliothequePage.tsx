import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { UploadSimple, File, Image, FilePdf, Link, Trash, FolderOpen, MagnifyingGlass, X } from '@phosphor-icons/react';
import {
  createRessource,
  deleteRessource,
  fetchRessource,
  fetchRessources,
  type Ressource
} from '../api';
import { relTime } from '../format';
import { Page, PageHeader, EmptyState } from '../components/ui';

const CATEGORIES = ['visuel', 'texte', 'document', 'site', 'autre'] as const;

const CATEGORIE_LABELS: Record<string, string> = {
  visuel: 'Visuel',
  texte: 'Texte',
  document: 'Document',
  site: 'Site',
  autre: 'Autre'
};

/** Normalise pour la recherche : minuscules + sans accents (e, e accentue, etc.). */
function normaliser(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function guessType(file: File): string {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf') return 'pdf';
  return 'fichier';
}

function formatTaille(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files');
}

/** La bibliotheque : memoire de la marque. Le user depose ses contenus (photos, PDF, pages),
 *  l'agent les lit pour produire conforme et peut en deposer lui-meme via le MCP.
 *  Toute la page est une cible de depot : on peut glisser-deposer n'importe ou,
 *  chercher par nom et filtrer par categorie. */
export function BibliothequePage() {
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filtre, setFiltre] = useState<string>('tous');
  const [recherche, setRecherche] = useState('');
  const [archiverUrl, setArchiverUrl] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  // Compteur de profondeur dragenter/dragleave : sans lui, passer sur un enfant
  // declenche dragleave et l'overlay clignote.
  const dragDepth = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await fetchRessources();
      setRessources(data);
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onFiles(files: FileList | File[]) {
    setUploading(true);
    setMsg(null);
    const list = Array.from(files);
    for (const file of list) {
      try {
        const contenu = await fileToDataUrl(file);
        await createRessource({
          nom: file.name,
          type: guessType(file),
          categorie: file.type.startsWith('image/') ? 'visuel' : 'document',
          contenu
        });
      } catch (e) {
        setMsg({ type: 'err', text: `Échec pour ${file.name}` });
      }
    }
    setUploading(false);
    load();
  }

  async function onArchiverPage() {
    const url = archiverUrl.trim();
    if (!url) return;
    setUploading(true);
    setMsg(null);
    try {
      const res = await fetch(url);
      const contenu = (await res.text()).slice(0, 50000);
      const nom = new URL(url).hostname + new URL(url).pathname.replace(/\//g, '-').slice(0, 30);
      await createRessource({ nom, type: 'page', categorie: 'site', sourceUrl: url, contenu });
      setArchiverUrl('');
      load();
    } catch (e) {
      setMsg({ type: 'err', text: `Impossible d'archiver cette page : ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string, nom: string) {
    if (!window.confirm(`Supprimer « ${nom} » de la bibliothèque ?`)) return;
    try {
      await deleteRessource(id);
      load();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  }

  async function onOpen(id: string) {
    try {
      const detail = await fetchRessource(id);
      if (detail.url) window.open(detail.url, '_blank');
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  }

  // ── Depot page entiere ─────────────────────────────────────────────
  function onDragEnter(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragOver(true);
  }

  function onDragOver(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
  }

  function onDragLeave(e: DragEvent) {
    if (!hasFiles(e)) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }

  function onDrop(e: DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  }

  // ── Filtres combines : categorie + recherche par nom ───────────────
  const q = normaliser(recherche.trim());
  const filtrees = ressources.filter((r) => {
    if (filtre !== 'tous' && r.categorie !== filtre) return false;
    if (q && !normaliser(r.nom).includes(q)) return false;
    return true;
  });

  const filtresActifs = filtre !== 'tous' || q !== '';

  function reinitFiltres() {
    setFiltre('tous');
    setRecherche('');
  }

  return (
    <div className="biblio-root" onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {dragOver && (
        <div className="biblio-drop-overlay" aria-hidden="true">
          <UploadSimple size={20} />
          <span>Deposez vos fichiers pour les ajouter a la bibliotheque</span>
          <small>Photos, PDF, captures, pages web. Multi-depot autorise.</small>
        </div>
      )}

      <Page>
        <PageHeader
          title="Bibliotheque"
          count={ressources.length}
          sub="La memoire de votre marque : photos, pages de site, documents. Vos agents la lisent pour produire."
        />

        <div className="liste-filtres biblio-filtres">
          <div className="biblio-search">
            <MagnifyingGlass size={14} />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par nom..."
              aria-label="Rechercher une ressource par nom"
            />
            {recherche && (
              <button
                type="button"
                className="biblio-search-clear"
                onClick={() => setRecherche('')}
                title="Effacer la recherche"
                aria-label="Effacer la recherche"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="toolbar-quiet biblio-cats" role="group" aria-label="Filtrer par categorie">
            <button className={filtre === 'tous' ? 'on' : ''} onClick={() => setFiltre('tous')} data-f="tous">
              Tous
            </button>
            {CATEGORIES.map((c) => (
              <button key={c} className={filtre === c ? 'on' : ''} onClick={() => setFiltre(c)} data-f={c}>
                {CATEGORIE_LABELS[c] ?? c}
              </button>
            ))}
            <span className="toolbar-count">
              {filtrees.length} / {ressources.length}
            </span>
          </div>
        </div>

        <div
          className={`dropzone${dragOver ? ' over' : ''}`}
          onClick={() => fileInput.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.current?.click(); }}
          aria-label="Deposer des fichiers dans la bibliotheque"
        >
          <UploadSimple size={18} />
          <span>{uploading ? 'Dépôt en cours...' : 'Déposez vos fichiers ici (photos, PDF, captures) ou cliquez'}</span>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        <div className="archiver-row">
          <input
            value={archiverUrl}
            onChange={(e) => setArchiverUrl(e.target.value)}
            placeholder="Archiver une page web (ex: https://votresite.com/accueil)"
            aria-label="URL de la page a archiver"
          />
          <button className="ghost" type="button" onClick={onArchiverPage} disabled={uploading || !archiverUrl.trim()}>
            <Link size={14} /> Archiver
          </button>
        </div>

        {msg && <p className={`form-msg ${msg.type}`}>{msg.text}</p>}

        {loading ? (
          <div className="placeholder">Chargement de la bibliothèque...</div>
        ) : filtrees.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={ressources.length === 0 ? 'Aucune ressource pour l\'instant' : 'Aucune ressource ne correspond'}
            sub={
              ressources.length === 0
                ? 'La bibliothèque est la mémoire de votre marque : photos, pages de site, documents. Vos agents la lisent pour produire, et peuvent l\'enrichir eux-mêmes.'
                : 'Aucun résultat pour cette recherche ou ce filtre. Essayez un autre nom, ou réinitialisez les filtres.'
            }
          >
            {filtresActifs && (
              <button className="ghost" type="button" onClick={reinitFiltres} style={{ marginTop: 14 }}>
                Réinitialiser les filtres
              </button>
            )}
          </EmptyState>
        ) : (
          <div className="ressources-grid">
            {filtrees.map((r) => (
              <div key={r.id} className="ressource-card" onClick={() => onOpen(r.id)}>
                <div className="ressource-cover">
                  {r.type === 'image' ? (
                    <Image size={20} />
                  ) : r.type === 'pdf' ? (
                    <FilePdf size={20} />
                  ) : r.type === 'page' ? (
                    <Link size={20} />
                  ) : (
                    <File size={20} />
                  )}
                </div>
                <div className="ressource-body">
                  <div className="ressource-nom" title={r.nom}>{r.nom}</div>
                  <div className="ressource-meta">
                    {r.type} · {formatTaille(r.taille)} · {relTime(r.updated)}
                  </div>
                  <div className="ressource-actions">
                    <span className="badge">{CATEGORIE_LABELS[r.categorie] ?? r.categorie}</span>
                    <button
                      className="ghost danger"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(r.id, r.nom); }}
                      title="Supprimer"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Page>
    </div>
  );
}
