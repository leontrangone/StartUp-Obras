// POST   /api/gastos         { gastos: [...] }  → crea uno o varios gastos
// PUT    /api/gastos?id=…    { campos }         → actualiza un gasto
// DELETE /api/gastos?id=…                       → borra un gasto
import { q } from '../server/db.js';
import { ruta, cuerpo, parametro, ErrorApi } from '../server/http.js';
import { requiereUsuario } from '../server/auth.js';
import { COLS_GASTO, filaAGasto, camposGasto, insertarGastos, verificarObras, validarId, nuevoId } from '../server/datos.js';

export default ruta({
  async POST(req) {
    const s = await requiereUsuario(req);
    const b = await cuerpo(req);
    const lista = Array.isArray(b.gastos) ? b.gastos : b.gasto ? [b.gasto] : [];
    if (!lista.length) throw new ErrorApi(400, 'No llegó ningún gasto');
    if (lista.length > 5000) throw new ErrorApi(400, 'Demasiados gastos de una vez (máx. 5000)');
    const gastos = lista.map((g) => ({ ...g, id: g.id ? validarId(g.id) : nuevoId(), obraId: validarId(g.obraId) }));
    await verificarObras(s.id, gastos.map((g) => g.obraId));
    try {
      await insertarGastos(s.id, gastos);
    } catch (e) {
      if (e.code === '23505') throw new ErrorApi(409, 'Ese gasto ya estaba cargado');
      throw e;
    }
    return { ids: gastos.map((g) => g.id) };
  },

  async PUT(req) {
    const s = await requiereUsuario(req);
    const id = validarId(parametro(req, 'id'));
    const { campos = {} } = await cuerpo(req);
    const [cols, vals] = camposGasto(campos);
    if (!cols.length) throw new ErrorApi(400, 'No hay cambios para guardar');
    const [f] = await q(
      `update gastos set ${cols.map((c, i) => `${c} = $${i + 3}`).join(', ')}
       where id = $1 and usuario_id = $2 returning ${COLS_GASTO}`,
      [id, s.id, ...vals],
    );
    if (!f) throw new ErrorApi(404, 'Ese gasto no existe');
    return { gasto: filaAGasto(f) };
  },

  async DELETE(req) {
    const s = await requiereUsuario(req);
    const id = validarId(parametro(req, 'id'));
    const filas = await q('delete from gastos where id = $1 and usuario_id = $2 returning id', [id, s.id]);
    if (!filas.length) throw new ErrorApi(404, 'Ese gasto no existe');
    return { ok: true };
  },
});
