import { useEffect, useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Download } from 'lucide-react';
import { Modal } from './ui.jsx';
import { useStore } from '../lib/store.jsx';
import { fmt, fechaLinda } from '../lib/money.js';

export function ImportarModal({ abierto, obra, onCerrar }) {
  const { ajustes, agregarGastos, editarObra, avisar } = useStore();
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const [arrastrando, setArrastrando] = useState(false);
  const input = useRef(null);
  useEffect(() => { if (abierto) { setRes(null); setError(''); } }, [abierto]);

  async function leer(archivo) {
    if (!archivo) return;
    setError('');
    try {
      const { importarExcel } = await import('../lib/exportExcel.js');
      const r = await importarExcel(archivo, obra, ajustes.tc);
      if (!r.gastos.length) throw new Error('No encontré gastos con monto en el archivo.');
      setRes({ ...r, nombre: archivo.name });
    } catch (e) {
      setError(e.message || 'No se pudo leer el archivo.');
    }
  }

  function confirmar() {
    if (res.nuevos.length) editarObra(obra.id, { rubros: [...obra.rubros, ...res.nuevos] });
    agregarGastos(res.gastos).catch(() => {});
    avisar(`Se importaron ${res.gastos.length} gastos`);
    onCerrar();
  }

  const rubros = Object.fromEntries([...obra.rubros, ...(res?.nuevos || [])].map((r) => [r.id, r.nombre]));

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Importar gastos desde Excel" subtitulo={obra.nombre} ancho={680}
      pie={res ? <><button className="btn btn--sec" onClick={() => setRes(null)}>Elegir otro archivo</button><div className="pie__btns"><button className="btn btn--pri" onClick={confirmar}>Importar {res.gastos.length} gastos</button></div></> : null}>
      {!res ? (
        <>
          <div className={`zona-archivo ${arrastrando ? 'on' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastrando(false); leer(e.dataTransfer.files?.[0]); }}
            onClick={() => input.current?.click()}>
            <FileSpreadsheet size={36} />
            <b>Arrastrá tu planilla acá o tocá para elegirla</b>
            <span>Archivos .xlsx con columnas Fecha, Rubro, Concepto, Monto, Moneda y Tipo de costo</span>
            <input ref={input} type="file" accept=".xlsx" hidden onChange={(e) => { leer(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {error && <p className="error">{error}</p>}
          <div className="importar-ayuda">
            <p>¿No sabés cómo armarla? Bajá la plantilla, pegá tus gastos y volvé a subirla. También acepta la planilla que exporta esta app.</p>
            <button className="btn btn--sec btn--chico" onClick={async () => { const { descargarPlantilla } = await import('../lib/exportExcel.js'); descargarPlantilla(obra); }}>
              <Download size={15} /> Descargar plantilla
            </button>
          </div>
        </>
      ) : (
        <div className="importar-prev">
          <p><b>{res.nombre}</b>: {res.gastos.length} gastos listos para importar
            {res.saltadas ? ` · ${res.saltadas} filas sin monto se saltearon` : ''}
            {res.nuevos.length ? ` · se crean ${res.nuevos.length} rubros nuevos (${res.nuevos.map((r) => r.nombre).join(', ')})` : ''}.</p>
          <div className="tabla-scroll importar-tabla">
            <table>
              <thead><tr><th>Fecha</th><th>Rubro</th><th>Concepto</th><th>Tipo</th><th className="der">Monto</th></tr></thead>
              <tbody>
                {res.gastos.slice(0, 50).map((g, i) => (
                  <tr key={i}><td>{fechaLinda(g.fecha)}</td><td>{rubros[g.rubroId]}</td><td>{g.concepto}</td><td>{obra.tipos[g.tipo]?.nombre}</td><td className="der num">{fmt(g.monto, g.moneda)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {res.gastos.length > 50 && <small>Mostrando 50 de {res.gastos.length}.</small>}
        </div>
      )}
    </Modal>
  );
}
