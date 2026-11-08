# Vigía (antes Recetas Nevera PWA)

PWA instalable (iPhone) para controlar lo que hay en la nevera, la despensa,
el congelador y los tuppers, y no tirar comida, con recetas generadas por IA.
Nombre comercial "Vigía" desde el 2026-11-07 (D-45); la carpeta y el repo
siguen como `recetas-nevera-pwa`. Recreación de la app Expo "Recetas Nevera".
Proyecto de portfolio de un estudiante de DAW.

## Cómo trabajar conmigo (modo mentor)
- NO escribas código en mis archivos. Tú me explicas, yo escribo, tú revisas
  leyendo el archivo y lo probamos.
- Mi JavaScript está oxidado: enséñame el código con explicación línea a línea.
- Pregúntame antes de cada decisión, de instalar cualquier paquete o de crear
  cuentas externas (Neon, Render, cron-job.org...).
- Al cerrar cada fase: ✅ lo que funciona, 🧪 cómo probarlo, ⚠️ lo pendiente.
  Espera mi "ok" antes de pasar a la siguiente.
- Al terminar cada sesión: resumen de conceptos y definición de los términos
  técnicos que hayan salido.

## Documentación (la fuente de verdad)
- `docs/ARQUITECTURA.md`: stack, modelo de datos, API, seguridad, plan por
  fases (§10) y registro de decisiones D-xx (§11). Léelo antes de proponer nada.
- `docs/DISENO_UI.md`: tokens CSS, componentes y pantallas P-xx.
- Si algo contradice una decisión D-xx, avísame en vez de cambiarla.

## Stack
- Node >= 22.11, ES modules ("type": "module"), Express 5
- PostgreSQL en Neon con `pg` y SQL directo (consultas siempre parametrizadas)
- Frontend: HTML + CSS + JavaScript vanilla, sin frameworks
- Pruebas con `node:test`. Variables con `node --env-file` (sin dotenv)
- Despliegue: Render (API + frontend en el mismo origen) + cron-job.org

## Comandos
- En PowerShell uso `npm.cmd` en vez de `npm` (la política de ejecución de
  scripts bloquea `npm.ps1`): `npm.cmd run dev`, `npm.cmd install`…
- `npm run dev`: servidor con recarga en http://localhost:3000
- `npm start`: servidor sin recarga
- Primera vez en un equipo: `npm install` y copiar `.env.ejemplo` a `.env`

## Reglas del código
- Nombres de código, carpetas y mensajes en español (excepción: la carpeta
  `server/`, D-33).
- Comillas simples en JavaScript; template literals solo con variables (D-35).
- Comentarios JSDoc en primera persona, con mi forma de expresarme.
- Capas del servidor: rutas → servicios → bd. Las rutas no escriben SQL.
- `compartido/` no importa nada de fuera de `compartido/`.
- Nunca subir `.env` ni secretos al repo.

## Estado actual
**Fases aprobadas:** 0 (2026-10-27), 1 (2026-11-02) y 2 (2026-11-04). El
detalle de cada paso está en los commits (`git log`).

**Fase 3 (PWA instalable, sin conexión y primer despliegue): en curso.**
Plan: 1 manifest e iconos; 2 `web/sw.js` (precaché con versión, primero la
red en la API, §8.1); 3 sin conexión (`conexion.js`, franja, escrituras
deshabilitadas, §8.2); 4 servidor para producción (migraciones al
arrancar, `npm start`); 5 Render (preguntar antes de crear la cuenta) con
un proyecto NUEVO de Neon para producción (D-44); 6 pruebas en el iPhone.
La Bienvenida (P-03) se decide al final de la fase.
Hecho (2026-11-05): paso 1 (icono "A · Nevera", PNG 180/192/512, manifest,
etiquetas en `index.html`) y paso 2 (`sw.js`: precaché `app-v2`, la API
primero la red con copia en `api-v1` y `X-Desde-Cache`; `api.js` borra la
copia al cambiar de cuenta o de casa y con el 401). Hecho (2026-11-06):
paso 3 (`conexion.js`: franja "Sin conexión · datos de las HH:MM", botones
con `data-escribe` deshabilitados con `aria-disabled` y el motivo,
`crearSinConexion()` cuando no hay copia, y al volver la red comprueba
`/api/salud` y repinta si no hay formulario; `sw.js` en `app-v5`).
Hecho (2026-11-07): paso 4 (`index.js` migra antes de `listen` y no
arranca si falla; cierre ordenado con `SIGTERM`; `npm start` con
`--env-file-if-exists=.env`). Hecho (2026-11-07): identidad visual
**Vigía** (D-45, sustituye a D-41): papel y verde pino, estados de
caducidad ok/pronto/caducado, Bricolage Grotesque en títulos
(`web/fuentes/`), icono "ojo-hoja"; todas las pantallas rediseñadas en
CSS y revisadas (AA en claro y oscuro, 375 y 1440 px); `sw.js` en `app-v6`.
Hecho (2026-11-08): paso 5 (proyecto Neon `vigia-produccion`, nota de
Bitwarden `vigia-produccion`; Render `vigia-despensa`, Frankfurt, Free,
`NODE_VERSION=22`, health check `/api/salud`; URL
https://vigia-despensa.onrender.com; ojo: `APP_ORIGEN` con https, si no
todo lo que guarda da 403) y paso 6 en el iPhone: instalación sin barra
de Safari, `theme-color`, letra del sistema, sin zoom, teclado, cuenta,
inventario, sin conexión y VoiceOver, todo bien. Arreglado: el aviso de
éxito del inventario ya se quita al cambiar de ubicación (`app-v8`, sin
desplegar). Pendiente de la fase 3: tras desplegar `app-v8`, comprobar
que la app instalada se actualiza y el `SIGTERM` en los logs de Render;
"Despertando el servidor…" tras 3 s (§8.3).

**Pendiente de otras fases:**
- Comprobar en el iPhone (fase 3): `-apple-system-body` = 17 px, sin zoom
  en campos de 16 px, el teclado sobre el pie fijo, R-07 y R-16.
- `PATCH /api/hogar` (nombre de la casa; va con la zona horaria y la hora
  del plan), `server/log.js` (SEC-09), límite de intentos en
  `/api/hogar/unirse`, `rutas/yo.js` en el árbol de ARQUITECTURA §6,
  Privacidad (P-18, fase 5).
- La `clave` de idempotencia del lote (P-06) llega en la fase 5.
- Probar desde la pantalla: Dani → "Salir de esta casa" y "Borrar cuenta".

**Versión 2 (tras desplegar):** ideas apuntadas en ARQUITECTURA §10
("Versión 2"): V2-01 consejos de cocina con IA, V2-02 productos de temporada.

**Detalles del rediseño pendientes:** el lema de `entrar.js` sin punto
final; cambiar por SVG los caracteres "‹" (`router.js`), "+"
(`inventario.js`) y "✓"/"✗" (mensajes y `ponerErrorCampo`); probar en el
iPhone el icono instalado, la barra con `theme-color` y VoiceOver.

**Hecho (2026-11-08):** botón "Mostrar / Ocultar" en los campos de
contraseña (lo pone `crearCampo()` cuando `type: 'password'`; vale para
Crear cuenta, Entrar y Borrar cuenta); `sw.js` en `app-v7`. Probado en
el iPhone (2026-11-08) tras cerrar y abrir la app: el SW viejo seguía
sirviendo `app-v6`. Mejora propuesta: recargar sola al llegar una versión
nueva del SW (`app.js`).

**Detalles de estilo pendientes:** `@file` de
`server/pruebas/compartido.test.js` sin formatearCantidad(); 4 espacios
delante del `import` de `compartido/formato.js`; `<body>` con 6 espacios en
`index.html`; `leerBusqueda` fuera de orden en el import de
`rutas/productos.js`; en `formularioProducto.js`, sangrado de las líneas 71
y 92 y `crearAutocompletar` antes que `crearAviso`; en
`pantallas/producto.js`, el import de `/compartido/ubicaciones.js` junto a
los de `/compartido/`; en `origen.js`, un comentario con 4 espacios; en
`server/pruebas/validacion.test.js`, el `@file` con 2 espacios; en
`web/sw.js`, el bloque `if (url.pathname.startsWith('/api/'))` sin sangrar; en `app.js`, dos líneas en blanco antes del registro del SW; en
`conexion.js`, tres líneas en blanco tras `let textoActual` y
`actualizarEscrituras();` con 4 espacios.

**Cuentas de prueba** (base de datos de DESARROLLO; nunca en producción,
porque este archivo es público):
- ana@prueba.test, "una clave larga": sola en Casa de Ana (7 productos).
- carla@prueba.test, "tercera clave larga": responsable de "Casa de Bea".
- dani@prueba.test, "cuarta clave larga": miembro de "Casa de Bea".

**Cosas que conviene recordar:**
- Abrir la app en http://localhost:3000 (no 127.0.0.1: el Origin no
  coincidiría con APP_ORIGEN). Recargar (F5) tras cambiar algo de `web/`.
- Service Worker: mientras programo, F12 › Application › Service workers ›
  "Bypass for network" (o Ctrl+Shift+R). Si cambio algo de `web/` o de
  `compartido/`, subir `VERSION` en `sw.js`; si añado un archivo, meterlo
  en `ARCHIVOS`.
- PowerShell: las peticiones que cambian algo necesitan
  `-Headers @{ Origin = 'http://localhost:3000' }`; dentro de comillas
  dobles, `$` se escribe `` `$ ``; para JSON, `Invoke-RestMethod`.
- Si el login da 429 en desarrollo: guardar un archivo del servidor
  (`--watch` reinicia y los contadores en memoria vuelven a cero).
- Mis reglas de diseño (skill reglas-diseno-web) en cada formulario; la
  etiqueta flotante (regla 1) la elegí a sabiendas.
- Secretos: copia en Bitwarden, nota `recetas-pwa · .env desarrollo`
  (D-34). Comprobar que la nota tiene `sslmode=verify-full`.
- Commits: si se lo pido, los hace Claude (con mi permiso en cada paso).

## Trabajo en dos equipos
Trabajo desde el sobremesa (Windows) y el portátil. Al empezar la sesión
recuérdame hacer `git pull`; al terminar, actualiza conmigo "Estado actual" y
recuérdame hacer commit y push.

