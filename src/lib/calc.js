// ─── Cálculos: todo lo que antes se hacía a mano en la planilla ────────────
import { montoEn, mesDe, rangoMeses, convertir } from './money.js';

export const tiposActivos = (obra) => (obra.usarC ? ['A', 'B', 'C'] : ['A', 'B']);

/**
 * Resumen completo de una obra en la moneda elegida.
 * Devuelve totales, por tipo, por rubro (con A/B/C), por mes y acumulado.
 */
export function resumenObra(obra, gastos, moneda, tcHoy) {
  const tipos = tiposActivos(obra);
  const total = { total: 0, A: 0, B: 0, C: 0 };
  const porRubro = new Map(obra.rubros.map((r) => [r.id, { rubro: r, total: 0, A: 0, B: 0, C: 0, n: 0 }]));
  const porMes = new Map();

  for (const g of gastos) {
    const v = montoEn(g, moneda);
    total.total += v;
    total[g.tipo] = (total[g.tipo] || 0) + v;

    let r = porRubro.get(g.rubroId);
    if (!r) {
      r = { rubro: { id: g.rubroId, nombre: 'Sin rubro', icono: 'Receipt' }, total: 0, A: 0, B: 0, C: 0, n: 0 };
      porRubro.set(g.rubroId, r);
    }
    r.total += v; r[g.tipo] += v; r.n++;

    const m = mesDe(g.fecha);
    const pm = porMes.get(m) || { mes: m, total: 0, A: 0, B: 0, C: 0, rubros: {} };
    pm.total += v; pm[g.tipo] += v;
    pm.rubros[g.rubroId] = (pm.rubros[g.rubroId] || 0) + v;
    porMes.set(m, pm);
  }

  // Meses consecutivos (incluye meses sin gastos, para que la evolución sea real)
  const mesesConGasto = [...porMes.keys()].sort();
  const meses = mesesConGasto.length ? rangoMeses(mesesConGasto[0], mesesConGasto[mesesConGasto.length - 1]) : [];
  let acum = 0;
  const evolucion = meses.map((m) => {
    const pm = porMes.get(m) || { mes: m, total: 0, A: 0, B: 0, C: 0, rubros: {} };
    acum += pm.total;
    return { ...pm, acumulado: acum };
  });

  const rubros = [...porRubro.values()]
    .map((r) => ({ ...r, pct: total.total ? (r.total / total.total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  const presupuesto = convertir(obra.presupuesto, obra.presupuestoMoneda, moneda, tcHoy);
  const avance = presupuesto ? (total.total / presupuesto) * 100 : 0;

  // Promedio mensual de los últimos 3 meses con datos
  const ult = evolucion.slice(-3);
  const promedio3 = ult.length ? ult.reduce((s, x) => s + x.total, 0) / ult.length : 0;

  return {
    tipos,
    total,
    pct: Object.fromEntries(['A', 'B', 'C'].map((t) => [t, total.total ? (total[t] / total.total) * 100 : 0])),
    rubros,
    evolucion,
    presupuesto,
    avance,
    restante: presupuesto - total.total,
    promedio3,
    m2: obra.m2 ? total.total / obra.m2 : 0,
    cantidad: gastos.length,
  };
}

/** Filtra gastos por texto libre + filtros. */
export function filtrarGastos(gastos, obra, { q = '', mes = '', rubro = '', tipo = '' }) {
  const rubrosById = Object.fromEntries(obra.rubros.map((r) => [r.id, r.nombre]));
  const texto = q.trim().toLowerCase();
  return gastos.filter((g) => {
    if (mes && mesDe(g.fecha) !== mes) return false;
    if (rubro && g.rubroId !== rubro) return false;
    if (tipo && g.tipo !== tipo) return false;
    if (!texto) return true;
    const hay = [g.concepto, g.descripcion, g.proveedor, rubrosById[g.rubroId], obra.tipos[g.tipo]?.nombre, g.fecha]
      .filter(Boolean).join(' ').toLowerCase();
    return texto.split(/\s+/).every((p) => hay.includes(p));
  });
}
