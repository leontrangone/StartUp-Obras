import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, las llamadas a /api van al servidor local (server/local.js).
// En Vercel, /api son funciones serverless y el resto es la app estática (dist/).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:3001' } },
  preview: { proxy: { '/api': 'http://localhost:3001' } },
  build: { chunkSizeWarningLimit: 4000 },
});
