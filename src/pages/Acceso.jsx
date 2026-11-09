import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, ArrowRight, ArrowLeft, LoaderCircle, ChartLine, FileSpreadsheet, Building2, MailCheck, ShieldCheck, KeyRound } from 'lucide-react';
import { useSesion } from '../lib/sesion.jsx';
import { Marca, NOMBRE_APP } from '../components/Marca.jsx';
import { Fachada } from '../components/Fachada.jsx';

// ── Piezas ─────────────────────────────────────────────────────────────────
function CampoPass({ id, valor, onChange, autoComplete, placeholder, autoFocus }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="input-pass">
      <input id={id} type={ver ? 'text' : 'password'} value={valor} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} autoFocus={autoFocus} />
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

function Fuerza({ password }) {
  if (!password) return null;
  const nivel = fuerza(password);
  return (
    <div className={`fuerza fuerza--${nivel}`}>
      <div className="fuerza__barras">{[0, 1, 2, 3].map((i) => <i key={i} className={i < nivel ? 'on' : ''} />)}</div>
      <span>{password.length < 8 ? NIVELES[0] : NIVELES[nivel]}</span>
    </div>
  );
}

/** 6 casilleros para el código. Acepta pegar el código entero. */
function CodigoInput({ valor, onChange, onCompleto, deshabilitado, error }) {
  const refs = useRef([]);
  const digitos = valor.padEnd(6, ' ').slice(0, 6).split('');

  function poner(i, txt) {
    const limpio = txt.replace(/\D/g, '');
    if (!limpio) return;
    const arr = valor.padEnd(6, ' ').split('');
    for (let k = 0; k < limpio.length && i + k < 6; k++) arr[i + k] = limpio[k];
    const nuevo = arr.join('').replace(/\s+$/, '');
    onChange(nuevo);
    const sig = Math.min(5, i + limpio.length);
    refs.current[sig]?.focus();
    if (nuevo.replace(/\s/g, '').length === 6) onCompleto?.(nuevo);
  }

  function tecla(i, e) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = valor.padEnd(6, ' ').split('');
      if (arr[i] !== ' ') { arr[i] = ' '; } else if (i > 0) { arr[i - 1] = ' '; refs.current[i - 1]?.focus(); }
      onChange(arr.join('').replace(/\s+$/, ''));
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  }

  return (
    <div className={`codigo ${error ? 'codigo--error' : ''}`} role="group" aria-label="Código de 6 números">
      {digitos.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d.trim()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          disabled={deshabilitado}
          autoFocus={i === 0}
          aria-label={`Número ${i + 1}`}
          onChange={(e) => poner(i, e.target.value.slice(-6))}
          onPaste={(e) => { e.preventDefault(); poner(0, e.clipboardData.getData('text')); }}
          onKeyDown={(e) => tecla(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

function useCuentaRegresiva(inicio) {
  const [seg, setSeg] = useState(inicio);
  useEffect(() => { setSeg(inicio); }, [inicio]);
  useEffect(() => {
    if (seg <= 0) return;
    const t = setTimeout(() => setSeg((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seg]);
  return [seg, setSeg];
}

const Boton = ({ enviando, children, ...rest }) => (
  <button type="submit" className="btn btn--pri btn--ancho" disabled={enviando} {...rest}>
    {enviando ? <LoaderCircle size={18} className="gira" /> : children}
  </button>
);

// ── Pantalla ───────────────────────────────────────────────────────────────
export function Acceso() {
  const s = useSesion();
  const [paso, setPaso] = useState('ingresar'); // ingresar | registro | codigo | recuperar | nueva
  const [f, setF] = useState({ identificador: '', usuario: '', email: '', password: '', password2: '', codigo: '' });
  const [pendiente, setPendiente] = useState(null);
  const [recordar, setRecordar] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [seg, setSeg] = useCuentaRegresiva(0);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  function ir(p) { setPaso(p); setError(''); setOk(''); setF((x) => ({ ...x, password: '', password2: '', codigo: '' })); }

  async function correr(fn) {
    setError(''); setOk(''); setEnviando(true);
    try { await fn(); } catch (err) { setError(err.message); } finally { setEnviando(false); }
  }

  function esperarCodigo(p) {
    setPendiente(p);
    setSeg(p.segundos || 45);
    setF((x) => ({ ...x, codigo: '' }));
    setPaso(p.proposito === 'recuperar' ? 'nueva' : 'codigo');
  }

  // Paso 1: ingresar o registrarse
  function enviarAcceso(e) {
    e.preventDefault();
    if (paso === 'registro') {
      if (!/^[A-Za-z0-9._-]{3,30}$/.test(f.usuario.trim())) return setError('El usuario va de 3 a 30 caracteres, sin espacios (letras, números, punto o guion).');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) return setError('Revisá el email.');
      if (f.password.length < 8) return setError('La contraseña tiene que tener al menos 8 caracteres.');
      return correr(async () => {
        const r = await s.registrarse({ usuario: f.usuario.trim(), email: f.email.trim(), password: f.password });
        if (r.pendiente) esperarCodigo(r.pendiente);
      });
    }
    if (!f.identificador.trim() || !f.password) return setError('Completá usuario (o email) y contraseña.');
    correr(async () => {
      const r = await s.ingresar(f.identificador.trim(), f.password);
      if (r.pendiente) esperarCodigo(r.pendiente);
    });
  }

  // Paso 2: código
  function verificar(codigo = f.codigo) {
    if (codigo.replace(/\D/g, '').length !== 6) return setError('Completá los 6 números del código.');
    correr(async () => {
      try { await s.verificar(pendiente.id, codigo, recordar); }
      catch (err) { setF((x) => ({ ...x, codigo: '' })); throw err; }
    });
  }

  function reenviar() {
    correr(async () => {
      const r = await s.reenviar(pendiente.id);
      setPendiente(r.pendiente);
      setSeg(r.pendiente.segundos || 45);
      setF((x) => ({ ...x, codigo: '' }));
      setOk('Listo, te mandamos un código nuevo.');
    });
  }

  // Recuperar contraseña
  function pedirRecuperacion(e) {
    e.preventDefault();
    if (!f.identificador.trim()) return setError('Escribí tu usuario o tu email.');
    correr(async () => esperarCodigo((await s.recuperar(f.identificador.trim())).pendiente));
  }

  function restablecer(e) {
    e.preventDefault();
    if (f.codigo.replace(/\D/g, '').length !== 6) return setError('Completá los 6 números del código.');
    if (f.password.length < 8) return setError('La nueva contraseña tiene que tener al menos 8 caracteres.');
    if (f.password !== f.password2) return setError('Las contraseñas no coinciden.');
    correr(() => s.restablecer(pendiente.id, f.codigo, f.password));
  }

  const avisos = (
    <>
      {error && <p className="error" role="alert">{error}</p>}
      {ok && <p className="acceso__ok" role="status">{ok}</p>}
    </>
  );

  const reenvio = pendiente && (
    <div className="reenvio">
      <span>¿No te llegó? Revisá spam o promociones.</span>
      {seg > 0
        ? <span className="reenvio__espera">Reenviar en 0:{String(seg).padStart(2, '0')}</span>
        : <button type="button" className="link" onClick={reenviar} disabled={enviando}>Reenviar código</button>}
    </div>
  );

  let contenido;
  if (paso === 'codigo') {
    const registro = pendiente.proposito === 'registro';
    contenido = (
      <>
        <div className="acceso__icono">{registro ? <MailCheck size={26} /> : <ShieldCheck size={26} />}</div>
        <h2>{registro ? 'Revisá tu mail' : 'Verificá que sos vos'}</h2>
        <p className="acceso__sub">Te mandamos un código de 6 números a <b>{pendiente.email}</b>. {registro ? 'Ingresalo para activar tu cuenta.' : 'Ingresalo para entrar.'}</p>
        <form className="form" onSubmit={(e) => { e.preventDefault(); verificar(); }} noValidate>
          <CodigoInput valor={f.codigo} onChange={(c) => setF((x) => ({ ...x, codigo: c }))} onCompleto={verificar} deshabilitado={enviando} error={Boolean(error)} />
          {!registro && (
            <label className="check">
              <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
              <span>No pedir el código en esta computadora por 30 días</span>
            </label>
          )}
          {avisos}
          <Boton enviando={enviando}>{registro ? 'Crear mi cuenta' : 'Ingresar'} <ArrowRight size={18} /></Boton>
        </form>
        {reenvio}
        <button className="link acceso__volver" onClick={() => ir(registro ? 'registro' : 'ingresar')}><ArrowLeft size={15} /> {registro ? 'Cambiar los datos' : 'Usar otra cuenta'}</button>
      </>
    );
  } else if (paso === 'recuperar') {
    contenido = (
      <>
        <div className="acceso__icono"><KeyRound size={26} /></div>
        <h2>Recuperá tu cuenta</h2>
        <p className="acceso__sub">Escribí tu usuario o tu email y te mandamos un código para elegir una contraseña nueva.</p>
        <form className="form" onSubmit={pedirRecuperacion} noValidate>
          <div className="campo">
            <label htmlFor="r-ident">Usuario o email</label>
            <input id="r-ident" value={f.identificador} onChange={set('identificador')} autoComplete="username" placeholder="Tu usuario o tu email" autoFocus />
          </div>
          {avisos}
          <Boton enviando={enviando}>Mandarme el código <ArrowRight size={18} /></Boton>
        </form>
        <button className="link acceso__volver" onClick={() => ir('ingresar')}><ArrowLeft size={15} /> Volver a ingresar</button>
      </>
    );
  } else if (paso === 'nueva') {
    contenido = (
      <>
        <div className="acceso__icono"><KeyRound size={26} /></div>
        <h2>Elegí tu nueva contraseña</h2>
        <p className="acceso__sub">Si la cuenta existe, te llegó un código a <b>{pendiente.email}</b>. Ponelo acá junto con tu nueva contraseña.</p>
        <form className="form" onSubmit={restablecer} noValidate>
          <CodigoInput valor={f.codigo} onChange={(c) => setF((x) => ({ ...x, codigo: c }))} deshabilitado={enviando} error={Boolean(error) && /código/i.test(error)} />
          <div className="campo">
            <label htmlFor="n-pass">Nueva contraseña</label>
            <CampoPass id="n-pass" valor={f.password} onChange={set('password')} autoComplete="new-password" placeholder="Mínimo 8 caracteres" />
            <Fuerza password={f.password} />
          </div>
          <div className="campo">
            <label htmlFor="n-pass2">Repetila</label>
            <CampoPass id="n-pass2" valor={f.password2} onChange={set('password2')} autoComplete="new-password" placeholder="La misma contraseña" />
          </div>
          {avisos}
          <Boton enviando={enviando}>Cambiar contraseña e ingresar <ArrowRight size={18} /></Boton>
        </form>
        {reenvio}
        <button className="link acceso__volver" onClick={() => ir('ingresar')}><ArrowLeft size={15} /> Volver a ingresar</button>
      </>
    );
  } else {
    const nuevo = paso === 'registro';
    contenido = (
      <>
        <div className="acceso__tabs" role="tablist">
          <button role="tab" aria-selected={!nuevo} className={!nuevo ? 'on' : ''} onClick={() => ir('ingresar')}>Ingresar</button>
          <button role="tab" aria-selected={nuevo} className={nuevo ? 'on' : ''} onClick={() => ir('registro')}>Crear cuenta</button>
        </div>
        <h2>{nuevo ? 'Creá tu cuenta' : 'Hola de nuevo'}</h2>
        <p className="acceso__sub">{nuevo ? 'Tus obras quedan guardadas en la nube y las ves desde cualquier dispositivo.' : 'Ingresá con tu usuario o tu email.'}</p>
        {s.aviso && !error && <p className="acceso__aviso">{s.aviso}</p>}
        <form className="form" onSubmit={enviarAcceso} noValidate>
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
                <Fuerza password={f.password} />
              </div>
            </>
          ) : (
            <>
              <div className="campo">
                <label htmlFor="a-ident">Usuario o email</label>
                <input id="a-ident" value={f.identificador} onChange={set('identificador')} autoComplete="username" placeholder="Tu usuario o tu email" autoFocus />
              </div>
              <div className="campo">
                <div className="campo__fila">
                  <label htmlFor="a-pass">Contraseña</label>
                  <button type="button" className="link link--chico" onClick={() => ir('recuperar')}>¿Olvidaste tu contraseña?</button>
                </div>
                <CampoPass id="a-pass" valor={f.password} onChange={set('password')} autoComplete="current-password" placeholder="Tu contraseña" />
              </div>
            </>
          )}
          {avisos}
          <Boton enviando={enviando}>{nuevo ? 'Continuar' : 'Ingresar'} <ArrowRight size={18} /></Boton>
        </form>
        <p className="acceso__cambio">
          {nuevo ? <>¿Ya tenés cuenta? <button className="link" onClick={() => ir('ingresar')}>Ingresá</button></>
            : <>¿Primera vez en {NOMBRE_APP}? <button className="link" onClick={() => ir('registro')}>Creá tu cuenta</button></>}
        </p>
        {nuevo && <p className="acceso__legal">Te vamos a mandar un código a tu email para confirmar que es tuyo.</p>}
      </>
    );
  }

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
        <div className="acceso__caja" key={paso}>{contenido}</div>
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
