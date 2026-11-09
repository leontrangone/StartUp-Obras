import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Grafico } from '../../components/Grafico.jsx';
import { Icono, Vacio } from '../../components/ui.jsx';
import { cfgRubrosAB, cfgAcumulado } from '../../lib/graficos.js';
import { COLOR_TIPO } from '../../lib/catalogo.js';
import { fmt, fmtCorto, fmtPct, mesCorto, mesLargo } from '../../lib/money.js';

export function TabAnalisis({ obra, gastos, res, moneda, onNuevo }) {
  const cAB = useMemo(() => cfgRubrosAB(res, obra, moneda), [res, obra, moneda]);
  const cAc = useMemo(() => cfgAcumulado(res, moneda), [res, moneda]);
  const [verPct, setVerPct] = useState(false);

  if (!gastos.length) {
    return (
      <Vacio icono="ChartColumn" titulo="Sin datos para analizar" texto="Cuando cargues gastos, acá vas a ver la tabla A+B, la comparación por rubro y la evolución.">
        <button className="btn btn--pri" onClick={onNuevo}><Plus size={18} /> Cargar gasto</button>
      </Vacio>
    );
  }

  const rubros = res.rubros.filter((r) => r.total > 0);
  const maxCelda = Math.max(1, ...res.evolucion.flatMap((m) => rubros.map((r) => m.rubros[r.rubro.id] || 0)));

  return (
    <div className="tab">
      <article className="panel">
        <header className="panel__cab">
          <div>
            <h2>Representación de costos {res.tipos.join(' + ')}</h2>
            <p>La misma tabla de la planilla, pero se arma sola con cada gasto que cargás</p>
          </div>
        </header>
        <div className="tabla-scroll">
          <table className="tabla-ab">
            <thead>
              <tr>
                <th className="izq">Rubro</th>
                <th>Costo total</th>
                <th>% total</th>
                {res.tipos.map((t) => (
                  <th key={t} colSpan={2} className="th-tipo" style={{ '--c': COLOR_TIPO[t] }}>{obra.tipos[t].nombre}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rubros.map((r) => (
                <tr key={r.rubro.id}>
                  <td className="izq"><span className="td-rubro"><Icono nombre={r.rubro.icono} size={16} /> {r.rubro.nombre}</span></td>
                  <td className="num fuerte">{fmt(r.total, moneda)}</td>
                  <td className="num">
                    <span className="pct-celda"><i style={{ width: `${r.pct}%` }} />{fmtPct(r.pct)}</span>
                  </td>
                  {res.tipos.map((t) => (
                    <FragmentoTipo key={t} valor={r[t]} pct={res.total.total ? (r[t] / res.total.total) * 100 : 0} moneda={moneda} />
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="izq">Totales</td>
                <td className="num">{fmt(res.total.total, moneda)}</td>
                <td className="num">100%</td>
                {res.tipos.map((t) => <FragmentoTipo key={t} valor={res.total[t]} pct={res.pct[t]} moneda={moneda} />)}
              </tr>
            </tfoot>
          </table>
        </div>
      </article>

      <section className="grilla grilla--1-1">
        <article className="panel">
          <header className="panel__cab"><div><h2>{res.tipos.join(' / ')} en cada rubro</h2><p>Qué parte de cada rubro es de cada tipo de costo</p></div></header>
          <Grafico cfg={cAB} alto={Math.max(240, rubros.length * 40 + 60)} etiqueta="Tipos de costo por rubro" />
        </article>
        <article className="panel">
          <header className="panel__cab"><div><h2>Gasto acumulado</h2><p>{res.presupuesto ? 'Cuánto se lleva gastado contra el presupuesto' : 'Suma de todo lo gastado mes a mes'}</p></div></header>
          <Grafico cfg={cAc} alto={Math.max(240, rubros.length * 40 + 60)} etiqueta="Gasto acumulado" />
        </article>
      </section>

      <article className="panel">
        <header className="panel__cab">
          <div><h2>Mes por mes, rubro por rubro</h2><p>Cuanto más oscuro, más se gastó. Ideal para ver en qué etapa se fue cada rubro.</p></div>
          <label className="switch"><input type="checkbox" checked={verPct} onChange={(e) => setVerPct(e.target.checked)} /><span /> Ver en % del mes</label>
        </header>
        <div className="tabla-scroll">
          <table className="tabla-calor">
            <thead>
              <tr>
                <th className="izq pegado">Mes</th>
                {rubros.map((r) => <th key={r.rubro.id}>{r.rubro.nombre}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {res.evolucion.map((m) => (
                <tr key={m.mes}>
                  <td className="izq pegado" title={mesLargo(m.mes)}>{mesCorto(m.mes)}</td>
                  {rubros.map((r) => {
                    const v = m.rubros[r.rubro.id] || 0;
                    const a = v ? 0.08 + 0.82 * Math.sqrt(v / maxCelda) : 0;
                    return (
                      <td key={r.rubro.id} className="num celda" style={{ '--a': a, color: a > 0.55 ? '#fff' : undefined }}
                        title={`${r.rubro.nombre} · ${mesLargo(m.mes)}: ${fmt(v, moneda)}`}>
                        {v ? (verPct ? fmtPct((v / m.total) * 100) : fmtCorto(v, moneda).replace(/^(US)?\$ /, '')) : '·'}
                      </td>
                    );
                  })}
                  <td className="num fuerte">{fmtCorto(m.total, moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function FragmentoTipo({ valor, pct, moneda }) {
  return (
    <>
      <td className="num">{valor ? fmt(valor, moneda) : <span className="gris">—</span>}</td>
      <td className="num gris">{fmtPct(pct)}</td>
    </>
  );
}
