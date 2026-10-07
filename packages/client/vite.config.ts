import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // The game data lives at the repository root, outside the client package.
  server: { port: 5173, fs: { allow: ['../..'] } },
});
