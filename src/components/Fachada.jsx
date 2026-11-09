// Fachada dibujada de cada edificio. Los pisos se van "construyendo" según
// cuánto del presupuesto se gastó; los que faltan se ven como plano (línea punteada).
const PALETAS = [
  { muro: '#C8B69B', sombra: '#AE9A7D', ventana: '#2B3A44', luz: '#F2C14E' },
  { muro: '#AEB7BF', sombra: '#8F99A2', ventana: '#26313A', luz: '#F2C14E' },
  { muro: '#D3B9A0', sombra: '#B8987C', ventana: '#2E3338', luz: '#F2C14E' },
  { muro: '#B9B2A4', sombra: '#9C9484', ventana: '#2A3036', luz: '#F2C14E' },
];

export function Fachada({ pisos = 6, avance = 0, estado = 'En obra', paleta = 0, alto = 150, id = 'f' }) {
  const p = PALETAS[paleta % PALETAS.length];
  const W = 240, H = 160, suelo = 146;
  const n = Math.max(1, Math.min(30, Number(pisos) || 1));
  const anchoEd = n > 10 ? 96 : n > 5 ? 112 : 128;
  const x0 = (W - anchoEd) / 2 - 18;
  const altoMax = 118;
  const hp = Math.min(16, altoMax / (n + 0.6)); // alto de cada piso
  const terminada = estado === 'Terminada';
  const construidos = terminada ? n : estado === 'Planificación' ? 0 : Math.max(1, Math.min(n, Math.round((n * Math.min(100, avance)) / 100)));
  const cols = anchoEd > 110 ? 5 : 4;
  const topEd = suelo - hp * n - hp * 0.6;

  const pisosSvg = [];
  for (let i = 0; i < n; i++) {
    const y = suelo - hp * (i + 1) - (i === 0 ? 0 : 0);
    const hecho = i < construidos;
    const ventanas = [];
    const vw = (anchoEd - 16) / cols - 6;
    for (let c = 0; c < cols; c++) {
      const vx = x0 + 8 + c * ((anchoEd - 16) / cols) + 3;
      const encendida = terminada && ((i * 7 + c * 3) % 5 === 0);
      ventanas.push(
        <rect key={c} x={vx} y={y + hp * 0.22} width={vw} height={hp * 0.56} rx="1"
          fill={hecho ? (encendida ? p.luz : p.ventana) : 'none'}
          stroke={hecho ? 'none' : '#5B7A99'} strokeWidth=".8" strokeDasharray={hecho ? '' : '2 2'} opacity={hecho ? 1 : 0.7} />,
      );
    }
    pisosSvg.push(
      <g key={i}>
        <rect x={x0} y={y} width={anchoEd} height={hp}
          fill={hecho ? p.muro : 'none'} stroke={hecho ? p.sombra : '#5B7A99'}
          strokeWidth={hecho ? 0.6 : 0.9} strokeDasharray={hecho ? '' : '3 2.5'} />
        {ventanas}
      </g>,
    );
  }

  // Grúa torre para obras en curso / planificación
  const grua = !terminada && (
    <g stroke="#1C1E21" strokeWidth="1.4" fill="none" strokeLinecap="round">
      <path d={`M${x0 + anchoEd + 30} ${suelo} V${topEd - 16}`} />
      <path d={`M${x0 + anchoEd + 26} ${suelo} V${topEd - 12} M${x0 + anchoEd + 34} ${suelo} V${topEd - 12}`} strokeWidth=".7" />
      {Array.from({ length: Math.floor((suelo - topEd) / 10) }, (_, k) => (
        <path key={k} d={`M${x0 + anchoEd + 26} ${suelo - k * 10} L${x0 + anchoEd + 34} ${suelo - k * 10 - 10}`} strokeWidth=".6" />
      ))}
      <path d={`M${x0 + anchoEd - 40} ${topEd - 16} H${x0 + anchoEd + 66}`} />
      <path d={`M${x0 + anchoEd + 30} ${topEd - 26} L${x0 + anchoEd - 40} ${topEd - 16} M${x0 + anchoEd + 30} ${topEd - 26} L${x0 + anchoEd + 66} ${topEd - 16}`} strokeWidth=".7" />
      <rect x={x0 + anchoEd + 52} y={topEd - 16} width="12" height="7" fill="#1C1E21" />
      <path d={`M${x0 + anchoEd - 20} ${topEd - 16} V${topEd + 8}`} strokeWidth=".7" />
      <rect x={x0 + anchoEd - 24} y={topEd + 8} width="8" height="5" fill="#F2B500" stroke="none" />
    </g>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} height={alto} width="100%" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <defs>
        <pattern id={`grid-${id}`} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M12 0H0V12" fill="none" stroke="#5B7A99" strokeOpacity=".12" strokeWidth=".6" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#grid-${id})`} />
      {/* árbol */}
      <circle cx={x0 - 18} cy={suelo - 16} r="10" fill="#7E8C5A" opacity=".85" />
      <path d={`M${x0 - 18} ${suelo} v-8`} stroke="#5B4A36" strokeWidth="2" />
      {pisosSvg}
      {/* acceso planta baja */}
      {construidos > 0 && <rect x={x0 + anchoEd / 2 - 7} y={suelo - hp * 0.8} width="14" height={hp * 0.8} fill="#1C1E21" />}
      {grua}
      <path d={`M8 ${suelo}H${W - 8}`} stroke="#1C1E21" strokeWidth="1.6" />
      <path d={`M8 ${suelo + 4}H${W - 8}`} stroke="#1C1E21" strokeWidth=".6" strokeDasharray="2 4" opacity=".5" />
    </svg>
  );
}
