import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes every link relative, so the built site works at
// https://<you>.github.io/<repository-name>/ without extra setup.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0, // keep images and sound as real files
    // Firebase (~170 KB gzipped) is its own file, downloaded only when
    // the first answer is saved, so the large size is fine.
    chunkSizeWarningLimit: 700,
  },
});
