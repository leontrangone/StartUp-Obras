// ─── Códigos de verificación por mail ──────────────────────────────────────
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { q } from './db.js';
import { ErrorApi } from './http.js';
import { nuevoId } from './datos.js';
import { enviarCorreo, mailCodigo } from './correo.js';
import { exigir, registrar } from './limites.js';

export const MINUTOS_VALIDEZ = 10;
const MAX_INTENTOS = 5;

const hashCodigo = (id, codigo) => createHash('sha256').update(`${id}:${codigo}`).digest('hex');

/** le***@gmail.com */
export function enmascarar(email) {
  const [u, d] = String(email).split('@');
  if (!d) return '***';
  return `${u.slice(0, Math.min(2, u.length))}${'*'.repeat(Math.max(3, u.length - 2))}@${d}`;
}

/**
 * Crea un código, invalida los anteriores del mismo tipo y lo manda por mail.
 * Limita: 1 envío cada 45 segundos por tipo y 10 por hora para el mismo email.
 */
export async function enviarCodigo({ proposito, email, usuarioId = null, nombre, datos = null }) {
  const claveEnvio = `envio:${email.toLowerCase()}`;
  const claveCorta = `${claveEnvio}:${proposito}`;
  await exigir(claveCorta, 1, 0.75, 'Esperá unos segundos antes de pedir otro código.');
  await exigir(claveEnvio, 10, 60, 'Pediste demasiados códigos. Probá de nuevo en {min}.');

  const id = nuevoId();
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await q('update codigos set usado = true where lower(email) = lower($1) and proposito = $2 and not usado', [email, proposito]);
  await q(
    `insert into codigos (id, proposito, email, usuario_id, hash, datos, expira)
     values ($1, $2, $3, $4, $5, $6, now() + ($7::float8 * interval '1 minute'))`,
    [id, proposito, email, usuarioId, hashCodigo(id, codigo), datos ? JSON.stringify(datos) : null, MINUTOS_VALIDEZ],
  );
  const m = mailCodigo(proposito, codigo, nombre, MINUTOS_VALIDEZ);
  await enviarCorreo({ para: email, asunto: m.asunto, html: m.html, texto: m.texto });
  await registrar(claveCorta);
  await registrar(claveEnvio);
  return { id, email: enmascarar(email), proposito, segundos: 45 };
}

/** Valida el código. Si es correcto lo marca como usado y devuelve la fila. */
export async function verificarCodigo(id, codigo, proposito) {
  const limpio = String(codigo || '').replace(/\D/g, '');
  if (limpio.length !== 6) throw new ErrorApi(400, 'El código tiene 6 números.');
  const [c] = await q(
    `select id, proposito, email, usuario_id, hash, datos, intentos, usado, expira < now() as vencido
       from codigos where id = $1`,
    [String(id || '')],
  );
  if (!c || c.proposito !== proposito) throw new ErrorApi(400, 'Código incorrecto.');
  if (c.usado) throw new ErrorApi(410, 'Ese código ya no sirve. Pedí uno nuevo.');
  if (c.vencido) throw new ErrorApi(410, 'El código venció. Pedí uno nuevo.');
  if (c.intentos >= MAX_INTENTOS) throw new ErrorApi(429, 'Demasiados intentos con este código. Pedí uno nuevo.');

  const esperado = Buffer.from(c.hash, 'hex');
  const recibido = Buffer.from(hashCodigo(c.id, limpio), 'hex');
  if (!timingSafeEqual(esperado, recibido)) {
    const [f] = await q('update codigos set intentos = intentos + 1 where id = $1 returning intentos', [c.id]);
    const quedan = MAX_INTENTOS - f.intentos;
    if (quedan <= 0) {
      await q('update codigos set usado = true where id = $1', [c.id]);
      throw new ErrorApi(429, 'Código incorrecto. Se agotaron los intentos: pedí uno nuevo.');
    }
    throw new ErrorApi(400, `Código incorrecto. Te ${quedan === 1 ? 'queda 1 intento' : `quedan ${quedan} intentos`}.`);
  }
  // Marcarlo usado de forma atómica (evita usarlo dos veces en paralelo)
  const ok = await q('update codigos set usado = true where id = $1 and not usado returning id', [c.id]);
  if (!ok.length) throw new ErrorApi(410, 'Ese código ya no sirve. Pedí uno nuevo.');
  return { ...c, datos: typeof c.datos === 'string' ? JSON.parse(c.datos) : c.datos };
}

/** Datos de un código pendiente (para reenviarlo). */
export async function leerPendiente(id) {
  const [c] = await q(
    `select c.id, c.proposito, c.email, c.usuario_id, c.datos, u.usuario
       from codigos c left join usuarios u on u.id = c.usuario_id
      where c.id = $1 and c.creado > now() - interval '1 hour'`,
    [String(id || '')],
  );
  if (!c) throw new ErrorApi(410, 'La verificación venció. Empezá de nuevo.');
  return { ...c, datos: typeof c.datos === 'string' ? JSON.parse(c.datos) : c.datos };
}
