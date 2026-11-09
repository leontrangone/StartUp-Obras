// ─── Límites de intentos (anti fuerza bruta) ───────────────────────────────
import { q } from './db.js';
import { ErrorApi } from './http.js';

/** IP del visitante (Vercel la manda en x-forwarded-for). */
export function ipDe(req) {
  const h = req.headers || {};
  return String(h['x-real-ip'] || (h['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || 'desconocida').trim();
}

/** Cuántos registros tiene la clave dentro de la ventana, y cuándo se libera. */
export async function contar(clave, ventanaMin) {
  const [f] = await q(
    `select count(*)::int as n,
            ceil(extract(epoch from (min(creado) + ($2::float8 * interval '1 minute') - now())) / 60)::int as faltan
       from limites where clave = $1 and creado > now() - ($2::float8 * interval '1 minute')`,
    [clave, ventanaMin],
  );
  return { n: f?.n || 0, faltan: Math.max(1, f?.faltan || 1) };
}

/** Corta con 429 si ya se llegó al máximo. */
export async function exigir(clave, max, ventanaMin, mensaje) {
  const { n, faltan } = await contar(clave, ventanaMin);
  if (n >= max) {
    throw new ErrorApi(429, mensaje.replace('{min}', `${faltan} ${faltan === 1 ? 'minuto' : 'minutos'}`));
  }
  return max - n;
}

export async function registrar(clave) {
  await q('insert into limites (clave) values ($1)', [clave]);
  // Limpieza ocasional de registros viejos
  if (Math.random() < 0.05) {
    await q("delete from limites where creado < now() - interval '1 day'").catch(() => {});
    await q("delete from codigos where expira < now() - interval '1 day'").catch(() => {});
  }
}

export async function limpiar(clave) {
  await q('delete from limites where clave = $1', [clave]);
}
