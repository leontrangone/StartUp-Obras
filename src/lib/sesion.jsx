// ─── Sesión del usuario: registro, ingreso con código, recuperación ────────
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onSesionPerdida } from './api.js';

const Ctx = createContext(null);

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    api('GET', 'auth/me')
      .then((r) => setUsuario(r.usuario))
      .catch((e) => { if (e.status !== 401) setAviso(e.message); })
      .finally(() => setCargando(false));
    onSesionPerdida(() => { setUsuario(null); setAviso('Tu sesión venció. Volvé a ingresar.'); });
  }, []);

  // Cada paso devuelve { pendiente } (hay que poner un código) o { usuario } (ya entró)
  const resultado = useCallback((r) => {
    if (r.usuario) { setAviso(''); setUsuario(r.usuario); }
    return r;
  }, []);

  const acciones = useMemo(() => ({
    registrarse: (datos) => api('POST', 'auth/registro', datos).then(resultado),
    ingresar: (identificador, password) => api('POST', 'auth/login', { identificador, password }).then(resultado),
    verificar: (id, codigo, recordar) => api('POST', 'auth/verificar', { id, codigo, recordar }).then(resultado),
    reenviar: (id) => api('POST', 'auth/reenviar', { id }),
    recuperar: (identificador) => api('POST', 'auth/recuperar', { identificador }),
    restablecer: (id, codigo, password) => api('POST', 'auth/restablecer', { id, codigo, password }).then(resultado),
    salir: async () => {
      try { await api('POST', 'auth/logout'); } catch { /* igual salimos */ }
      window.location.hash = '/';
      setUsuario(null);
    },
  }), [resultado]);

  const valor = useMemo(() => ({ usuario, cargando, aviso, ...acciones }), [usuario, cargando, aviso, acciones]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useSesion = () => useContext(Ctx);
