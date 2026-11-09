// ─── Utilidades para las funciones de /api ──────────────────────────────────
export class ErrorApi extends Error {
  constructor(status, mensaje) { super(mensaje); this.status = status; }
}

/** Lee el cuerpo JSON (Vercel ya lo trae parseado en req.body). */
export async function cuerpo(req) {
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body || '{}'); } catch { throw new ErrorApi(400, 'JSON inválido'); } }
  const partes = [];
  for await (const c of req) partes.push(c);
  const txt = Buffer.concat(partes).toString('utf8');
  if (!txt) return {};
  try { return JSON.parse(txt); } catch { throw new ErrorApi(400, 'JSON inválido'); }
}

export function enviar(res, status, datos) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(datos ?? {}));
}

export function parametro(req, nombre) {
  if (req.query && req.query[nombre] !== undefined) return String(req.query[nombre]);
  const u = new URL(req.url, 'http://x');
  return u.searchParams.get(nombre);
}

/**
 * Envuelve un handler: { GET: fn, POST: fn, ... }.
 * Atrapa errores y responde con un mensaje entendible.
 */
export function ruta(metodos) {
  return async (req, res) => {
    const fn = metodos[req.method];
    if (!fn) { res.setHeader('Allow', Object.keys(metodos).join(', ')); return enviar(res, 405, { error: 'Método no permitido' }); }
    try {
      const r = await fn(req, res);
      if (!res.writableEnded) enviar(res, 200, r ?? { ok: true });
    } catch (e) {
      if (e instanceof ErrorApi) return enviar(res, e.status, { error: e.message });
      console.error(e);
      const msg = /DATABASE_URL|JWT_SECRET/.test(e.message) ? e.message : 'Error del servidor. Probá de nuevo en un rato.';
      enviar(res, 500, { error: msg });
    }
  };
}
