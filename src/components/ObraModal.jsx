import { useEffect, useState } from 'react';
import { Modal, Segmentado } from './ui.jsx';
import { Fachada } from './Fachada.jsx';
import { ESTADOS } from '../lib/catalogo.js';
import { useStore } from '../lib/store.jsx';

const base = { nombre: '', direccion: '', pisos: 6, unidades: 12, m2: '', presupuesto: '', presupuestoMoneda: 'USD', inicio: new Date().toISOString().slice(0, 7), estado: 'En obra' };

/** Formulario de datos de obra. Se usa para crear y en Ajustes. */
export function CamposObra({ f, set }) {
  return (
    <div className="form">
      <div className="campo">
        <label htmlFor="o-nombre">Nombre de la obra</label>
        <input id="o-nombre" value={f.nombre} onChange={set('nombre')} placeholder="Ej: Edificio Olmedo" />
      </div>
      <div className="campo">
        <label htmlFor="o-dir">Dirección</label>
        <input id="o-dir" value={f.direccion} onChange={set('direccion')} placeholder="Calle y número, barrio" />
      </div>
      <div className="fila fila--3">
        <div className="campo"><label htmlFor="o-pisos">Pisos</label><input id="o-pisos" type="number" min="1" max="60" value={f.pisos} onChange={set('pisos')} /></div>
        <div className="campo"><label htmlFor="o-uf">Unidades</label><input id="o-uf" type="number" min="0" value={f.unidades} onChange={set('unidades')} /></div>
        <div className="campo"><label htmlFor="o-m2">m² cubiertos</label><input id="o-m2" type="number" min="0" value={f.m2} onChange={set('m2')} placeholder="0" /></div>
      </div>
      <div className="fila">
        <div className="campo campo--grow">
          <label htmlFor="o-pres">Presupuesto total</label>
          <input id="o-pres" type="number" min="0" value={f.presupuesto} onChange={set('presupuesto')} placeholder="Opcional" />
        </div>
        <div className="campo">
          <label>Moneda</label>
          <Segmentado etiqueta="Moneda del presupuesto" valor={f.presupuestoMoneda} onChange={set('presupuestoMoneda')} opciones={[{ valor: 'USD', label: 'Dólares' }, { valor: 'ARS', label: 'Pesos' }]} />
        </div>
      </div>
      <div className="fila">
        <div className="campo"><label htmlFor="o-ini">Inicio</label><input id="o-ini" type="month" value={f.inicio} onChange={set('inicio')} /></div>
        <div className="campo campo--grow">
          <label>Estado</label>
          <Segmentado etiqueta="Estado" valor={f.estado} onChange={set('estado')} opciones={ESTADOS.map((e) => ({ valor: e, label: e }))} />
        </div>
      </div>
    </div>
  );
}

export function ObraModal({ abierto, onCerrar, onCreada }) {
  const { crearObra, avisar } = useStore();
  const [f, setF] = useState(base);
  const [error, setError] = useState('');
  useEffect(() => { if (abierto) { setF(base); setError(''); } }, [abierto]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));

  function crear() {
    if (!f.nombre.trim()) return setError('Ponele un nombre a la obra.');
    const id = crearObra({ ...f, nombre: f.nombre.trim(), pisos: +f.pisos || 1, unidades: +f.unidades || 0, m2: +f.m2 || 0, presupuesto: +f.presupuesto || 0 });
    avisar(`Obra "${f.nombre.trim()}" creada`);
    onCreada?.(id);
  }

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Nueva obra" subtitulo="Después podés cambiar todo desde Ajustes" ancho={640}
      pie={<><span /><div className="pie__btns"><button className="btn btn--sec" onClick={onCerrar}>Cancelar</button><button className="btn btn--pri" onClick={crear}>Crear obra</button></div></>}>
      <div className="obra-nueva">
        <div className="obra-nueva__prev"><Fachada pisos={f.pisos} estado={f.estado} avance={45} paleta={0} alto={170} id="nueva" /></div>
        <form onSubmit={(e) => { e.preventDefault(); crear(); }}>
          <CamposObra f={f} set={set} />
          {error && <p className="error">{error}</p>}
          <button type="submit" hidden />
        </form>
      </div>
    </Modal>
  );
}
