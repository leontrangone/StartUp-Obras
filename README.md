# Plomada · Costos de obra, a plomo

App web para registrar y analizar los gastos de una o varias obras de construcción.
Cada usuario tiene su cuenta (usuario o email + contraseña) y sus obras quedan
guardadas en una base de datos **PostgreSQL en Neon**. Se publica en **Vercel**.

## Dónde está publicada

- **App:** proyecto `plomada` en Vercel (equipo ascu-s-projects), conectado a este repo de GitHub: cada `git push` a `main` publica la versión nueva sola.
- **Base de datos:** proyecto `plomada` en Neon (región São Paulo). Las funciones de Vercel corren en São Paulo (`gru1`) para estar cerca.
- **Variables en Vercel** (*Settings → Environment Variables*):
  | Variable | Para qué |
  |---|---|
  | `DATABASE_URL` | conexión a Neon (ya cargada) |
  | `JWT_SECRET` | firma de las sesiones (ya cargada) |
  | `SMTP_USER` | el Gmail desde el que salen los códigos |
  | `SMTP_PASS` | la *contraseña de aplicación* de ese Gmail |

### Configurar el Gmail para mandar los códigos
1. En tu cuenta de Google activá la **Verificación en 2 pasos** (myaccount.google.com → Seguridad).
2. Entrá a **myaccount.google.com/apppasswords**, creá una contraseña de aplicación llamada "Plomada" y copiá las 16 letras.
3. En Vercel → proyecto `plomada` → *Settings → Environment Variables*, agregá `SMTP_USER` (tu Gmail) y `SMTP_PASS` (las 16 letras) para *Production* y *Preview*.
4. *Deployments → … → Redeploy* para que tome las variables.

## Seguridad de las cuentas

- **Registro con código:** para crear la cuenta llega un código de 6 números al mail; sin ese código la cuenta no se crea.
- **Ingreso en 2 pasos:** después de la contraseña se pide un código por mail. Se puede marcar "no pedir el código en esta computadora por 30 días".
- **Recuperar la cuenta:** "¿Olvidaste tu contraseña?" manda un código para elegir una contraseña nueva. Al cambiarla se cierran todas las sesiones abiertas y llega un aviso por mail. Nunca se revela si un usuario o email existe.
- **Límites de intentos:** 5 contraseñas incorrectas por cuenta (o 20 por conexión) bloquean el ingreso 15 minutos; cada código admite 5 intentos y vence a los 10 minutos; se puede pedir un código cada 45 segundos y hasta 10 por hora.
- Contraseñas con bcrypt, códigos guardados como hash (nunca en texto plano), sesión en cookie `httpOnly` + `Secure`.

## Cómo correrla en tu compu

```bash
npm install
cp .env.example .env.local     # y completá DATABASE_URL, JWT_SECRET y el Gmail
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
  auth/[accion].js   · registro, login, verificar código, reenviar,
                       recuperar, restablecer, logout y usuario actual
  datos.js           · leer todo / carga masiva
  obras.js           · crear, editar, borrar obras
  gastos.js          · crear, editar, borrar gastos
  ajustes.js         · moneda y cotización
server/              ← código compartido del backend
  db.js              · conexión (Neon serverless en producción, pg en local)
  auth.js            · bcrypt + JWT en cookie, dispositivo de confianza
  codigos.js         · códigos de 6 números por mail
  correo.js          · envío de mails (Gmail/SMTP) y plantillas
  limites.js         · límites de intentos
  datos.js           · validaciones y conversión filas ⇄ objetos
  local.js           · servidor local para desarrollo
db/schema.sql        ← tablas: usuarios, ajustes, obras, gastos, codigos, limites
src/                 ← frontend (React + Vite)
  lib/store.jsx      · estado de la app y guardado en la API
  lib/sesion.jsx     · login / signup / logout
  pages/Acceso.jsx   · pantalla de ingreso y registro
```

Tecnologías: React 18, Vite, Chart.js, ExcelJS, jsPDF · Node.js (funciones de Vercel) · PostgreSQL (Neon) · bcrypt + JWT.
