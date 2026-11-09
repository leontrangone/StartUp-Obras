import { useMemo, useRef, useState, useEffect } from 'react';
import { Plus, FileSpreadsheet, FileDown, Upload, ChevronDown, MapPin, LayoutGrid, ListFilter, ChartColumn, Settings2 } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { resumenObra } from '../lib/calc.js';
import { Fachada } from '../components/Fachada.jsx';
import { GastoModal } from '../components/GastoModal.jsx';
import { ImportarModal } from '../components/ImportarModal.jsx';
import { TabResumen } from './obra/TabResumen.jsx';
import { TabGastos } from './obra/TabGastos.jsx';
import { TabAnalisis } from './obra/TabAnalisis.jsx';
import { TabAjustes } from './obra/TabAjustes.jsx';
import { fmtNum } from '../lib/money.js';

const TABS = [
  { id: 'resumen', label: 'Resumen', icono: LayoutGrid },
  { id: 'gastos', label: 'Gastos', icono: ListFilter },
  { id: 'analisis', label: 'Análisis', icono: ChartColumn },
  { id: 'ajustes', label: 'Ajustes', icono: Settings2 },
];

function MenuExportar({ onExcel, onPdf, onImportar, ocupado }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const cerrar = (e) => !ref.current?.contains(e.target) && setAbierto(false);
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);
  const elegir = (fn) => () => { setAbierto(false); fn(); };
  return (
    <div className="menu-exp" ref={ref}>
      <button className="btn btn--sec" onClick={() => setAbierto((a) => !a)} disabled={ocupado} aria-expanded={abierto}>
        {ocupado ? 'Generando…' : <>Exportar <ChevronDown size={16} /></>}
      </button>
      {abierto && (
        <div className="menu-exp__lista" role="menu">
          <button role="menuitem" onClick={elegir(onExcel)}>
            <span className="menu-exp__ico menu-exp__ico--xls"><FileSpreadsheet size={18} /></span>
            <span><b>Planilla de Excel</b><small>Resumen A+B, todos los gastos y mes por mes</small></span>
          </button>
          <button role="menuitem" onClick={elegir(onPdf)}>
            <span className="menu-exp__ico menu-exp__ico--pdf"><FileDown size={18} /></span>
            <span><b>Informe PDF</b><small>Resumen con gráficos para presentar en una reunión</small></span>
          </button>
          <hr />
          <button role="menuitem" onClick={elegir(onImportar)}>
            <span className="menu-exp__ico"><Upload size={18} /></span>
            <span><b>Importar gastos desde Excel</b><small>Traé muchos gastos de una vez</small></span>
          </button>
        </div>
      )}
    </div>
  );
}

export function ObraDetalle({ obra, tab }) {
  const { gastos: todos, ajustes, avisar } = useStore();
  const moneda = ajustes.moneda;
  const gastos = useMemo(() => todos.filter((g) => g.obraId === obra.id), [todos, obra.id]);
  const res = useMemo(() => resumenObra(obra, gastos, moneda, ajustes.tc), [obra, gastos, moneda, ajustes.tc]);
  const [modal, setModal] = useState({ abierto: false, gasto: null });
  const [importar, setImportar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const actual = TABS.some((t) => t.id === tab) ? tab : 'resumen';

  const nuevo = () => setModal({ abierto: true, gasto: null });
  const editar = (g) => setModal({ abierto: true, gasto: g });

  // Atajo de teclado: "N" para cargar gasto
  useEffect(() => {
    const on = (e) => {
      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !document.querySelector('.modal')) {
        e.preventDefault(); nuevo();
      }
    };
    document.addEventListener('keydown', on);
    return () => document.removeEventListener('keydown', on);
  }, []);

  async function exportar(tipo) {
    if (!gastos.length) return avisar('Esta obra todavía no tiene gastos para exportar', { tipo: 'error' });
    setOcupado(true);
    try {
      if (tipo === 'excel') {
        const { exportarExcel } = await import('../lib/exportExcel.js');
        await exportarExcel(obra, gastos, moneda, ajustes.tc);
        avisar('Planilla de Excel descargada');
      } else {
        const { exportarPdf } = await import('../lib/exportPdf.js');
        await exportarPdf(obra, gastos, moneda, ajustes.tc);
        avisar('Informe PDF descargado');
      }
    } catch (e) {
      console.error(e);
      avisar('No se pudo generar el archivo', { tipo: 'error' });
    } finally { setOcupado(false); }
  }

  const estadoCls = obra.estado === 'En obra' ? 'obra' : obra.estado === 'Terminada' ? 'fin' : 'plan';

  return (
    <div className="pagina">
      <section className="obra-cab">
        <div className="obra-cab__ilus"><Fachada pisos={obra.pisos} avance={res.avance} estado={obra.estado} paleta={obra.paleta || 0} alto={96} id={`cab-${obra.id}`} /></div>
        <div className="obra-cab__info">
          <span className={`estado estado--${estadoCls}`}>{obra.estado}</span>
          <h1>{obra.nombre}</h1>
          <p><MapPin size={14} /> {obra.direccion || 'Sin dirección'} <span className="sep">·</span> {obra.pisos} pisos{obra.unidades ? ` · ${obra.unidades} unidades` : ''}{obra.m2 ? ` · ${fmtNum(obra.m2)} m²` : ''}</p>
        </div>
        <div className="obra-cab__acc">
          <MenuExportar ocupado={ocupado} onExcel={() => exportar('excel')} onPdf={() => exportar('pdf')} onImportar={() => setImportar(true)} />
          <button className="btn btn--pri" onClick={nuevo} title="Atajo: tecla N"><Plus size={18} /> Cargar gasto</button>
        </div>
      </section>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <a key={t.id} role="tab" aria-selected={actual === t.id} className={actual === t.id ? 'on' : ''} href={`#/obra/${obra.id}/${t.id}`}>
            <t.icono size={16} /> {t.label}
            {t.id === 'gastos' && <span className="tabs__n">{gastos.length}</span>}
          </a>
        ))}
      </nav>

      {actual === 'resumen' && <TabResumen obra={obra} gastos={gastos} res={res} moneda={moneda} onNuevo={nuevo} onEditar={editar} />}
      {actual === 'gastos' && <TabGastos obra={obra} gastos={gastos} moneda={moneda} onNuevo={nuevo} onEditar={editar} onImportar={() => setImportar(true)} />}
      {actual === 'analisis' && <TabAnalisis obra={obra} gastos={gastos} res={res} moneda={moneda} onNuevo={nuevo} />}
      {actual === 'ajustes' && <TabAjustes obra={obra} gastos={gastos} />}

      <button className="fab" onClick={nuevo} aria-label="Cargar gasto"><Plus size={26} /></button>
      <GastoModal abierto={modal.abierto} gasto={modal.gasto} obra={obra} onCerrar={() => setModal({ abierto: false, gasto: null })} />
      <ImportarModal abierto={importar} obra={obra} onCerrar={() => setImportar(false)} />
    </div>
  );
}
