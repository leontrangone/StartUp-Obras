import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal, Icono, Segmentado } from './ui.jsx';
import { useStore } from '../lib/store.jsx';
import { SUGERENCIAS, COLOR_TIPO, ICONOS_RUBRO } from '../lib/catalogo.js';
import { tiposActivos } from '../lib/calc.js';
import { hoyISO, fmt, convertir, fmtTc, uid } from '../lib/money.js';

const vacio = (obra, ajustes, ultimo) => ({
  fecha: ultimo?.fecha || hoyISO(),
  rubroId: ultimo?.rubroId || obra.rubros[0]?.id || '',
  concepto: '',
  descripcion: '',
  proveedor: '',
  monto: '',
  moneda: ultimo?.moneda || 'ARS',
  tc: ajustes.tc,
  tipo: ultimo?.tipo || 'A',
});

// Permite escribir montos como "1.250.000,50" o "1250000.5"
function parseMonto(txt) {
  if (typeof txt === 'number') return txt;
  const s = String(txt).trim().replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.'));
  const puntos = (s.match(/\./g) || []).length;
  if (puntos > 1 || /\.\d{3}$/.test(s)) return Number(s.replace(/\./g, ''));
  return Number(s);
}
const mostrarMonto = (n) => (n === '' || n == null ? '' : new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(n));

export function GastoModal({ abierto, obra, gasto, onCerrar }) {
  const { ajustes, agregarGasto, editarGasto, editarObra, avisar } = useStore();
  const editando = Boolean(gasto);
  const ultimo = useRef(null);
  const [f, setF] = useState(() => vacio(obra, ajustes));
  const [montoTxt, setMontoTxt] = useState('');
  const [error, setError] = useState('');
  const [mas, setMas] = useState(false);
  const montoRef = useRef(null);
  const [nuevoRubro, setNuevoRubro] = useState({ abierto: false });

  // Crea un rubro nuevo en la obra y lo deja elegido para este gasto
  function crearRubro() {
    const nombre = (nuevoRubro.nombre || '').trim();
    if (!nombre) return setError('Escribí el nombre del rubro nuevo.');
    const existe = obra.rubros.find((r) => r.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) {
      set('rubroId')(existe.id);
    } else {
      const id = 'r' + uid();
      editarObra(obra.id, { rubros: [...obra.rubros, { id, nombre, icono: nuevoRubro.icono || 'Hammer' }] });
      set('rubroId')(id);
      avisar(`Rubro "${nombre}" agregado`);
    }
    setError('');
    setNuevoRubro({ abierto: false });
    setTimeout(() => document.getElementById('g-concepto')?.focus(), 20);
  }

  useEffect(() => {
    if (!abierto) return;
    if (gasto) {
      setF({ ...gasto });
      setMontoTxt(mostrarMonto(gasto.monto));
      setMas(Boolean(gasto.descripcion || gasto.proveedor));
    } else {
      setF(vacio(obra, ajustes, ultimo.current));
      setMontoTxt('');
      setMas(false);
    }
    setError('');
    setNuevoRubro({ abierto: false });
  }, [abierto, gasto, ajustes]);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const tipos = tiposActivos(obra);
  const sugerencias = useMemo(() => SUGERENCIAS[f.rubroId] || [], [f.rubroId]);
  const montoNum = parseMonto(montoTxt);
  const otraMoneda = f.moneda === 'ARS' ? 'USD' : 'ARS';

  function guardar(otro) {
    const monto = parseMonto(montoTxt);
    if (!f.rubroId) return setError('Elegí un rubro.');
    if (!f.concepto.trim()) return setError('Escribí qué se pagó (por ejemplo: "Hormigón elaborado").');
    if (!monto || monto <= 0) return setError('Ingresá un monto mayor a cero.');
    if (!f.fecha) return setError('Elegí la fecha.');
    const datos = { ...f, monto, tc: Number(f.tc) || ajustes.tc, concepto: f.concepto.trim(), obraId: obra.id };
    if (editando) {
      editarGasto(gasto.id, datos);
      avisar('Gasto actualizado');
      onCerrar();
      return;
    }
    agregarGasto(datos);
    ultimo.current = datos;
    avisar(`Gasto cargado: ${fmt(monto, f.moneda)}`);
    if (otro) {
      setF((x) => ({ ...x, concepto: '', descripcion: '', proveedor: '' }));
      setMontoTxt('');
      setError('');
      setTimeout(() => document.getElementById('g-concepto')?.focus(), 20);
    } else onCerrar();
  }

  const pie = (
    <>
      <span className="pie__ayuda"><kbd>Enter</kbd> para guardar</span>
      <div className="pie__btns">
        {!editando && <button className="btn btn--sec" onClick={() => guardar(true)}>Guardar y cargar otro</button>}
        <button className="btn btn--pri" onClick={() => guardar(false)}>{editando ? 'Guardar cambios' : 'Guardar gasto'}</button>
      </div>
    </>
  );

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={editando ? 'Editar gasto' : 'Cargar gasto'} subtitulo={obra.nombre} pie={pie} ancho={620}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); guardar(false); }}>
        <div className="campo">
          <label>Rubro</label>
          <div className="rubros-pick">
            {obra.rubros.map((r) => (
              <button type="button" key={r.id} className={f.rubroId === r.id ? 'on' : ''} onClick={() => set('rubroId')(r.id)}>
                <Icono nombre={r.icono} size={18} />
                <span>{r.nombre}</span>
              </button>
            ))}
            {!nuevoRubro.abierto && (
              <button type="button" className="rubro-agregar" onClick={() => setNuevoRubro({ abierto: true, nombre: '', icono: 'Hammer' })}>
                <span className="rubro-agregar__mas"><Plus size={16} strokeWidth={2.4} /></span>
                <span>Nuevo rubro</span>
              </button>
            )}
          </div>
          {nuevoRubro.abierto && (
            <div className="rubro-crear">
              <div className="rubro-crear__fila">
                <span className="rubro-crear__ico"><Icono nombre={nuevoRubro.icono} size={20} /></span>
                <input autoFocus value={nuevoRubro.nombre} placeholder="Nombre del rubro (ej: Instalación eléctrica)" aria-label="Nombre del nuevo rubro"
                  onChange={(e) => setNuevoRubro((x) => ({ ...x, nombre: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); crearRubro(); }
                    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setNuevoRubro({ abierto: false }); }
                  }} />
                <button type="button" className="btn btn--pri btn--chico" onClick={crearRubro}>Agregar</button>
                <button type="button" className="btn-icono" onClick={() => setNuevoRubro({ abierto: false })} aria-label="Cancelar"><X size={18} /></button>
              </div>
              <div className="rubro-crear__iconos" role="radiogroup" aria-label="Ícono del rubro">
                {ICONOS_RUBRO.map((i) => (
                  <button type="button" key={i} role="radio" aria-checked={nuevoRubro.icono === i} className={nuevoRubro.icono === i ? 'on' : ''}
                    onClick={() => setNuevoRubro((x) => ({ ...x, icono: i }))}><Icono nombre={i} size={17} /></button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="campo">
          <label htmlFor="g-concepto">Concepto</label>
          <input id="g-concepto" list="g-sug" value={f.concepto} onChange={set('concepto')} placeholder={sugerencias[0] ? `Ej: ${sugerencias[0]}` : 'Qué se pagó'} autoComplete="off" />
          <datalist id="g-sug">{sugerencias.map((s) => <option key={s} value={s} />)}</datalist>
          {sugerencias.length > 0 && !f.concepto && (
            <div className="sugs">
              {sugerencias.slice(0, 5).map((s) => (
                <button type="button" key={s} onClick={() => { set('concepto')(s); montoRef.current?.focus(); }}>{s}</button>
              ))}
            </div>
          )}
        </div>

        <div className="fila fila--monto">
          <div className="campo campo--grow">
            <label htmlFor="g-monto">Monto</label>
            <div className="input-monto">
              <span>{f.moneda === 'USD' ? 'US$' : '$'}</span>
              <input id="g-monto" ref={montoRef} inputMode="decimal" value={montoTxt} onChange={(e) => setMontoTxt(e.target.value)}
                onBlur={() => !isNaN(parseMonto(montoTxt)) && montoTxt && setMontoTxt(mostrarMonto(parseMonto(montoTxt)))} placeholder="0" />
            </div>
          </div>
          <div className="campo">
            <label>Moneda</label>
            <Segmentado etiqueta="Moneda" valor={f.moneda} onChange={set('moneda')} opciones={[{ valor: 'ARS', label: 'Pesos' }, { valor: 'USD', label: 'Dólares' }]} />
          </div>
        </div>
        <p className="nota-tc">
          {montoNum > 0 && <>≈ <b>{fmt(convertir(montoNum, f.moneda, otraMoneda, f.tc), otraMoneda)}</b> · </>}
          Cotización del gasto: US$ 1 = $
          <input className="input-tc" inputMode="decimal" value={f.tc} onChange={set('tc')} aria-label="Cotización del dólar para este gasto" />
          <span className="nota-tc__hint">(hoy {fmtTc(ajustes.tc)})</span>
        </p>

        <div className="fila">
          <div className="campo">
            <label htmlFor="g-fecha">Fecha</label>
            <input id="g-fecha" type="date" value={f.fecha} onChange={set('fecha')} />
          </div>
          <div className="campo campo--grow">
            <label>Tipo de costo</label>
            <Segmentado etiqueta="Tipo de costo" valor={f.tipo} onChange={set('tipo')}
              opciones={tipos.map((t) => ({ valor: t, label: obra.tipos[t].nombre, color: COLOR_TIPO[t] }))} />
            <small className="ayuda">{obra.tipos[f.tipo]?.desc}</small>
          </div>
        </div>

        {mas ? (
          <div className="fila">
            <div className="campo campo--grow">
              <label htmlFor="g-prov">Proveedor <em>opcional</em></label>
              <input id="g-prov" value={f.proveedor} onChange={set('proveedor')} placeholder="Ej: Corralón San Martín" />
            </div>
            <div className="campo campo--grow">
              <label htmlFor="g-desc">Nota <em>opcional</em></label>
              <input id="g-desc" value={f.descripcion} onChange={set('descripcion')} placeholder="Ej: 3er piso, losa" />
            </div>
          </div>
        ) : (
          <button type="button" className="link" onClick={() => setMas(true)}>+ Agregar proveedor o nota</button>
        )}

        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
