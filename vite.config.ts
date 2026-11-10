import { defineConfig } from 'vite';

// The web client lives in src/client and imports the pure simulation from src/core.
// `dist/` is reserved for the TypeScript build of the core and its tests, so the web bundle
// goes to `dist-web/`. A relative base lets the build be served from any sub-path.
export default defineConfig({
  base: './',
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'react' },
  },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
