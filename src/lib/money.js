// ─── Dinero, divisas y fechas ───────────────────────────────────────────────
// Cada gasto guarda su monto en la moneda en que se pagó y la cotización
// (pesos por dólar) del día. Así, cuando se cambia la vista a USD o ARS,
// cada gasto se convierte con SU cotización y no con la de hoy.

export const MONEDAS = {
  ARS: { codigo: 'ARS', simbolo: '$', nombre: 'Pesos' },
  USD: { codigo: 'USD', simbolo: 'US$', nombre: 'Dólares' },
};

/** Convierte un monto de una moneda a otra con la cotización dada (ARS por USD). */
export function convertir(monto, de, a, tc) {
  const n = Number(monto) || 0;
  if (de === a) return n;
  const t = Number(tc) || 1;
  return de === 'USD' ? n * t : n / t;
}

/** Monto de un gasto expresado en la moneda de la vista. */
export function montoEn(gasto, moneda) {
  return convertir(gasto.monto, gasto.moneda, moneda, gasto.tc);
}

const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** $ 1.234.567  ·  US$ 12.345 */
export function fmt(monto, moneda = 'ARS', { decimales } = {}) {
  const n = Number(monto) || 0;
  const usarDec = decimales ?? (moneda === 'USD' && Math.abs(n) < 1000);
  const s = (usarDec ? nf2 : nf0).format(n);
  return `${MONEDAS[moneda].simbolo} ${s}`;
}

/** Versión corta para tarjetas: $ 1.126,3 M · US$ 845 mil */
export function fmtCorto(monto, moneda = 'ARS') {
  const n = Number(monto) || 0;
  const abs = Math.abs(n);
  const sim = MONEDAS[moneda].simbolo;
  if (abs >= 1e9) return `${sim} ${nf1.format(n / 1e6)} M`;
  if (abs >= 1e6) return `${sim} ${nf1.format(n / 1e6)} M`;
  if (abs >= 1e4) return `${sim} ${nf0.format(n / 1e3)} mil`;
  return fmt(n, moneda);
}

export const fmtNum = (n) => nf0.format(Number(n) || 0);
export const fmtPct = (n) => `${nf1.format(Number(n) || 0)}%`;
export const fmtTc = (n) => nf2.format(Number(n) || 0);

// ─── Fechas ─────────────────────────────────────────────────────────────────
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGO = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const hoyISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
export const mesDe = (fechaISO) => (fechaISO || '').slice(0, 7); // 'YYYY-MM'
export const mesActual = () => hoyISO().slice(0, 7);

/** '2025-03' → 'mar 25' */
export function mesCorto(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MESES[+m - 1]} ${y.slice(2)}`;
}
/** '2025-03' → 'Marzo 2025' */
export function mesLargo(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MESES_LARGO[+m - 1]} ${y}`;
}
/** '2025-03-14' → '14 mar 2025' */
export function fechaLinda(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${+d} ${MESES[+m - 1]} ${y}`;
}

/** Lista de meses consecutivos entre dos 'YYYY-MM' (inclusive). */
export function rangoMeses(desde, hasta) {
  const out = [];
  if (!desde || !hasta) return out;
  let [y, m] = desde.split('-').map(Number);
  const [y2, m2] = hasta.split('-').map(Number);
  while (y < y2 || (y === y2 && m <= m2)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
    if (out.length > 240) break;
  }
  return out;
}

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
