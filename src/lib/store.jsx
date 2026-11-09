// ─── Estado de la app ───────────────────────────────────────────────────────
// Los datos viven en la base (Neon) y se leen/escriben por la API.
// La pantalla se actualiza al instante y el guardado va por detrás, en orden;
// si algo falla, se avisa y se vuelve a leer todo desde la base.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { datosEjemplo } from './seed.js';
import { uid, hoyISO } from './money.js';
import { nuevaObraBase } from './catalogo.js';

const CLAVE_LOCAL = 'plomada.datos.v1'; // datos de la versión anterior (guardados en el navegador)

const ajustesBase = { moneda: 'ARS', tc: 1450, tcFuente: 'manual', tcFecha: hoyISO() };

/** Datos que quedaron guardados en este navegador antes de tener cuenta. */
export function leerDatosLocales() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_LOCAL) || 'null');
    if (d && !d.ejemplo && Array.isArray(d.obras) && d.obras.length) return d;
  } catch { /* nada */ }
  return null;
}
export function olvidarDatosLocales() {
  try { localStorage.removeItem(CLAVE_LOCAL); } catch { /* nada */ }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [datos, setDatos] = useState({ obras: [], gastos: [], ajustes: ajustesBase, ejemplo: false });
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error
  const [guardando, setGuardando] = useState(0);
  const [toasts, setToasts] = useState([]);
  const cola = useRef(Promise.resolve());
  const datosRef = useRef(datos);
  datosRef.current = datos;

  const avisar = useCallback((texto, { tipo = 'ok', deshacer } = {}) => {
    const id = uid();
    setToasts((t) => [...t, { id, texto, tipo, deshacer }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), deshacer ? 6000 : tipo === 'error' ? 5000 : 3200);
  }, []);
  const cerrarToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const aplicar = useCallback((d) => {
    setDatos({ obras: d.obras, gastos: d.gastos, ajustes: { ...ajustesBase, ...(d.ajustes || {}) }, ejemplo: Boolean(d.ejemplo) });
  }, []);

  const recargar = useCallback(async () => {
    try {
      aplicar(await api('GET', 'datos'));
      setEstado('listo');
    } catch (e) {
      if (e.status !== 401) setEstado('error');
    }
  }, [aplicar]);

  useEffect(() => { recargar(); }, [recargar]);

  /** Encola una escritura en la API (se ejecutan de a una, en orden). */
  const guardar = useCallback((fn, { error = 'No se pudo guardar el cambio' } = {}) => {
    setGuardando((n) => n + 1);
    const p = cola.current.then(fn).catch((e) => {
      if (e.status !== 401) {
        avisar(`${error}: ${e.message}`, { tipo: 'error' });
        recargar();
      }
      throw e;
    }).finally(() => setGuardando((n) => n - 1));
    cola.current = p.catch(() => {});
    return p;
  }, [avisar, recargar]);

  const acciones = useMemo(() => ({
    recargar,

    // Ajustes
    setMoneda: (moneda) => {
      setDatos((d) => ({ ...d, ajustes: { ...d.ajustes, moneda } }));
      guardar(() => api('PUT', 'ajustes', { moneda })).catch(() => {});
    },
    setCotizacion: (tc, tcFuente = 'manual') => {
      const campos = { tc: Number(tc) || 0, tcFuente, tcFecha: hoyISO() };
      if (!(campos.tc > 0)) return;
      setDatos((d) => ({ ...d, ajustes: { ...d.ajustes, ...campos } }));
      guardar(() => api('PUT', 'ajustes', campos)).catch(() => {});
    },

    // Obras
    crearObra: (campos) => {
      const id = uid();
      const obra = { id, ...nuevaObraBase(campos), paleta: datosRef.current.obras.length % 4, creado: Date.now() };
      setDatos((d) => ({ ...d, obras: [...d.obras, obra] }));
      guardar(() => api('POST', 'obras', { obra }), { error: 'No se pudo crear la obra' }).catch(() => {});
      return id;
    },
    editarObra: (id, campos) => {
      setDatos((d) => ({ ...d, obras: d.obras.map((o) => (o.id === id ? { ...o, ...campos } : o)) }));
      guardar(() => api('PUT', `obras?id=${encodeURIComponent(id)}`, { campos })).catch(() => {});
    },
    borrarObra: (id) => {
      setDatos((d) => ({ ...d, obras: d.obras.filter((o) => o.id !== id), gastos: d.gastos.filter((g) => g.obraId !== id) }));
      guardar(() => api('DELETE', `obras?id=${encodeURIComponent(id)}`), { error: 'No se pudo borrar la obra' }).catch(() => {});
    },

    // Gastos
    agregarGasto: (g) => {
      const gasto = { ...g, id: uid(), creado: Date.now() };
      setDatos((d) => ({ ...d, gastos: [gasto, ...d.gastos] }));
      guardar(() => api('POST', 'gastos', { gastos: [gasto] }), { error: 'No se pudo guardar el gasto' }).catch(() => {});
    },
    agregarGastos: (lista) => {
      const nuevos = lista.map((g) => ({ ...g, id: uid(), creado: Date.now() }));
      setDatos((d) => ({ ...d, gastos: [...nuevos, ...d.gastos] }));
      return guardar(() => api('POST', 'gastos', { gastos: nuevos }), { error: 'No se pudieron importar los gastos' });
    },
    editarGasto: (id, campos) => {
      setDatos((d) => ({ ...d, gastos: d.gastos.map((g) => (g.id === id ? { ...g, ...campos } : g)) }));
      guardar(() => api('PUT', `gastos?id=${encodeURIComponent(id)}`, { campos })).catch(() => {});
    },
    borrarGasto: (id) => {
      let borrado;
      setDatos((d) => {
        borrado = d.gastos.find((g) => g.id === id);
        return { ...d, gastos: d.gastos.filter((g) => g.id !== id) };
      });
      guardar(() => api('DELETE', `gastos?id=${encodeURIComponent(id)}`), { error: 'No se pudo borrar el gasto' }).catch(() => {});
      return () => {
        if (!borrado) return;
        setDatos((d) => ({ ...d, gastos: [borrado, ...d.gastos] }));
        guardar(() => api('POST', 'gastos', { gastos: [borrado] })).catch(() => {});
      };
    },

    // Cargas masivas (reemplazan o suman todo de una vez en la base)
    cargarTodo: async ({ obras, gastos, modo = 'reemplazar', ejemplo = false }) => {
      setEstado('cargando');
      try {
        const d = await guardar(() => api('POST', 'datos', { obras, gastos, modo, ejemplo }), { error: 'No se pudieron cargar los datos' });
        aplicar(d);
      } finally { setEstado('listo'); }
    },
  }), [recargar, guardar, aplicar]);

  const extra = useMemo(() => ({
    borrarEjemplo: () => acciones.cargarTodo({ obras: [], gastos: [] }),
    restaurarEjemplo: () => { const ej = datosEjemplo(); return acciones.cargarTodo({ ...ej, ejemplo: true }); },
    reemplazarTodo: (nuevo) => acciones.cargarTodo({ obras: nuevo.obras, gastos: nuevo.gastos }),
  }), [acciones]);

  const valor = useMemo(
    () => ({ ...datos, ...acciones, ...extra, estado, guardando: guardando > 0, avisar, toasts, cerrarToast }),
    [datos, acciones, extra, estado, guardando, avisar, toasts, cerrarToast],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
