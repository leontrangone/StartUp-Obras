// ─── Datos de ejemplo ───────────────────────────────────────────────────────
// "Edificio Olmedo" reproduce aproximadamente los totales de la planilla real
// (Representación de costos A + B). Las cotizaciones son valores de ejemplo.
import { nuevaObraBase, SUGERENCIAS } from './catalogo.js';
import { rangoMeses, uid } from './money.js';

// PRNG determinístico para que el ejemplo sea siempre igual
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cotización de ejemplo por mes (crece de a poco)
function tcEjemplo(meses, desde, hasta) {
  return Object.fromEntries(meses.map((m, i) => [m, Math.round(desde + ((hasta - desde) * i) / Math.max(1, meses.length - 1))]));
}

/**
 * Reparte un total (en ARS) en gastos individuales a lo largo de los meses,
 * según una curva de pesos (fase de obra).
 */
function repartir({ obraId, rubroId, tipo, totalARS, meses, pesos, tc, r, usdChance = 0 }) {
  const out = [];
  const sumaP = pesos.reduce((a, b) => a + b, 0);
  let asignado = 0;
  const conceptos = SUGERENCIAS[rubroId] || ['Varios'];
  meses.forEach((mes, i) => {
    if (!pesos[i]) return;
    let delMes = i === meses.length - 1 || pesos.slice(i + 1).every((p) => !p)
      ? totalARS - asignado
      : Math.round((totalARS * pesos[i]) / sumaP);
    asignado += delMes;
    if (delMes <= 0) return;
    const n = delMes > 20_000_000 ? 2 + Math.floor(r() * 3) : delMes > 3_000_000 ? 1 + Math.floor(r() * 2) : 1;
    let resto = delMes;
    for (let k = 0; k < n; k++) {
      const parte = k === n - 1 ? resto : Math.round((delMes / n) * (0.6 + r() * 0.8));
      resto -= parte;
      const dia = String(1 + Math.floor(r() * 27)).padStart(2, '0');
      const enUSD = r() < usdChance;
      const t = tc[mes];
      out.push({
        id: uid(),
        obraId,
        fecha: `${mes}-${dia}`,
        rubroId,
        concepto: conceptos[Math.floor(r() * conceptos.length)],
        descripcion: '',
        proveedor: '',
        monto: enUSD ? Math.round((parte / t) * 100) / 100 : parte,
        moneda: enUSD ? 'USD' : 'ARS',
        tc: t,
        tipo,
        creado: Date.now(),
      });
    }
  });
  return out;
}

// Curvas típicas de una obra (pesos relativos por mes)
const curva = (n, fn) => Array.from({ length: n }, (_, i) => Math.max(0, fn(i / Math.max(1, n - 1), i)));
const campana = (centro, ancho) => (x) => Math.exp(-((x - centro) ** 2) / (2 * ancho ** 2));

export function datosEjemplo() {
  const r = rng(20251);
  const obras = [];
  let gastos = [];

  // ── 1. Edificio Olmedo ───────────────────────────────────────────────────
  {
    const id = 'olmedo';
    const meses = rangoMeses('2025-01', '2026-10');
    const tc = tcEjemplo(meses, 1060, 1450);
    const N = meses.length;
    obras.push({
      id,
      ...nuevaObraBase({
        nombre: 'Edificio Olmedo',
        direccion: 'Olmedo 2450, Ciudad de Buenos Aires',
        pisos: 8, unidades: 16, m2: 1850,
        presupuesto: 1_000_000, presupuestoMoneda: 'USD',
        inicio: '2025-01', estado: 'En obra', paleta: 0,
      }),
      creado: Date.now() - 3,
    });
    const P = (rubroId, tipo, totalARS, pesos, usdChance = 0) =>
      (gastos = gastos.concat(repartir({ obraId: id, rubroId, tipo, totalARS, meses, pesos, tc, r, usdChance })));

    P('mano', 'A', 89_815_222, curva(N, campana(0.55, 0.3)));
    P('mano', 'B', 588_155_846, curva(N, (x) => (x < 0.06 ? 0 : 0.4 + campana(0.55, 0.28)(x))));
    P('materiales', 'A', 299_102_210, curva(N, (x) => (x < 0.06 ? 0 : campana(0.45, 0.25)(x))));
    P('materiales', 'B', 81_384_098, curva(N, (x) => (x < 0.1 ? 0 : campana(0.6, 0.3)(x))));
    P('proyecto', 'A', 32_949_510, curva(N, (x, i) => (i === 0 ? 4 : i % 3 === 0 ? 1 : 0)), 0.6);
    P('indirectos', 'A', 19_278_559, curva(N, () => 1));
    P('indirectos', 'B', 574_590, curva(N, (x, i) => (i === 4 || i === 11 ? 1 : 0)));
    P('honorarios', 'A', 7_161_001, curva(N, (x, i) => (i % 4 === 0 ? 1 : 0)));
    P('honorarios', 'B', 6_734_500, curva(N, (x, i) => (i % 5 === 1 ? 1 : 0)));
    P('excavacion', 'B', 1_030_000, curva(N, (x, i) => (i === 1 ? 2 : i === 2 ? 1 : 0)));
    P('municipales', 'A', 112_440, curva(N, (x, i) => (i === 0 ? 1 : 0)));
  }

  // ── 2. Torre Belgrano (recién arranca: compra de lote y proyecto) ───────
  {
    const id = 'belgrano';
    const meses = rangoMeses('2026-06', '2026-10');
    const tc = tcEjemplo(meses, 1390, 1450);
    obras.push({
      id,
      ...nuevaObraBase({
        nombre: 'Torre Belgrano',
        direccion: 'Av. Cabildo 1820, Belgrano',
        pisos: 12, unidades: 34, m2: 3900,
        presupuesto: 2_600_000, presupuestoMoneda: 'USD',
        inicio: '2026-06', estado: 'Planificación', paleta: 1,
      }),
      creado: Date.now() - 2,
    });
    const g = (fecha, rubroId, concepto, monto, moneda, tipo) => gastos.push({
      id: uid(), obraId: id, fecha, rubroId, concepto, descripcion: '', proveedor: '',
      monto, moneda, tc: tc[fecha.slice(0, 7)], tipo, creado: Date.now(),
    });
    g('2026-06-04', 'lote', 'Compra del lote', 420_000, 'USD', 'A');
    g('2026-06-04', 'lote', 'Comisión inmobiliaria', 12_600, 'USD', 'A');
    g('2026-06-11', 'lote', 'Gastos de escrituración', 9_800, 'USD', 'A');
    g('2026-06-11', 'lote', 'Impuesto de sellos', 8_450_000, 'ARS', 'A');
    g('2026-07-02', 'proyecto', 'Proyecto de arquitectura', 38_000, 'USD', 'A');
    g('2026-08-19', 'proyecto', 'Cálculo estructural', 9_500, 'USD', 'A');
    g('2026-09-05', 'municipales', 'Aprobación de planos', 3_250_000, 'ARS', 'A');
    g('2026-09-22', 'honorarios', 'Agrimensor', 1_850_000, 'ARS', 'B');
    g('2026-10-08', 'excavacion', 'Movimiento de suelos', 14_300_000, 'ARS', 'B');
    g('2026-10-15', 'indirectos', 'Obrador', 2_100_000, 'ARS', 'A');
  }

  // ── 3. PH Villa Crespo (terminada) ───────────────────────────────────────
  {
    const id = 'crespo';
    const meses = rangoMeses('2024-03', '2025-02');
    const tc = tcEjemplo(meses, 850, 1065);
    const N = meses.length;
    obras.push({
      id,
      ...nuevaObraBase({
        nombre: 'PH Villa Crespo',
        direccion: 'Thames 640, Villa Crespo',
        pisos: 3, unidades: 4, m2: 420,
        presupuesto: 210_000, presupuestoMoneda: 'USD',
        inicio: '2024-03', estado: 'Terminada', paleta: 2,
      }),
      creado: Date.now() - 1,
    });
    const P = (rubroId, tipo, totalARS, pesos) =>
      (gastos = gastos.concat(repartir({ obraId: id, rubroId, tipo, totalARS, meses, pesos, tc, r })));
    P('mano', 'A', 21_400_000, curva(N, campana(0.5, 0.3)));
    P('mano', 'B', 58_900_000, curva(N, campana(0.5, 0.3)));
    P('materiales', 'A', 64_700_000, curva(N, campana(0.4, 0.3)));
    P('materiales', 'B', 9_800_000, curva(N, campana(0.6, 0.3)));
    P('proyecto', 'A', 7_900_000, curva(N, (x, i) => (i < 2 ? 1 : 0)));
    P('indirectos', 'A', 3_600_000, curva(N, () => 1));
    P('municipales', 'A', 640_000, curva(N, (x, i) => (i === 0 || i === N - 1 ? 1 : 0)));
  }

  gastos.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  return { obras, gastos };
}
