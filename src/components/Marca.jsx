// Logo de Plomada: una plomada de albañil (la herramienta que marca la vertical
// perfecta). El nombre de la app se cambia acá.
export const NOMBRE_APP = 'Plomada';
export const LEMA = 'Costos de obra, a plomo';

export function Isotipo({ size = 36, fondo = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {fondo && <rect width="64" height="64" rx="14" fill="#1C1E21" />}
      {/* hilo */}
      <path d="M32 7v13" stroke="#F2B500" strokeWidth="3" strokeLinecap="round" />
      {/* tapa */}
      <rect x="25" y="19" width="14" height="6" rx="1.5" fill="#F2B500" />
      {/* cuerpo */}
      <path d="M23.5 27h17L32 56z" fill="#F2B500" />
      <path d="M32 27v29" stroke="#1C1E21" strokeOpacity=".28" strokeWidth="2" />
      {/* nivel */}
      <path d="M12 56h40" stroke="#F2B500" strokeOpacity=".45" strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  );
}

export function Marca({ claro = false, compacto = false }) {
  return (
    <div className={`marca ${claro ? 'marca--claro' : ''}`}>
      <Isotipo size={compacto ? 32 : 38} />
      {!compacto && (
        <div className="marca__txt">
          <span className="marca__nombre">{NOMBRE_APP}</span>
          <span className="marca__lema">{LEMA}</span>
        </div>
      )}
    </div>
  );
}
