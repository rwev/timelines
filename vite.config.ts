import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**'],
      outDir: 'dist',
    }),
  ],
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Timelines',
      formats: ['es', 'cjs'],
      fileName: 'timelines',
    },
    rollupOptions: {
      external: ['d3-axis', 'd3-scale', 'd3-selection', 'd3-shape', 'd3-transition', 'd3-zoom'],
    },
  },
});
