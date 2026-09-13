import { defineConfig } from 'vite';

// base './' so the built app works from any origin (file, PWA, Capacitor)
export default defineConfig({
  base: './',
  // Arena's browser preview is proxied through a dynamic .e2b.app host.
  // This only affects local Vite serving, not the static Android/prod bundle.
  server: { host: true, port: 5173, allowedHosts: true },
  preview: { host: true, port: 4173, allowedHosts: true },
  build: {
    target: 'es2020',
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
  },
});
