// ─── Cliente de la API ──────────────────────────────────────────────────────
let alPerderSesion = null;
export const onSesionPerdida = (fn) => { alPerderSesion = fn; };

export async function api(metodo, ruta, datos) {
  let res;
  try {
    res = await fetch(`/api/${ruta}`, {
      method: metodo,
      credentials: 'same-origin',
      headers: datos ? { 'Content-Type': 'application/json' } : undefined,
      body: datos ? JSON.stringify(datos) : undefined,
    });
  } catch {
    throw new Error('No hay conexión con el servidor. Revisá tu internet.');
  }
  let cuerpo = {};
  try { cuerpo = await res.json(); } catch { /* sin cuerpo */ }
  if (res.status === 401 && !ruta.startsWith('auth/')) alPerderSesion?.();
  if (!res.ok) {
    const e = new Error(cuerpo.error || `Error ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return cuerpo;
}
