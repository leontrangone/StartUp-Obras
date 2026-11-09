# Plomada · Costos de obra, a plomo

App web para registrar y analizar los gastos de una o varias obras de construcción.
Cada usuario tiene su cuenta (usuario o email + contraseña) y sus obras quedan
guardadas en una base de datos **PostgreSQL en Neon**. Se publica en **Vercel**.

## Cómo publicarla (Vercel + Neon)

1. **Subí el código a GitHub**
   ```bash
   git add .
   git commit -m "Plomada con cuentas y base de datos"
   git push
   ```
2. **Creá el proyecto en Vercel:** en [vercel.com](https://vercel.com) elegí *Add New → Project*, importá el repo y dejá todo como viene (Vercel detecta Vite). Todavía no hace falta hacer el deploy.
3. **Conectá Neon:** en el proyecto de Vercel, andá a *Storage → Create Database → Neon* y conectalo al proyecto. Vercel crea sola la variable `DATABASE_URL`.
   - Si ya tenés una base en Neon: copiá la *Connection string* desde el panel de Neon y cargala a mano como `DATABASE_URL` en *Settings → Environment Variables*.
4. **Agregá `JWT_SECRET`:** en *Settings → Environment Variables* creá `JWT_SECRET` con una frase larga y al azar (es la llave que firma las sesiones).
5. **Deploy:** *Deployments → Redeploy*. Listo: abrí el link, creá tu cuenta y empezá.

Las tablas se crean solas la primera vez que alguien usa la app (el esquema está en `db/schema.sql`).
De ahí en más, cada `git push` publica la versión nueva automáticamente.

## Cómo correrla en tu compu

```bash
npm install
cp .env.example .env.local     # y completá DATABASE_URL y JWT_SECRET
npm run dev                    # app en http://localhost:5173 (API en :3001)
```

Para desarrollo podés usar la misma base de Neon, o mejor una *branch* de Neon aparte para no mezclar datos de prueba.

## Qué tiene

- **Cuentas:** registro con usuario + email + contraseña; ingreso con usuario **o** email. Contraseñas encriptadas con bcrypt, sesión en cookie segura (httpOnly) que dura 30 días. Cada usuario ve solo sus obras.
- **Panel de obras** con fachada dibujada, total invertido, % de presupuesto y reparto A/B.
- **Por obra:** Resumen, Gastos (buscador y filtros), Análisis (tabla A + B automática, comparación por rubro, acumulado, mes × rubro) y Ajustes (datos, tipos de costo, rubros).
- **Pesos o dólares** con la cotización del día de cada gasto; dólar Oficial, Blue o MEP online.
- **Exportar** Excel (3 hojas) y PDF para reuniones. **Importar** gastos desde Excel.
- **Copia de seguridad** en `.json` y datos de ejemplo para probar.
- Si había obras guardadas en el navegador de la versión anterior, la app ofrece subirlas a la cuenta.

## Estructura

```
api/                 ← funciones serverless de Vercel (backend)
  auth/signup.js     · crear cuenta
  auth/login.js      · ingresar (usuario o email)
  auth/logout.js     · cerrar sesión
  auth/me.js         · usuario actual
  datos.js           · leer todo / carga masiva
  obras.js           · crear, editar, borrar obras
  gastos.js          · crear, editar, borrar gastos
  ajustes.js         · moneda y cotización
server/              ← código compartido del backend
  db.js              · conexión (Neon serverless en producción, pg en local)
  auth.js            · bcrypt + JWT en cookie
  datos.js           · validaciones y conversión filas ⇄ objetos
  local.js           · servidor local para desarrollo
db/schema.sql        ← tablas: usuarios, ajustes, obras, gastos
src/                 ← frontend (React + Vite)
  lib/store.jsx      · estado de la app y guardado en la API
  lib/sesion.jsx     · login / signup / logout
  pages/Acceso.jsx   · pantalla de ingreso y registro
```

Tecnologías: React 18, Vite, Chart.js, ExcelJS, jsPDF · Node.js (funciones de Vercel) · PostgreSQL (Neon) · bcrypt + JWT.
