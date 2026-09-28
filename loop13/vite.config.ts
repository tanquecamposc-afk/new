import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the built game can be opened from any sub-path (GitHub Pages, file hosting…)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          post: ['postprocessing', '@react-three/postprocessing'],
        },
      },
    },
  },
  test: { environment: 'node' },
} as never);
