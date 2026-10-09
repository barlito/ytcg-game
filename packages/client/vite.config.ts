import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // The game data lives at the repository root, outside the client package.
  server: {
    port: 5173,
    fs: { allow: ['../..'] },
    // The holo masks are CSS mask images (CORS): served from this origin in dev, like in production.
    proxy: { '/uploads/masks': { target: 'https://ytcg.youlz.fr', changeOrigin: true } },
  },
});
