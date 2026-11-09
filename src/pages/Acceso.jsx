import { useState } from 'react';
import { Eye, EyeOff, ArrowRight, LoaderCircle, ChartLine, FileSpreadsheet, Building2 } from 'lucide-react';
import { useSesion } from '../lib/sesion.jsx';
import { Marca, NOMBRE_APP } from '../components/Marca.jsx';
import { Fachada } from '../components/Fachada.jsx';

function CampoPass({ id, valor, onChange, autoComplete, placeholder }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="input-pass">
      <input id={id} type={ver ? 'text' : 'password'} value={valor} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} />
      <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
        {ver ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function fuerza(p) {
  let n = 0;
  if (p.length >= 8) n++;
  if (p.length >= 12) n++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
  if (/\d/.test(p)) n++;
  if (/[^A-Za-z0-9]/.test(p)) n++;
  return Math.min(4, n);
}
const NIVELES = ['Muy corta', 'Débil', 'Aceptable', 'Buena', 'Muy buena'];

export function Acceso() {
  const { ingresar, registrarse, aviso } = useSesion();
  const [modo, setModo] = useState('ingresar');
  const [f, setF] = useState({ identificador: '', usuario: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const nuevo = modo === 'registro';
  const nivel = fuerza(f.password);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    if (nuevo) {
      if (!/^[A-Za-z0-9._-]{3,30}$/.test(f.usuario.trim())) return setError('El usuario va de 3 a 30 caracteres, sin espacios (letras, números, punto o guion).');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) return setError('Revisá el email.');
      if (f.password.length < 8) return setError('La contraseña tiene que tener al menos 8 caracteres.');
    } else if (!f.identificador.trim() || !f.password) return setError('Completá usuario (o email) y contraseña.');

    setEnviando(true);
    try {
      if (nuevo) await registrarse({ usuario: f.usuario.trim(), email: f.email.trim(), password: f.password });
      else await ingresar(f.identificador.trim(), f.password);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  function cambiar(m) { setModo(m); setError(''); setF((x) => ({ ...x, password: '' })); }

  return (
    <div className="acceso">
      <aside className="acceso__lado">
        <Marca claro />
        <div className="acceso__titular">
          <p className="sobretitulo">Gestión de costos para constructores</p>
          <h1>Cada peso de la obra, <span>en su lugar.</span></h1>
          <ul>
            <li><Building2 size={18} /> Todas tus obras en un solo panel</li>
            <li><ChartLine size={18} /> Gráficos y tabla A + B que se arman solos</li>
            <li><FileSpreadsheet size={18} /> Excel y PDF listos para la reunión</li>
          </ul>
        </div>
        <div className="acceso__skyline" aria-hidden="true">
          <div><Fachada pisos={4} estado="Terminada" paleta={2} alto="100%" id="s1" /></div>
          <div><Fachada pisos={11} estado="En obra" avance={62} paleta={0} alto="100%" id="s2" /></div>
          <div><Fachada pisos={7} estado="Planificación" paleta={1} alto="100%" id="s3" /></div>
        </div>
      </aside>

      <main className="acceso__main">
        <div className="acceso__movil"><Marca /></div>
        <div className="acceso__caja">
          <div className="acceso__tabs" role="tablist">
            <button role="tab" aria-selected={!nuevo} className={!nuevo ? 'on' : ''} onClick={() => cambiar('ingresar')}>Ingresar</button>
            <button role="tab" aria-selected={nuevo} className={nuevo ? 'on' : ''} onClick={() => cambiar('registro')}>Crear cuenta</button>
          </div>

          <h2>{nuevo ? 'Creá tu cuenta' : 'Hola de nuevo'}</h2>
          <p className="acceso__sub">{nuevo ? `Tus obras quedan guardadas en la nube y las ves desde cualquier dispositivo.` : `Ingresá con tu usuario o tu email.`}</p>

          {aviso && !error && <p className="acceso__aviso">{aviso}</p>}

          <form className="form" onSubmit={enviar} noValidate>
            {nuevo ? (
              <>
                <div className="campo">
                  <label htmlFor="a-usuario">Usuario</label>
                  <input id="a-usuario" value={f.usuario} onChange={set('usuario')} autoComplete="username" placeholder="Ej: constructora.perez" autoFocus />
                </div>
                <div className="campo">
                  <label htmlFor="a-email">Email</label>
                  <input id="a-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" placeholder="nombre@empresa.com" />
                </div>
                <div className="campo">
                  <label htmlFor="a-pass">Contraseña</label>
                  <CampoPass id="a-pass" valor={f.password} onChange={set('password')} autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
                  {f.password && (
                    <div className={`fuerza fuerza--${nivel}`}>
                      <div className="fuerza__barras">{[0, 1, 2, 3].map((i) => <i key={i} className={i < nivel ? 'on' : ''} />)}</div>
                      <span>{f.password.length < 8 ? NIVELES[0] : NIVELES[nivel]}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="campo">
                  <label htmlFor="a-ident">Usuario o email</label>
                  <input id="a-ident" value={f.identificador} onChange={set('identificador')} autoComplete="username" placeholder="Tu usuario o tu email" autoFocus />
                </div>
                <div className="campo">
                  <label htmlFor="a-pass">Contraseña</label>
                  <CampoPass id="a-pass" valor={f.password} onChange={set('password')} autoComplete="current-password" placeholder="Tu contraseña" />
                </div>
              </>
            )}

            {error && <p className="error" role="alert">{error}</p>}

            <button type="submit" className="btn btn--pri btn--ancho" disabled={enviando}>
              {enviando ? <LoaderCircle size={18} className="gira" /> : <>{nuevo ? 'Crear cuenta' : 'Ingresar'} <ArrowRight size={18} /></>}
            </button>
          </form>

          <p className="acceso__cambio">
            {nuevo ? <>¿Ya tenés cuenta? <button className="link" onClick={() => cambiar('ingresar')}>Ingresá</button></>
              : <>¿Primera vez en {NOMBRE_APP}? <button className="link" onClick={() => cambiar('registro')}>Creá tu cuenta</button></>}
          </p>
        </div>
      </main>
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="cargando">
      <div className="cargando__plomada"><Marca compacto /></div>
      <p>{texto}</p>
    </div>
  );
}
