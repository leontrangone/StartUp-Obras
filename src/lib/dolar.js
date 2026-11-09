// Cotización online desde DolarApi (https://dolarapi.com). Si no hay internet
// o la API no responde, la app sigue funcionando con la cotización manual.
export const FUENTES = {
  oficial: 'Oficial',
  blue: 'Blue',
  bolsa: 'MEP',
};

export async function traerCotizacion(fuente = 'blue') {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`https://dolarapi.com/v1/dolares/${fuente}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error('Respuesta inválida');
    const d = await res.json();
    const venta = Number(d.venta);
    if (!venta) throw new Error('Sin dato');
    return { venta, compra: Number(d.compra) || null, fecha: d.fechaActualizacion };
  } finally {
    clearTimeout(t);
  }
}
