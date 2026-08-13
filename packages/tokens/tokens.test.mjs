import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

describe('tokens sources', () => {
  const raw = readFileSync(path.join(root, 'tokens.json'), 'utf8');
  const tokens = JSON.parse(raw);

  it('conserve des fonds noirs (dark) et un mode clair adouci (light)', () => {
    expect(tokens.color.bg.deepest.$value).toBe('#050505');
    expect(tokens.color.bg['level-1'].$value).toBe('#0A0A0A');
    expect(tokens.color.bg.deepest.$extensions.light).toBe('#F6F6F4');
    expect(tokens.color.bg['level-1'].$extensions.light).toBe('#FFFFFF');
  });

  it('contient l accent unique dore #E8C97A (dark) / ambre profond #B45309 (light)', () => {
    expect(tokens.color.accent.base.$value).toBe('#E8C97A');
    expect(tokens.color.accent.base.$extensions.light).toBe('#B45309');
    expect(tokens.color.accent['on-accent'].$value).toBe('#0A0A0A');
  });

  it('contient le statut a-valider ambre #D9A441, distinct de l accent (dark ET light)', () => {
    expect(tokens.color.status.warn.$value).toBe('#D9A441');
    expect(tokens.color.status.warn.$value).not.toBe(tokens.color.accent.base.$value);
    expect(tokens.color.status.warn.$extensions.light).not.toBe(tokens.color.accent.base.$extensions.light);
  });

  it('contient le statut valide vert #4CAF7D et le statut erreur rouge', () => {
    expect(tokens.color.status.ok.$value).toBe('#4CAF7D');
    expect(tokens.color.status.err.$value).toBe('#FF5252');
  });

  it('utilise Plus Jakarta Sans comme unique famille de police', () => {
    expect(tokens.font.family.ui.$value).toContain('Plus Jakarta Sans');
  });

  it('definit des hairlines alpha (jamais de gris plein)', () => {
    expect(tokens.color.line.default.$value).toMatch(/^rgba\(/);
  });
});

describe('build Style Dictionary', () => {
  it('genere dist/tokens.css et dist/tokens.json', () => {
    execSync('node build.mjs', { cwd: root });
    const cssPath = path.join(root, 'dist', 'tokens.css');
    const jsonPath = path.join(root, 'dist', 'tokens.json');
    expect(existsSync(cssPath)).toBe(true);
    expect(existsSync(jsonPath)).toBe(true);

    const css = readFileSync(cssPath, 'utf8');
    expect(css).toContain('--color-accent-base: #E8C97A');
    expect(css).toContain('@media (prefers-color-scheme: light)');

    const built = JSON.parse(readFileSync(jsonPath, 'utf8'));
    expect(built['color.accent.base'].dark).toBe('#E8C97A');
    expect(built['color.accent.base'].light).toBe('#B45309');
  });
});
