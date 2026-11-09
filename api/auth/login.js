// POST /api/auth/login  { identificador (usuario o email), password }
import { q } from '../../server/db.js';
import { ruta, cuerpo, ErrorApi } from '../../server/http.js';
import { comparar, iniciarSesion, HASH_FALSO } from '../../server/auth.js';

export default ruta({
  async POST(req, res) {
    const b = await cuerpo(req);
    const ident = String(b.identificador || '').trim();
    const password = String(b.password || '');
    if (!ident || !password) throw new ErrorApi(400, 'Completá usuario (o email) y contraseña.');

    const [u] = await q('select id, usuario, email, hash from usuarios where lower(usuario) = lower($1) or lower(email) = lower($1) limit 1', [ident]);
    const ok = await comparar(password, u?.hash || HASH_FALSO);
    if (!u || !ok) throw new ErrorApi(401, 'Usuario, email o contraseña incorrectos.');

    await iniciarSesion(res, u);
    return { usuario: { id: u.id, usuario: u.usuario, email: u.email } };
  },
});
