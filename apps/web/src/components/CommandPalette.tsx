import { useEffect, useMemo, useRef, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import type { Brouillon } from '../api';
import type { Vue } from './ContentListPage';

interface Command {
  grp: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  brouillons: Brouillon[];
  onOpenBrouillon: (id: string) => void;
  onToggleVue: () => void;
  onGoBrouillons: () => void;
  /** Navigation vers la page Blog (les articles ont leur editeur dedie). */
  onGoBlog: () => void;
  /** Ouvre la modale de creation (Nouvelle creation). */
  onOpenCreation: () => void;
  vue: Vue;
}

export function CommandPalette({
  open,
  onClose,
  brouillons,
  onOpenBrouillon,
  onToggleVue,
  onGoBrouillons,
  onGoBlog,
  onOpenCreation,
  vue
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [];
    cmds.push({
      grp: 'Action',
      label: 'Nouveau brouillon',
      hint: 'N',
      run: () => {
        onClose();
        onGoBrouillons();
        onOpenCreation();
      }
    });
    cmds.push({
      grp: 'Vue',
      label: `Basculer vers la vue ${vue === 'grille' ? 'liste' : 'grille'}`,
      hint: 'V',
      run: () => {
        onClose();
        onToggleVue();
      }
    });
    cmds.push({
      grp: 'Navigation',
      label: 'Ouvrir le premier brouillon',
      hint: 'Entree',
      run: () => {
        onClose();
        onGoBrouillons();
        if (brouillons[0]) onOpenBrouillon(brouillons[0].id);
      }
    });
    for (const b of brouillons) {
      const estArticle = b.type === 'article';
      cmds.push({
        grp: estArticle ? 'Articles' : 'Contenus',
        label: `Ouvrir : ${b.titre}`,
        run: () => {
          onClose();
          if (estArticle) {
            onGoBlog();
          } else {
            onGoBrouillons();
          }
          onOpenBrouillon(b.id);
        }
      });
    }

    if (!query) return cmds.slice(0, 8);
    const q = query.toLowerCase();
    return cmds.filter((c) => c.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query, brouillons, onClose, onGoBrouillons, onGoBlog, onOpenBrouillon, onOpenCreation, onToggleVue, vue]);

  useEffect(() => {
    if (selected >= commands.length) setSelected(0);
  }, [commands, selected]);

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, commands.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        commands[selected]?.run();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, commands, selected, onClose]);

  if (!open) return null;

  return (
    <div
      className="cmdk-overlay open"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cmdk-panel">
        <div className="cmdk-input-wrap">
          <span className="cmdk-icon">
            <MagnifyingGlass size={15} />
          </span>
          <input
            ref={inputRef}
            id="cmdk-input"
            type="text"
            placeholder="Rechercher une action ou un brouillon"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="cmdk-esc">{'ESC'}</kbd>
        </div>
        <div className="cmdk-list">
          {commands.length === 0 ? (
            <div className="cmdk-empty">Aucun resultat</div>
          ) : (
            commands.map((c, i) => (
              <div
                key={`${c.grp}-${c.label}`}
                className={`cmdk-item${i === selected ? ' sel' : ''}`}
                onMouseDown={() => c.run()}
              >
                <span>
                  <span className="grp">{c.grp}</span>
                  {c.label}
                </span>
                {c.hint && <kbd>{c.hint}</kbd>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

