// ─── Exportar / importar Excel ──────────────────────────────────────────────
import ExcelJS from 'exceljs';
import { resumenObra, tiposActivos } from './calc.js';
import { convertir, mesDe, mesLargo, hoyISO, fechaLinda, uid } from './money.js';

const FMT = { ARS: '"$" #,##0.00', USD: '"US$" #,##0.00' };
const PCT = '0.00%';
const C = { tinta: 'FF1C1E21', papel: 'FFF6F3EC', linea: 'FFD8D3C8', amarillo: 'FFF2B500', A: 'FFF6E6C3', B: 'FFD6E8F2', Cc: 'FFF2D9D2' };

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const borde = { top: { style: 'thin', color: { argb: C.linea } }, bottom: { style: 'thin', color: { argb: C.linea } }, left: { style: 'thin', color: { argb: C.linea } }, right: { style: 'thin', color: { argb: C.linea } } };

function cabecera(ws, obra, titulo, moneda, cols) {
  ws.mergeCells(1, 1, 1, cols);
  const t = ws.getCell(1, 1);
  t.value = titulo.toUpperCase();
  t.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  t.fill = fill(C.tinta);
  t.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 30;
  ws.mergeCells(2, 1, 2, cols);
  const s = ws.getCell(2, 1);
  s.value = `${obra.nombre}${obra.direccion ? ' · ' + obra.direccion : ''}   |   Montos en ${moneda === 'USD' ? 'dólares' : 'pesos'}   |   ${fechaLinda(hoyISO())}`;
  s.font = { name: 'Arial', size: 10, color: { argb: 'FF5F646B' } };
  s.fill = fill(C.amarillo);
  s.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 20;
}

function estiloEncabezado(row, colores = {}) {
  row.height = 22;
  row.eachCell((c, n) => {
    c.font = { name: 'Arial', bold: true, size: 10, color: { argb: colores[n] ? C.tinta : 'FFFFFFFF' } };
    c.fill = fill(colores[n] || 'FF3A4047');
    c.alignment = { vertical: 'middle', horizontal: n === 1 ? 'left' : 'center', wrapText: true };
    c.border = borde;
  });
}

function descargar(buffer, nombre) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export const nombreArchivo = (obra, ext) =>
  `${obra.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '')}_${hoyISO()}.${ext}`;

export async function exportarExcel(obra, gastos, moneda, tcHoy) {
  const res = resumenObra(obra, gastos, moneda, tcHoy);
  const tipos = tiposActivos(obra);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Plomada';
  wb.created = new Date();
  const fmtM = FMT[moneda];

  // ── Hoja 1: Resumen A + B por rubro ──────────────────────────────────────
  {
    const cols = 3 + tipos.length * 2;
    const ws = wb.addWorksheet('Resumen A+B', { views: [{ showGridLines: false, state: 'frozen', ySplit: 4 }] });
    cabecera(ws, obra, 'Representación de costos ' + tipos.join(' + '), moneda, cols);
    ws.getRow(3).height = 8;
    const enc = ['Rubro', 'Costo total', '% del total'];
    tipos.forEach((t) => enc.push(obra.tipos[t].nombre, `% ${obra.tipos[t].nombre}`));
    const h = ws.addRow(enc);
    const colores = {};
    tipos.forEach((t, i) => { colores[4 + i * 2] = C[t === 'C' ? 'Cc' : t]; colores[5 + i * 2] = C[t === 'C' ? 'Cc' : t]; });
    estiloEncabezado(h, colores);

    const filas = res.rubros.filter((r) => r.total > 0 || r.n > 0);
    const primera = 5;
    const ultima = primera + filas.length - 1;
    const filaTot = ultima + 1;
    filas.forEach((r, i) => {
      const n = primera + i;
      const vals = [r.rubro.nombre, { formula: tipos.map((_, k) => `${col(4 + k * 2)}${n}`).join('+'), result: r.total }, { formula: `IFERROR(B${n}/B$${filaTot},0)`, result: r.pct / 100 }];
      tipos.forEach((t, k) => vals.push(r[t], { formula: `IFERROR(${col(4 + k * 2)}${n}/B$${filaTot},0)`, result: res.total.total ? r[t] / res.total.total : 0 }));
      const row = ws.addRow(vals);
      row.eachCell((c, cn) => {
        c.border = borde;
        c.font = { name: 'Arial', size: 10 };
        if (cn === 2 || (cn >= 4 && cn % 2 === 0)) c.numFmt = fmtM;
        if (cn === 3 || (cn >= 5 && cn % 2 === 1)) c.numFmt = PCT;
        if (i % 2) c.fill = fill('FFFBFAF7');
      });
    });
    const tot = ['TOTALES', { formula: `SUM(B${primera}:B${ultima})`, result: res.total.total }, { formula: `IFERROR(B${filaTot}/B${filaTot},0)`, result: 1 }];
    tipos.forEach((t, k) => tot.push({ formula: `SUM(${col(4 + k * 2)}${primera}:${col(4 + k * 2)}${ultima})`, result: res.total[t] }, { formula: `IFERROR(${col(4 + k * 2)}${filaTot}/B${filaTot},0)`, result: res.pct[t] / 100 }));
    const rt = ws.addRow(tot);
    rt.height = 22;
    rt.eachCell((c, cn) => {
      c.font = { name: 'Arial', bold: true, size: 11 };
      c.fill = fill(C.amarillo);
      c.border = borde;
      if (cn === 2 || (cn >= 4 && cn % 2 === 0)) c.numFmt = fmtM;
      if (cn === 3 || (cn >= 5 && cn % 2 === 1)) c.numFmt = PCT;
    });
    ws.getColumn(1).width = 28;
    for (let i = 2; i <= cols; i++) ws.getColumn(i).width = i === 2 || i % 2 === 0 ? 20 : 12;

    // Datos de la obra debajo
    ws.addRow([]);
    const info = [
      ['Presupuesto', res.presupuesto, fmtM],
      ['Usado del presupuesto', res.presupuesto ? res.total.total / res.presupuesto : 0, PCT],
      ['Costo por m²', res.m2, fmtM],
      ['Cantidad de gastos', res.cantidad, '0'],
    ];
    info.forEach(([k, v, f]) => {
      const r = ws.addRow([k, v]);
      r.getCell(1).font = { name: 'Arial', size: 10, color: { argb: 'FF5F646B' } };
      r.getCell(2).font = { name: 'Arial', size: 10, bold: true };
      r.getCell(2).numFmt = f;
    });
  }

  // ── Hoja 2: Todos los gastos ─────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Gastos', { views: [{ state: 'frozen', ySplit: 4 }] });
    const enc = ['Fecha', 'Mes', 'Rubro', 'Concepto', 'Proveedor', 'Nota', 'Tipo de costo', 'Moneda original', 'Monto original', 'Cotización (ARS/USD)', 'Monto en pesos', 'Monto en dólares'];
    cabecera(ws, obra, 'Detalle de gastos', moneda, enc.length);
    ws.getRow(3).height = 8;
    estiloEncabezado(ws.addRow(enc));
    const rubros = Object.fromEntries(obra.rubros.map((r) => [r.id, r.nombre]));
    const orden = [...gastos].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    orden.forEach((g, i) => {
      const [y, m, d] = g.fecha.split('-').map(Number);
      const row = ws.addRow([
        new Date(Date.UTC(y, m - 1, d)), mesLargo(mesDe(g.fecha)), rubros[g.rubroId] || '', g.concepto, g.proveedor || '', g.descripcion || '',
        obra.tipos[g.tipo]?.nombre || g.tipo, g.moneda, g.monto, g.tc,
        convertir(g.monto, g.moneda, 'ARS', g.tc), convertir(g.monto, g.moneda, 'USD', g.tc),
      ]);
      row.eachCell({ includeEmpty: true }, (c, cn) => {
        c.font = { name: 'Arial', size: 10 };
        c.border = borde;
        if (i % 2) c.fill = fill('FFFBFAF7');
        if (cn === 1) c.numFmt = 'dd/mm/yyyy';
        if (cn === 9) c.numFmt = g.moneda === 'USD' ? FMT.USD : FMT.ARS;
        if (cn === 10) c.numFmt = '#,##0.00';
        if (cn === 11) c.numFmt = FMT.ARS;
        if (cn === 12) c.numFmt = FMT.USD;
      });
    });
    const ini = 5, fin = 4 + orden.length;
    const t = ws.addRow(['TOTAL (según filtro)', '', '', '', '', '', '', '', '', '',
      { formula: `SUBTOTAL(109,K${ini}:K${fin})` }, { formula: `SUBTOTAL(109,L${ini}:L${fin})` }]);
    t.eachCell({ includeEmpty: true }, (c, cn) => {
      c.font = { name: 'Arial', bold: true, size: 11 };
      c.fill = fill(C.amarillo);
      if (cn === 11) c.numFmt = FMT.ARS;
      if (cn === 12) c.numFmt = FMT.USD;
    });
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: fin, column: enc.length } };
    [12, 16, 22, 28, 20, 22, 14, 12, 18, 14, 20, 18].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  }

  // ── Hoja 3: Mes por rubro ────────────────────────────────────────────────
  {
    const rubros = res.rubros.filter((r) => r.total > 0);
    const enc = ['Mes', ...rubros.map((r) => r.rubro.nombre), ...tipos.map((t) => obra.tipos[t].nombre), 'Total del mes', 'Acumulado'];
    const ws = wb.addWorksheet('Por mes', { views: [{ state: 'frozen', ySplit: 4, xSplit: 1 }] });
    cabecera(ws, obra, 'Evolución mensual por rubro', moneda, enc.length);
    ws.getRow(3).height = 8;
    estiloEncabezado(ws.addRow(enc));
    res.evolucion.forEach((m, i) => {
      const row = ws.addRow([mesLargo(m.mes), ...rubros.map((r) => m.rubros[r.rubro.id] || 0), ...tipos.map((t) => m[t]), m.total, m.acumulado]);
      row.eachCell((c, cn) => {
        c.font = { name: 'Arial', size: 10, bold: cn >= enc.length - 1 };
        c.border = borde;
        if (i % 2) c.fill = fill('FFFBFAF7');
        if (cn > 1) c.numFmt = fmtM;
      });
    });
    const ini = 5, fin = 4 + res.evolucion.length;
    const tot = ['TOTAL'];
    for (let k = 2; k <= enc.length - 1; k++) tot.push({ formula: `SUM(${col(k)}${ini}:${col(k)}${fin})` });
    const rt = ws.addRow(tot);
    rt.eachCell((c, cn) => { c.font = { name: 'Arial', bold: true }; c.fill = fill(C.amarillo); if (cn > 1) c.numFmt = fmtM; });
    ws.getColumn(1).width = 18;
    for (let i = 2; i <= enc.length; i++) ws.getColumn(i).width = 17;
  }

  descargar(await wb.xlsx.writeBuffer(), nombreArchivo(obra, 'xlsx'));
}

function col(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// ── Plantilla para importar ────────────────────────────────────────────────
export async function descargarPlantilla(obra) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Gastos');
  const enc = ['Fecha', 'Rubro', 'Concepto', 'Monto', 'Moneda', 'Tipo de costo', 'Cotización', 'Proveedor', 'Nota'];
  estiloEncabezado(ws.addRow(enc));
  ws.addRow([new Date(), obra.rubros[1]?.nombre || 'Materiales', 'Hormigón elaborado', 1250000, 'ARS', 'A', 1450, 'Hormigonera Sur', 'Losa 2do piso']);
  ws.addRow([new Date(), obra.rubros[0]?.nombre || 'Mano de obra', 'Albañilería', 3500, 'USD', 'B', 1450, '', '']);
  ws.getColumn(1).numFmt = 'dd/mm/yyyy';
  [12, 22, 26, 14, 10, 14, 12, 20, 22].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  const ayuda = wb.addWorksheet('Cómo completar');
  [
    ['Cómo completar la planilla'],
    [''],
    ['Fecha', 'Día del gasto (dd/mm/aaaa).'],
    ['Rubro', `Uno de: ${obra.rubros.map((r) => r.nombre).join(', ')}. Si ponés uno nuevo, se crea solo.`],
    ['Concepto', 'Qué se pagó.'],
    ['Monto', 'Solo el número.'],
    ['Moneda', 'ARS o USD (si se deja vacío, se toma ARS).'],
    ['Tipo de costo', 'A, B o C.'],
    ['Cotización', 'Pesos por dólar ese día (opcional: si falta, se usa la de hoy).'],
  ].forEach((r) => ayuda.addRow(r));
  ayuda.getColumn(1).width = 16; ayuda.getColumn(2).width = 90;
  ayuda.getRow(1).font = { bold: true, size: 14 };
  descargar(await wb.xlsx.writeBuffer(), 'Plantilla_gastos.xlsx');
}

// ── Importar ───────────────────────────────────────────────────────────────
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function valorCelda(v) {
  if (v && typeof v === 'object') {
    if (v instanceof Date) return v;
    if ('result' in v) return v.result;
    if ('text' in v) return v.text;
    if (v.richText) return v.richText.map((t) => t.text).join('');
  }
  return v;
}

function aFechaISO(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') { // número de serie de Excel
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v || '').trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function aNumero(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));
  if ((s.match(/\./g) || []).length > 1) return Number(s.replace(/\./g, ''));
  return Number(s);
}

/**
 * Lee un Excel (la plantilla o el propio export de la app) y devuelve
 * los gastos listos para agregar + rubros nuevos encontrados.
 */
export async function importarExcel(archivo, obra, tcHoy) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await archivo.arrayBuffer());
  const ws = wb.getWorksheet('Gastos') || wb.worksheets[0];
  if (!ws) throw new Error('El archivo no tiene hojas.');

  // Buscar la fila de encabezados (la primera que tenga "monto")
  let filaEnc = 0, mapa = {};
  for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
    const vals = ws.getRow(r).values.map((v) => norm(valorCelda(v)));
    if (vals.some((v) => v.startsWith('monto'))) {
      filaEnc = r;
      vals.forEach((v, i) => {
        if (!v) return;
        const set = (k) => { if (!mapa[k]) mapa[k] = i; };
        if (v === 'fecha') set('fecha');
        else if (v.startsWith('rubro')) set('rubro');
        else if (v.startsWith('concepto') || v === 'tipo de gasto' || v === 'descripcion') set('concepto');
        else if (v === 'monto original' || v === 'monto' || v === 'importe') set('monto');
        else if (v.startsWith('moneda')) set('moneda');
        else if (v.startsWith('tipo de costo') || v === 'tipo') set('tipo');
        else if (v.startsWith('cotizacion') || v === 'tc') set('tc');
        else if (v.startsWith('proveedor')) set('proveedor');
        else if (v.startsWith('nota')) set('nota');
      });
      break;
    }
  }
  if (!filaEnc || !mapa.monto) throw new Error('No encontré una columna "Monto". Usá la plantilla para que coincidan los encabezados.');

  const rubrosPorNombre = Object.fromEntries(obra.rubros.map((r) => [norm(r.nombre), r.id]));
  const tiposPorNombre = {};
  ['A', 'B', 'C'].forEach((t) => { tiposPorNombre[norm(t)] = t; tiposPorNombre[norm(obra.tipos[t].nombre)] = t; tiposPorNombre[norm('costo ' + t)] = t; });
  const nuevos = [];
  const gastos = [];
  let saltadas = 0;

  for (let r = filaEnc + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const get = (k) => (mapa[k] ? valorCelda(row.getCell(mapa[k]).value) : undefined);
    const monto = aNumero(get('monto'));
    const concepto = String(get('concepto') ?? '').trim();
    if (norm(valorCelda(row.getCell(1).value)).startsWith('total')) continue;
    if (!monto || isNaN(monto) || monto <= 0) { if (concepto || get('fecha')) saltadas++; continue; }

    const nombreRubro = String(get('rubro') ?? '').trim() || 'Sin rubro';
    let rubroId = rubrosPorNombre[norm(nombreRubro)];
    if (!rubroId) {
      rubroId = 'r' + uid();
      rubrosPorNombre[norm(nombreRubro)] = rubroId;
      nuevos.push({ id: rubroId, nombre: nombreRubro, icono: 'Receipt' });
    }
    const moneda = norm(get('moneda')).includes('usd') || norm(get('moneda')).includes('dol') ? 'USD' : 'ARS';
    const tc = aNumero(get('tc'));
    gastos.push({
      obraId: obra.id,
      fecha: aFechaISO(get('fecha')) || hoyISO(),
      rubroId,
      concepto: concepto || nombreRubro,
      descripcion: String(get('nota') ?? '').trim(),
      proveedor: String(get('proveedor') ?? '').trim(),
      monto,
      moneda,
      tc: tc > 0 ? tc : tcHoy,
      tipo: tiposPorNombre[norm(get('tipo'))] || 'A',
    });
  }
  return { gastos, nuevos, saltadas };
}
