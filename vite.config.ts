import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project sites are served below /<repository>/.
  base: process.env.VITE_BASE_PATH || '/',
});
