# Stockpot

PWA instalable (pensada para el iPhone) para saber qué hay en la nevera, la
despensa y el congelador, no tirar comida, planificar las comidas de la semana
y llevar la lista de la compra. Lee los tickets del súper con Claude y tiene un
ayudante de cocina con IA que propone recetas y huecos del cuadrante.

Proyecto de portfolio de un estudiante de DAW. Antes se llamaba "Vigía" y, al
principio, "Recetas Nevera" (por eso el repositorio se llama `recetas-pwa`).

## Qué hace

- **Inventario** por ubicación (nevera, despensa, congelador) con la
  caducidad de cada producto, y **tuppers** con aviso el día antes.
- **Escanear el ticket** de la compra (foto o PDF): Claude lee los productos y
  se revisan antes de guardarlos.
- **Recetario** escrito a mano, con "qué me falta" y "La he cocinado" (descuenta
  lo usado del inventario).
- **Semana**: comida y cena de cada día, con el equilibrio semanal frente a las
  recomendaciones de AESAN y un aviso la noche anterior.
- **Lista de la compra** compartida, que se apunta y se tacha sola.
- **Ayudante** (chat con Claude) que propone recetas y huecos como tarjetas que
  se confirman.
- **Hogar compartido** con código de invitación, avisos Web Push, perfil con
  avatar y recuperación de la contraseña por correo.

## Tecnologías

- **Servidor:** Node.js (>= 22.11, ES modules) con Express 5.
- **Base de datos:** PostgreSQL en [Neon](https://neon.tech), con `pg` y SQL
  directo (consultas siempre parametrizadas).
- **Frontend:** HTML, CSS y JavaScript sin frameworks ni paso de build;
  Service Worker para funcionar sin conexión.
- **Servicios:** API de Claude (Anthropic), Web Push (VAPID), correo con
  [Resend](https://resend.com).
- **Pruebas:** `node:test`. Variables de entorno con `node --env-file` (sin
  dotenv).
- **Despliegue:** Render (API y frontend en el mismo origen) y cron-job.org
  para la tarea de avisos.

## Levantarlo desde cero

### 1. Requisitos

- Node.js 22.11 o superior (`node -v`).
- Una base de datos PostgreSQL. La más sencilla: un proyecto gratuito en Neon.
  Copia su cadena de conexión en *Connect* (empieza por `postgresql://`).

### 2. Instalar

```bash
git clone https://github.com/AlvaroAlme/recetas-pwa.git
cd recetas-pwa
npm install
```

> En PowerShell de Windows, si la política de ejecución bloquea `npm`, usa
> `npm.cmd` en su lugar (`npm.cmd install`, `npm.cmd run dev`…).

### 3. Configurar `.env`

Copia el ejemplo y rellénalo:

```bash
cp .env.ejemplo .env
```

| Variable | Qué poner |
|---|---|
| `DATABASE_URL` | La cadena de conexión de Neon. |
| `APP_ORIGEN` | `http://localhost:3000` en desarrollo. |
| `VAPID_PUBLICA`, `VAPID_PRIVADA` | Genera el par con `npx web-push generate-vapid-keys`. |
| `VAPID_SUJETO` | Un contacto `https://` (la URL de la app) o `mailto:`. |
| `CRON_SECRETO` | Una cadena aleatoria larga (el comando está en `.env.ejemplo`). |
| `ANTHROPIC_API_KEY` | Opcional en desarrollo: sin ella, leer un ticket y el Ayudante responden que la IA no está configurada. |
| `RESEND_API_KEY` | Opcional en desarrollo: sin ella, los correos se escriben en la terminal. |
| `CORREO_REMITENTE` | Quién envía los correos (con un dominio verificado en Resend, si hay key). |

El servidor no arranca si falta alguna variable obligatoria, y dice cuál.
El archivo `.env` está en `.gitignore`: nunca se sube.

### 4. Arrancar

```bash
npm run dev
```

Las migraciones de `server/migraciones/` se aplican solas al arrancar (también
se pueden lanzar con `npm run migrar`). Abre **http://localhost:3000** (con
`localhost`, no `127.0.0.1`: el origen tiene que coincidir con `APP_ORIGEN`) y
crea una cuenta.

Mientras programas, en las herramientas del navegador (F12 › Application ›
Service workers) marca "Bypass for network" o recarga con Ctrl+Shift+R, para
que el Service Worker no te sirva archivos viejos.

### 5. Pruebas

```bash
npm test
```

Lanza las pruebas de `node:test` (`server/pruebas/`).
`tests/smoke.spec.ts` es una prueba de humo con Playwright que no va incluida:
necesita `@playwright/test` y el servidor de desarrollo en marcha.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor con recarga al guardar, en http://localhost:3000 |
| `npm start` | Servidor sin recarga (el de producción) |
| `npm run migrar` | Aplica las migraciones pendientes |
| `npm test` | Pruebas |

## Estructura

```
compartido/   reglas que usan el servidor y el navegador (validación, fechas, unidades…)
server/       Express: rutas → servicios → bd, migraciones SQL y pruebas
web/          la PWA: index.html, css/, js/ (pantallas y componentes), sw.js, iconos y fuentes
docs/         ARQUITECTURA.md, DISENO_UI.md y marca.md
audit/        auditoría de UI/UX y accesibilidad
```

## Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): modelo de datos, API,
  seguridad, plan por fases y registro de decisiones (D-xx).
- [`docs/DISENO_UI.md`](docs/DISENO_UI.md): tokens, componentes y pantallas.
- [`docs/marca.md`](docs/marca.md): identidad visual de Stockpot.

## Despliegue (resumen)

Un servicio web en Render con `npm start` y las mismas variables que el
`.env` (con los valores de producción, `NODE_ENV=production` y `APP_ORIGEN`
con la URL de Render). Cada push a `main` despliega. En cron-job.org, una
llamada cada 5 minutos a `POST /api/tareas/avisos` con la cabecera `Authorization: Bearer <CRON_SECRETO>`
(envía los avisos y mantiene despierto el servidor gratuito).

## Licencia

Sin licencia por ahora: el código es de su autor. Las fuentes y librerías de
terceros llevan la suya (por ejemplo, Fraunces con la SIL Open Font License,
en `web/fuentes/OFL.txt`).
