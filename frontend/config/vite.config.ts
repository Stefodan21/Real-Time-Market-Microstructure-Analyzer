import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `root` defaults to the directory npm runs from (the `frontend/` folder),
// so `index.html` at the project root is picked up automatically even though
// this config lives inside `config/`.
export default defineConfig({
  plugins: [react()],
  base: '/Real-Time-Market-Microstructure-Analyzer/',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
