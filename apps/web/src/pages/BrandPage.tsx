import tokens from '@atelier/tokens';

interface TokenSwatch {
  name: string;
  value: string;
}

function collectColors(): TokenSwatch[] {
  const swatches: TokenSwatch[] = [];
  const color = (tokens as { color?: Record<string, unknown> }).color;
  if (!color) return swatches;

  function walk(node: Record<string, unknown>, prefix: string) {
    for (const [key, val] of Object.entries(node)) {
      if (val && typeof val === 'object' && '$value' in (val as Record<string, unknown>)) {
        const entry = val as { $value: string };
        swatches.push({ name: `${prefix}${key}`, value: entry.$value });
      } else if (val && typeof val === 'object') {
        walk(val as Record<string, unknown>, `${prefix}${key}-`);
      }
    }
  }
  walk(color, 'color-');
  return swatches;
}

/** Le contrat DA visible : palette, typo, rayons, directement depuis packages/tokens. */
export function BrandPage() {
  const swatches = collectColors();
  const fontFamily = (tokens as { font?: { family?: { ui?: { $value?: string } } } }).font?.family?.ui?.$value;
  const radii = (tokens as { radius?: Record<string, { $value: string }> }).radius || {};

  return (
    <div className="brand-page">
      <section className="brand-section">
        <h3>Palette</h3>
        <div className="swatch-grid">
          {swatches.map((s) => (
            <div key={s.name} className="swatch">
              <div className="swatch-color" style={{ background: s.value }} />
              <div className="swatch-name">{s.name}</div>
              <div className="swatch-value">{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="brand-section">
        <h3>Typographie</h3>
        <div className="type-sample" style={{ fontFamily }}>
          Atelier, l'atelier de production de contenu.
        </div>
        <div className="type-family">{fontFamily}</div>
      </section>

      <section className="brand-section">
        <h3>Rayons</h3>
        <div className="radius-grid">
          {Object.entries(radii).map(([name, def]) => (
            <div key={name} className="radius-sample">
              <div className="radius-box" style={{ borderRadius: def.$value }} />
              <div className="radius-name">{name}</div>
              <div className="radius-value">{def.$value}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
