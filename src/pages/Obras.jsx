import { useMemo } from 'react';
import { Plus, MapPin, Layers, ArrowUpRight, Info } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { Fachada } from '../components/Fachada.jsx';
import { Barra } from '../components/ui.jsx';
import { resumenObra } from '../lib/calc.js';
import { COLOR_TIPO } from '../lib/catalogo.js';
import { fmt, fmtCorto, fmtPct, fmtNum, mesActual, mesDe, montoEn, fechaLinda, mesLargo } from '../lib/money.js';

function TarjetaObra({ obra, res, ultimo, moneda }) {
  const estadoCls = obra.estado === 'En obra' ? 'obra' : obra.estado === 'Terminada' ? 'fin' : 'plan';
  return (
    <a className="obra-card" href={`#/obra/${obra.id}`}>
      <div className="obra-card__ilus">
        <Fachada pisos={obra.pisos} avance={res.avance} estado={obra.estado} paleta={obra.paleta || 0} alto={150} id={obra.id} />
        <span className={`estado estado--${estadoCls}`}>{obra.estado}</span>
      </div>
      <div className="obra-card__cuerpo">
        <div className="obra-card__cab">
          <h3>{obra.nombre}</h3>
          <ArrowUpRight size={18} className="obra-card__flecha" />
        </div>
        <p className="obra-card__dir"><MapPin size={13} /> {obra.direccion || 'Sin dirección'}</p>
        <p className="obra-card__meta"><Layers size={13} /> {obra.pisos} pisos{obra.unidades ? ` · ${obra.unidades} unidades` : ''}{obra.m2 ? ` · ${fmtNum(obra.m2)} m²` : ''}</p>

        <div className="obra-card__total">
          <span>Invertido</span>
          <b className="num">{fmtCorto(res.total.total, moneda)}</b>
        </div>
        {res.presupuesto > 0 ? (
          <div className="obra-card__pres">
            <Barra pct={res.avance} exceso={res.avance > 100} />
            <div><span>{fmtPct(res.avance)} del presupuesto</span><span>{fmtCorto(res.presupuesto, moneda)}</span></div>
          </div>
        ) : <div className="obra-card__pres obra-card__pres--sin">Sin presupuesto cargado</div>}

        {res.total.total > 0 && (
          <div className="obra-card__ab" title="Reparto entre tipos de costo">
            <div className="ab-barra">
              {res.tipos.map((t) => res.pct[t] > 0 && <i key={t} style={{ width: `${res.pct[t]}%`, background: COLOR_TIPO[t] }} />)}
            </div>
            <div className="ab-leyenda">
              {res.tipos.map((t) => <span key={t}><i style={{ background: COLOR_TIPO[t] }} />{obra.tipos[t].nombre} {fmtPct(res.pct[t])}</span>)}
            </div>
          </div>
        )}
        <p className="obra-card__ult">
          {ultimo ? <>Último gasto: <b>{ultimo.concepto}</b> · {fechaLinda(ultimo.fecha)}</> : 'Todavía no hay gastos'}
        </p>
      </div>
    </a>
  );
}

export function Obras({ onNueva }) {
  const { obras, gastos, ajustes, ejemplo, borrarEjemplo, avisar } = useStore();
  const moneda = ajustes.moneda;

  const datos = useMemo(() => obras.map((o) => {
    const gs = gastos.filter((g) => g.obraId === o.id);
    const ultimo = gs.reduce((u, g) => (!u || g.fecha > u.fecha ? g : u), null);
    return { obra: o, res: resumenObra(o, gs, moneda, ajustes.tc), ultimo };
  }), [obras, gastos, moneda, ajustes.tc]);

  const mes = mesActual();
  const total = datos.reduce((s, d) => s + d.res.total.total, 0);
  const delMes = gastos.filter((g) => mesDe(g.fecha) === mes && obras.some((o) => o.id === g.obraId)).reduce((s, g) => s + montoEn(g, moneda), 0);
  const enObra = obras.filter((o) => o.estado === 'En obra').length;

  return (
    <div className="pagina">
      {ejemplo && (
        <div className="aviso-ejemplo">
          <Info size={18} />
          <p><b>Estás viendo obras de ejemplo.</b> Recorré la app con estos datos y, cuando quieras, empezá con las tuyas.</p>
          <button className="btn btn--sec btn--chico" onClick={() => { if (confirm('¿Borrar las obras de ejemplo y empezar de cero?')) { borrarEjemplo(); avisar('Listo, a cargar tus obras'); } }}>Empezar de cero</button>
        </div>
      )}

      <section className="hero">
        <div>
          <p className="sobretitulo">Panel general</p>
          <h1>Tus obras</h1>
        </div>
        <button className="btn btn--pri" onClick={onNueva}><Plus size={18} /> Nueva obra</button>
      </section>

      <section className="kpis kpis--4">
        <div className="kpi kpi--destacado">
          <span className="kpi__lbl">Invertido en todas las obras</span>
          <b className="kpi__val num">{fmtCorto(total, moneda)}</b>
          <span className="kpi__sub num">{fmt(total, moneda)}</span>
        </div>
        <div className="kpi">
          <span className="kpi__lbl">Gastado en {mesLargo(mes).toLowerCase()}</span>
          <b className="kpi__val num">{fmtCorto(delMes, moneda)}</b>
          <span className="kpi__sub">entre todas las obras</span>
        </div>
        <div className="kpi">
          <span className="kpi__lbl">Obras</span>
          <b className="kpi__val num">{obras.length}</b>
          <span className="kpi__sub">{enObra} en construcción</span>
        </div>
        <div className="kpi">
          <span className="kpi__lbl">Gastos cargados</span>
          <b className="kpi__val num">{fmtNum(gastos.length)}</b>
          <span className="kpi__sub">registrados en total</span>
        </div>
      </section>

      <section className="grilla-obras">
        {datos.map((d) => <TarjetaObra key={d.obra.id} {...d} moneda={moneda} />)}
        <button className="obra-card obra-card--nueva" onClick={onNueva}>
          <div className="nueva__plano">
            <svg viewBox="0 0 120 90" width="120" aria-hidden="true">
              <path d="M20 80V30h50v50M70 80V45h30v35M10 80h100" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 3" />
              <path d="M32 40h8v8h-8zM50 40h8v8h-8zM32 58h8v8h-8zM50 58h8v8h-8zM80 55h10v8H80z" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
          <span className="nueva__mas"><Plus size={20} /></span>
          <b>Agregar una obra</b>
          <span>Edificio, casa, PH, local…</span>
        </button>
      </section>
    </div>
  );
}
