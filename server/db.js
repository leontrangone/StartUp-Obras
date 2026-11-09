// ─── Conexión a la base de datos ────────────────────────────────────────────
// En producción (Neon) usa el driver serverless por HTTP, ideal para Vercel.
// En local, con un Postgres común, usa "pg".
import { ESQUEMA } from './schema.js';

let ejecutar = null;
let esquemaListo = null;

async function conectar() {
  if (ejecutar) return ejecutar;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta la variable DATABASE_URL (la cadena de conexión de Neon).');
  if (/neon\.tech/.test(url)) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    ejecutar = (texto, params = []) => sql.query(texto, params);
  } else {
    const pg = (await import('pg')).default;
    const pool = new pg.Pool({ connectionString: url, max: 3 });
    ejecutar = async (texto, params = []) => (await pool.query(texto, params)).rows;
  }
  return ejecutar;
}

/** Crea las tablas si no existen (una vez por arranque del servidor). */
async function asegurarEsquema(run) {
  if (!esquemaListo) {
    esquemaListo = (async () => {
      // Si las tablas ya existen, no hace falta nada
      const [fila] = await run("select to_regclass('public.gastos') as t");
      if (fila?.t) return;
      const sentencias = ESQUEMA
        .replace(/--.*$/gm, '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const s of sentencias) await run(s);
    })().catch((e) => { esquemaListo = null; throw e; });
  }
  return esquemaListo;
}

/** Ejecuta una consulta con parámetros ($1, $2…) y devuelve las filas. */
export async function q(texto, params = []) {
  const run = await conectar();
  await asegurarEsquema(run);
  return run(texto, params);
}
