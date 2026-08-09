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
    json: {
      transformGroup: 'js',
      buildPath: path.join(here, 'dist/'),
      files: [{ destination: 'tokens.json', format: 'json/atelier-flat' }]
    }
  }
});

await sd.buildAllPlatforms();
console.log('Tokens Atelier : dist/tokens.css + dist/tokens.json generes.');
