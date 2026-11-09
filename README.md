# Plomada · Costos de obra, a plomo

App para registrar y analizar los gastos de una o varias obras de construcción.
Reemplaza la planilla de Excel: cada gasto se carga en segundos y los gráficos,
porcentajes y la tabla **Representación de costos A + B** se arman solos.

## Cómo abrirla

**Sin instalar nada:** abrí `dist/index.html` con doble clic (Chrome, Edge o Firefox).

**Para desarrollar:**

```bash
npm install
npm run dev      # abre la app en http://localhost:5173
npm run build    # regenera dist/index.html (un solo archivo)
```

## Qué tiene

- **Panel de obras:** cada edificio con su fachada dibujada (los pisos se "construyen" según el avance del presupuesto), total invertido, % de presupuesto y reparto A/B.
- **Por obra:**
  - **Resumen:** costo total, presupuesto usado, gasto del mes contra el anterior, costo por m², gráfico mensual, distribución A/B, ranking de rubros y últimos gastos.
  - **Gastos:** historial agrupado por mes, con buscador y filtros (mes, rubro, tipo de costo). Editar, borrar y deshacer.
  - **Análisis:** tabla A + B automática, comparación A/B por rubro, gasto acumulado contra el presupuesto y mapa de calor mes × rubro.
  - **Ajustes:** datos de la obra, nombres de los tipos de costo (A, B y C opcional) y rubros propios con ícono.
- **Pesos o dólares:** cada gasto guarda la cotización del día en que se cargó, así la conversión es justa aunque cambie el dólar. La cotización de referencia se trae online (Oficial, Blue o MEP, vía dolarapi.com) o se escribe a mano.
- **Exportar Excel:** 3 hojas (Resumen A+B con fórmulas, Gastos con filtros y subtotal, Evolución mes × rubro).
- **Exportar PDF:** informe para reuniones con indicadores, todos los gráficos y las tablas.
- **Importar Excel:** carga masiva desde una planilla (hay plantilla descargable).
- **Copia de seguridad:** descargar y restaurar todos los datos en un archivo `.json`.
- Atajo: tecla **N** para cargar un gasto.

## Estructura

```
src/
  lib/
    store.jsx       ← estado y guardado (acá se conecta el backend)
    calc.js         ← todos los cálculos (totales, % por rubro, A/B, evolución)
    money.js        ← monedas, conversión y formatos
    graficos.js     ← configuración de los gráficos (pantalla y PDF)
    exportExcel.js  ← exportar / importar Excel
    exportPdf.js    ← informe PDF
    catalogo.js     ← rubros, tipos de costo y sugerencias
    seed.js         ← obras de ejemplo
    dolar.js        ← cotización online
  components/       ← logo, fachada, modales, gráficos
  pages/            ← panel de obras y pestañas de cada obra
```

## Datos

Por ahora los datos se guardan en el navegador (localStorage). Para pasar al
backend del anteproyecto (Node + Express + PostgreSQL) alcanza con reemplazar
`cargar()` y `guardar()` en `src/lib/store.jsx` por llamadas a la API; las
pantallas no cambian.

Tecnologías: React 18, Vite, Chart.js, ExcelJS, jsPDF.
