// ─── /api/auth/:accion ──────────────────────────────────────────────────────
//  POST registro     { usuario, email, password }        → manda código al mail
//  POST login        { identificador, password }         → manda código (o entra si el dispositivo es de confianza)
//  POST verificar    { id, codigo, recordar }            → valida el código y abre la sesión
//  POST reenviar     { id }                              → manda un código nuevo
//  POST recuperar    { identificador }                   → manda código para cambiar la contraseña
//  POST restablecer  { id, codigo, password }            → cambia la contraseña y abre la sesión
//  POST logout                                           → cierra la sesión
//  GET  me                                               → usuario con sesión abierta
import { q } from '../../server/db.js';
import { ruta, cuerpo, ErrorApi } from '../../server/http.js';
import {
  encriptar, comparar, HASH_FALSO, validarPassword, iniciarSesion, cerrarSesion,
  requiereUsuario, recordarDispositivo, dispositivoConfiable,
} from '../../server/auth.js';
import { enviarCodigo, verificarCodigo, leerPendiente, enmascarar } from '../../server/codigos.js';
import { ipDe, exigir, registrar, limpiar } from '../../server/limites.js';
import { enviarCorreo, mailContrasenaCambiada } from '../../server/correo.js';
import { nuevoId } from '../../server/datos.js';

const RE_USUARIO = /^[A-Za-z0-9._-]{3,30}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const publico = (u) => ({ id: u.id, usuario: u.usuario, email: u.email });

// Límites de login: 5 fallos por cuenta y 20 por IP cada 15 minutos
const LOGIN_MAX_CUENTA = 5;
const LOGIN_MAX_IP = 20;
const LOGIN_VENTANA = 15;

async function buscarUsuario(ident) {
  const [u] = await q(
    'select id, usuario, email, hash, sesion_version from usuarios where lower(usuario) = lower($1) or lower(email) = lower($1) limit 1',
    [ident],
  );
  return u || null;
}

const acciones = {
  async registro(req) {
    const b = await cuerpo(req);
    const usuario = String(b.usuario || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = validarPassword(b.password);
    if (!RE_USUARIO.test(usuario)) throw new ErrorApi(400, 'El usuario tiene que tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.');
    if (!RE_EMAIL.test(email) || email.length > 160) throw new ErrorApi(400, 'Ese email no parece válido.');

    const ip = ipDe(req);
    await exigir(`registro-ip:${ip}`, 10, 60, 'Demasiados registros desde esta conexión. Probá de nuevo en {min}.');

    const existentes = await q('select lower(usuario) as u, lower(email) as e from usuarios where lower(usuario) = lower($1) or lower(email) = $2', [usuario, email]);
    if (existentes.some((x) => x.u === usuario.toLowerCase())) throw new ErrorApi(409, 'Ese nombre de usuario ya está en uso.');
    if (existentes.some((x) => x.e === email)) throw new ErrorApi(409, 'Ya hay una cuenta con ese email. Probá ingresar o recuperar la contraseña.');

    const hash = await encriptar(password);
    const pendiente = await enviarCodigo({ proposito: 'registro', email, nombre: usuario, datos: { usuario, email, hash } });
    await registrar(`registro-ip:${ip}`);
    return { pendiente };
  },

  async login(req, res) {
    const b = await cuerpo(req);
    const ident = String(b.identificador || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!ident || !password) throw new ErrorApi(400, 'Completá usuario (o email) y contraseña.');

    const ip = ipDe(req);
    const u = await buscarUsuario(ident);
    // El bloqueo es por cuenta (sirva el usuario o el email) y por conexión
    const claveCuenta = `login-fallo:${u ? u.id : ident}`;
    const claveIp = `login-fallo-ip:${ip}`;
    const msgBloqueo = 'Demasiados intentos fallidos. Por seguridad, esperá {min} o recuperá tu contraseña.';
    const quedanCuenta = await exigir(claveCuenta, LOGIN_MAX_CUENTA, LOGIN_VENTANA, msgBloqueo);
    await exigir(claveIp, LOGIN_MAX_IP, LOGIN_VENTANA, 'Demasiados intentos fallidos desde esta conexión. Esperá {min}.');

    const ok = await comparar(password, u?.hash || HASH_FALSO);
    if (!u || !ok) {
      await registrar(claveCuenta);
      await registrar(claveIp);
      const quedan = quedanCuenta - 1;
      if (quedan <= 0) throw new ErrorApi(429, msgBloqueo.replace('{min}', `${LOGIN_VENTANA} minutos`));
      throw new ErrorApi(401, `Usuario, email o contraseña incorrectos. ${quedan === 1 ? 'Te queda 1 intento' : `Te quedan ${quedan} intentos`} antes de un bloqueo temporal.`);
    }
    await limpiar(claveCuenta);

    if (await dispositivoConfiable(req, u)) {
      await iniciarSesion(res, u);
      return { usuario: publico(u) };
    }
    const pendiente = await enviarCodigo({ proposito: 'login', email: u.email, usuarioId: u.id, nombre: u.usuario });
    return { pendiente };
  },

  async verificar(req, res) {
    const b = await cuerpo(req);
    const ip = ipDe(req);
    await exigir(`verificar-ip:${ip}`, 30, 15, 'Demasiados intentos. Esperá {min}.');
    await registrar(`verificar-ip:${ip}`);

    // Se averigua el propósito del código pendiente y se valida contra ese
    const [c] = await q('select proposito from codigos where id = $1', [String(b.id || '')]);
    if (!c || c.proposito === 'recuperar') throw new ErrorApi(400, 'Código incorrecto.');
    const cod = await verificarCodigo(b.id, b.codigo, c.proposito);

    let u;
    if (cod.proposito === 'registro') {
      const d = cod.datos || {};
      const id = nuevoId();
      try {
        await q('insert into usuarios (id, usuario, email, hash) values ($1, $2, $3, $4)', [id, d.usuario, d.email, d.hash]);
      } catch (e) {
        if (e.code === '23505') throw new ErrorApi(409, 'Ese usuario o email se registró recién. Probá ingresar.');
        throw e;
      }
      await q('insert into ajustes (usuario_id, tc_fecha) values ($1, current_date) on conflict do nothing', [id]);
      u = { id, usuario: d.usuario, email: d.email, sesion_version: 0 };
    } else {
      [u] = await q('select id, usuario, email, sesion_version from usuarios where id = $1', [cod.usuario_id]);
      if (!u) throw new ErrorApi(404, 'La cuenta ya no existe.');
    }
    await iniciarSesion(res, u);
    if (b.recordar) await recordarDispositivo(res, u);
    return { usuario: publico(u) };
  },

  async reenviar(req) {
    const b = await cuerpo(req);
    const p = await leerPendiente(b.id);
    const pendiente = await enviarCodigo({
      proposito: p.proposito,
      email: p.email,
      usuarioId: p.usuario_id,
      nombre: p.usuario || p.datos?.usuario || '',
      datos: p.datos,
    });
    return { pendiente };
  },

  async recuperar(req) {
    const b = await cuerpo(req);
    const ident = String(b.identificador || '').trim().toLowerCase();
    if (!ident) throw new ErrorApi(400, 'Escribí tu usuario o tu email.');
    const ip = ipDe(req);
    await exigir(`recuperar-ip:${ip}`, 10, 60, 'Demasiados pedidos. Probá de nuevo en {min}.');
    await registrar(`recuperar-ip:${ip}`);

    const u = await buscarUsuario(ident);
    if (!u) {
      // No revelamos si la cuenta existe: respondemos igual que si existiera
      return { pendiente: { id: nuevoId(), email: RE_EMAIL.test(ident) ? enmascarar(ident) : 'el mail de tu cuenta', proposito: 'recuperar', segundos: 45 } };
    }
    const pendiente = await enviarCodigo({ proposito: 'recuperar', email: u.email, usuarioId: u.id, nombre: u.usuario });
    return { pendiente };
  },

  async restablecer(req, res) {
    const b = await cuerpo(req);
    const password = validarPassword(b.password);
    const ip = ipDe(req);
    await exigir(`verificar-ip:${ip}`, 30, 15, 'Demasiados intentos. Esperá {min}.');
    await registrar(`verificar-ip:${ip}`);

    const cod = await verificarCodigo(b.id, b.codigo, 'recuperar');
    const hash = await encriptar(password);
    const [u] = await q(
      'update usuarios set hash = $2, sesion_version = sesion_version + 1 where id = $1 returning id, usuario, email, sesion_version',
      [cod.usuario_id, hash],
    );
    if (!u) throw new ErrorApi(404, 'La cuenta ya no existe.');
    await limpiar(`login-fallo:${u.id}`);
    await iniciarSesion(res, u);
    const m = mailContrasenaCambiada(u.usuario);
    await enviarCorreo({ para: u.email, asunto: m.asunto, html: m.html, texto: m.texto }).catch(() => {});
    return { usuario: publico(u) };
  },

  async logout(req, res) {
    cerrarSesion(res);
    return { ok: true };
  },
};

const handler = ruta({
  async POST(req, res) {
    const accion = accionDe(req);
    const fn = acciones[accion];
    if (!fn) throw new ErrorApi(404, 'Acción desconocida');
    return fn(req, res);
  },
  async GET(req, res) {
    if (accionDe(req) !== 'me') throw new ErrorApi(404, 'Acción desconocida');
    const s = await requiereUsuario(req);
    const [u] = await q('select id, usuario, email from usuarios where id = $1', [s.id]);
    if (!u) { cerrarSesion(res); throw new ErrorApi(401, 'La cuenta ya no existe.'); }
    return { usuario: u };
  },
});

function accionDe(req) {
  if (req.query?.accion) return String(req.query.accion);
  return new URL(req.url, 'http://x').pathname.split('/').filter(Boolean).pop();
}

export default handler;

