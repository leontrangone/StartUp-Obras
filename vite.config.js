import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { copyFileSync } from 'node:fs';

// Convierte el script en uno "clásico" al final del <body>. Así el archivo
// funciona con doble clic en cualquier navegador, sin servidor.
function scriptClasico() {
  return {
    name: 'script-clasico',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const f of Object.values(bundle)) {
        if (f.type !== 'asset' || !f.fileName.endsWith('.html')) continue;
        let html = String(f.source);
        const ini = html.indexOf('<script type="module" crossorigin>');
        if (ini === -1) continue;
        const fin = html.indexOf('</script>', ini) + '</script>'.length;
        const codigo = html.slice(ini, fin).replace('<script type="module" crossorigin>', '<script>');
        html = html.slice(0, ini) + html.slice(fin);
        html = html.replace('</body>', () => codigo + '\n</body>');
        f.source = html;
      }
    },
  };
}

// Además de dist/index.html, deja una copia "Plomada.html" en la raíz del proyecto.
function copiaEnRaiz() {
  return {
    name: 'copia-en-raiz',
    closeBundle() {
      try { copyFileSync('dist/index.html', 'Plomada.html'); } catch { /* nada */ }
    },
  };
}

export default defineConfig({
  plugins: [react(), viteSingleFile(), scriptClasico(), copiaEnRaiz()],
  base: './',
  build: {
    chunkSizeWarningLimit: 4000,
    modulePreload: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
});
