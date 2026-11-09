// ─── Servidor local para desarrollo ─────────────────────────────────────────
// Corre las mismas funciones de /api que usa Vercel, en http://localhost:3001.
// `npm run dev` lo levanta junto con Vite (que le pasa las llamadas a /api).
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Carga .env.local / .env (sin dependencias)
for (const archivo of ['.env.local', '.env']) {
  const ruta = join(raiz, archivo);
  if (!existsSync(ruta)) continue;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const PUERTO = Number(process.env.PUERTO_API || 3001);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  const nombre = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
  if (!url.pathname.startsWith('/api/') || !/^[a-z/]+$/.test(nombre)) {
    res.statusCode = 404; return res.end('No encontrado');
  }
  const archivo = join(raiz, 'api', `${nombre}.js`);
  if (!existsSync(archivo)) { res.statusCode = 404; return res.end('No encontrado'); }
  req.query = Object.fromEntries(url.searchParams);
  try {
    const mod = await import(pathToFileURL(archivo).href);
    await mod.default(req, res);
  } catch (e) {
    console.error(e);
    res.statusCode = 500; res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PUERTO, () => {
  console.log(`API local lista en http://localhost:${PUERTO}`);
  if (!process.env.DATABASE_URL) console.warn('⚠ Falta DATABASE_URL en .env.local');
});
