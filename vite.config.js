import { defineConfig } from 'vite';

// base './' so the built app works from any origin (file, PWA, Capacitor)
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    target: 'es2020',
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
  },
});
