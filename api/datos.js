// GET  /api/datos  → todas las obras, gastos y ajustes del usuario
// POST /api/datos  { modo: 'reemplazar' | 'agregar', obras, gastos, ejemplo? }
//      Carga masiva: copia de seguridad, datos de ejemplo o datos viejos del navegador.
import { q } from '../server/db.js';
import { ruta, cuerpo, ErrorApi } from '../server/http.js';
import { requiereUsuario } from '../server/auth.js';
import { COLS_OBRA, COLS_GASTO, filaAObra, filaAGasto, camposObra, insertarGastos, nuevoId } from '../server/datos.js';

export async function leerTodo(usuarioId) {
  const [obras, gastos, ajustes] = await Promise.all([
    q(`select ${COLS_OBRA} from obras where usuario_id = $1 order by creado`, [usuarioId]),
    q(`select ${COLS_GASTO} from gastos where usuario_id = $1 order by fecha desc, creado desc`, [usuarioId]),
    q(`select moneda, tc, tc_fuente, to_char(tc_fecha, 'YYYY-MM-DD') as tc_fecha, ejemplo from ajustes where usuario_id = $1`, [usuarioId]),
  ]);
  const a = ajustes[0];
  return {
    obras: obras.map(filaAObra),
    gastos: gastos.map(filaAGasto),
    ajustes: a ? { moneda: a.moneda, tc: Number(a.tc), tcFuente: a.tc_fuente, tcFecha: a.tc_fecha } : null,
    ejemplo: Boolean(a?.ejemplo),
  };
}

export default ruta({
  async GET(req) {
    const s = await requiereUsuario(req);
    return leerTodo(s.id);
  },

  async POST(req) {
    const s = await requiereUsuario(req);
    const b = await cuerpo(req);
    const obras = Array.isArray(b.obras) ? b.obras : [];
    const gastos = Array.isArray(b.gastos) ? b.gastos : [];
    if (obras.length > 300 || gastos.length > 50000) throw new ErrorApi(400, 'Demasiados datos para una sola carga.');

    // Validar todo ANTES de borrar nada
    const filasObras = obras.map((o) => ({ viejo: o.id, nuevo: nuevoId(), campos: camposObra(o, { completo: true }) }));
    const mapa = Object.fromEntries(filasObras.map((o) => [o.viejo, o.nuevo]));
    const gastosOk = gastos.filter((g) => mapa[g.obraId]).map((g) => ({ ...g, id: nuevoId(), obraId: mapa[g.obraId] }));

    if (b.modo === 'reemplazar') await q('delete from obras where usuario_id = $1', [s.id]);

    for (const o of filasObras) {
      const [cols, vals] = o.campos;
      await q(
        `insert into obras (id, usuario_id, ${cols.join(', ')}) values ($1, $2, ${cols.map((_, i) => `$${i + 3}`).join(', ')})`,
        [o.nuevo, s.id, ...vals],
      );
    }
    await insertarGastos(s.id, gastosOk);
    await q('update ajustes set ejemplo = $2 where usuario_id = $1', [s.id, Boolean(b.ejemplo) && b.modo === 'reemplazar']);
    return leerTodo(s.id);
  },
});
