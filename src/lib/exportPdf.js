// ─── Informe PDF para reuniones ─────────────────────────────────────────────
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Chart, cfgMensual, cfgDona, cfgRubros, cfgRubrosAB, cfgAcumulado } from './graficos.js';
import { resumenObra } from './calc.js';
import { COLOR_TIPO } from './catalogo.js';
import { fmt, fmtCorto, fmtPct, fmtNum, mesLargo, fechaLinda, hoyISO, montoEn, fmtTc } from './money.js';
import { nombreArchivo } from './exportExcel.js';
import { NOMBRE_APP } from '../components/Marca.jsx';

const TINTA = [28, 30, 33];
const GRIS = [95, 100, 107];
const LINEA = [216, 211, 200];
const AMARILLO = [242, 181, 0];
const PAPEL = [246, 243, 236];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Dibuja un gráfico fuera de pantalla y devuelve la imagen. */
async function imagen(cfg, w, h) {
  const cont = document.createElement('div');
  cont.style.cssText = `position:fixed;left:-10000px;top:0;width:${w}px;height:${h}px;`;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  cont.appendChild(canvas);
  document.body.appendChild(cont);
  const c = new Chart(canvas, {
    ...cfg,
    options: { ...cfg.options, responsive: false, animation: false, devicePixelRatio: 3 },
  });
  c.update('none');
  const url = canvas.toDataURL('image/png');
  c.destroy();
  cont.remove();
  return url;
}

function logo(doc, x, y, s = 1) {
  doc.setFillColor(...AMARILLO);
  doc.setDrawColor(...AMARILLO);
  doc.setLineWidth(0.9 * s);
  doc.line(x + 5 * s, y, x + 5 * s, y + 3 * s);
  doc.roundedRect(x + 2.6 * s, y + 3 * s, 4.8 * s, 1.8 * s, 0.4, 0.4, 'F');
  doc.triangle(x + 1.7 * s, y + 5.4 * s, x + 8.3 * s, y + 5.4 * s, x + 5 * s, y + 13 * s, 'F');
}

export async function exportarPdf(obra, gastos, moneda, tcHoy) {
  if (document.fonts?.ready) await document.fonts.ready;
  const res = resumenObra(obra, gastos, moneda, tcHoy);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 14, ancho = W - M * 2;
  const op = { sinAnimacion: true, fondo: '#FFFFFF' };

  // ── Portada / encabezado ─────────────────────────────────────────────────
  doc.setFillColor(...TINTA);
  doc.rect(0, 0, W, 46, 'F');
  doc.setFillColor(...AMARILLO);
  doc.rect(0, 46, W, 2.2, 'F');
  logo(doc, M, 10, 1.25);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(NOMBRE_APP.toUpperCase() + '  ·  INFORME DE COSTOS DE OBRA', M + 16, 15);
  doc.setFontSize(22);
  doc.text(obra.nombre, M + 16, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(210, 206, 198);
  const sub = [obra.direccion, `${obra.pisos} pisos`, obra.unidades ? `${obra.unidades} unidades` : '', obra.m2 ? `${fmtNum(obra.m2)} m2` : ''].filter(Boolean).join('  ·  ');
  doc.text(sub, M + 16, 32);
  doc.text(`Estado: ${obra.estado}   ·   Emitido el ${fechaLinda(hoyISO())}   ·   Montos en ${moneda === 'USD' ? 'dólares (US$)' : 'pesos ($)'}`, M + 16, 38);

  // ── Indicadores ──────────────────────────────────────────────────────────
  const kpis = [
    ['COSTO TOTAL', fmtCorto(res.total.total, moneda), fmt(res.total.total, moneda)],
    ['PRESUPUESTO USADO', res.presupuesto ? fmtPct(res.avance) : 'Sin cargar', res.presupuesto ? `de ${fmtCorto(res.presupuesto, moneda)}` : ''],
    ...res.tipos.map((t) => [obra.tipos[t].nombre.toUpperCase(), fmtCorto(res.total[t], moneda), `${fmtPct(res.pct[t])} del total`, COLOR_TIPO[t]]),
    ['COSTO POR M2', obra.m2 ? fmtCorto(res.m2, moneda) : '-', obra.m2 ? `${fmtNum(obra.m2)} m2` : 'Sin m2 cargados'],
  ].slice(0, 5);
  const kw = (ancho - (kpis.length - 1) * 3) / kpis.length;
  let y = 55;
  kpis.forEach(([k, v, s, color], i) => {
    const x = M + i * (kw + 3);
    doc.setFillColor(...PAPEL);
    doc.roundedRect(x, y, kw, 24, 1.5, 1.5, 'F');
    if (color) { doc.setFillColor(...hex(color)); doc.rect(x, y, 1.6, 24, 'F'); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(...GRIS);
    doc.text(k, x + 4, y + 6);
    doc.setFontSize(13.5); doc.setTextColor(...TINTA);
    doc.text(v, x + 4, y + 14.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRIS);
    doc.text(s, x + 4, y + 20);
  });
  if (res.presupuesto) {
    y += 28;
    doc.setFillColor(...LINEA); doc.roundedRect(M, y, ancho, 2.4, 1.2, 1.2, 'F');
    doc.setFillColor(...(res.avance > 100 ? [176, 68, 42] : AMARILLO));
    doc.roundedRect(M, y, Math.max(2.4, Math.min(1, res.avance / 100) * ancho), 2.4, 1.2, 1.2, 'F');
  }

  const titulo = (t, yy, sub2) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...TINTA);
    doc.text(t, M, yy);
    if (sub2) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...GRIS); doc.text(sub2, M, yy + 4.5); }
  };

  // ── Gráficos página 1 ────────────────────────────────────────────────────
  y += 12;
  titulo('Gasto mes a mes', y, `Separado por tipo de costo · ${res.evolucion.length} meses`);
  const imgMes = await imagen(cfgMensual(res, obra, moneda, op), 620, 230);
  doc.addImage(imgMes, 'PNG', M, y + 7, ancho, ancho * (230 / 620));
  y += 7 + ancho * (230 / 620) + 9;

  const mitad = (ancho - 6) / 2;
  titulo('Distribución por tipo de costo', y);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...TINTA);
  doc.text('Costo por rubro', M + mitad + 6, y);
  const imgDona = await imagen(cfgDona(res, obra, moneda, op), 300, 240);
  const imgRub = await imagen(cfgRubros(res, moneda, op), 320, 240);
  doc.addImage(imgDona, 'PNG', M, y + 4, mitad, mitad * (240 / 300));
  doc.addImage(imgRub, 'PNG', M + mitad + 6, y + 4, mitad, mitad * (240 / 320));

  // ── Página 2: tabla A+B y comparación ────────────────────────────────────
  doc.addPage();
  y = 18;
  titulo(`Representación de costos ${res.tipos.join(' + ')}`, y, 'Cuánto se gastó en cada rubro y cómo se reparte entre tipos de costo');
  const head = [['Rubro', 'Costo total', '%', ...res.tipos.flatMap((t) => [obra.tipos[t].nombre, '%'])]];
  const body = res.rubros.filter((r) => r.total > 0).map((r) => [
    r.rubro.nombre, fmt(r.total, moneda), fmtPct(r.pct),
    ...res.tipos.flatMap((t) => [fmt(r[t], moneda), fmtPct(res.total.total ? (r[t] / res.total.total) * 100 : 0)]),
  ]);
  const foot = [['TOTALES', fmt(res.total.total, moneda), '100%', ...res.tipos.flatMap((t) => [fmt(res.total[t], moneda), fmtPct(res.pct[t])])]];
  autoTable(doc, {
    startY: y + 8, head, body, foot, margin: { left: M, right: M },
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.2, textColor: TINTA, lineColor: LINEA, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: TINTA, textColor: 255, fontStyle: 'bold', halign: 'right' },
    footStyles: { fillColor: AMARILLO, textColor: TINTA, fontStyle: 'bold', halign: 'right' },
    columnStyles: Object.fromEntries([[0, { halign: 'left', fontStyle: 'bold' }], ...Array.from({ length: 2 + res.tipos.length * 2 }, (_, i) => [i + 1, { halign: 'right' }])]),
    didParseCell: (d) => { if (d.column.index === 0 && d.section !== 'body') d.cell.styles.halign = 'left'; },
    alternateRowStyles: { fillColor: [251, 250, 247] },
  });
  y = doc.lastAutoTable.finalY + 12;
  titulo(`Comparación ${res.tipos.join(' / ')} por rubro`, y);
  const nR = res.rubros.filter((r) => r.total > 0).length;
  const hAB = Math.max(160, 50 + nR * 28);
  const imgAB = await imagen(cfgRubrosAB(res, obra, moneda, op), 620, hAB);
  doc.addImage(imgAB, 'PNG', M, y + 4, ancho, ancho * (hAB / 620));
  y += 4 + ancho * (hAB / 620) + 10;
  if (y > 200) { doc.addPage(); y = 18; }
  titulo('Gasto acumulado', y, res.presupuesto ? 'Comparado con el presupuesto total' : 'Suma de todos los gastos mes a mes');
  const imgAc = await imagen(cfgAcumulado(res, moneda, op), 620, 210);
  doc.addImage(imgAc, 'PNG', M, y + 7, ancho, ancho * (210 / 620));

  // ── Página 3: detalle mensual y gastos más grandes ───────────────────────
  doc.addPage();
  y = 18;
  titulo('Detalle mes a mes', y);
  autoTable(doc, {
    startY: y + 4,
    head: [['Mes', ...res.tipos.map((t) => obra.tipos[t].nombre), 'Total del mes', 'Acumulado']],
    body: res.evolucion.map((m) => [mesLargo(m.mes), ...res.tipos.map((t) => fmt(m[t], moneda)), fmt(m.total, moneda), fmt(m.acumulado, moneda)]),
    margin: { left: M, right: M },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.9, textColor: TINTA, lineColor: LINEA, lineWidth: { bottom: 0.2 }, halign: 'right' },
    headStyles: { fillColor: TINTA, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
    didParseCell: (d) => { if (d.column.index === 0) d.cell.styles.halign = 'left'; },
    alternateRowStyles: { fillColor: [251, 250, 247] },
  });
  y = doc.lastAutoTable.finalY + 12;
  if (y > 230) { doc.addPage(); y = 18; }
  titulo('Los 15 gastos más grandes', y);
  const rubros = Object.fromEntries(obra.rubros.map((r) => [r.id, r.nombre]));
  const top = [...gastos].sort((a, b) => montoEn(b, moneda) - montoEn(a, moneda)).slice(0, 15);
  autoTable(doc, {
    startY: y + 4,
    head: [['Fecha', 'Rubro', 'Concepto', 'Tipo', 'Monto']],
    body: top.map((g) => [fechaLinda(g.fecha), rubros[g.rubroId] || '', g.concepto + (g.proveedor ? ` · ${g.proveedor}` : ''), obra.tipos[g.tipo]?.nombre, fmt(montoEn(g, moneda), moneda)]),
    margin: { left: M, right: M },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.9, textColor: TINTA, lineColor: LINEA, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: TINTA, textColor: 255, fontStyle: 'bold' },
    columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (d) => { if (d.column.index === 4 && d.section === 'head') d.cell.styles.halign = 'right'; },
    alternateRowStyles: { fillColor: [251, 250, 247] },
  });

  // ── Pie de página ────────────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINEA); doc.setLineWidth(0.2);
    doc.line(M, 286, W - M, 286);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
    doc.text(`${obra.nombre}  ·  Cotización de referencia: US$ 1 = $ ${fmtTc(tcHoy)}  ·  Cada gasto se convierte con la cotización del día en que se cargó`, M, 290.5);
    doc.text(`${i} / ${total}`, W - M, 290.5, { align: 'right' });
  }

  doc.save(nombreArchivo(obra, 'pdf'));
}
