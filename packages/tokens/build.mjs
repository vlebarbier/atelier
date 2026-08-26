// packages/tokens/build.mjs
// Genere dist/tokens.css (variables CSS dark-first + override light) et dist/tokens.json
// a partir de tokens.json (format DTCG, $value + $extensions.light).
// IMPORTANT : tous les chemins sont resolus depuis ce fichier (import.meta.dirname),
// jamais depuis le cwd du processus appelant (Vercel lance ce script depuis apps/web).
import StyleDictionary from 'style-dictionary';
import path from 'node:path';

const here = import.meta.dirname;

StyleDictionary.registerFormat({
  name: 'css/atelier-vars',
  format: async ({ dictionary }) => {
    const darkLines = [];
    const lightLines = [];
    for (const token of dictionary.allTokens) {
      const varName = `--${token.path.join('-')}`;
      const value = token.$value ?? token.value;
      darkLines.push(`  ${varName}: ${value};`);
      const light = token.$extensions && token.$extensions.light;
      if (light) lightLines.push(`    ${varName}: ${light};`);
    }
    return [
      '/* Genere par packages/tokens/build.mjs, ne pas editer a la main. */',
      '/* Source unique : packages/tokens/tokens.json */',
      ':root {',
      darkLines.join('\n'),
      '  color-scheme: dark;',
      '}',
      '',
      '@media (prefers-color-scheme: light) {',
      '  :root {',
      lightLines.join('\n'),
      '    color-scheme: light;',
      '  }',
      '}',
      ''
    ].join('\n');
  }
});

// Table de mapping DTCG -> variables shadcn (SPEC-SHADCN.md §3). La valeur est
// lue depuis le token source, jamais codee en dur : changer tokens.json propage
// partout, y compris shadcn.
const MAPPING_SHADCN = [
  ['background', 'color', 'bg', 'level-1'],
  ['foreground', 'color', 'ink', 'primary'],
  ['card', 'color', 'bg', 'level-3'],
  ['card-foreground', 'color', 'ink', 'primary'],
  ['popover', 'color', 'bg', 'level-3'],
  ['popover-foreground', 'color', 'ink', 'primary'],
  ['primary', 'color', 'accent', 'base'],
  ['primary-foreground', 'color', 'accent', 'on-accent'],
  ['secondary', 'color', 'bg', 'level-2'],
  ['secondary-foreground', 'color', 'ink', 'primary'],
  ['muted', 'color', 'bg', 'level-2'],
  ['muted-foreground', 'color', 'ink', 'secondary'],
  ['accent', 'color', 'line', 'hover'],
  ['accent-foreground', 'color', 'ink', 'primary'],
  ['destructive', 'color', 'status', 'err'],
  ['border', 'color', 'line', 'default'],
  ['input', 'color', 'line', 'strong'],
  ['ring', 'color', 'accent', 'base']
];

StyleDictionary.registerFormat({
  name: 'css/atelier-shadcn',
  format: async ({ dictionary }) => {
    // Index chemin DTCG normalise -> { value, light } pour la resolution du mapping.
    const parChemin = new Map();
    for (const token of dictionary.allTokens) {
      const value = token.$value ?? token.value;
      parChemin.set(token.path.join('.'), {
        value,
        light: token.$extensions && token.$extensions.light
      });
    }
    const resoudre = (chemin) => parChemin.get(chemin);
    const lignes = (cleLight) =>
      MAPPING_SHADCN.map(([nomVar, ...chemin]) => {
        const t = resoudre(chemin.join('.'));
        if (!t) return null;
        const v = cleLight ? t.light : t.value;
        return v ? `  --${nomVar}: ${v};` : null;
      })
        .filter(Boolean)
        .join('\n');
    return [
      '/* Genere par packages/tokens/build.mjs, ne pas editer a la main. */',
      '/* Mapping shadcn/ui : SPEC-SHADCN.md §3. Convention shadcn : :root = light, .dark = dark. */',
      ':root {',
      lignes(true),
      '}',
      '',
      '.dark {',
      lignes(false),
      '}',
      ''
    ].join('\n');
  }
});

StyleDictionary.registerFormat({
  name: 'json/atelier-flat',
  format: async ({ dictionary }) => {
    const out = {};
    for (const token of dictionary.allTokens) {
      const value = token.$value ?? token.value;
      const light = token.$extensions && token.$extensions.light;
      out[token.path.join('.')] = {
        cssVar: `--${token.path.join('-')}`,
        dark: value,
        light: light || null
      };
    }
    return JSON.stringify(out, null, 2);
  }
});

const sd = new StyleDictionary({
  source: [path.join(here, 'tokens.json')],
  usesDtcg: true,
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: path.join(here, 'dist/'),
      files: [{ destination: 'tokens.css', format: 'css/atelier-vars' }]
    },
    shadcn: {
      transformGroup: 'css',
      buildPath: path.join(here, 'dist/'),
      files: [{ destination: 'tokens.shadcn.css', format: 'css/atelier-shadcn' }]
    },
    json: {
      transformGroup: 'js',
      buildPath: path.join(here, 'dist/'),
      files: [{ destination: 'tokens.json', format: 'json/atelier-flat' }]
    }
  }
});

await sd.buildAllPlatforms();
console.log('Tokens Atelier : dist/tokens.css + dist/tokens.shadcn.css + dist/tokens.json generes.');
