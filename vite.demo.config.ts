import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Vite config for building the demo as a static site (GitHub Pages).
 * Unlike the library config, this bundles everything including d3 deps.
 */
export default defineConfig({
  root: resolve(__dirname, 'demo'),
  base: '/timelines/',
  build: {
    outDir: resolve(__dirname, 'demo-dist'),
    emptyOutDir: true,
  },
});
