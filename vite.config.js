import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// El build genera UN solo archivo (dist/index.html) que se abre con doble clic,
// sin servidor y sin instalar nada.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: { chunkSizeWarningLimit: 4000 },
});
