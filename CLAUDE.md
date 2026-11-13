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
3 (2026-11-08), 4 (2026-11-09) y 5 (2026-11-12). El detalle de cada paso
está en los commits (`git log`).

**Fases 6 a 9 replanteadas (2026-11-13, D-48):** la IA es un chat
ayudante con acciones (tarjetas que se confirman), el cuadrante va por
fechas (semanas vacías, "fuera de casa", grupos de alimentos y equilibrio
semanal calculado sin IA) y el chat llega al final. Nuevo orden: 6
recetario y "La he cocinado" (sin IA), 7 cuadrante por fechas (sin IA),
8 chat ayudante, 9 cierre. Calendario: V2-03.
**Fase 6 (recetario y "La he cocinado"): en curso.** Plan: 1
`005_recetas.sql` y `validarReceta()`; 2 "qué me falta" en
`compartido/cocina.js`; 3 `/api/recetas` (crear, ver, editar, borrar);
4 `POST /api/cocinar` (TX con `FOR UPDATE` en orden de id, 409
`INVENTARIO_CAMBIADO`, `conClave()`); 5 pantallas: lista P-09 sin IA,
formulario de receta NUEVO (reglas de formularios) y detalle P-11 con
"qué me falta"; 6 "La he cocinado" P-12; 7 `sw.js` (añadir
`/compartido/cocina.js` a `ARCHIVOS` y subir `VERSION`), desplegar e
iPhone. D-49: editar (PUT), ingredientes en filas, pasos en un área de
texto (uno por línea) y raciones opcionales (1 a 20).
Hecho (2026-11-13): pasos 1, 2 y 3 (`005_recetas` aplicada en
desarrollo; 100 pruebas en verde; `/api/recetas` probada desde la
consola). Siguiente: paso 4.
VS Code: la extensión SQL Server (mssql) marca en rojo los `.sql` de
PostgreSQL; no son errores (la prueba real es `npm.cmd run migrar`).

**Fase 5 (escaneo de tickets con Claude): aprobada.** Los 8 pasos
(2026-11-09 a 2026-11-11), desplegada en Render (`app-v18`) y probada en
el iPhone; todo el "Hecho cuando" comprobado (ticket real,
`NO_ES_TICKET`, 429 en la llamada 11, la key no llega al navegador,
pruebas en el límite). Lo que conviene recordar:
- D-47: PDF ≤ 20 MB, `anthropic-version: 2023-06-01`, Claude espera
  60 s (menos que los 75 s de `api.js`) y la cuota se devuelve con
  cualquier error reintentable.
- Cuerpo del ticket: el `express.json` de 100 KB se salta
  `/api/ia/ticket`, que lee el suyo (~27 MB, calculado de
  `MAX_BYTES_PDF_TICKET`) solo con sesión y con el aviso aceptado.
- `ANTHROPIC_API_KEY`: obligatoria solo en producción; sin ella, en
  desarrollo `/api/ia/ticket` da 503 `IA_NO_CONFIGURADA` sin gastar
  cuota. Workspace `vigia` (con límite de gasto) y dos keys:
  `vigia-desarrollo` (`.env` y Bitwarden) y `vigia-produccion` (Render
  y nota `vigia-produccion`).
- Idempotencia (P-06): `conClave()` en `servicios/operaciones.js`
  reserva la clave LO PRIMERO (`ON CONFLICT DO NOTHING`); la usará
  también `/api/cocinar` (fase 6). Las claves de más de 7 días se borran
  en la tarea de avisos.
- Pantalla Ticket: `archivoTicket.js` (canvas 2000 px, JPEG 0,8),
  `pantallas/ticket.js` y `componentes/lineaTicket.js`; un solo botón
  sin `capture` (R-08). `/privacidad` pública, contacto = mi perfil de
  GitHub. Render y Neon, los dos en Frankfurt (D-36).
- Probar la IA en desarrollo gasta consultas de Ana y céntimos del
  workspace: al acabar, `aviso_ia_aceptado_en = NULL` y borrar `uso_ia`.
- SEC-09: `server/log.js` con `logError(que, error, idPeticion)` (en
  producción una línea sin traza; lo configura `index.js`, así
  `claude.js` y las pruebas no cargan `config.js`), el middleware
  `idPeticion` (cabecera `X-Id-Peticion`, el mismo id que en el log del
  500) y `web/js/log.js`, que solo escribe en `localhost`.

**Pendiente de otras fases:**
- A veces la PRIMERA petición tras un rato (Chrome en el PC y el iPhone en
  producción) da "No hay conexión…" y la segunda funciona. No se
  reproduce (2026-11-11): Neon despertando, el pool, IPv6 y el SW
  (solo toca los GET) descartados. La próxima vez, recoger pruebas: en
  Chrome, F12 › Network, el *Status* de la petición que falla
  (`net::ERR_…`) y la terminal de `npm.cmd run dev`; en el iPhone, la
  hora y qué hacía (¿volvía a la app?) para mirar los Logs de Render.
  Si es una conexión reutilizada muerta, la idea es reintentar una vez
  en `api.js` (seguro en GET, `/lote` y `/cocinar`).

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

**Hecho el 2026-11-12 (pendientes de fases anteriores):** límite de
`/api/hogar/unirse` (10 intentos por hora y persona); el árbol de
ARQUITECTURA §6; "Salir de esta casa" y "Borrar cuenta" probados desde
la pantalla (miembro y única persona); en el iPhone, el texto con el
tamaño del sistema, sin zoom en los campos, el teclado y R-07/R-16; y
todos los detalles de estilo (`sw.js` en `app-v18`).

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

