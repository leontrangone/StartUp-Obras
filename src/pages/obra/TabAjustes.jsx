import { useEffect, useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { useStore } from '../../lib/store.jsx';
import { CamposObra } from '../../components/ObraModal.jsx';
import { Icono } from '../../components/ui.jsx';
import { COLOR_TIPO, ICONOS_RUBRO } from '../../lib/catalogo.js';
import { uid } from '../../lib/money.js';

export function TabAjustes({ obra, gastos }) {
  const { editarObra, borrarObra, avisar } = useStore();
  const [f, setF] = useState(obra);
  const [iconoAbierto, setIconoAbierto] = useState(null);
  const [nuevoRubro, setNuevoRubro] = useState('');
  useEffect(() => setF(obra), [obra]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const cambios = JSON.stringify(f) !== JSON.stringify(obra);
  const usados = new Set(gastos.map((g) => g.rubroId));

  function guardar() {
    if (!f.nombre.trim()) return avisar('La obra necesita un nombre', { tipo: 'error' });
    editarObra(obra.id, { ...f, pisos: +f.pisos || 1, unidades: +f.unidades || 0, m2: +f.m2 || 0, presupuesto: +f.presupuesto || 0 });
    avisar('Cambios guardados');
  }
  const setRubro = (id, campos) => setF((x) => ({ ...x, rubros: x.rubros.map((r) => (r.id === id ? { ...r, ...campos } : r)) }));
  const setTipo = (t, campos) => setF((x) => ({ ...x, tipos: { ...x.tipos, [t]: { ...x.tipos[t], ...campos } } }));
  const usadosC = gastos.some((g) => g.tipo === 'C');

  return (
    <div className="tab ajustes">
      <article className="panel">
        <header className="panel__cab"><div><h2>Datos de la obra</h2></div></header>
        <CamposObra f={f} set={set} />
      </article>

      <article className="panel">
        <header className="panel__cab"><div><h2>Tipos de costo</h2><p>Ponele el nombre que uses en la obra (por ejemplo: "Con factura" y "Sin factura")</p></div></header>
        <div className="tipos-edit">
          {['A', 'B', 'C'].map((t) => {
            const activo = t !== 'C' || f.usarC;
            return (
              <div key={t} className={`tipo-edit ${activo ? '' : 'off'}`} style={{ '--c': COLOR_TIPO[t] }}>
                <span className="tipo-edit__letra">{t}</span>
                <input value={f.tipos[t].nombre} onChange={(e) => setTipo(t, { nombre: e.target.value })} disabled={!activo} aria-label={`Nombre del tipo ${t}`} />
                <input value={f.tipos[t].desc} onChange={(e) => setTipo(t, { desc: e.target.value })} disabled={!activo} placeholder="Descripción" aria-label={`Descripción del tipo ${t}`} />
                {t === 'C' && (
                  <label className="switch">
                    <input type="checkbox" checked={f.usarC} disabled={usadosC && f.usarC} onChange={(e) => set('usarC')(e.target.checked)} />
                    <span /> {f.usarC ? 'Activo' : 'Usar costo C'}
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </article>

      <article className="panel">
        <header className="panel__cab"><div><h2>Rubros</h2><p>Cambiá nombres e íconos o sumá los tuyos. Los rubros con gastos no se pueden borrar.</p></div></header>
        <ul className="rubros-edit">
          {f.rubros.map((r) => (
            <li key={r.id}>
              <div className="rubros-edit__ico-wrap">
                <button className="rubros-edit__ico" onClick={() => setIconoAbierto(iconoAbierto === r.id ? null : r.id)} aria-label="Cambiar ícono"><Icono nombre={r.icono} size={18} /></button>
                {iconoAbierto === r.id && (
                  <div className="iconos-pop">
                    {ICONOS_RUBRO.map((i) => (
                      <button key={i} className={r.icono === i ? 'on' : ''} onClick={() => { setRubro(r.id, { icono: i }); setIconoAbierto(null); }}><Icono nombre={i} size={18} /></button>
                    ))}
                  </div>
                )}
              </div>
              <input value={r.nombre} onChange={(e) => setRubro(r.id, { nombre: e.target.value })} aria-label="Nombre del rubro" />
              <span className="rubros-edit__n">{(() => { const n = gastos.filter((g) => g.rubroId === r.id).length; return `${n} ${n === 1 ? 'gasto' : 'gastos'}`; })()}</span>
              <button className="btn-icono btn-icono--peligro" disabled={usados.has(r.id)} title={usados.has(r.id) ? 'Tiene gastos cargados' : 'Borrar rubro'}
                onClick={() => setF((x) => ({ ...x, rubros: x.rubros.filter((y) => y.id !== r.id) }))} aria-label="Borrar rubro"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
        <form className="rubro-nuevo" onSubmit={(e) => { e.preventDefault(); if (!nuevoRubro.trim()) return; setF((x) => ({ ...x, rubros: [...x.rubros, { id: 'r' + uid(), nombre: nuevoRubro.trim(), icono: 'Hammer' }] })); setNuevoRubro(''); }}>
          <input value={nuevoRubro} onChange={(e) => setNuevoRubro(e.target.value)} placeholder="Nuevo rubro (ej: Instalación eléctrica)" />
          <button className="btn btn--sec" type="submit"><Plus size={16} /> Agregar</button>
        </form>
      </article>

      <article className="panel panel--peligro">
        <div>
          <h2>Borrar esta obra</h2>
          <p>Se borran la obra y sus {gastos.length} gastos. No se puede deshacer.</p>
        </div>
        <button className="btn btn--peligro" onClick={() => {
          if (confirm(`¿Seguro que querés borrar "${obra.nombre}" y todos sus gastos?`)) { borrarObra(obra.id); avisar('Obra borrada'); window.location.hash = '/'; }
        }}><Trash2 size={16} /> Borrar obra</button>
      </article>

      <div className={`barra-guardar ${cambios ? 'visible' : ''}`}>
        <span>Tenés cambios sin guardar</span>
        <button className="btn btn--sec btn--chico" onClick={() => setF(obra)}>Descartar</button>
        <button className="btn btn--pri btn--chico" onClick={guardar}><Check size={16} /> Guardar cambios</button>
      </div>
    </div>
  );
}
