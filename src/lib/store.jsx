// ─── Estado de la app ───────────────────────────────────────────────────────
// Por ahora los datos se guardan en el navegador (localStorage).
// Toda la lectura/escritura pasa por este archivo: para conectar un backend
// (Node + Express + PostgreSQL) alcanza con reemplazar `cargar` y `guardar`
// por llamadas a la API, sin tocar las pantallas.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { datosEjemplo } from './seed.js';
import { uid, hoyISO } from './money.js';
import { nuevaObraBase } from './catalogo.js';

const CLAVE = 'plomada.datos.v1';
const VERSION = 1;

const ajustesBase = {
  moneda: 'ARS',
  tc: 1450,
  tcFuente: 'manual', // manual | oficial | blue | bolsa
  tcFecha: hoyISO(),
};

function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.obras)) return { ...d, ajustes: { ...ajustesBase, ...d.ajustes } };
    }
  } catch { /* sin almacenamiento disponible */ }
  const ej = datosEjemplo();
  return { version: VERSION, obras: ej.obras, gastos: ej.gastos, ajustes: ajustesBase, ejemplo: true };
}

function guardar(datos) {
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch { /* ignorar */ }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [datos, setDatos] = useState(cargar);
  const [toasts, setToasts] = useState([]);
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    guardar(datos);
  }, [datos]);

  const avisar = useCallback((texto, { tipo = 'ok', deshacer } = {}) => {
    const id = uid();
    setToasts((t) => [...t, { id, texto, tipo, deshacer }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), deshacer ? 6000 : 3200);
  }, []);
  const cerrarToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const acciones = useMemo(() => ({
    // Ajustes
    setMoneda: (moneda) => setDatos((d) => ({ ...d, ajustes: { ...d.ajustes, moneda } })),
    setCotizacion: (tc, tcFuente = 'manual') =>
      setDatos((d) => ({ ...d, ajustes: { ...d.ajustes, tc: Number(tc) || d.ajustes.tc, tcFuente, tcFecha: hoyISO() } })),

    // Obras
    crearObra: (campos) => {
      const id = uid();
      setDatos((d) => ({ ...d, obras: [...d.obras, { id, ...nuevaObraBase(campos), paleta: d.obras.length % 4, creado: Date.now() }] }));
      return id;
    },
    editarObra: (id, campos) =>
      setDatos((d) => ({ ...d, obras: d.obras.map((o) => (o.id === id ? { ...o, ...campos } : o)) })),
    borrarObra: (id) =>
      setDatos((d) => ({ ...d, obras: d.obras.filter((o) => o.id !== id), gastos: d.gastos.filter((g) => g.obraId !== id) })),

    // Gastos
    agregarGasto: (g) => setDatos((d) => ({ ...d, gastos: [{ ...g, id: uid(), creado: Date.now() }, ...d.gastos] })),
    agregarGastos: (lista) =>
      setDatos((d) => ({ ...d, gastos: [...lista.map((g) => ({ ...g, id: uid(), creado: Date.now() })), ...d.gastos] })),
    editarGasto: (id, campos) =>
      setDatos((d) => ({ ...d, gastos: d.gastos.map((g) => (g.id === id ? { ...g, ...campos } : g)) })),
    borrarGasto: (id) => {
      let borrado;
      setDatos((d) => {
        borrado = d.gastos.find((g) => g.id === id);
        return { ...d, gastos: d.gastos.filter((g) => g.id !== id) };
      });
      return () => borrado && setDatos((d) => ({ ...d, gastos: [borrado, ...d.gastos] }));
    },

    // Datos
    borrarEjemplo: () => setDatos((d) => ({ ...d, obras: [], gastos: [], ejemplo: false })),
    restaurarEjemplo: () => {
      const ej = datosEjemplo();
      setDatos((d) => ({ ...d, obras: ej.obras, gastos: ej.gastos, ejemplo: true }));
    },
    reemplazarTodo: (nuevo) => setDatos((d) => ({ ...d, ...nuevo, ajustes: { ...d.ajustes, ...(nuevo.ajustes || {}) } })),
  }), []);

  const valor = useMemo(() => ({ ...datos, ...acciones, avisar, toasts, cerrarToast }), [datos, acciones, avisar, toasts, cerrarToast]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
