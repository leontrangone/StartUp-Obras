// POST /api/auth/logout
import { ruta } from '../../server/http.js';
import { cerrarSesion } from '../../server/auth.js';

export default ruta({
  async POST(req, res) {
    cerrarSesion(res);
    return { ok: true };
  },
});
