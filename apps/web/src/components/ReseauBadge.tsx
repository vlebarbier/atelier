import type { Reseau } from '../api';
import { RESEAUX_LABELS } from '../format';
import { Square } from '@phosphor-icons/react';

/**
 * Logos officiels des reseaux sociaux en SVG inline (copies de la maquette
 * publications.html validee Victor 13/08). Instagram / LinkedIn / Facebook /
 * X ont leur SVG officiel ; tiktok et gmb passent par un fallback texte
 * (pas de SVG officiel integre a la maquette).
 */
const PATHS: Record<string, { viewBox: string; d: string }> = {
  instagram: {
    viewBox: '0 0 24 24',
    d: 'M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.9.2 2.3.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.3.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.9-.4 2.3-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.3.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.9-.2-2.3-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.9.4-2.3.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.3-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.6a5.2 5.2 0 100 10.4 5.2 5.2 0 000-10.4zm0 8.6a3.4 3.4 0 110-6.8 3.4 3.4 0 010 6.8zm6.6-8.8a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z'
  },
  linkedin: {
    viewBox: '0 0 24 24',
    d: 'M20.4 20.4h-3.6v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.2V9h3.4v1.6h.1c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 110-4.2 2.1 2.1 0 010 4.2zm1.8 13H3.5V9h3.6v11.4z'
  },
  facebook: {
    viewBox: '0 0 24 24',
    d: 'M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0022 12z'
  },
  x: {
    viewBox: '0 0 24 24',
    d: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
  }
};

/** Classes de couleur par reseau (fond + texte, identiques a la maquette). */
const NET_CLASS: Record<string, string> = {
  instagram: 'net-ig',
  linkedin: 'net-li',
  facebook: 'net-fb',
  x: 'net-x',
  tiktok: 'net-x',
  gmb: 'net-x'
};

export function ReseauIcon({ reseau }: { reseau: string }) {
  const svg = PATHS[reseau];
  if (!svg) return null;
  return (
    <svg viewBox={svg.viewBox} fill="currentColor" aria-hidden="true">
      <path d={svg.d} />
    </svg>
  );
}

/** Badge reseau : logo SVG officiel + nom (Instagram / LinkedIn / ...). */
export function ReseauBadge({ reseau }: { reseau: Reseau }) {
  const svg = PATHS[reseau];
  const label = RESEAUX_LABELS[reseau] ?? reseau;
  return (
    <span className={`net ${NET_CLASS[reseau] ?? 'net-x'}`}>
      {svg ? <ReseauIcon reseau={reseau} /> : <span className="net-glyph" aria-hidden="true"><Square size={14} weight="bold" /></span>}
      {label}
    </span>
  );
}
