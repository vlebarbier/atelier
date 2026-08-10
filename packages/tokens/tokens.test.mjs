import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

describe('tokens sources', () => {
  const raw = readFileSync(path.join(root, 'tokens.json'), 'utf8');
  const tokens = JSON.parse(raw);

  it('contient l accent monochrome blanc (dark) / noir (light)', () => {
    expect(tokens.color.accent.base.$value).toBe('#FFFFFF');
    expect(tokens.color.accent.base.$extensions.light).toBe('#0A0A0A');
  });

  it('contient le statut a-valider ambre, distinct de l accent', () => {
    expect(tokens.color.status.warn.$value).toBe('#F5A623');
    expect(tokens.color.status.warn.$value).not.toBe(tokens.color.accent.base.$value);
  });

  it('contient le statut valide vert et le statut erreur rouge', () => {
    expect(tokens.color.status.ok.$value).toBe('#2FD06B');
    expect(tokens.color.status.err.$value).toBe('#FF5252');
  });

  it('utilise Geist comme unique famille de police', () => {
    expect(tokens.font.family.ui.$value).toContain('Geist');
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
    expect(css).toContain('--color-accent-base: #FFFFFF');
    expect(css).toContain('@media (prefers-color-scheme: light)');

    const built = JSON.parse(readFileSync(jsonPath, 'utf8'));
    expect(built['color.accent.base'].dark).toBe('#FFFFFF');
    expect(built['color.accent.base'].light).toBe('#0A0A0A');
  });
});
