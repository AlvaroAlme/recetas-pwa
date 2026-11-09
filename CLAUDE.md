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
**Fases aprobadas:** 0 (2026-10-27), 1 (2026-11-02), 2 (2026-11-04),
3 (2026-11-08) y 4 (2026-11-09). El detalle de cada paso está en los
commits (`git log`).

**Fase 5 (escaneo de tickets con Claude): en curso.** Plan: 1 verificar
R-17 y R-08; 2 `004_ia.sql` y constantes; 3 portar `claude.js` y
`ticket.js` con pruebas; 4 cuota (`cuotaIa.js`) y rutas de IA
(`/api/ia/aviso-aceptado`, `/api/ia/ticket` con firma y tamaño del
archivo, `/api/yo` con `cuotaIa`); 5 `POST /api/productos/lote`
idempotente (P-06); 6 pantalla Ticket (input sin `capture`, revisión
línea a línea); 7 `/privacidad` (P-18); 8 workspace de Anthropic con
límite de gasto (preguntar antes), `ANTHROPIC_API_KEY` en `.env` y
Render, desplegar e iPhone.
Hecho (2026-11-09): pasos 1, 2 y 3. D-47: PDF ≤ 20 MB (25 no cabe en
los 32 MB de la API en base64), `anthropic-version: 2023-06-01`, Claude
espera 60 s (menos que los 75 s de `api.js`) y la cuota se devuelve con
cualquier error reintentable. `004_ia.sql` aplicada en desarrollo (NO en
producción: se aplica sola al desplegar). `ErrorClaude` hereda de
`ErrorApi`; la key la pasa quien llama (así las pruebas no cargan
`config.js`). `ticket.js` devuelve `ubicacionesPosibles` (camelCase); el
tipo y el tamaño del archivo se validan en la ruta (paso 4).
Pendiente de decidir en el paso 4: el límite del cuerpo (un PDF de
20 MB son ~27 MB en base64; subir `express.json` solo en esa ruta o usar
`FormData`) y si `server/log.js` (SEC-09) entra en esta fase.

**Fase 4 (tuppers y avisos Web Push): aprobada.** Tuppers, Web Push
(`web-push` 3.6.7 fija; la 4.0.0 salió el 2026-11-06), agenda en memoria
(D-14) con `POST /api/tareas/avisos` cada 5 min desde cron-job.org,
Bienvenida P-03 (D-46), `PATCH /api/hogar` (nombre y zona; la hora del
plan, en la fase 7) y "Cambiar nombre" en Ajustes. `sw.js` en `app-v13`.
Todo el "Hecho cuando" comprobado (iPhone, Chrome, Neon se suspende, la
suscripción caducada se borra sola). Secretos: `VAPID_*` y
`CRON_SECRETO` de desarrollo en `.env` y Bitwarden; los de producción,
distintos, en Render y en la nota `vigia-produccion`. `config.js` no
arranca si falta alguno: añadir las variables en Render ANTES del push.
`VAPID_SUJETO` es la URL de Render (no un email).
Para arrancar el servidor desde Claude hay un `.claude/launch.json`
(ignorado por git).

**Pendiente de otras fases:**
- Comprobar en el iPhone (fase 3): `-apple-system-body` = 17 px, sin zoom
  en campos de 16 px, el teclado sobre el pie fijo, R-07 y R-16.
- `server/log.js` (SEC-09), límite de intentos en
  `/api/hogar/unirse`, `rutas/yo.js` en el árbol de ARQUITECTURA §6,
  Privacidad (P-18, fase 5).
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
`web/sw.js`, el bloque `if (url.pathname.startsWith('/api/'))` sin sangrar; en `app.js`, dos líneas en blanco antes del registro del SW.

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

