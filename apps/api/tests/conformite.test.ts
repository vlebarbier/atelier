import { describe, expect, it } from 'vitest';
import { analyserConformite } from '../src/conformite.js';

/** Charte de test façon Bordeluche. */
const CHARTE = {
  couleurs: { bordeaux: '#722F37', creme: '#F5F0E6', dore: '#E8C97A' },
  polices: { titre: 'Fraunces', texte: 'Plus Jakarta Sans' }
};

describe('analyserConformite', () => {
  it('conforme : couleurs et polices de la charte, neutres ignorés', () => {
    const html = `<style>
      .slide { background: #722F37; color: #fff; font-family: 'Fraunces', serif; }
      .slide p { color: #F5F0E6; font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>`;
    expect(analyserConformite(html, CHARTE).statut).toBe('conforme');
  });

  it('hors-charte : une couleur de marque inconnue est un écart détaillé', () => {
    const html = `<style>.slide { background: #FF0000; font-family: 'Fraunces'; }</style>`;
    const v = analyserConformite(html, CHARTE);
    expect(v.statut).toBe('hors-charte');
    expect(v.ecarts.some((e) => e.nature === 'couleur' && e.valeur === '#FF0000')).toBe(true);
  });

  it('les couleurs achromatiques (blanc, noir, gris) ne sont pas contrôlées', () => {
    const html = `<style>
      .slide { background: #fff; color: #111; border: 1px solid rgb(128, 128, 128); }
      .slide h1 { color: hsl(0, 0%, 20%); font-family: 'Fraunces'; }
    </style>`;
    expect(analyserConformite(html, CHARTE).statut).toBe('conforme');
  });

  it('une police hors charte est un écart ; les génériques sont ignorées', () => {
    const html = `<style>.slide { font-family: 'Comic Sans MS', sans-serif; }</style>`;
    const v = analyserConformite(html, CHARTE);
    expect(v.statut).toBe('hors-charte');
    expect(v.ecarts.some((e) => e.nature === 'police' && e.valeur === 'Comic Sans MS')).toBe(true);
  });

  it('les références aux tokens de la charte ne sont pas des couleurs littérales', () => {
    const html = `<style>
      .slide { background: var(--bordeaux); color: var(--charte-couleur-creme); font-family: var(--police-titre); }
    </style>`;
    expect(analyserConformite(html, CHARTE).statut).toBe('conforme');
  });

  it('verdicts limites : sans charte exploitable → sans-charte ; sans source → sans-source', () => {
    expect(analyserConformite('<p>x</p>', {}).statut).toBe('sans-charte');
    expect(analyserConformite('', CHARTE).statut).toBe('sans-source');
    expect(analyserConformite('   \n ', CHARTE).statut).toBe('sans-source');
  });

  it('la casse et les hex courts sont normalisés (#E8C97A vs #e8c97a)', () => {
    const html = `<style>.slide { color: #e8c97a; background: #722f37; font-family: 'Fraunces'; }</style>`;
    expect(analyserConformite(html, CHARTE).statut).toBe('conforme');
  });

  it('plusieurs écarts sont tous rapportés (couleur + police)', () => {
    const html = `<style>.slide { background: #123456; font-family: 'Papyrus'; }</style>`;
    const v = analyserConformite(html, CHARTE);
    expect(v.statut).toBe('hors-charte');
    expect(v.ecarts.filter((e) => e.nature === 'couleur')).toHaveLength(1);
    expect(v.ecarts.filter((e) => e.nature === 'police')).toHaveLength(1);
  });
});
