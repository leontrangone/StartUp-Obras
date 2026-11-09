import { useEffect, useRef } from 'react';
import {
  HardHat, BrickWall, DraftingCompass, Truck, BriefcaseBusiness, Shovel, Landmark, LandPlot, Hammer, Wrench, Zap, Droplets, PaintRoller, Ruler, Construction, Fence, Container, Lightbulb, ShieldCheck, Receipt, X, AlertTriangle, Check, Undo2, Search, ChartColumn,
} from 'lucide-react';

const L = { HardHat, BrickWall, DraftingCompass, Truck, BriefcaseBusiness, Shovel, Landmark, LandPlot, Hammer, Wrench, Zap, Droplets, PaintRoller, Ruler, Construction, Fence, Container, Lightbulb, ShieldCheck, Receipt, X, AlertTriangle, Check, Undo2, Search, ChartColumn };
import { useStore } from '../lib/store.jsx';

export function Icono({ nombre, size = 18, ...rest }) {
  const C = L[nombre] || L.Receipt;
  return <C size={size} strokeWidth={1.8} {...rest} />;
}

export function Modal({ abierto, titulo, subtitulo, onCerrar, children, pie, ancho = 560 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e) => e.key === 'Escape' && onCerrar?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector('input,select,textarea')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div className="modal__fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar?.()}>
      <div className="modal" style={{ maxWidth: ancho }} ref={ref} role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="modal__cab">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button className="btn-icono" onClick={onCerrar} aria-label="Cerrar"><L.X size={20} /></button>
        </header>
        <div className="modal__cuerpo">{children}</div>
        {pie && <footer className="modal__pie">{pie}</footer>}
      </div>
    </div>
  );
}

export function Segmentado({ opciones, valor, onChange, chico = false, etiqueta }) {
  return (
    <div className={`seg ${chico ? 'seg--chico' : ''}`} role="radiogroup" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor}
          className={valor === o.valor ? 'on' : ''} onClick={() => onChange(o.valor)}
          style={o.color && valor === o.valor ? { '--seg-c': o.color } : undefined}>
          {o.color && <i className="punto" style={{ background: o.color }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toasts() {
  const { toasts, cerrarToast } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tipo}`}>
          {t.tipo === 'error' ? <L.AlertTriangle size={18} /> : <L.Check size={18} />}
          <span>{t.texto}</span>
          {t.deshacer && (
            <button onClick={() => { t.deshacer(); cerrarToast(t.id); }}><L.Undo2 size={15} /> Deshacer</button>
          )}
        </div>
      ))}
    </div>
  );
}

export function Vacio({ icono = 'Receipt', titulo, texto, children }) {
  return (
    <div className="vacio">
      <div className="vacio__ico"><Icono nombre={icono} size={28} /></div>
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

export function Chip({ color, children }) {
  return <span className="chip" style={{ '--chip': color }}><i className="punto" style={{ background: color }} />{children}</span>;
}

export function Barra({ pct, color = 'var(--amarillo)', alto = 8, exceso }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className="barra" style={{ height: alto }}>
      <div className="barra__relleno" style={{ width: `${p}%`, background: exceso ? 'var(--rojo)' : color }} />
    </div>
  );
}
