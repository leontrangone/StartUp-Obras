import { useEffect, useRef } from 'react';
import { Chart } from '../lib/graficos.js';

/** Monta un gráfico de Chart.js a partir de una configuración. */
export function Grafico({ cfg, alto = 280, etiqueta }) {
  const canvas = useRef(null);
  const chart = useRef(null);

  useEffect(() => {
    if (!canvas.current) return;
    chart.current?.destroy();
    chart.current = new Chart(canvas.current, cfg);
    return () => { chart.current?.destroy(); chart.current = null; };
  }, [cfg]);

  return (
    <div className="grafico" style={{ height: alto }}>
      <canvas ref={canvas} role="img" aria-label={etiqueta} />
    </div>
  );
}
