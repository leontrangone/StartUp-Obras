// ─── Autenticación: contraseñas con bcrypt + sesión en cookie firmada (JWT) ─
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { ErrorApi } from './http.js';

const COOKIE = 'plomada_sesion';
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

export async function iniciarSesion(res, usuario) {
  const token = await new SignJWT({ usuario: usuario.usuario })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(usuario.id)
    .setIssuedAt()
    .setExpirationTime(`${DURACION}s`)
    .sign(secreto());
  res.setHeader('Set-Cookie', cookie(token, DURACION));
}

export function cerrarSesion(res) {
  res.setHeader('Set-Cookie', cookie('', 0));
}

function cookie(valor, maxAge) {
  const seguro = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${seguro}`;
}

function leerCookie(req) {
  const h = req.headers?.cookie || '';
  for (const parte of h.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

/** Devuelve { id, usuario } si hay sesión válida, o null. */
export async function sesion(req) {
  const token = leerCookie(req);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secreto());
    return { id: payload.sub, usuario: payload.usuario };
  } catch { return null; }
}

/** Igual que sesion() pero corta con 401 si no hay usuario. */
export async function requiereUsuario(req) {
  const s = await sesion(req);
  if (!s) throw new ErrorApi(401, 'Tu sesión venció. Volvé a ingresar.');
  return s;
}
