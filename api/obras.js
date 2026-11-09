// POST   /api/obras          { obra }        → crea una obra
// PUT    /api/obras?id=…     { campos }      → actualiza
// DELETE /api/obras?id=…                     → borra la obra y sus gastos
import { q } from '../server/db.js';
import { ruta, cuerpo, parametro, ErrorApi } from '../server/http.js';
import { requiereUsuario } from '../server/auth.js';
import { COLS_OBRA, filaAObra, camposObra, validarId, nuevoId } from '../server/datos.js';

export default ruta({
  async POST(req) {
    const s = await requiereUsuario(req);
    const { obra = {} } = await cuerpo(req);
    const id = obra.id ? validarId(obra.id) : nuevoId();
    const [cols, vals] = camposObra(obra, { completo: true });
    const [f] = await q(
      `insert into obras (id, usuario_id, ${cols.join(', ')}) values ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(', ')}) returning ${COLS_OBRA}`,
      [id, s.id, ...vals],
    );
    return { obra: filaAObra(f) };
  },

  async PUT(req) {
    const s = await requiereUsuario(req);
    const id = validarId(parametro(req, 'id'));
    const { campos = {} } = await cuerpo(req);
    const [cols, vals] = camposObra(campos);
    if (!cols.length) throw new ErrorApi(400, 'No hay cambios para guardar');
    const [f] = await q(
      `update obras set ${cols.map((c, i) => `${c} = $${i + 3}`).join(', ')}, actualizado = now()
       where id = $1 and usuario_id = $2 returning ${COLS_OBRA}`,
      [id, s.id, ...vals],
    );
    if (!f) throw new ErrorApi(404, 'Esa obra no existe o no es tuya');
    return { obra: filaAObra(f) };
  },

  async DELETE(req) {
    const s = await requiereUsuario(req);
    const id = validarId(parametro(req, 'id'));
    const filas = await q('delete from obras where id = $1 and usuario_id = $2 returning id', [id, s.id]);
    if (!filas.length) throw new ErrorApi(404, 'Esa obra no existe o no es tuya');
    return { ok: true };
  },
});
