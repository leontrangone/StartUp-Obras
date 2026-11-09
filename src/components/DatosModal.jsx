import { useRef } from 'react';
import { Download, Upload, Trash2, RotateCcw } from 'lucide-react';
import { Modal } from './ui.jsx';
import { useStore } from '../lib/store.jsx';
import { hoyISO } from '../lib/money.js';

/** Copia de seguridad (JSON) y manejo de los datos de ejemplo. */
export function DatosModal({ abierto, onCerrar }) {
  const { obras, gastos, ajustes, ejemplo, reemplazarTodo, borrarEjemplo, restaurarEjemplo, avisar } = useStore();
  const input = useRef(null);

  function exportar() {
    const blob = new Blob([JSON.stringify({ app: 'plomada', version: 1, fecha: hoyISO(), obras, gastos, ajustes }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Plomada_copia_${hoyISO()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
    avisar('Copia de seguridad descargada');
  }

  async function importar(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!Array.isArray(d.obras) || !Array.isArray(d.gastos)) throw new Error();
      if (!confirm(`Esto reemplaza los datos actuales por los de la copia (${d.obras.length} obras, ${d.gastos.length} gastos). ¿Seguir?`)) return;
      await reemplazarTodo({ obras: d.obras, gastos: d.gastos });
      avisar('Copia restaurada');
      onCerrar();
    } catch {
      avisar('El archivo no es una copia válida de Plomada', { tipo: 'error' });
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Copia de seguridad y datos" subtitulo="Tus datos están guardados en la nube. Igual podés bajarte una copia cuando quieras." ancho={560}>
      <div className="datos">
        <div className="datos__fila">
          <div><b>Descargar copia</b><p>Un archivo con todas las obras y gastos ({obras.length} obras · {gastos.length} gastos).</p></div>
          <button className="btn btn--sec" onClick={exportar}><Download size={16} /> Descargar</button>
        </div>
        <div className="datos__fila">
          <div><b>Restaurar copia</b><p>Para pasar los datos a otra computadora o recuperarlos.</p></div>
          <button className="btn btn--sec" onClick={() => input.current?.click()}><Upload size={16} /> Elegir archivo</button>
          <input ref={input} type="file" accept=".json,application/json" hidden onChange={importar} />
        </div>
        {ejemplo ? (
          <div className="datos__fila datos__fila--aviso">
            <div><b>Empezar de cero</b><p>Borra las obras de ejemplo para cargar las tuyas.</p></div>
            <button className="btn btn--peligro" onClick={() => { if (confirm('¿Borrar los datos de ejemplo?')) { borrarEjemplo().catch(() => {}); avisar('Listo, a cargar tus obras'); onCerrar(); window.location.hash = '/'; } }}><Trash2 size={16} /> Borrar ejemplo</button>
          </div>
        ) : (
          <div className="datos__fila">
            <div><b>Ver datos de ejemplo</b><p>Reemplaza todo por las obras de demostración.</p></div>
            <button className="btn btn--sec" onClick={() => { if (confirm('Esto reemplaza tus datos por los de ejemplo. Hacé una copia antes. ¿Seguir?')) { restaurarEjemplo().catch(() => {}); onCerrar(); window.location.hash = '/'; } }}><RotateCcw size={16} /> Cargar ejemplo</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
