import { useEffect, useState } from 'react';
import { Building2, Menu, X, RefreshCw, Database, Plus, LogOut, Cloud, CloudUpload } from 'lucide-react';
import { useSesion } from './lib/sesion.jsx';
import { Cargando } from './pages/Acceso.jsx';
import { useStore } from './lib/store.jsx';
import { Marca } from './components/Marca.jsx';
import { Segmentado, Toasts } from './components/ui.jsx';
import { DatosModal } from './components/DatosModal.jsx';
import { ObraModal } from './components/ObraModal.jsx';
import { Obras } from './pages/Obras.jsx';
import { ObraDetalle } from './pages/ObraDetalle.jsx';
import { traerCotizacion, FUENTES } from './lib/dolar.js';
import { fmtTc, fechaLinda } from './lib/money.js';

// Navegación simple con el "#" de la URL: #/  ·  #/obra/<id>/<pestaña>
function leerRuta() {
  const p = window.location.hash.replace(/^#\/?/, '').split('/');
  if (p[0] === 'obra' && p[1]) return { vista: 'obra', id: p[1], tab: p[2] || 'resumen' };
  return { vista: 'obras' };
}
export const ir = (ruta) => { window.location.hash = ruta; };

function Cotizacion() {
  const { ajustes, setCotizacion, avisar } = useStore();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(ajustes.tc);
  const [cargando, setCargando] = useState(false);
  const [fuente, setFuente] = useState(ajustes.tcFuente === 'manual' ? 'blue' : ajustes.tcFuente);

  async function actualizar() {
    setCargando(true);
    try {
      const d = await traerCotizacion(fuente);
      setCotizacion(d.venta, fuente);
      avisar(`Dólar ${FUENTES[fuente]} actualizado: $ ${fmtTc(d.venta)}`);
    } catch {
      avisar('No se pudo traer la cotización. Podés escribirla a mano.', { tipo: 'error' });
    } finally { setCargando(false); }
  }

  return (
    <div className="cotiz">
      <div className="cotiz__cab">
        <span>Dólar de referencia</span>
        <span className="cotiz__fuente">{ajustes.tcFuente === 'manual' ? 'Manual' : FUENTES[ajustes.tcFuente]}</span>
      </div>
      {editando ? (
        <form className="cotiz__edit" onSubmit={(e) => { e.preventDefault(); setCotizacion(valor, 'manual'); setEditando(false); avisar('Cotización actualizada'); }}>
          <span>$</span>
          <input autoFocus inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value.replace(',', '.'))} aria-label="Cotización manual" />
          <button type="submit">OK</button>
        </form>
      ) : (
        <button className="cotiz__valor" onClick={() => { setValor(ajustes.tc); setEditando(true); }} title="Tocá para escribirla a mano">
          <small>US$ 1 =</small> $ {fmtTc(ajustes.tc)}
        </button>
      )}
      <div className="cotiz__acciones">
        <select value={fuente} onChange={(e) => setFuente(e.target.value)} aria-label="Tipo de dólar">
          {Object.entries(FUENTES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={actualizar} disabled={cargando}><RefreshCw size={13} className={cargando ? 'gira' : ''} /> Actualizar</button>
      </div>
      <small className="cotiz__fecha">Actualizado {fechaLinda(ajustes.tcFecha)}</small>
    </div>
  );
}

export default function App() {
  const store = useStore();
  const { obras, ajustes, setMoneda, estado, guardando, recargar } = store;
  const { usuario, salir } = useSesion();
  const [ruta, setRuta] = useState(leerRuta);
  const [menu, setMenu] = useState(false);
  const [datosAbierto, setDatosAbierto] = useState(false);
  const [nuevaObra, setNuevaObra] = useState(false);

  useEffect(() => {
    const on = () => { setRuta(leerRuta()); setMenu(false); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const obra = ruta.vista === 'obra' ? obras.find((o) => o.id === ruta.id) : null;
  useEffect(() => { if (estado === 'listo' && ruta.vista === 'obra' && !obra) ir('/'); }, [estado, ruta, obra]);
  useEffect(() => { document.title = obra ? `${obra.nombre} · Plomada` : 'Plomada · Costos de obra'; }, [obra]);

  return (
    <div className={`app ${menu ? 'app--menu' : ''}`}>
      <aside className="lateral">
        <div className="lateral__top">
          <a href="#/" className="lateral__marca"><Marca claro /></a>
          <button className="btn-icono lateral__cerrar" onClick={() => setMenu(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>
        <nav className="lateral__nav">
          <a href="#/" className={ruta.vista === 'obras' ? 'on' : ''}><Building2 size={18} /> Todas las obras</a>
          <div className="lateral__titulo">
            <span>Obras</span>
            <button onClick={() => setNuevaObra(true)} aria-label="Nueva obra"><Plus size={15} /></button>
          </div>
          {obras.map((o) => (
            <a key={o.id} href={`#/obra/${o.id}`} className={obra?.id === o.id ? 'on' : ''}>
              <i className={`estado-punto estado-punto--${o.estado === 'En obra' ? 'obra' : o.estado === 'Terminada' ? 'fin' : 'plan'}`} />
              <span className="trunc">{o.nombre}</span>
            </a>
          ))}
        </nav>
        <div className="lateral__pie">
          <Cotizacion />
          <button className="lateral__datos" onClick={() => setDatosAbierto(true)}><Database size={15} /> Copia de seguridad y datos</button>
          <div className="cuenta">
            <span className="cuenta__avatar" aria-hidden="true">{usuario.usuario.slice(0, 1).toUpperCase()}</span>
            <span className="cuenta__txt"><b className="trunc">{usuario.usuario}</b><small className="trunc">{usuario.email}</small></span>
            <button className="cuenta__salir" onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
      <div className="lateral__velo" onClick={() => setMenu(false)} />

      <main className="principal">
        <header className="barra-sup">
          <button className="btn-icono barra-sup__menu" onClick={() => setMenu(true)} aria-label="Abrir menú"><Menu size={22} /></button>
          <div className="barra-sup__marca-movil"><Marca compacto /></div>
          <div className="barra-sup__miga">
            {obra ? <><a href="#/">Obras</a><span>/</span><b>{obra.nombre}</b></> : <b>Panel de obras</b>}
          </div>
          <div className="barra-sup__der">
            <span className={`guardado ${guardando ? 'guardado--activo' : ''}`} title="Tus datos se guardan en la nube">
              {guardando ? <><CloudUpload size={16} /> Guardando…</> : <><Cloud size={16} /> Guardado</>}
            </span>
            <span className="barra-sup__lbl">Ver en</span>
            <Segmentado chico etiqueta="Moneda" valor={ajustes.moneda} onChange={setMoneda}
              opciones={[{ valor: 'ARS', label: '$ Pesos' }, { valor: 'USD', label: 'US$ Dólares' }]} />
          </div>
        </header>

        {estado === 'cargando' ? <Cargando texto="Trayendo tus obras…" />
          : estado === 'error' ? (
            <div className="pagina"><div className="vacio"><h3>No pudimos conectarnos con la base de datos</h3><p>Revisá tu conexión a internet y probá de nuevo.</p><button className="btn btn--pri" onClick={recargar}><RefreshCw size={16} /> Reintentar</button></div></div>
          ) : obra
            ? <ObraDetalle key={obra.id} obra={obra} tab={ruta.tab} />
            : <Obras onNueva={() => setNuevaObra(true)} />}
      </main>

      <ObraModal abierto={nuevaObra} onCerrar={() => setNuevaObra(false)} onCreada={(id) => { setNuevaObra(false); ir(`/obra/${id}`); }} />
      <DatosModal abierto={datosAbierto} onCerrar={() => setDatosAbierto(false)} />
      <Toasts />
    </div>
  );
}
