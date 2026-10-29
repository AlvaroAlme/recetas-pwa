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
- Fase 1 (base de datos y CRUD del inventario) en curso.
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
  ROLLBACK de un lote roto. `npm test`: 30 de 30. Último commit: 15f100a.
- En Neon (hogar 1) quedan productos de prueba: leche y tomate (nevera),
  lentejas y pasta (despensa), queso (congelador). Sirven para el frontend.
- Siguiente: frontend del inventario, en pasos:
  8a `app.js` sirve `/compartido/` y devuelve `index.html` en las rutas que
  no son de la API (DISENO_UI §5.2); 8b `web/css/tokens.css` y `base.css`;
  8c `el()` y `web/js/api.js`; 8d pantalla Inventario (P-04) con selector
  de ubicación y los 4 estados + router mínimo; 8e Nuevo/editar producto
  (P-05) con "¿Dónde lo guardas?"; 8f mover y borrar con `<dialog>`.
  Después, criterios de "hecho" de la fase 1 y el "ok".
- Pendiente pequeño: añadir formatearCantidad() al `@file` de
  `server/pruebas/compartido.test.js`. Comprobar que la nota de Bitwarden
  tiene ya `sslmode=verify-full` (el `.env` ya lo tiene).
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

