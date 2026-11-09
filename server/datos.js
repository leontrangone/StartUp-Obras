// ─── Conversión filas ⇄ objetos de la app, y validaciones ──────────────────
import { randomBytes } from 'node:crypto';
import { q } from './db.js';
import { ErrorApi } from './http.js';

export const nuevoId = () => randomBytes(9).toString('base64url');
const ID_OK = /^[A-Za-z0-9_-]{4,40}$/;

// ── Obras ──────────────────────────────────────────────────────────────────
export const COLS_OBRA = `id, nombre, direccion, pisos, unidades, m2, presupuesto, presupuesto_moneda, inicio, estado,
  paleta, usar_c, tipos, rubros, (extract(epoch from creado) * 1000)::bigint as creado`;

export function filaAObra(f) {
  return {
    id: f.id,
    nombre: f.nombre,
    direccion: f.direccion,
    pisos: Number(f.pisos),
    unidades: Number(f.unidades),
    m2: Number(f.m2),
    presupuesto: Number(f.presupuesto),
    presupuestoMoneda: f.presupuesto_moneda,
    inicio: f.inicio,
    estado: f.estado,
    paleta: Number(f.paleta),
    usarC: Boolean(f.usar_c),
    tipos: typeof f.tipos === 'string' ? JSON.parse(f.tipos) : f.tipos,
    rubros: typeof f.rubros === 'string' ? JSON.parse(f.rubros) : f.rubros,
    creado: Number(f.creado),
  };
}

const CAMPOS_OBRA = {
  nombre: ['nombre', (v) => texto(v, 120, 'El nombre de la obra', true)],
  direccion: ['direccion', (v) => texto(v, 200)],
  pisos: ['pisos', (v) => entero(v, 1, 200)],
  unidades: ['unidades', (v) => entero(v, 0, 5000)],
  m2: ['m2', (v) => numero(v, 0)],
  presupuesto: ['presupuesto', (v) => numero(v, 0)],
  presupuestoMoneda: ['presupuesto_moneda', moneda],
  inicio: ['inicio', (v) => (v ? String(v).slice(0, 7) : null)],
  estado: ['estado', (v) => (['Planificación', 'En obra', 'Terminada'].includes(v) ? v : 'En obra')],
  paleta: ['paleta', (v) => entero(v, 0, 50)],
  usarC: ['usar_c', (v) => Boolean(v)],
  tipos: ['tipos', (v) => json(validarTipos(v))],
  rubros: ['rubros', (v) => json(validarRubros(v))],
};

/** Valida los campos de una obra y devuelve [columnas, valores]. */
export function camposObra(obj, { completo = false } = {}) {
  const cols = [], vals = [];
  for (const [k, [col, fn]] of Object.entries(CAMPOS_OBRA)) {
    if (obj[k] === undefined) {
      if (completo && (k === 'nombre' || k === 'tipos' || k === 'rubros')) throw new ErrorApi(400, `Falta "${k}" en la obra`);
      continue;
    }
    cols.push(col);
    vals.push(fn(obj[k]));
  }
  return [cols, vals];
}

function validarTipos(t) {
  if (!t || typeof t !== 'object') throw new ErrorApi(400, 'Tipos de costo inválidos');
  const out = {};
  for (const k of ['A', 'B', 'C']) {
    const x = t[k] || {};
    out[k] = { nombre: texto(x.nombre || `Costo ${k}`, 40), desc: texto(x.desc || '', 80) };
  }
  return out;
}
function validarRubros(r) {
  if (!Array.isArray(r) || r.length > 60) throw new ErrorApi(400, 'Rubros inválidos');
  return r.map((x) => ({
    id: ID_OK.test(x?.id) ? x.id : nuevoId(),
    nombre: texto(x?.nombre, 60, 'El nombre del rubro', true),
    icono: /^[A-Za-z0-9]{1,30}$/.test(x?.icono) ? x.icono : 'Receipt',
  }));
}

// ── Gastos ─────────────────────────────────────────────────────────────────
export const COLS_GASTO = `id, obra_id, to_char(fecha, 'YYYY-MM-DD') as fecha, rubro_id, concepto, descripcion, proveedor,
  monto, moneda, tc, tipo, (extract(epoch from creado) * 1000)::bigint as creado`;

export function filaAGasto(f) {
  return {
    id: f.id,
    obraId: f.obra_id,
    fecha: f.fecha,
    rubroId: f.rubro_id,
    concepto: f.concepto,
    descripcion: f.descripcion,
    proveedor: f.proveedor,
    monto: Number(f.monto),
    moneda: f.moneda,
    tc: Number(f.tc),
    tipo: f.tipo,
    creado: Number(f.creado),
  };
}

const CAMPOS_GASTO = {
  fecha: ['fecha', (v) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) throw new ErrorApi(400, 'Fecha inválida'); return v; }],
  rubroId: ['rubro_id', (v) => { if (!ID_OK.test(v || '')) throw new ErrorApi(400, 'Rubro inválido'); return v; }],
  concepto: ['concepto', (v) => texto(v, 200, 'El concepto', true)],
  descripcion: ['descripcion', (v) => texto(v, 300)],
  proveedor: ['proveedor', (v) => texto(v, 150)],
  monto: ['monto', (v) => { const n = Number(v); if (!(n > 0) || n > 1e14) throw new ErrorApi(400, 'El monto tiene que ser mayor a cero'); return n; }],
  moneda: ['moneda', moneda],
  tc: ['tc', (v) => { const n = numero(v, 0); if (!(n > 0)) throw new ErrorApi(400, 'Cotización inválida'); return n; }],
  tipo: ['tipo', (v) => { if (!['A', 'B', 'C'].includes(v)) throw new ErrorApi(400, 'Tipo de costo inválido'); return v; }],
};
const OBLIGATORIOS_GASTO = ['fecha', 'rubroId', 'concepto', 'monto', 'moneda', 'tc', 'tipo'];

export function camposGasto(obj, { completo = false } = {}) {
  const cols = [], vals = [];
  for (const [k, [col, fn]] of Object.entries(CAMPOS_GASTO)) {
    if (obj[k] === undefined || obj[k] === null) {
      if (completo && OBLIGATORIOS_GASTO.includes(k)) throw new ErrorApi(400, `Falta "${k}" en un gasto`);
      if (completo) { cols.push(col); vals.push(''); }
      continue;
    }
    cols.push(col);
    vals.push(fn(obj[k]));
  }
  return [cols, vals];
}

/** Inserta muchos gastos en tandas. Cada gasto: { id, obraId, ...campos }. */
export async function insertarGastos(usuarioId, gastos) {
  const COLS = ['id', 'obra_id', 'usuario_id', 'fecha', 'rubro_id', 'concepto', 'descripcion', 'proveedor', 'monto', 'moneda', 'tc', 'tipo'];
  for (let i = 0; i < gastos.length; i += 400) {
    const tanda = gastos.slice(i, i + 400);
    const params = [];
    const filas = tanda.map((g) => {
      const [cols, vals] = camposGasto(g, { completo: true });
      const m = Object.fromEntries(cols.map((c, k) => [c, vals[k]]));
      const fila = [g.id, g.obraId, usuarioId, m.fecha, m.rubro_id, m.concepto, m.descripcion || '', m.proveedor || '', m.monto, m.moneda, m.tc, m.tipo];
      const base = params.length;
      params.push(...fila);
      return `(${fila.map((_, k) => `$${base + k + 1}`).join(', ')})`;
    });
    await q(`insert into gastos (${COLS.join(', ')}) values ${filas.join(', ')}`, params);
  }
}

/** Verifica que todas las obras sean del usuario. */
export async function verificarObras(usuarioId, obraIds) {
  const ids = [...new Set(obraIds)];
  if (!ids.length) return;
  const filas = await q('select id from obras where usuario_id = $1 and id = any($2)', [usuarioId, ids]);
  if (filas.length !== ids.length) throw new ErrorApi(404, 'Esa obra no existe o no es tuya');
}

export const validarId = (id) => { if (!ID_OK.test(id || '')) throw new ErrorApi(400, 'Identificador inválido'); return id; };

// ── Validadores básicos ────────────────────────────────────────────────────
function texto(v, max, nombre, obligatorio = false) {
  const s = String(v ?? '').trim();
  if (obligatorio && !s) throw new ErrorApi(400, `${nombre} no puede estar vacío`);
  if (s.length > max) throw new ErrorApi(400, `${nombre || 'Un texto'} es demasiado largo (máx. ${max})`);
  return s;
}
function numero(v, min) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > 1e14) throw new ErrorApi(400, 'Número inválido');
  return n;
}
function entero(v, min, max) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min || n > max) throw new ErrorApi(400, 'Número inválido');
  return n;
}
function moneda(v) {
  if (v !== 'ARS' && v !== 'USD') throw new ErrorApi(400, 'Moneda inválida');
  return v;
}
const json = (v) => JSON.stringify(v);
