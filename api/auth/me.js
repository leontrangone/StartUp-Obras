// GET /api/auth/me  → datos del usuario con sesión abierta
import { q } from '../../server/db.js';
import { ruta, ErrorApi } from '../../server/http.js';
import { requiereUsuario, cerrarSesion } from '../../server/auth.js';

export default ruta({
  async GET(req, res) {
    const s = await requiereUsuario(req);
    const [u] = await q('select id, usuario, email from usuarios where id = $1', [s.id]);
    if (!u) { cerrarSesion(res); throw new ErrorApi(401, 'La cuenta ya no existe.'); }
    return { usuario: u };
  },
});
