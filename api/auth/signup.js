// POST /api/auth/signup  { usuario, email, password }
import { q } from '../../server/db.js';
import { ruta, cuerpo, ErrorApi } from '../../server/http.js';
import { encriptar, iniciarSesion } from '../../server/auth.js';
import { nuevoId } from '../../server/datos.js';

export default ruta({
  async POST(req, res) {
    const b = await cuerpo(req);
    const usuario = String(b.usuario || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');

    if (!/^[A-Za-z0-9._-]{3,30}$/.test(usuario)) throw new ErrorApi(400, 'El usuario tiene que tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) throw new ErrorApi(400, 'Ese email no parece válido.');
    if (password.length < 8) throw new ErrorApi(400, 'La contraseña tiene que tener al menos 8 caracteres.');
    if (password.length > 200) throw new ErrorApi(400, 'La contraseña es demasiado larga.');

    const existentes = await q('select lower(usuario) as u, lower(email) as e from usuarios where lower(usuario) = lower($1) or lower(email) = $2', [usuario, email]);
    if (existentes.some((x) => x.u === usuario.toLowerCase())) throw new ErrorApi(409, 'Ese nombre de usuario ya está en uso.');
    if (existentes.some((x) => x.e === email)) throw new ErrorApi(409, 'Ya hay una cuenta con ese email.');

    const id = nuevoId();
    const hash = await encriptar(password);
    try {
      await q('insert into usuarios (id, usuario, email, hash) values ($1, $2, $3, $4)', [id, usuario, email, hash]);
    } catch (e) {
      if (e.code === '23505') throw new ErrorApi(409, 'Ese usuario o email ya está registrado.');
      throw e;
    }
    await q('insert into ajustes (usuario_id, tc_fecha) values ($1, current_date) on conflict do nothing', [id]);
    await iniciarSesion(res, { id, usuario });
    return { usuario: { id, usuario, email } };
  },
});
