import { useMemo, useState } from 'react';
import { Search, Pencil, Trash2, X, Plus, Upload } from 'lucide-react';
import { useStore } from '../../lib/store.jsx';
import { filtrarGastos, tiposActivos } from '../../lib/calc.js';
import { Icono, Chip, Vacio, Segmentado } from '../../components/ui.jsx';
import { COLOR_TIPO } from '../../lib/catalogo.js';
import { fmt, montoEn, mesDe, mesLargo, fechaLinda, fmtTc } from '../../lib/money.js';

export function TabGastos({ obra, gastos, moneda, onNuevo, onEditar, onImportar }) {
  const { borrarGasto, avisar } = useStore();
  const [filtro, setFiltro] = useState({ q: '', mes: '', rubro: '', tipo: '' });
  const set = (k) => (v) => setFiltro((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));
  const tipos = tiposActivos(obra);
  const rubros = Object.fromEntries(obra.rubros.map((r) => [r.id, r]));

  const meses = useMemo(() => [...new Set(gastos.map((g) => mesDe(g.fecha)))].sort().reverse(), [gastos]);
  const lista = useMemo(
    () => filtrarGastos(gastos, obra, filtro).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.creado - a.creado)),
    [gastos, obra, filtro],
  );
  const grupos = useMemo(() => {
    const m = new Map();
    for (const g of lista) {
      const k = mesDe(g.fecha);
      if (!m.has(k)) m.set(k, { mes: k, gastos: [], total: 0 });
      const gr = m.get(k);
      gr.gastos.push(g);
      gr.total += montoEn(g, moneda);
    }
    return [...m.values()];
  }, [lista, moneda]);
  const totalFiltrado = lista.reduce((s, g) => s + montoEn(g, moneda), 0);
  const hayFiltro = filtro.q || filtro.mes || filtro.rubro || filtro.tipo;

  function borrar(g) {
    const deshacer = borrarGasto(g.id);
    avisar(`Se borró "${g.concepto}"`, { deshacer });
  }

  if (!gastos.length) {
    return (
      <Vacio icono="Receipt" titulo="No hay gastos cargados" texto="Cargalos de a uno o importá una planilla de Excel con todos juntos.">
        <div className="fila-btns">
          <button className="btn btn--pri" onClick={onNuevo}><Plus size={18} /> Cargar gasto</button>
          <button className="btn btn--sec" onClick={onImportar}><Upload size={16} /> Importar Excel</button>
        </div>
      </Vacio>
    );
  }

  return (
    <div className="tab">
      <section className="filtros">
        <div className="buscador">
          <Search size={18} />
          <input value={filtro.q} onChange={set('q')} placeholder="Buscar por concepto, proveedor, rubro…" aria-label="Buscar gastos" />
          {filtro.q && <button onClick={() => set('q')('')} aria-label="Limpiar búsqueda"><X size={16} /></button>}
        </div>
        <select value={filtro.mes} onChange={set('mes')} aria-label="Filtrar por mes">
          <option value="">Todos los meses</option>
          {meses.map((m) => <option key={m} value={m}>{mesLargo(m)}</option>)}
        </select>
        <select value={filtro.rubro} onChange={set('rubro')} aria-label="Filtrar por rubro">
          <option value="">Todos los rubros</option>
          {obra.rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <Segmentado chico etiqueta="Filtrar por tipo de costo" valor={filtro.tipo} onChange={set('tipo')}
          opciones={[{ valor: '', label: 'Todos' }, ...tipos.map((t) => ({ valor: t, label: obra.tipos[t].nombre, color: COLOR_TIPO[t] }))]} />
      </section>

      <div className="resultado">
        <span><b>{lista.length}</b> {lista.length === 1 ? 'gasto' : 'gastos'}{hayFiltro ? ' encontrados' : ''}</span>
        <span className="resultado__total">Total: <b className="num">{fmt(totalFiltrado, moneda)}</b></span>
        {hayFiltro && <button className="link" onClick={() => setFiltro({ q: '', mes: '', rubro: '', tipo: '' })}>Limpiar filtros</button>}
      </div>

      {!lista.length ? (
        <Vacio icono="Search" titulo="No encontramos gastos con esos filtros" texto="Probá con otra palabra o sacá algún filtro." />
      ) : (
        <div className="tabla-gastos">
          <div className="tg-fila tg-enc" aria-hidden="true">
            <span>Fecha</span><span>Rubro</span><span>Concepto</span><span>Tipo</span><span className="der">Monto</span><span />
          </div>
          {grupos.map((gr) => (
            <section key={gr.mes} className="tg-grupo">
              <header className="tg-mes">
                <b>{mesLargo(gr.mes)}</b>
                <span>{gr.gastos.length} {gr.gastos.length === 1 ? 'gasto' : 'gastos'} · <b className="num">{fmt(gr.total, moneda)}</b></span>
              </header>
              {gr.gastos.map((g) => {
                const r = rubros[g.rubroId];
                const v = montoEn(g, moneda);
                return (
                  <div key={g.id} className="tg-fila" onDoubleClick={() => onEditar(g)}>
                    <span className="tg-fecha">{fechaLinda(g.fecha)}</span>
                    <span className="tg-rubro"><Icono nombre={r?.icono} size={16} /> {r?.nombre || 'Sin rubro'}</span>
                    <span className="tg-concepto">
                      <b>{g.concepto}</b>
                      {(g.proveedor || g.descripcion) && <small>{[g.proveedor, g.descripcion].filter(Boolean).join(' · ')}</small>}
                    </span>
                    <span className="tg-tipo"><Chip color={COLOR_TIPO[g.tipo]}>{obra.tipos[g.tipo]?.nombre}</Chip></span>
                    <span className="tg-monto der">
                      <b className="num">{fmt(v, moneda)}</b>
                      {g.moneda !== moneda && <small className="num" title={`Cotización: $ ${fmtTc(g.tc)}`}>{fmt(g.monto, g.moneda)}</small>}
                    </span>
                    <span className="tg-acc">
                      <button className="btn-icono" onClick={() => onEditar(g)} aria-label="Editar"><Pencil size={16} /></button>
                      <button className="btn-icono btn-icono--peligro" onClick={() => borrar(g)} aria-label="Borrar"><Trash2 size={16} /></button>
                    </span>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
