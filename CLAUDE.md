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
3 (2026-11-08), 4 (2026-11-09), 5 (2026-11-12), 6 (2026-11-15), 7
(2026-11-16) y 8 (2026-11-17). El detalle de cada paso está en los
commits (`git log`).

**Fases 6 a 9 replanteadas (2026-11-13, D-48):** la IA es un chat
ayudante con acciones (tarjetas que se confirman), el cuadrante va por
fechas (semanas vacías, "fuera de casa", grupos de alimentos y equilibrio
semanal calculado sin IA) y el chat llega al final. Nuevo orden: 6
recetario y "La he cocinado" (sin IA), 7 cuadrante por fechas (sin IA),
8 chat ayudante, 9 cierre. Calendario: V2-03.
**Fases 9 y 10 nuevas (2026-11-18, D-52):** antes del cierre, 9 Perfil y
avatar, y 10 Lista de la compra (D-53 se fija en su paso 1). El cierre
pasa a ser la 11 (recuperar la contraseña y cambiar el email: el
proveedor de correo se decide entonces; en Render gratis el SMTP está
bloqueado, hace falta una API HTTPS como Brevo o Resend).
**Siguiente: fase 9, paso 2** (`008_perfil.sql` y la API del perfil, con
pruebas). Paso 1 (documentación: D-52, P-16 Perfil y P-22 a P-26) hecho.

**Fase 8 (chat ayudante con IA): aprobada.** Los 7 pasos (2026-11-17),
desplegada en Render (`app-v28`, con `007_chat` aplicada en producción) y
probada en el iPhone. Lo que conviene recordar:
- D-51: `claude-sonnet-5-5`, razonamiento adaptativo con esfuerzo `low`,
  `@anthropic-ai/sdk` 1.4.0 fija. Una conversación por persona (40
  preguntas, se borra a los 30 días), 30 mensajes al día por persona, 5
  vueltas de herramientas. El historial se guarda y se reenvía TAL CUAL
  y las instrucciones no cambian nunca (la fecha va en cada mensaje,
  `bloqueFecha()`): si no, se pierden el razonamiento y la caché.
- Servidor: `rutas/chat.js` (`res.flushHeaders()` en cuanto se reserva la
  cuota, así no sale "Despertando…" mientras Claude piensa),
  `servicios/chat.js` (bucle e `INSTRUCCIONES`), `herramientasChat.js`
  (las 5 herramientas) y `vistaChat.js` (lo que ve la persona: nunca el
  razonamiento ni los bloques de herramientas).
- Navegador: `api.flujo()` (NDJSON, 90 s de silencio como mucho),
  `pantallas/ayudante.js`, `mensajeChat.js`, `tarjetaReceta.js` y
  `tarjetaHuecos.js`. Si se corta a media respuesta, el texto vuelve al
  área de texto.
- Las tarjetas se guardan leyendo la propuesta del historial (no del
  navegador) y se reclaman en `tarjetas_chat` (la segunda vez, 409).
- Probar el chat en desarrollo gasta cuota y céntimos: preguntar antes y
  al acabar, `aviso_chat_aceptado_en = NULL` y borrar `uso_ia`.
- Campos de fecha y hora en el iPhone: `appearance: none` y `min-width: 0`
  (si no, el control de Safari se sale de la pantalla).

**Fase 7 (cuadrante por fechas, sin IA): aprobada.** Los 7 pasos
(2026-11-16), desplegada en Render (`app-v26`, con `006_cuadrante`
aplicada en producción) y probada en el iPhone, con el aviso "Mañana
comes…". Lo que conviene recordar:
- D-50: tabla `cuadrante` (fecha + comida/cena) con receta, plato escrito
  a mano o "fuera de casa" (su `texto_libre` es una nota opcional:
  "Comida aniversario" es una cita, no un plato); grupo opcional de 8
  (`GRUPOS_ALIMENTOS`); margen de un año (400 `FECHA_FUERA_DE_MARGEN`).
  Rutas `/semana`, `/semana/:lunes`, `/plan/:fecha` (P-15) y
  `/plan/:fecha/:tipo` (P-14).
- `compartido/plan.js`: semanas (`lunesDe`, `textoSemana`,
  `dentroDelMargen`), `nombrePlato`, `textoAviso`, `equilibrioSemana()`
  frente a AESAN 2022 (`OBJETIVOS_AESAN`) y `avisosDia()` (el mismo grupo
  en comida y cena; el día en que se pasa de un máximo).
  `compartido/horas.js`: `validarHora()`.
- Aviso del plan: `PLAN_CON_AVISO` (`servicios/avisos.js`) es la MISMA
  condición para la agenda y para el envío; se reclama con `INSERT … ON
  CONFLICT DO NOTHING` en `avisos_plan_enviados`; va desde la hora de la
  víspera hasta medianoche; "fuera de casa" no avisa. La tarea de avisos
  borra los huecos de más de un año y los avisos de más de 7 días.
- SQL: 'cena' va antes que 'comida' por orden alfabético (`ORDER BY
  tipo_comida = 'cena'`); las fechas, como `::text` (si no, `pg` da un
  Date en la hora del servidor).
- `schema_migrations` guarda la `version` (6) y el nombre sin número
  ('cuadrante'): para rehacer una migración en desarrollo, borrar por
  `version`. `npm.cmd run dev` migra al arrancar. Solo se puede corregir
  una migración que aún no esté en producción.

**Fase 6 (recetario y "La he cocinado"): aprobada.** Los 7 pasos
(2026-11-13 a 2026-11-15), desplegada en Render (`app-v23`, con
`005_recetas` aplicada en producción) y probada en el iPhone y con dos
navegadores a la vez (409). Lo que conviene recordar:
- D-49: recetas escritas a mano; editar (PUT), ingredientes en filas,
  pasos en un área de texto (uno por línea), raciones opcionales (1 a 20).
- `compartido/cocina.js`: `estadoIngrediente()` (tienes, poco,
  otra_unidad, tupper, falta) y `cantidadPropuesta()` (en la unidad del
  producto; null si no se puede convertir, y entonces se PREGUNTA).
- `POST /api/cocinar`: TX con `FOR UPDATE` en orden de id, todo o nada,
  409 `INVENTARIO_CAMBIADO` (la pantalla recarga y mantiene lo decidido),
  `conClave()` (una clave por visita) y suma los descuentos del mismo
  producto.
- Pantallas: `recetas.js` (P-09), `editarReceta.js` +
  `formularioReceta.js` (P-20), `receta.js` + `vistaReceta.js` (P-11,
  `cargarInventarioCompleto()`) y `cocinar.js` + `filaCocinar.js` (P-12).
  `crearCampo()` admite `select` y `textarea`; `ponerTitulo()` en
  `router.js`.
- `replaceChildren()` es del navegador: un `undefined` sale como texto
  (usar `...(x ? [nodo] : [])`); `el()` sí lo ignora.
- En el navegador integrado de Claude con el panel oculto, el `<dialog>`
  no lanza `close`: probar `confirmar()` en Chrome.
- VS Code: la extensión SQL Server (mssql) marca en rojo los `.sql` de
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

**Hecho el 2026-11-17 (pendientes de fases anteriores):**
- La primera petición tras un rato que daba "No hay conexión…": `api.js`
  la repite UNA vez sola si es seguro (un GET o una escritura con
  `clave`: "Guardar ticket" y "La he cocinado"; `sePuedeRepetir()`).
  Probado simulando el fallo; si vuelve a pasar en el iPhone, mirar los
  Logs de Render a esa hora.
- Plan del día: `productosDelPlato()` (`compartido/cocina.js`) busca
  palabra a palabra, sin contar "asado", "frito"…: "Pollo asado" ya
  encuentra "Pechuga de pollo". Las recetas siguen con
  `buscarProductos()` (más estricta, para no dar falsos positivos).
- Borrada la cena del 19 de Ana que solo tenía grupo (resto de pruebas).
- `sw.js` en `app-v29`.

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
- ana@prueba.test, "una clave larga": propietaria de "Casa de Ana" (11
  productos y huecos de prueba en la semana del 16 de noviembre).
- carla@prueba.test, "tercera clave larga": miembro de "Casa de Ana".
- dani@prueba.test, "cuarta clave larga": propietario de "Casa de Bea" (vacía).
(Comprobado el 2026-11-16.)

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

