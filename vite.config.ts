import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works under https://<owner>.github.io/<repo>/.
  base: './',
  build: {
    target: 'es2022',
    // Rapier inlines ~4 MB of WASM; it is loaded lazily as its own chunk (research R2).
    chunkSizeWarningLimit: 5000,
  },
});
