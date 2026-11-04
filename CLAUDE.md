# Recetas Nevera PWA

PWA instalable (iPhone) para gestionar nevera, despensa, congelador y tuppers,
con recetas generadas por IA. Recreación de la app Expo "Recetas Nevera".
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
- Fase 0 (proyecto y servidor mínimo) aprobada el 2026-10-27.
- Fase 1 (base de datos y CRUD del inventario) aprobada el 2026-11-02.
  Pendiente de comprobar en el iPhone (fase 3): `-apple-system-body` = 17 px,
  sin zoom en campos de 16 px y el teclado sobre el pie fijo.
- Fase 2 (cuentas, sesiones y hogar compartido) en curso. Plan de pasos:
  1 migración `002_cuentas.sql` (usuarios sin `aviso_ia_aceptado_en`, que
  llega en la 004; miembros, invitaciones, sesiones); 2 contraseñas con
  scrypt; 3 registro, login y logout con cookie; 4 middlewares `sesion` y
  `exigirSesion` (sustituyen al hogar de desarrollo); 5 `origen`, `limite`
  y helmet con CSP (preguntar antes de instalar helmet); 6 invitaciones,
  unirse, salir y borrar cuenta; 7 pantallas Entrar, Registro y Ajustes del
  hogar, y el 401 en `api.js`.
- Hecho fase 2 (pasos 1–4, 2026-11-02):
  - 1: migración `002_cuentas.sql` APLICADA en Neon.
  - 2: `servicios/contrasenas.js` (scrypt N=2^14 r=8 p=5, D-43; NFC;
    timingSafeEqual) con pruebas.
  - 3: `validarRegistro`/`validarLogin` en `compartido/validacion.js`
    (D-40) con pruebas; `servicios/sesiones.js` (token de 32 bytes, solo
    su SHA-256 en la tabla), `servicios/usuarios.js` (registro en una
    transacción, login con HASH_FALSO para no revelar emails),
    `server/cookies.js` (HttpOnly, SameSite=Lax, Secure en producción;
    lectura propia, D-12), `validacion/auth.js`, `rutas/auth.js`
    (registro 201/409, login 200/401, logout 204).
  - 4: middlewares `sesion` y `exigirSesion`; borrados `desarrollo.js`,
    `semilla.js` y `npm run semilla` (D-39 cumplida). Productos de prueba
    movidos a "Casa de Ana" (hogar 2); el hogar 1 ya no existe.
  - Probado: 401 sin cookie, cada cuenta ve solo su hogar, Bea recibe 404
    con la leche de Ana. `npm test`: 47 de 47.
  - helmet 8.3.0 instalado (sin dependencias, 0 vulnerabilidades).
- Hecho fase 2 (pasos 5–6b, 2026-11-03):
  - 5a: `middlewares/origen.js` (Origin ≠ APP_ORIGEN → 403; cuerpo de verdad
    y no JSON → 415; un POST vacío con Content-Length: 0 sí pasa).
  - 5b: `middlewares/limite.js` (`crearLimite`, ventana fija en memoria,
    429 + Retry-After; general 300/15 min por IP, login 10 por IP y 5 por
    email con `olvidar()` al acertar, registro 5/hora) y sus pruebas.
  - 5c: helmet con la CSP de §9.7 (`useDefaults: false`, sin
    upgrade-insecure-requests) y `trust proxy` solo en producción.
  - 6a: `servicios/hogares.js` (`crearInvitacion`, código de 8 caracteres
    sin I/L/O/0/1, SHA-256, 48 h), `rutas/hogar.js`, límite 3/hora por
    persona.
  - 6b: `validarCodigoInvitacion` (compartido), `validacion/hogar.js`,
    `unirse` con FOR UPDATE y `dejarHogar` (borra el hogar si te quedas
    sola, con CONFIRMAR_BORRADO si tiene datos; pasa la propiedad).
  - Probado: 403 con Origin ajeno, 415, 429 al sexto login fallido, CSP
    bloquea scripts en línea, Bea se une a Casa de Ana y ven el mismo
    inventario (Casa de Bea se borró). `npm test`: 51 de 51.
  - Criterios de servidor de la fase 2: TODOS cumplidos.
- Hecho fase 2 (pasos 6c–7b, 2026-11-04):
  - 6c: `dejarHogar` exportada, `nombreDeCasa`, `obtenerHogar`, `salir`
    (409 si eres la única), `borrarCuenta` (pide contraseña),
    `leerBorrarCuenta`, `POST /api/hogar/salir`, `rutas/yo.js` (`GET` y
    `DELETE /api/yo`). Probado: herencia de la propiedad al salir y al
    borrar la cuenta, CONFIRMAR_BORRADO al unirse con datos.
  - 7a: 401 SIN_SESION en `api.js` → `/entrar?volver=…`; rutas `publica`
    en el router (sin pestañas, `.app--publica`); `leerCampo()`;
    `pantallas/entrar.js` con `destinoSeguro()` (contra redirecciones
    abiertas: rechaza "//" y "/\").
  - 7b: `pantallas/registro.js` (new-password, ayuda "Mínimo 10
    caracteres.", 409 en campos.email, mensaje de bienvenida).
  - Probado en el navegador sin escribir: redirección a /entrar, errores
    de los formularios. FALTA mi prueba que escribe: entrar con Ana (mal y
    bien → vuelve a la despensa), `?volver=//google.com` → `/`, registro
    con ana@ (409) y una cuenta nueva (dani@prueba.test).
- Hecho fase 2 (pasos 7c–7d, 2026-11-04):
  - Reglas de diseño 2 y 3: placeholder "nombre@correo.com" en los emails
    e icono de información (SVG con createElementNS) en las ayudas.
    `crearCampo` pone `placeholder: ' '` por defecto (sin él, la etiqueta
    flotante se quedaba siempre arriba).
  - 7c: `pantallas/ajustes.js` (Tu casa: miembros con "Responsable",
    invitar, unirse, salir con confirmación; Cuenta: email, cerrar sesión,
    borrar cuenta).
  - 7d: `pantallas/invitar.js` (código al pulsar, copiar y compartir),
    `pantallas/unirse.js` (CONFIRMAR_BORRADO con el diálogo) y
    `pantallas/borrarCuenta.js` (ruta nueva `/cuenta/borrar`, pide la
    contraseña); `api.borrar(ruta, cuerpo)`.
  - Probado: Carla invita, Dani se une confirmando el borrado de su casa.
- ARREGLAR PRIMERO: en `web/js/pantallas/entrar.js`, línea 29, falta el ()
  de `tomarMensaje()`. Sin él, `mensaje` es la propia función y la
  pantalla Entrar enseña su código en un aviso verde. También: el `@file`
  de `web/js/app.js` aún dice "en la 2, la sesión".
- Cuentas de prueba en Neon (contraseñas de prueba, solo desarrollo):
  - ana@prueba.test, "una clave larga": sola en Casa de Ana (7 productos).
  - carla@prueba.test, "tercera clave larga": responsable de "Casa de Bea".
  - dani@prueba.test, "cuarta clave larga": miembro de "Casa de Bea".
  NO usar esta base de datos en producción (este archivo es público).
- Falta por probar del 7d: Dani → "Salir de esta casa" y "Borrar cuenta"
  (si la borras, quítala de esta lista).
- Siguiente: cerrar la fase 2 (criterios de §10, ✅ 🧪 ⚠️ y el "ok"), y
  añadir `/cuenta/borrar` a la tabla de rutas de DISENO_UI §5.2.
- Abrir la app en http://localhost:3000 (no 127.0.0.1: el Origin no
  coincidiría con APP_ORIGEN). En PowerShell, las peticiones que cambian
  algo necesitan `-Headers @{ Origin = 'http://localhost:3000' }`.
- En el navegador, sin pantalla Entrar todavía: entrar desde la consola con
  `fetch('/api/auth/login', …)` y recargar.
- Siguiente: paso 6c (explicado en la conversación, sin escribir):
  `hogares.js` exporta `dejarHogar` y añade `nombreDeCasa`, `obtenerHogar`
  y `salir`; `usuarios.js` usa `nombreDeCasa` y añade `borrarCuenta`;
  `validacion/auth.js` `leerBorrarCuenta`; `POST /api/hogar/salir`;
  `rutas/yo.js` (`GET /api/yo`, `DELETE /api/yo`) montado en app.js. Prueba
  con Bea y una cuenta nueva de Carla (Ana no se toca). Después, paso 7.
- Detalle pendiente: en `origen.js`, la primera línea del comentario
  "¿Lleva cuerpo DE VERDAD?" tiene 4 espacios (van 2); en
  `server/pruebas/validacion.test.js`, el `@file` con 2 espacios.
- Hecho fase 0: git init, .gitignore, .env.ejemplo, package.json,
  express 5.2.1, `server/config.js`, `server/app.js` (Express mínimo y
  `GET /api/salud`; sin helmet ni trust proxy de momento),
  `server/index.js` y `web/index.html`.
- Hecho fase 1 (pasos 1–4): Neon en Frankfurt con PostgreSQL 18 y conexión
  directa (D-36 a D-38), pg 8.23.1, `DATABASE_URL` en config,
  `server/bd/pool.js`, `transaccion.js` (probado el rollback), `migrar.js`,
  `cli-migrar.js`, `npm run migrar` y la migración 001 APLICADA en Neon
  (tablas hogares y productos, vacías).
- Hecho fase 1 (pasos 5–6c): semilla (`server/desarrollo.js`,
  `server/bd/semilla.js`, `npm run semilla`; hogar id 1 creado en Neon y
  contador de ids colocado), `compartido/constantes.js`, `texto.js`,
  `ubicaciones.js` (Map; los 54 alimentos coinciden con Expo) y las primeras
  pruebas (`server/pruebas/compartido.test.js`, `npm test`: 9 de 9).
- Hecho fase 1 (pasos 6d–7e, PARTE DEL SERVIDOR TERMINADA):
  `compartido/fechas.js`, `formato.js` (formatearCantidad),
  `validacion.js` (validarProducto, D-40), `MAX_PRODUCTOS_TICKET`;
  `server/errores.js` (ErrorApi) y `middlewares/errores.js` (404 de la API
  y JSON de §5.1); `servicios/inventario.js` (listar, obtener, crear,
  actualizar, mover, borrar y crearProductos en transacción);
  `validacion/productos.js` (leerId, leerUbicacion, leerProducto,
  leerLote); `usarHogarDesarrollo` en `desarrollo.js`;
  `rutas/productos.js` montado en `app.js`. Probado con
  Invoke-RestMethod: crear, editar, mover, lote, borrar, 400 y 404; y el
  ROLLBACK de un lote roto. `npm test`: 30 de 30.
- Hecho fase 1 (frontend, pasos 8a–8e-2b, 2026-10-30):
  - 8a: `app.js` sirve `/compartido/` y devuelve `index.html` en las rutas
    de la app (`/{*ruta}` sin extensión).
  - Identidad visual propia D-41 (base crema, botones salvia `#488063`,
    escalas y radios de Fibonacci, botones de 21 px): `web/css/tokens.css`,
    `base.css` y `componentes.css`.
  - 8c: `web/js/dom.js` (`el()` sin innerHTML) y `api.js` (ErrorApi,
    15 s, SIN_CONEXION / TIEMPO_AGOTADO).
  - 8d: esqueleto en `index.html` (barra de pestañas abajo / lateral desde
    48em), `router.js` (pushState, popstate, delegación de clics, turno,
    `navegar`, `volver`, `tomarMensaje`, "‹ Atrás" con `{ dentro }`),
    `app.js` con las rutas, pantallas `inventario.js` (selector en la URL,
    lista por caducidad, cargando/vacío/error) y `noExiste.js`.
  - Primitivas en `web/js/componentes/ui/index.js` (selector, fila, carga,
    vacío, aviso, campo con etiqueta flotante, ponerErrorCampo,
    ponerCargando). `avisoCaducidad()` en `compartido/formato.js`.
  - 8e-2: `componentes/formularioProducto.js` ("¿Dónde lo guardas?",
    validarProducto compartido) y `pantallas/producto.js` (alta con POST y
    mensaje de éxito). Probado guardando en Neon. Placeholders "Ej. …"
    (decisión mía; DISENO §3.2 actualizado).
  - 8e-2b: `GET /api/productos/nombres?q=` (D-42: historial del hogar,
    DISTINCT ON, comodines escapados).
  - 8e-2c/8e-2d (2026-11-01): `compartido/sugerencias.js` (89 alimentos,
    `buscarAlimentos`, pruebas) y `crearAutocompletar()` (combobox ARIA,
    250 ms, turno, historial + lista fija, propone unidad y ubicación; la
    ubicación de una sugerencia se olvida al cambiar el nombre).
  - 8e-3: editar (`/producto/:id`: GET, formulario relleno, PUT, "Cambios
    guardados.", "Este producto ya no existe", pie oculto con `:has`).
    "(opcional)" en tono suave (regla 6 de mis reglas de diseño).
  - 8f: mover (PATCH, "Moviendo…") y borrar con `confirmar()` en un
    `<dialog>` (D-28); `mensajeDeError()` en `api.js`; tokens
    `--sombra-flotante`, `--color-sobre-peligro`, `--color-velo`.
    Probado guardando, moviendo y borrando en Neon.
  - `npm test`: 36 de 36. Último commit: 2d9dd54.
- En Neon (hogar 1): nevera (pechuga de pollo, leche semidesnatada de
  prueba, leche entera 2 l), despensa (lentejas, pasta), congelador
  (pechuga de pollo caducada, queso). El tomate se borró en la prueba.
- "Congelador vacío" corregido en el estado vacío del inventario.
- Pendiente pequeño: añadir formatearCantidad() al `@file` de
  `server/pruebas/compartido.test.js`; quitar los 4 espacios delante del
  `import` de `compartido/formato.js`; poner `<body>` con 2 espacios en
  `index.html`; ordenar `leerBusqueda` en el import de `rutas/productos.js`;
  en `formularioProducto.js`, sangrado de las líneas 71 y 92 y
  `crearAutocompletar` antes que `crearAviso`; en `pantallas/producto.js`,
  el import de `/compartido/ubicaciones.js` junto a los de `/compartido/`.
- Mis reglas de diseño (skill reglas-diseno-web): la regla 1 pide la
  etiqueta encima del input; elegí la etiqueta flotante a sabiendas.
  Comprobar que la nota de Bitwarden tiene ya `sslmode=verify-full` (el
  `.env` ya lo tiene).
- Commits: si me lo pide, los hace Claude (con mi permiso en cada paso).
- Lote: la `clave` de idempotencia (P-06) llega en la fase 5 (tabla
  `operaciones`, migración 004), dentro de la misma transacción.
- PowerShell: dentro de comandos con comillas dobles, el `$` se escribe
  `` `$ ``. Para mandar JSON a la API, `Invoke-RestMethod` (curl.exe pierde
  las comillas dobles del cuerpo en PowerShell 5.1).
- Secretos de desarrollo: copia en Bitwarden, nota `recetas-pwa · .env
  desarrollo` (D-34).

## Trabajo en dos equipos
Trabajo desde el sobremesa (Windows) y el portátil. Al empezar la sesión
recuérdame hacer `git pull`; al terminar, actualiza conmigo "Estado actual" y
recuérdame hacer commit y push.

