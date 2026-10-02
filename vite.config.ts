import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    // Rapier-compat incluye el WASM en base64 (~1,7 MB gzip). Ver docs/performance.md.
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('@dimforge')) return 'rapier';
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
});
