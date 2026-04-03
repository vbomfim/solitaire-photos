import { defineConfig } from 'vite';

export default defineConfig({
  base: '/solitaire-photos/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
