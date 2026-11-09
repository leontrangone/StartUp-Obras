// ─── Sesión del usuario (login / signup / logout) ──────────────────────────
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

  const ingresar = useCallback(async (identificador, password) => {
    const r = await api('POST', 'auth/login', { identificador, password });
    setAviso(''); setUsuario(r.usuario);
  }, []);
  const registrarse = useCallback(async (datos) => {
    const r = await api('POST', 'auth/signup', datos);
    setAviso(''); setUsuario(r.usuario);
  }, []);
  const salir = useCallback(async () => {
    try { await api('POST', 'auth/logout'); } catch { /* igual salimos */ }
    window.location.hash = '/';
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, cargando, aviso, ingresar, registrarse, salir }), [usuario, cargando, aviso, ingresar, registrarse, salir]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useSesion = () => useContext(Ctx);
