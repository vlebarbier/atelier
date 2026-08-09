// Types pour @atelier/render (package en .mjs sans déclarations).
declare module '@atelier/render' {
  export interface RenderSlidesOptions {
    source: string;
    outDir: string;
    size?: number;
    scale?: number;
  }
  export function renderSlides(options: RenderSlidesOptions): Promise<string[]>;
}
