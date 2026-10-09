import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  envDir: path.resolve(import.meta.dirname, '../..'),
  base: './',
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
    target: 'chrome120',
  },
});
