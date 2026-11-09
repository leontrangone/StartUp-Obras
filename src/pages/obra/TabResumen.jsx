import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Plus } from 'lucide-react';
import { Grafico } from '../../components/Grafico.jsx';
import { Barra, Icono, Vacio, Chip } from '../../components/ui.jsx';
import { cfgMensual, cfgDona, cfgRubros } from '../../lib/graficos.js';
import { COLOR_TIPO } from '../../lib/catalogo.js';
import { fmt, fmtCorto, fmtPct, mesActual, mesLargo, montoEn, fechaLinda, fmtNum } from '../../lib/money.js';

export function TabResumen({ obra, gastos, res, moneda, onNuevo, onEditar }) {
  const cMes = useMemo(() => cfgMensual(res, obra, moneda), [res, obra, moneda]);
  const cDona = useMemo(() => cfgDona(res, obra, moneda), [res, obra, moneda]);
  const cRub = useMemo(() => cfgRubros(res, moneda), [res, moneda]);

  if (!gastos.length) {
    return (
      <Vacio icono="Receipt" titulo="Todavía no hay gastos en esta obra" texto="Cargá el primero y los gráficos se arman solos. También podés traer muchos de una vez desde un Excel.">
        <button className="btn btn--pri" onClick={onNuevo}><Plus size={18} /> Cargar el primer gasto</button>
      </Vacio>
    );
  }

  const ev = res.evolucion;
  const mes = mesActual();
  const esteMes = ev.find((m) => m.mes === mes);
  const ultimoMes = esteMes || ev[ev.length - 1];
  const idx = ev.indexOf(ultimoMes);
  const anterior = idx > 0 ? ev[idx - 1] : null;
  const delta = anterior && anterior.total ? ((ultimoMes.total - anterior.total) / anterior.total) * 100 : null;
  const recientes = [...gastos].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.creado - a.creado)).slice(0, 6);
  const rubros = Object.fromEntries(obra.rubros.map((r) => [r.id, r]));
  const top = res.rubros[0];

  return (
    <div className="tab">
      <section className="kpis kpis--4">
        <div className="kpi kpi--destacado">
          <span className="kpi__lbl">Costo total de la obra</span>
          <b className="kpi__val num">{fmtCorto(res.total.total, moneda)}</b>
          <span className="kpi__sub num">{fmt(res.total.total, moneda)}</span>
        </div>
        <div className="kpi">
          <span className="kpi__lbl">Presupuesto usado</span>
          {res.presupuesto > 0 ? (
            <>
              <b className={`kpi__val num ${res.avance > 100 ? 'txt-rojo' : ''}`}>{fmtPct(res.avance)}</b>
              <Barra pct={res.avance} exceso={res.avance > 100} />
              <span className="kpi__sub">{res.restante >= 0 ? `Quedan ${fmtCorto(res.restante, moneda)}` : `Excedido en ${fmtCorto(-res.restante, moneda)}`}</span>
            </>
          ) : (<><b className="kpi__val kpi__val--gris">—</b><span className="kpi__sub">Cargalo en Ajustes</span></>)}
        </div>
        <div className="kpi">
          <span className="kpi__lbl">{esteMes ? 'Gastado este mes' : `Último mes (${mesLargo(ultimoMes.mes)})`}</span>
          <b className="kpi__val num">{fmtCorto(ultimoMes.total, moneda)}</b>
          {delta !== null ? (
            <span className={`kpi__delta ${delta > 0 ? 'sube' : 'baja'}`}>
              {delta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {fmtPct(Math.abs(delta))} vs. mes anterior
            </span>
          ) : <span className="kpi__sub">Primer mes con gastos</span>}
        </div>
        <div className="kpi">
          <span className="kpi__lbl">{obra.m2 ? 'Costo por m²' : 'Promedio mensual'}</span>
          <b className="kpi__val num">{obra.m2 ? fmtCorto(res.m2, moneda) : fmtCorto(res.promedio3, moneda)}</b>
          <span className="kpi__sub">{obra.m2 ? `${fmtNum(obra.m2)} m² cubiertos` : 'últimos 3 meses'}</span>
        </div>
      </section>

      <section className="grilla grilla--2-1">
        <article className="panel">
          <header className="panel__cab">
            <div><h2>Gasto mes a mes</h2><p>Pasá el mouse por una barra para ver el detalle</p></div>
          </header>
          <Grafico cfg={cMes} alto={300} etiqueta="Gasto por mes separado por tipo de costo" />
        </article>
        <article className="panel">
          <header className="panel__cab"><div><h2>¿Cómo se reparte?</h2><p>Por tipo de costo</p></div></header>
          <Grafico cfg={cDona} alto={300} etiqueta="Distribución por tipo de costo" />
        </article>
      </section>

      <section className="grilla grilla--1-1">
        <article className="panel">
          <header className="panel__cab">
            <div><h2>¿En qué se va la plata?</h2><p>{top && <>El rubro más pesado es <b>{top.rubro.nombre}</b> con el {fmtPct(top.pct)} del total</>}</p></div>
          </header>
          <Grafico cfg={cRub} alto={Math.max(220, res.rubros.filter((r) => r.total > 0).length * 38 + 40)} etiqueta="Costo por rubro" />
        </article>
        <article className="panel">
          <header className="panel__cab">
            <div><h2>Últimos gastos</h2><p>Tocá uno para editarlo</p></div>
            <a className="link" href={`#/obra/${obra.id}/gastos`}>Ver todos →</a>
          </header>
          <ul className="lista-gastos">
            {recientes.map((g) => {
              const r = rubros[g.rubroId];
              return (
                <li key={g.id}>
                  <button onClick={() => onEditar(g)}>
                    <span className="lista-gastos__ico"><Icono nombre={r?.icono} size={18} /></span>
                    <span className="lista-gastos__txt">
                      <b>{g.concepto}</b>
                      <small>{r?.nombre || 'Sin rubro'} · {fechaLinda(g.fecha)}{g.proveedor ? ` · ${g.proveedor}` : ''}</small>
                    </span>
                    <span className="lista-gastos__monto">
                      <b className="num">{fmt(montoEn(g, moneda), moneda)}</b>
                      <Chip color={COLOR_TIPO[g.tipo]}>{obra.tipos[g.tipo]?.nombre}</Chip>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </article>
      </section>
    </div>
  );
}
