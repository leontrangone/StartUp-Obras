// ─── Autenticación: contraseñas con bcrypt + sesión en cookie firmada (JWT) ─
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { q } from './db.js';
import { ErrorApi } from './http.js';

const COOKIE = 'plomada_sesion';
const COOKIE_DISPOSITIVO = 'plomada_dispositivo';
const DURACION = 60 * 60 * 24 * 30; // 30 días

function secreto() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('Falta la variable JWT_SECRET en Vercel (una frase larga y secreta).');
    }
    return new TextEncoder().encode('solo-para-desarrollo-local-cambiar');
  }
  return new TextEncoder().encode(s);
}

export const encriptar = (pass) => bcrypt.hash(pass, 10);
export const comparar = (pass, hash) => bcrypt.compare(pass, hash);
// Hash falso para comparar igual cuando el usuario no existe (evita adivinar usuarios por el tiempo de respuesta)
export const HASH_FALSO = '$2a$10$BNnv/0u5LXQrHDFB/6H6Buz7Ioj2hNyg0ebus6bCPIAmkSBeX4aJ2';

export function validarPassword(password) {
  const p = String(password || '');
  if (p.length < 8) throw new ErrorApi(400, 'La contraseña tiene que tener al menos 8 caracteres.');
  if (p.length > 200) throw new ErrorApi(400, 'La contraseña es demasiado larga.');
  return p;
}

// ── Cookies ────────────────────────────────────────────────────────────────
function agregarCookie(res, valor) {
  const prev = res.getHeader('Set-Cookie');
  const lista = prev ? (Array.isArray(prev) ? prev : [prev]) : [];
  res.setHeader('Set-Cookie', [...lista, valor]);
}

function cookie(nombre, valor, maxAge) {
  const seguro = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${nombre}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${seguro}`;
}

function leerCookie(req, nombre) {
  const h = req.headers?.cookie || '';
  for (const parte of h.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return v.join('=');
  }
  return null;
}

const firmar = (datos, sub) => new SignJWT(datos)
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject(sub)
  .setIssuedAt()
  .setExpirationTime(`${DURACION}s`)
  .sign(secreto());

// ── Sesión ─────────────────────────────────────────────────────────────────
/** usuario: { id, usuario, sesion_version } */
export async function iniciarSesion(res, usuario) {
  const token = await firmar({ usuario: usuario.usuario, v: Number(usuario.sesion_version || 0), t: 'sesion' }, usuario.id);
  agregarCookie(res, cookie(COOKIE, token, DURACION));
}

export function cerrarSesion(res) {
  agregarCookie(res, cookie(COOKIE, '', 0));
}

/** Devuelve { id, usuario, v } si la cookie es válida (sin consultar la base), o null. */
export async function sesion(req) {
  const token = leerCookie(req, COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secreto());
    if (payload.t && payload.t !== 'sesion') return null;
    return { id: payload.sub, usuario: payload.usuario, v: Number(payload.v || 0) };
  } catch { return null; }
}

/** Exige sesión válida y vigente (si cambió la contraseña, las sesiones viejas dejan de valer). */
export async function requiereUsuario(req) {
  const s = await sesion(req);
  if (!s) throw new ErrorApi(401, 'Tu sesión venció. Volvé a ingresar.');
  const [u] = await q('select sesion_version from usuarios where id = $1', [s.id]);
  if (!u || Number(u.sesion_version) !== s.v) throw new ErrorApi(401, 'Tu sesión venció. Volvé a ingresar.');
  return s;
}

// ── Dispositivo de confianza (no pedir código por 30 días) ─────────────────
export async function recordarDispositivo(res, usuario) {
  const token = await firmar({ v: Number(usuario.sesion_version || 0), t: 'dispositivo' }, usuario.id);
  agregarCookie(res, cookie(COOKIE_DISPOSITIVO, token, DURACION));
}

export async function dispositivoConfiable(req, usuario) {
  const token = leerCookie(req, COOKIE_DISPOSITIVO);
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secreto());
    return payload.t === 'dispositivo' && payload.sub === usuario.id && Number(payload.v) === Number(usuario.sesion_version || 0);
  } catch { return false; }
}
