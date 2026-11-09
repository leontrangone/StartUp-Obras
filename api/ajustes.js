// PUT /api/ajustes  { moneda?, tc?, tcFuente?, tcFecha? }
import { q } from '../server/db.js';
import { ruta, cuerpo, ErrorApi } from '../server/http.js';
import { requiereUsuario } from '../server/auth.js';

export default ruta({
  async PUT(req) {
    const s = await requiereUsuario(req);
    const b = await cuerpo(req);
    const sets = [], vals = [];
    const add = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length + 1}`); };
    if (b.moneda !== undefined) { if (!['ARS', 'USD'].includes(b.moneda)) throw new ErrorApi(400, 'Moneda inválida'); add('moneda', b.moneda); }
    if (b.tc !== undefined) { const n = Number(b.tc); if (!(n > 0 && n < 1e7)) throw new ErrorApi(400, 'Cotización inválida'); add('tc', n); }
    if (b.tcFuente !== undefined) { if (!['manual', 'oficial', 'blue', 'bolsa'].includes(b.tcFuente)) throw new ErrorApi(400, 'Fuente inválida'); add('tc_fuente', b.tcFuente); }
    if (b.tcFecha !== undefined) { if (!/^\d{4}-\d{2}-\d{2}$/.test(b.tcFecha)) throw new ErrorApi(400, 'Fecha inválida'); add('tc_fecha', b.tcFecha); }
    if (!sets.length) return { ok: true };
    await q(`insert into ajustes (usuario_id) values ($1) on conflict do nothing`, [s.id]);
    await q(`update ajustes set ${sets.join(', ')} where usuario_id = $1`, [s.id, ...vals]);
    return { ok: true };
  },
});
