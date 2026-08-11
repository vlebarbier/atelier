import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadSimple, File, Image, FilePdf, Link, Trash, FolderOpen } from '@phosphor-icons/react';
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

/** La bibliotheque : memoire de la marque. Le user depose ses contenus (photos, PDF, pages),
 *  l'agent les lit pour produire conforme et peut en deposer lui-meme via le MCP. */
export function BibliothequePage() {
  const [ressources, setRessources] = useState<Ressource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [filtre, setFiltre] = useState<string>('tous');
  const [archiverUrl, setArchiverUrl] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

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

  const filtrees = filtre === 'tous' ? ressources : ressources.filter((r) => r.categorie === filtre);

  return (
    <Page>
      <PageHeader
        title="Bibliotheque"
        sub="La memoire de votre marque : photos, pages de site, documents. Vos agents la lisent pour produire."
        actions={
          <div className="toolbar-group">
            <button className={filtre === 'tous' ? 'on' : ''} onClick={() => setFiltre('tous')} data-f="tous">
              Tous
            </button>
            {CATEGORIES.filter((c) => c !== 'autre').map((c) => (
              <button key={c} className={filtre === c ? 'on' : ''} onClick={() => setFiltre(c)} data-f={c}>
                {c}
              </button>
            ))}
          </div>
        }
      />

      <div
        className={`dropzone${dragOver ? ' over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); }}
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
          title={ressources.length === 0 ? 'Aucune ressource pour l\'instant' : `Aucune ressource dans « ${filtre} »`}
          sub="La bibliothèque est la mémoire de votre marque : photos, pages de site, documents. Vos agents la lisent pour produire, et peuvent l'enrichir eux-mêmes."
        />
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
                  <span className="badge">{r.categorie}</span>
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
  );
}
