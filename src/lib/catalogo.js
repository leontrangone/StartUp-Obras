// ─── Catálogo base: rubros, tipos de costo y sugerencias ───────────────────

// Colores de los tipos de costo (validados para daltonismo y contraste).
export const COLOR_TIPO = { A: '#B97D06', B: '#0B77A8', C: '#B0442A' };

export const TIPOS_BASE = {
  A: { nombre: 'Costo A', desc: 'Facturado (con IVA + IIBB)' },
  B: { nombre: 'Costo B', desc: 'Sin factura' },
  C: { nombre: 'Costo C', desc: 'Otros' },
};

// icono = nombre de un ícono de lucide-react (ver components/Icono.jsx)
export const RUBROS_BASE = [
  { id: 'mano', nombre: 'Mano de obra', icono: 'HardHat' },
  { id: 'materiales', nombre: 'Materiales', icono: 'BrickWall' },
  { id: 'proyecto', nombre: 'Proyecto y dirección', icono: 'DraftingCompass' },
  { id: 'indirectos', nombre: 'Costos indirectos', icono: 'Truck' },
  { id: 'honorarios', nombre: 'Honorarios', icono: 'BriefcaseBusiness' },
  { id: 'excavacion', nombre: 'Excavación', icono: 'Shovel' },
  { id: 'municipales', nombre: 'Gastos municipales', icono: 'Landmark' },
  { id: 'lote', nombre: 'Lote', icono: 'LandPlot' },
];

export const ICONOS_RUBRO = [
  'HardHat', 'BrickWall', 'DraftingCompass', 'Truck', 'BriefcaseBusiness', 'Shovel', 'Landmark',
  'LandPlot', 'Hammer', 'Wrench', 'Zap', 'Droplets', 'PaintRoller', 'Ruler', 'Construction',
  'Fence', 'Container', 'Lightbulb', 'ShieldCheck', 'Receipt',
];

// Sugerencias de "concepto" según el rubro (aparecen al escribir).
export const SUGERENCIAS = {
  mano: ['Albañilería', 'Plomería', 'Electricidad', 'Pintura', 'Yesería', 'Herrería', 'Carpintería', 'Contrapisos y carpetas', 'Colocación de cerámicos', 'Cargas sociales'],
  materiales: ['Hormigón elaborado', 'Hierro', 'Ladrillos', 'Cemento', 'Cal', 'Arena', 'Piedra', 'Cerámicos', 'Caños y sanitarios', 'Cables y materiales eléctricos', 'Pintura', 'Aberturas'],
  proyecto: ['Proyecto de arquitectura', 'Dirección de obra', 'Cálculo estructural', 'Planos de instalaciones', 'Renders'],
  indirectos: ['Alquiler de volquete', 'Alquiler de andamios', 'Fletes', 'Seguro de obra', 'Seguridad / sereno', 'Agua y luz de obra', 'Obrador'],
  honorarios: ['Escribanía', 'Contador', 'Abogado', 'Agrimensor', 'Higiene y seguridad'],
  excavacion: ['Movimiento de suelos', 'Retiro de tierra', 'Submuración', 'Depresión de napa'],
  municipales: ['Derechos de construcción', 'Aprobación de planos', 'Tasas municipales', 'Permiso de obra', 'Final de obra'],
  lote: ['Compra del lote', 'Comisión inmobiliaria', 'Gastos de escrituración', 'Gastos administrativos municipales', 'Impuesto de sellos', 'Impuestos relacionados'],
};

export const ESTADOS = ['Planificación', 'En obra', 'Terminada'];

export function nuevaObraBase(datos = {}) {
  return {
    nombre: '',
    direccion: '',
    pisos: 6,
    unidades: 12,
    m2: 0,
    presupuesto: 0,
    presupuestoMoneda: 'USD',
    inicio: new Date().toISOString().slice(0, 7),
    estado: 'En obra',
    tipos: structuredClone(TIPOS_BASE),
    usarC: false,
    rubros: structuredClone(RUBROS_BASE),
    ...datos,
  };
}
