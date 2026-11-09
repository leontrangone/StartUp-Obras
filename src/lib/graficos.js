// ─── Configuración de gráficos (se usa en pantalla y en el PDF) ────────────
import {
  Chart, BarController, BarElement, LineController, LineElement, PointElement,
  DoughnutController, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, Filler,
} from 'chart.js';
import { COLOR_TIPO } from './catalogo.js';
import { fmt, fmtCorto, fmtPct, mesCorto } from './money.js';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement,
  DoughnutController, ArcElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

const TINTA = '#1C1E21';
const TINTA2 = '#5F646B';
const GRILLA = 'rgba(28,30,33,.07)';
const FUENTE = "'Barlow', system-ui, sans-serif";

Chart.defaults.font.family = FUENTE;
Chart.defaults.font.size = 12;
Chart.defaults.color = TINTA2;

function tooltipBase(moneda) {
  return {
    backgroundColor: '#1C1E21',
    titleColor: '#fff',
    bodyColor: '#E9E6DF',
    titleFont: { family: FUENTE, weight: '600', size: 13 },
    bodyFont: { family: FUENTE, size: 12 },
    padding: 10,
    cornerRadius: 6,
    boxPadding: 4,
    usePointStyle: true,
    callbacks: {
      label: (c) => ` ${c.dataset.label}: ${fmt(c.parsed.y ?? c.parsed.x ?? c.parsed, moneda)}`,
    },
  };
}

const ejeDinero = (moneda, eje = 'y') => ({
  beginAtZero: true,
  grid: { color: GRILLA, drawTicks: false },
  border: { display: false },
  ticks: { padding: 8, callback: (v) => fmtCorto(v, moneda), maxTicksLimit: 6 },
  ...(eje === 'x' ? {} : {}),
});
const ejeCat = { grid: { display: false }, border: { color: '#D8D3C8' }, ticks: { color: TINTA2 } };

const leyenda = {
  position: 'top', align: 'end',
  labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10, boxHeight: 10, padding: 14, color: TINTA, font: { weight: '500' } },
};

/** Gastos por mes, apilado por tipo de costo. */
export function cfgMensual(res, obra, moneda, opts = {}) {
  return {
    type: 'bar',
    data: {
      labels: res.evolucion.map((m) => mesCorto(m.mes)),
      datasets: res.tipos.map((t) => ({
        label: obra.tipos[t].nombre,
        data: res.evolucion.map((m) => m[t]),
        backgroundColor: COLOR_TIPO[t],
        borderColor: opts.fondo || '#FFFFFF',
        borderWidth: { top: 2, left: 0, right: 0, bottom: 0 },
        borderRadius: 4,
        borderSkipped: 'bottom',
        maxBarThickness: 34,
        stack: 's',
      })),
    },
    options: {
      maintainAspectRatio: false,
      animation: opts.sinAnimacion ? false : { duration: 500 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: leyenda,
        tooltip: {
          ...tooltipBase(moneda),
          callbacks: {
            ...tooltipBase(moneda).callbacks,
            footer: (items) => `Total del mes: ${fmt(items.reduce((s, i) => s + i.parsed.y, 0), moneda)}`,
          },
        },
      },
      scales: { x: { ...ejeCat, stacked: true }, y: { ...ejeDinero(moneda), stacked: true } },
    },
  };
}

/** Dona A / B / C con el total en el centro. */
export function cfgDona(res, obra, moneda, opts = {}) {
  const centro = {
    id: 'centro',
    afterDraw(chart) {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const meta = chart.getDatasetMeta(0);
      const arc = meta?.data?.[0];
      if (!arc) return;
      const x = arc.x, y = arc.y;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = TINTA2;
      ctx.font = `500 ${opts.chico ? 11 : 12}px ${FUENTE}`;
      ctx.fillText('TOTAL', x, y - 10);
      ctx.fillStyle = TINTA;
      ctx.font = `700 ${opts.chico ? 17 : 21}px 'Barlow Condensed', ${FUENTE}`;
      ctx.fillText(fmtCorto(res.total.total, moneda), x, y + 14);
      ctx.restore();
    },
  };
  return {
    type: 'doughnut',
    data: {
      labels: res.tipos.map((t) => obra.tipos[t].nombre),
      datasets: [{
        data: res.tipos.map((t) => res.total[t]),
        backgroundColor: res.tipos.map((t) => COLOR_TIPO[t]),
        borderColor: opts.fondo || '#FFFFFF',
        borderWidth: 3,
        hoverOffset: 4,
      }],
    },
    options: {
      maintainAspectRatio: false,
      cutout: '68%',
      animation: opts.sinAnimacion ? false : { duration: 500 },
      plugins: {
        legend: { ...leyenda, position: 'bottom', align: 'center',
          labels: { ...leyenda.labels,
            generateLabels: (chart) => res.tipos.map((t, i) => ({
              text: `${obra.tipos[t].nombre}  ${fmtPct(res.pct[t])}`,
              fillStyle: COLOR_TIPO[t], strokeStyle: COLOR_TIPO[t], pointStyle: 'rectRounded',
              index: i, hidden: !chart.getDataVisibility(i), fontColor: TINTA,
            })),
          } },
        tooltip: { ...tooltipBase(moneda), callbacks: { label: (c) => ` ${c.label}: ${fmt(c.parsed, moneda)} (${fmtPct(res.pct[res.tipos[c.dataIndex]])})` } },
      },
    },
    plugins: [centro],
  };
}

/** Costo por rubro (barras horizontales, ordenadas de mayor a menor). */
export function cfgRubros(res, moneda, opts = {}) {
  const rubros = res.rubros.filter((r) => r.total > 0);
  return {
    type: 'bar',
    data: {
      labels: rubros.map((r) => r.rubro.nombre),
      datasets: [{
        label: 'Costo',
        data: rubros.map((r) => r.total),
        backgroundColor: '#3A4047',
        hoverBackgroundColor: '#1C1E21',
        borderRadius: 4,
        borderSkipped: 'start',
        maxBarThickness: 22,
      }],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      animation: opts.sinAnimacion ? false : { duration: 500 },
      plugins: {
        legend: { display: false },
        tooltip: { ...tooltipBase(moneda), callbacks: { label: (c) => ` ${fmt(c.parsed.x, moneda)} · ${fmtPct(rubros[c.dataIndex].pct)}` } },
      },
      scales: {
        x: { ...ejeDinero(moneda, 'x') },
        y: { ...ejeCat, border: { display: false }, ticks: { color: TINTA, font: { weight: '500' } } },
      },
    },
  };
}

/** Cada rubro partido en A / B / C (barras horizontales apiladas). */
export function cfgRubrosAB(res, obra, moneda, opts = {}) {
  const rubros = res.rubros.filter((r) => r.total > 0);
  return {
    type: 'bar',
    data: {
      labels: rubros.map((r) => r.rubro.nombre),
      datasets: res.tipos.map((t) => ({
        label: obra.tipos[t].nombre,
        data: rubros.map((r) => r[t]),
        backgroundColor: COLOR_TIPO[t],
        borderColor: opts.fondo || '#FFFFFF',
        borderWidth: { left: 0, right: 2, top: 0, bottom: 0 },
        borderRadius: 4,
        borderSkipped: false,
        maxBarThickness: 22,
        stack: 's',
      })),
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      animation: opts.sinAnimacion ? false : { duration: 500 },
      interaction: { mode: 'index', intersect: false, axis: 'y' },
      plugins: {
        legend: leyenda,
        tooltip: {
          ...tooltipBase(moneda),
          callbacks: {
            label: (c) => {
              const r = rubros[c.dataIndex];
              const pct = r.total ? (c.parsed.x / r.total) * 100 : 0;
              return ` ${c.dataset.label}: ${fmt(c.parsed.x, moneda)} (${fmtPct(pct)} del rubro)`;
            },
          },
        },
      },
      scales: {
        x: { ...ejeDinero(moneda, 'x'), stacked: true },
        y: { ...ejeCat, stacked: true, border: { display: false }, ticks: { color: TINTA, font: { weight: '500' } } },
      },
    },
  };
}

/** Gasto acumulado contra el presupuesto (misma escala, un solo eje). */
export function cfgAcumulado(res, moneda, opts = {}) {
  const labels = res.evolucion.map((m) => mesCorto(m.mes));
  const datasets = [{
    label: 'Gastado acumulado',
    data: res.evolucion.map((m) => m.acumulado),
    borderColor: '#1C1E21',
    backgroundColor: 'rgba(242,181,0,.18)',
    fill: true,
    borderWidth: 2,
    tension: 0.25,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: '#F2B500',
    pointHoverBorderColor: '#1C1E21',
  }];
  if (res.presupuesto > 0) {
    datasets.push({
      label: 'Presupuesto',
      data: labels.map(() => res.presupuesto),
      borderColor: '#B0442A',
      borderDash: [6, 5],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
      fill: false,
    });
  }
  return {
    type: 'line',
    data: { labels, datasets },
    options: {
      maintainAspectRatio: false,
      animation: opts.sinAnimacion ? false : { duration: 500 },
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: leyenda, tooltip: tooltipBase(moneda) },
      scales: { x: ejeCat, y: ejeDinero(moneda) },
    },
  };
}

export { Chart };
