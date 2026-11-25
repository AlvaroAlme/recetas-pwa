# Stockpot (antes Vigía y Recetas Nevera PWA)

PWA instalable (iPhone) para controlar lo que hay en la nevera, la despensa,
el congelador y los tuppers, y no tirar comida, con recetas generadas por IA.
Nombre comercial "Stockpot" desde el 2026-11-25 (D-59, `docs/marca.md`;
antes "Vigía", D-45); la carpeta y el repo siguen como `recetas-nevera-pwa`
y los identificadores internos con "vigia" no cambian. Recreación de la app
Expo "Recetas Nevera".
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
(2026-11-16), 8 (2026-11-17), 9 (2026-11-18), 10 (2026-11-18), 11
(2026-11-23), 12 (2026-11-25) y 13 (2026-11-25). El detalle de cada paso
está en los commits (`git log`).

**Versión 2 (D-60, 2026-11-25): plan escrito** en la rama `v2/plan` (lo
escribió Claude a petición del autor, que eligió que entraran todas las
ideas, con lo que no usa IA primero). Fases (ARQUITECTURA §10): 14 Usar
pronto y modo cocina, 15 Recetario con datos y filtros, 16 Ayudante con
contexto (las herramientas del chat cambian una sola vez: excepción a
D-51), 17 Categorías y dibujos, 18 Temporada, 19 Calendario y 20 Cierre.
Cada fase contesta sus "Preguntas para el paso 1" con el autor y las
apunta como su propia D-xx. Ideas sacadas de §10 y de la fila "Ideas v2"
del lienzo.
**Fase 14: paso 1 aprobado** (2026-11-25; D-61; P-04, P-11, P-31 y las
rutas en DISENO_UI). Lo decidido:
- Inventario en dos filas: "Todo / Nevera / Despensa / Congelador" (se
  abre en Todo) y "Todo · N / Usar pronto · N" (`?filtro=pronto`).
- "Usar pronto" junta productos y tuppers caducados o que caducan en 3
  días o menos, por fecha; en "Todo · N" los tuppers siguen arriba.
- La tarjeta "Cocina con lo que tengo" escribe la pregunta en el
  Ayudante, sin enviarla.
- Los básicos de despensa salen de una lista fija (`BASICOS_DESPENSA`).
- Las raciones (1 a 20) también escalan lo que descuenta "La he
  cocinado" (`?raciones=`).
- Modo cocina P-31 (`/receta/:id/cocinando`) con Wake Lock (iOS 18.4).
- Sin cambios en la API ni migraciones.
**Siguiente:** paso 2, `compartido/` (`usarPronto()`,
`escalarIngredientes()`, `BASICOS_DESPENSA` y `esBasico()`, con pruebas):
preguntar antes quién lo escribe.

**Rebranding a Stockpot (D-59): hecho, desplegado y probado en el
iPhone** (2026-11-25, lo escribió Claude a petición del autor; fases 0 a 7
con su "ok"; unido a `main` en b71c803, `app-v56` en Render;
`CORREO_REMITENTE` cambiado en `.env` y en Render). Solo lo visual: paleta arena/marino/azul polvo/vino en `tokens.css`
(nuevos `--color-tinte`, `--color-sobre-tinte`, `--color-borde-ok/pronto/
caducado` y `--alto-barra`), Fraunces 700 con `opsz` en `web/fuentes/`
(Bricolage borrada), avisos de caducidad con borde, chips elegidos con el
tinte, barra de pestañas flotante (pastilla que crece con
`grid-template-columns` 0fr→1fr: excepción a D-56; el Ayudante, botón
redondo aparte; desde 48em sigue la lateral de D-27), textos, correos
(colores incluidos), `INSTRUCCIONES` del chat (excepción a D-51), manifest,
`theme-color` e iconos de la olla; `sw.js` en `app-v56`. 268 pruebas; axe 0
en 27 pantallas, claro y oscuro, a 375 px. En el iPhone, para ver
el icono nuevo hay que reinstalar la app. Opcional: el borde `#d9c7a3` de
la barra y el aro del Ayudante en oscuro del lienzo.

**Fases 6 a 9 replanteadas (2026-11-13, D-48):** la IA es un chat
ayudante con acciones (tarjetas que se confirman), el cuadrante va por
fechas (semanas vacías, "fuera de casa", grupos de alimentos y equilibrio
semanal calculado sin IA) y el chat llega al final. Nuevo orden: 6
recetario y "La he cocinado" (sin IA), 7 cuadrante por fechas (sin IA),
8 chat ayudante, 9 cierre. Calendario: V2-03.
**Fases nuevas (2026-11-18, D-52, D-53 y D-56):** 9 Perfil y avatar, 10
Recuperar la contraseña y cambiar el email, 11 Animaciones (D-56), 12
Lista de la compra (D-54, se fija en su paso 1) y 13 cierre.
**Fase 13 (Cierre): aprobada** (2026-11-25, "ok" del autor tras probar
`app-v57` en el iPhone: el tupper con aviso, el avatar que "piensa" y
VoiceOver; lo escribió Claude a petición del autor; detalle en
ARQUITECTURA §10 y §9.11). **Todas las fases del plan están cerradas.**
express 5.3.0 y `npm audit` con 0 vulnerabilidades; revisión de seguridad
sin hallazgos altos ni medios (§9.11); `README.md`; P3 de la auditoría
decididos (foco en "Ahora no" en `avisoPrivacidad.js`; la barra sigue
antes del contenido; `--ancho-maximo` 800 px desde 64em); tick tras un
ticket real probado en desarrollo y arreglado con "Reducir movimiento"
(la marca esperaba su `animation-delay`); `muestra-ticks.html` borrado;
`sw.js` en `app-v57`. Ana quedó como estaba (productos de prueba borrados,
`aviso_ia_aceptado_en = NULL`, `uso_ia` del día borrado). Desplegada
(`app-v57`). **Solo queda:** subir DMARC a `p=quarantine` en Cloudflare a
partir del 2026-12-09. Después, la Versión 2 (ARQUITECTURA §10).

**Fase 12 (Lista de la compra, D-54): aprobada** (2026-11-25, "ok" del
autor con `app-v54`). Probado en el iPhone con `app-v53`: apuntar,
tachar, quitar y "Añadida sola". **Correcciones hechas** (2026-11-25, lo
escribió Claude a petición del autor; cambios del autor a D-54, en §11):
1. Nombres: `claveNombre()` en `compartido/texto.js` (`normalizar()` sin
   `de, del, la, el, los, las, con, y, en, al, a`; si solo hay de esas,
   todas) es lo que se guarda en `nombre_normalizado`: "Turrón de
   chocolate" tacha "turrón chocolate". `011_lista_clave.sql` recalcula
   las líneas que ya había (si dos quedan iguales sin tachar, deja la
   más antigua). Aplicada SOLO en desarrollo y comprobada; entra en
   producción con el push.
2. Unidades: `umbralLista(referencia, unidad)` en `compartido/lista.js`;
   `cruzaUmbral(antes, despues, referencia, unidad)`. En `unidades`, 1 si
   entraron más de 1 y 0 si entró 1; el 10 % sigue en g, kg, ml y l.
268 pruebas. Probado contra el servidor con Ana (turrón, 4 yogures → al
quedar 1, 1 solomillo cocinado → se apunta). Paso 5 hecho
(2026-11-24, lo escribió Claude a petición del autor): P-30 en
`pantallas/lista.js` (apuntar con autocompletado y cantidad opcional,
tachar con `aria-pressed`, ✗ para quitar, "Comprados (N)" y "Borrar
comprados", recarga en `visibilitychange`), la ruta `/lista`, la quinta
pestaña en `index.html`, su CSS (`.lista-compra`, `.linea-lista`) y
`sw.js` en `app-v53`. Probado en el navegador (claro, oscuro, 375 px).
Ojo al probar: tras `formulario.reset()` hay que lanzar `input` en el
nombre, o el autocompletado pinta la búsqueda pendiente encima. Paso 4 hecho (2026-11-24, lo escribió
Claude a petición del autor): `cruzaUmbral()` en `compartido/lista.js`
(`UMBRAL_LISTA` y `DIAS_LISTA_COMPRADAS` en constantes);
`tacharAlEntrar()`, `anadirSola()` y `borrarAntiguas()` en
`servicios/lista.js`, que reciben el `cliente` de la transacción de
quien llama; alta y lote ponen `cantidad_inicial` y tachan;
`actualizarProducto(hogarId, usuarioId, id, datos)` (ahora en TX con
`FOR UPDATE`) sube la referencia, la reinicia si cambia la unidad y
apunta al cruzar; "La he cocinado" apunta al cruzar; la limpieza diaria
borra las tachadas de más de 7 días. 260 pruebas. Probado contra el
servidor con Ana (alta, lote, editar, cambio de unidad, cocinar y
limpieza). Paso 3 hecho (2026-11-24, lo escribió
Claude a petición del autor): `/api/lista` (`rutas/lista.js`,
`servicios/lista.js`, `validacion/lista.js`, `validarLineaLista()` y
`MAX_LINEAS_LISTA` en `compartido/`, 10 pruebas en `lista.test.js`; 254
en total) y su tabla en ARQUITECTURA §5. Al destachar con otra igual sin
tachar, se borra la tachada (elección del autor; el id cambia). Probado
contra el servidor con Ana. Paso 2 hecho (2026-11-24, lo escribió Claude a
petición del autor): `010_lista.sql` (`productos.cantidad_inicial`,
rellenada con la cantidad actual salvo los agotados, y `lista_compra`
con el índice único parcial de las líneas sin tachar), aplicada SOLO en
desarrollo y comprobada (repetida → no entra; tachada → se puede volver
a apuntar; cantidad sin unidad → rechazada). Subida con el paso 3 (el
2026-11-24): `server/index.js` migra al arrancar, así que `010_lista`
ya está en producción y solo se puede cambiar con otra migración. Paso 1 hecho
(2026-11-24): D-54 en ARQUITECTURA (§10 con su "Hecho cuando" y §11; el
autor eligió referencia = cantidad al entrar, mismo nombre normalizado,
cantidad opcional en la línea y tachadas fuera a los 7 días) y P-30
Lista (`/lista`, quinta pestaña) en DISENO_UI §4 y §5.2.

**D-58, tick de guardado: hecho** (2026-11-24, "se ve bien" del autor
en el iPhone con `app-v52`). Al probarlo se añadió: el velo
(`--color-velo`) con `backdrop-filter: blur(4px)` en la propia capa (en
un hijo, el `opacity` animado de la capa lo anularía), la capa entra
fundiéndose (150 ms) y el aro va en una tarjeta `superficie` con
sombra que entra con `scale(0.9)` (en modo claro, el verde `#1b6a43`
no se veía sobre el velo); trazo de 4. Sin probar aún: el tick tras un
ticket real (gasta IA), con "Reducir movimiento" y el tupper con aviso.
Ojo: con el panel del navegador de Claude oculto, las animaciones no
avanzan (para capturar, `getAnimations()`, `pause()` y `currentTime`).

**D-58, tick de guardado (2026-11-23, pedido por el autor):** en vez
de la banda verde, al volver a Inventario tras añadir, editar, mover o
borrar un producto, guardar un ticket o marcar un tupper como consumido,
sale un aro verde que se dibuja y su tick (la opción 2 de la muestra;
excepción a D-56: anima `stroke-dashoffset`). Tras un ticket, "N
productos" debajo. "✓ Confirmar" en Ticket no anima: todo se guarda de
una vez con `/api/productos/lote`. Paso 1 hecho: `tickGuardado.js`
(`mostrarTickGuardado({ texto, detalle })`, `pathLength: '1'`,
`role="status"` en `.solo-lector`) y su CSS al final de
`componentes.css` (con "Reducir movimiento", `animation: none
!important` en la capa). Paso 2 hecho (2026-11-24, `app-v50`, lo
escribió Claude a petición del autor): el mensaje de `navegar()` puede
ser `{ tick: true, texto, detalle? }` (producto añadir/editar/mover/
borrar, tupper guardado con aviso y consumido, ticket con "N
productos"); Inventario no pinta la banda y llama a
`mostrarTickGuardado()` desde `intentarTick()`, cuando la lista ha
cargado Y la pantalla ya se ve: nuevo `alMostrar` en la Vista, que el
router llama al cumplirse `conTransicion()` (ahora devuelve una
promesa). Probado en el navegador (todo menos el ticket, que gasta IA,
"Reducir movimiento" y el tupper con aviso). Borrar
`muestra-ticks.html` (raíz, sin subir).

**Fase 11 (Animaciones, D-56): aprobada** (2026-11-23, "ok" del autor
tras probarla en el iPhone con `app-v48`). Al cerrarla (`app-v49`): la
etiqueta flotante ya solo anima `transform` (`translateY` en reposo y
`scale(13 / 16)` arriba); los caracteres ✓, ✗ y + son SVG
(`crearMarca()` y `conMarca(texto)` en `ui/index.js`, clase `.simbolo`:
`.marca` ya era el logo); D-57, los avisos de privacidad de la IA en una
ventana al entrar (`avisoPrivacidad.js`); `skills-lock.json` subido
(skills design-audit y ui-ux-audit, en `.claude/skills`, que no se
sube); la muestra de avatares, en `.gitignore`. Queda para el autor:
probar con un ticket real el avatar que "piensa" (gasta IA) y, a partir
del 2026-12-09, subir DMARC a `p=quarantine` en Cloudflare. Historia de
la fase: (antes, paso 6: desplegar `app-v46` y probar en el
iPhone que el avatar de la ruleta sale centrado y que Atrás no saca de
la app. Con `app-v45`: la Bienvenida y la ruleta, bien; pero (1) el
avatar salía a la izquierda en la ventana de la ruleta (`margin-inline:
auto`) y (2) Atrás aún volvía a Entrar: el Atrás del sistema no pasa por
`volver()`; ahora el `popstate` que llega a `/entrar` o `/registro`
desde la app cambia esa entrada por `/` (Inventario). Antes, con `app-v45`, probar en el
iPhone "Descubrir mi avatar" al crear la cuenta y que Atrás, flecha o
gesto, no saque de la app. Con `app-v44`: (1) Crear cuenta llevaba a
Inventario y no a Bienvenida, porque "Créala" pone siempre `?volver=/` y
`registro.js` miraba `consulta.has('volver')`; ahora, `volver !== '/'`.
Nadie había llegado nunca a la Bienvenida desde Entrar. (2) Atrás podía
devolverte a Entrar con la sesión abierta: el router guarda
`profundidad` en `history.state` (0 al pasar de una pantalla pública a
la app) y `volver()` solo usa `history.back()` si es mayor que 0.
Probado con una cuenta `.test` creada y borrada. El gesto de deslizar
desde el borde, `gestoAtras.js`, funciona en el iPhone; con `app-v43`, la ruleta al crear la cuenta giraba debajo del
"¿Guardar contraseña?" de iOS: ahora empieza al pulsar "Descubrir mi
avatar"; tercera prueba con `app-v41`: todo
bien salvo que al crear la cuenta no salía la ruleta. Arreglado en
`app-v42`: Bienvenida usa la ruleta flotante al llegar, solo la primera
vez, `esperarEnPantalla`. La app instalada en iOS NO tiene gesto de
"atrás" (solo Safari): el autor pidió hacerlo nosotros (`app-v43`). Antes,
con `app-v41`, se arregló: las pantallas y "Otro avatar"; segunda prueba con `app-v40`:
botones y lo demás bien, pero al cambiar de pantalla se veía la rueda de
"Cargando…" y la ruleta apenas se notaba. Arreglado en `app-v41`: el
router espera hasta 500 ms a que la pantalla nueva tenga sus datos
(`esperarContenido`) y `.carga` solo aparece pasados 0,3 s; "Otro
avatar" usa la ruleta flotante, `componentes/ruleta.js`, unos 3,9 s; con permiso, un ticket real para ver el
avatar que piensa). Primera prueba en el iPhone (2026-11-18, `app-v39`):
no se veía nada (ni transiciones, ni ruleta, ni detalles). En Chrome, en
producción, sí iba. Arreglado en `app-v40`: (1) la app instalada seguía
con el código viejo: `app.js` recarga sola en `controllerchange` (si ya
había un SW) y pide `registro.update()` al volver a verse
(`visibilitychange`); (2) iOS no aplica `:active` sin un escuchador de
`touchstart` (uno vacío y pasivo en `app.js`); (3) "Otro avatar" en
Perfil › Datos personales también hace la ruleta (4 vueltas); (4) abajo
en Perfil sale la versión ("Vigía app-v40") y si el iPhone tiene
"Reducir movimiento" (con él, a propósito, no se anima nada). Paso 5 hecho (2026-11-18): `nacerAvatar(marco, semilla, {
tamano, vueltas })` en `avatar.js` (semillas al azar con
`crypto.getRandomValues`, pausas de 90 a 260 ms que crecen como un
cuadrado, `.avatar--pop` y `.avatar--final`, `happy` 1,2 s) y el paso
"Este eres tú" en `bienvenida.js` (`pasoTu`, 120 px, 7 vueltas; "Otro
avatar" con 4 y `sad` si falla); los demás pasos pasan a 2, 3 y 4.
Probado en el navegador (la ruleta tarda ~1,1 s; con "Reducir
movimiento", al momento); "Otro avatar" sin pulsar (cambia el avatar de
la cuenta). `sw.js` en `app-v39`. Paso 4 hecho (2026-11-18): `app.js` sirve
también `expression.js`; `ponerExpresion(avatar, pose)` en `avatar.js`
(un `WeakMap` con la semilla, el grupo y las variables puestas);
`reacciones.js` (`usarAvatarCabecera`, `pensar`, y escucha
`vigia:escritura`, que lanza `api.js` en cada POST/PUT/PATCH/DELETE: no
con `campos` ni con 401); `thinking` en el Ayudante y un avatar de 64 px
que piensa al leer el ticket (sin probar: gasta IA). Ojo: el router pasa
el avatar ANTES de meterlo en la página (no está "conectado"). 4
pruebas nuevas en `avatar.test.js` (244 en total). `sw.js` en
`app-v38`. Paso 3 hecho (2026-11-18): View Transitions en `router.js` (`conTransicion`,
`decidirSentido`, `ponerVista`; `navegar()` adelante y con `reemplazar`
atrás; `atrasConFlecha` para que el gesto de iOS no se anime dos veces;
sin animación si el camino no cambia), con su CSS al final de
`componentes.css` (`view-transition-name` en `.cabecera` y
`.navegacion`). `sw.js` en `app-v37`. Paso 2 hecho (2026-11-18): tokens `--duracion-media`,
`--duracion-lenta`, `--curva-salida` y `--curva-suave`; `movimiento.js`
(`entrar`, `salir`, `sinMovimiento`); botones que se hunden
(`scale(0.97)`, 0,94 los de icono); el "✓" de los avisos de éxito en su
`<span class="aviso__marca">` con "pop" (`crearAviso`); entran y salen
las filas de ingrediente, las líneas del ticket y los mensajes del
Ayudante. `sw.js` en `app-v36`. Arreglado el 2026-11-23: la etiqueta flotante de los
campos anima `top` y `font-size` (rompe la regla de D-56; pasarla a
`transform`). Paso 1 hecho (2026-11-18): D-56 en
ARQUITECTURA (§10 y §11) y DISENO_UI (§2.4 Movimiento, Avatar con
expresiones y nacimiento, P-03 con 4 pasos y §7.6). Lo que conviene
recordar de D-56:
- Solo `transform`/`opacity` (y las `--mo-*` de blobatar), 150 a 300 ms,
  `--duracion-rapida/media/lenta` y `--curva-salida/suave`; con "Reducir
  movimiento", nada se desliza ni rebota.
- blobatar NO transforma un avatar en otro (la forma es un trazo
  distinto): el nacimiento es una ruleta (`nacerAvatar`, 7 vueltas de 90
  a 260 ms, y `happy` al final; "Otro avatar", 4). Las expresiones son
  solo variables CSS + la clase `mo-expr` (`_parts(semilla, { expression
  })`), así que van con `setProperty` y la CSP no se queja.
  `expression.js` no importa nada más: hay que servirlo en `/vendor`.
- Reacciones: `api.js` lanza `vigia:escritura` (`ok` sí o no); `happy`
  1,2 s, `sad` 1,5 s (no con errores de validación), `thinking` en el
  Ayudante y en Ticket (avatar de 64 px en vez del círculo que gira).
- View Transitions solo en lo que navego yo (enlaces, `navegar()`, la
  flecha Atrás); nunca en un `popstate` sin aviso mío (el gesto de iOS ya
  anima).

**Fase 10 (recuperar la contraseña y cambiar el email): aprobada**
(2026-11-18, "ok" del autor tras probarla en el iPhone con `app-v35`).
Lo que conviene recordar:
- D-53: Resend con su API (`resend.js`, `fetch`, sin paquetes) desde el
  dominio `alvaroalme.dev` (Cloudflare, renovación automática);
  `correo.alvaroalme.dev` verificado en Resend (Ireland) con DMARC
  `p=none` (subirlo a `p=quarantine` dentro de unas semanas).
  `CORREO_REMITENTE=Vigía <no-responder@correo.alvaroalme.dev>`. Keys con
  "Sending access": `vigia-desarrollo` (`.env` y Bitwarden) y
  `vigia-produccion` (Render y nota `vigia-produccion`). Plan gratis:
  100 correos al día y 3000 al mes.
- `correo.js`: con key, Resend; sin key, el "buzón de desarrollo" (la
  terminal). Las direcciones `.test` NUNCA se envían. En producción no se
  escribe nunca el texto del correo (lleva el enlace).
- `enlaces_correo` (`009_correo`): solo el SHA-256 del token; el token
  va detrás de `#t=` (no llega a los logs) y la pantalla lo quita de la
  barra. Recuperar, 30 min; cambiar el email, 24 h; un solo uso.
- Cambios del autor en D-53: "Recuperar" dice si el email no tiene cuenta
  (404 `EMAIL_NO_REGISTRADO`) y tras la contraseña nueva NO se entra: se
  cierran todas las sesiones y se va a Entrar con el email puesto.
- En el iPhone, el enlace del correo se abre en Safari, que es otra
  sesión distinta de la app instalada.
- Además (2026-11-18): "Escanear ticket" dentro de Nuevo producto
  (`app-v33`); D-55, títulos de 20 px e iconos solos en la cabecera
  (`componentes/iconos.js`, `.boton-icono` con `aria-label`; `app-v34`);
  el botón de Perfil es una píldora con el avatar vivo y una flecha, y
  los avatares de Hogar también parpadean (`app-v35`).

**Fase 9 (Perfil y avatar): aprobada** (2026-11-18, "ok" del autor tras
desplegar `app-v30`). Paso 4
hecho: Perfil (`perfil.js`) y sus apartados (`perfilDatos`,
`perfilSeguridad`, `perfilHogar`, `perfilAvisos`, `perfilIa`, con
`comunPerfil.js`), `ajustes.js` borrado, `/ajustes` → `/perfil`
(`redirigir` en el router), botón con el avatar en las cabeceras de
pestaña (`yo.js` guarda quién soy; se olvida en las pantallas
públicas), barra de 4 pestañas, `sw.js` en `app-v30`. Paso 3 hecho: avatar con
**blobatar 2.7.0** (versión fija; `app.js` sirve `index.js`,
`internal.js` y `motion.css` de `node_modules` en `/vendor/blobatar/`),
`componentes/avatar.js` (`crearAvatar` quieto en `<img>`,
`crearAvatarVivo` con parpadeo y `mirarAlToque`, porque `gaze` de
blobatar solo va con ratón) y sus pruebas. El SVG vivo NO va con
innerHTML: DOMParser + estilos por CSSOM (la CSP bloquea `style=`).
Muestra temporal (no se sube): `web/muestra-avatares.html`. Hechos antes: paso 1 (documentación: D-52, P-16 Perfil y
P-22 a P-26) y paso 2 (`008_perfil.sql`, aplicada solo en desarrollo, y
`PATCH /api/yo`, `POST /api/yo/avatar`, `PUT /api/yo/contrasena` y
`DELETE /api/yo/sesiones`, probadas contra el servidor con Ana).

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

**Detalles del rediseño pendientes:** probar en el iPhone el icono
instalado, la barra con `theme-color` y VoiceOver (hechos el 2026-11-23:
el lema sin punto, la flecha Atrás en SVG, D-55, y ✓, ✗ y + en SVG).

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

