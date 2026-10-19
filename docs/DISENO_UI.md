# Diseño de la interfaz — Recetas Nevera PWA

| | |
|---|---|
| **Estado** | Fase B **aprobada** el 19 de octubre de 2026 |
| **Fecha** | 19 de octubre de 2026 |
| **Basado en** | `docs/COMPONENTES.md`, `constants/tema.ts` y `app/**/*.tsx` de la app Expo; `docs/ARQUITECTURA.md` (decisiones D-01 a D-32) |
| **Decisiones de diseño** | D-27 navegación · D-28 páginas y `<dialog>` · D-29 tipografía · D-30 iconos · D-31 sugerencias en el servidor · D-32 fecha nativa (registro en `ARQUITECTURA.md` §11) |

**[sin verificar]** marca lo que se comprueba en el iPhone en la fase indicada antes de darlo por bueno.

---

## 1. Principios de UX

| # | Principio | Cómo se nota en la interfaz |
|---|---|---|
| 1 | **La IA propone, el usuario decide** | Nada de lo que devuelve Claude se guarda sin revisar: el ticket se confirma línea a línea y una receta solo descuenta tras "La he cocinado". La pantalla lo dice: "No se guarda nada hasta que pulses «Guardar»" |
| 2 | **Nunca datos a medias** | Guardar un ticket, cocinar o guardar una receta es todo o nada. Si falla, el mensaje dice **"No se ha guardado nada"**, nunca "algunos productos…" |
| 3 | **Preguntar en vez de suponer** | Si un alimento puede ir en varios sitios, se pregunta "¿Dónde lo guardas?". Si las unidades no cuadran, "¿Cuánto has gastado?". La app nunca se inventa una conversión ni una ubicación |
| 4 | **Lo urgente, primero** | Las listas se ordenan por caducidad. "Caduca hoy" y "Caducado" van en rojo, de 1 a 3 días en naranja, **siempre con texto** además del color |
| 5 | **Una acción principal por pantalla** | Solo un botón `primario` por pantalla, fijo en el pie, al alcance del pulgar |
| 6 | **Saber siempre qué está pasando** | Cada pantalla tiene los estados cargando, vacío, error, sin conexión y con datos; cada guardado tiene estado "Guardando…". Nunca hay una pantalla en blanco |
| 7 | **La casa es compartida** | Los mensajes lo tienen en cuenta: "Alguien de tu casa ha cambiado el inventario. Revisa las cantidades." Los avisos llegan a todos los miembros |
| 8 | **Ser sincero con los límites** | Si los avisos no pueden funcionar (PWA sin instalar, permiso denegado), se explica por qué y cómo arreglarlo, en lugar de fallar en silencio. Antes de gastar una llamada de IA se ve cuántas quedan hoy |
| 9 | **Lenguaje de cocina, no de informática** | "Guardar 5 productos", "Te falta", "Que aproveche". Nada de "error 500" ni "sincronizar" |
| 10 | **Accesible por defecto** | Contraste AA, 44 px, foco visible, lectores de pantalla y tamaño de letra del sistema desde el primer componente, no como un añadido final |

---

## 2. Tokens de diseño (variables CSS)

Archivo: `web/css/tokens.css`. Es la **única** fuente de colores, espacios, radios y tamaños. Ningún otro CSS escribe un color a mano (como en `tema.ts`).

### 2.1 Colores (portados de `constants/tema.ts` sin cambiar ni uno)

```css
:root {
  /* Avisa al navegador de que hay modo claro y oscuro: así los controles
     nativos (selector de fecha, casillas, barras de scroll) también cambian. */
  color-scheme: light dark;

  /* ---- Modo claro (PALETAS.light) ---- */
  --color-fondo: #ffffff;
  --color-superficie: #f4f5f7;        /* tarjetas y zonas elevadas */
  --color-texto: #111827;
  --color-texto-secundario: #374151;
  --color-texto-tenue: #5d6470;
  --color-borde: #d1d5db;
  --color-placeholder: #9ca3af;
  --color-primario: #1d6fb8;
  --color-sobre-primario: #ffffff;    /* texto encima de primario */
  --color-peligro: #c62828;
  --color-fondo-peligro: #fdecea;
  --color-aviso: #a85d00;
  --color-fondo-aviso: #fff4e0;
  --color-exito: #13733a;
  --color-fondo-exito: #e7f6ec;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* ---- Modo oscuro (PALETAS.dark) ---- */
    --color-fondo: #000000;
    --color-superficie: #1c1c1e;
    --color-texto: #f9fafb;
    --color-texto-secundario: #d1d5db;
    --color-texto-tenue: #9ca3af;
    --color-borde: #3a3a3c;
    --color-placeholder: #6b7280;
    --color-primario: #5eb0ef;
    --color-sobre-primario: #0b1220;
    --color-peligro: #f87171;
    --color-fondo-peligro: #3b1414;
    --color-aviso: #fbbf24;
    --color-fondo-aviso: #3a2a07;
    --color-exito: #4ade80;
    --color-fondo-exito: #0f2e1a;
  }
}
```

Los pares de texto y fondo son los mismos que se midieron para la app Expo (≥ 4,5:1 en los dos modos; el más ajustado, aviso sobre `fondo-aviso` en claro, con 4,55:1). **Regla:** solo se combinan los pares que ya existían. Si hace falta uno nuevo, se mide antes de usarlo.

En `index.html` también van dos `<meta name="theme-color">` (uno por modo con `media="(prefers-color-scheme: …)"`) con `#ffffff` y `#000000`, para el color de la barra del navegador **[sin verificar]** en la PWA de iOS (fase 3).

### 2.2 Espacio, radios, tamaños

```css
:root {
  /* ESPACIO: múltiplos de 4, en px (no crecen con la letra: crecen los textos) */
  --espacio-xs: 4px;
  --espacio-s: 8px;
  --espacio-m: 12px;
  --espacio-l: 16px;
  --espacio-xl: 24px;
  --espacio-xxl: 32px;

  /* RADIO */
  --radio-s: 8px;
  --radio-m: 12px;
  --radio-pildora: 999px;

  --tactil: 44px;          /* TAMANO_TACTIL: mínimo de cualquier zona pulsable */
  --ancho-maximo: 640px;   /* ANCHO_MAXIMO: el contenido no se estira */
  --ancho-barra-lateral: 88px;
}
```

### 2.3 Tipografía: tamaños de `tema.ts` y tamaño de letra del sistema (D-29)

**El problema:** en iOS, Safari no aplica el tamaño de texto del sistema a una web normal. Solo lo hace si la raíz usa `font: -apple-system-body` ([Vispero](https://vispero.com/resources/text-resizing-web-pages-ios-using-dynamic-type/), [WebKit bug 260880](https://bugs.webkit.org/show_bug.cgi?id=260880)). Ese valor vale 17 px con el tamaño por defecto (**[sin verificar]**, fase 1), no 16.

**La solución:** se toma **17 px como unidad** (`1rem`) en todas partes, y cada tamaño de `tema.ts` se escribe como `px / 17` en `rem`:
- **En el iPhone**, `1rem` es el tamaño de letra del usuario: todo crece o decrece con él.
- **En los demás navegadores**, `html { font-size: 106.25% }` (16 × 1,0625 = 17 px) respeta el tamaño de letra que el usuario haya configurado en su navegador.
- Con el tamaño por defecto, los tamaños son **exactamente los de `tema.ts`**. Si en el iPhone no fuera 17 px, solo hay que cambiar ese número.

```css
html {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 106.25%;                 /* 1rem = 17 px con el tamaño por defecto */
  -webkit-text-size-adjust: 100%;     /* iOS no agranda el texto por su cuenta al girar */
}
/* Pantallas táctiles de Apple: tamaño de letra del sistema (Dynamic Type).
   "hover: none" evita aplicarlo en el Safari del Mac, donde sale más pequeño. */
@supports (font: -apple-system-body) {
  @media (hover: none) {
    html {
      font: -apple-system-body;
      font-family: system-ui, -apple-system, sans-serif; /* va DESPUÉS del atajo `font` */
    }
  }
}

:root {
  /* TIPOGRAFIA de tema.ts: tamaño (px / 17 rem) · altura de línea (lineHeight / fontSize) */
  --texto-titulo: calc(24rem / 17);      --linea-titulo: 1.25;     /* 24 / 30, 700 */
  --texto-subtitulo: calc(18rem / 17);   --linea-subtitulo: 1.333; /* 18 / 24, 600 */
  --texto-cuerpo: calc(16rem / 17);      --linea-cuerpo: 1.375;    /* 16 / 22 */
  --texto-secundario: calc(14rem / 17);  --linea-secundario: 1.429;/* 14 / 20 */
  --texto-pequeno: calc(13rem / 17);     --linea-pequeno: 1.385;   /* 13 / 18 */
  --texto-seccion: calc(13rem / 17);     /* 600, mayúsculas, letter-spacing 0.5 px */
  --peso-normal: 400;
  --peso-fuerte: 600;
  --peso-titulo: 700;
}
```

**Media queries en `em`** (`48em`, no `768px`): así, si el usuario agranda la letra, el diseño cambia antes a la versión estrecha en lugar de cortar textos.

### 2.4 Foco y movimiento

```css
:root { --foco: 3px solid var(--color-primario); --foco-separacion: 2px; }

:focus-visible { outline: var(--foco); outline-offset: var(--foco-separacion); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

`primario` sobre `fondo` es uno de los pares medidos, así que el anillo de foco contrasta en los dos modos.

---

## 3. Componentes

### 3.1 Cómo se construyen en JavaScript

- **Cada componente es una función** que recibe un objeto de opciones (como las *props* de React) y **devuelve un elemento del DOM**. Por ejemplo, `crearBoton({ titulo, variante, alPulsar })` devuelve un `HTMLButtonElement`.
- **Todos los nodos se crean con `document.createElement` y `textContent`.** Nunca se usa `innerHTML` con datos (ARQUITECTURA §9.7, XSS). Un ayudante `el(etiqueta, atributos, ...hijos)` evita repetir código.
- **Los cambios de estado son funciones** del mismo módulo (`ponerCargando(boton, true)`) que tocan atributos ARIA y clases, nunca estilos sueltos.
- **CSS con nombres tipo BEM:** `.boton`, `.boton--primario`, `.campo__error`. Solo usa variables de `tokens.css`.
- **Capas** (igual que `COMPONENTES.md`): `web/js/componentes/ui/` para las primitivas, que no saben nada de comida, y `web/js/componentes/` para las de funcionalidad. Se importan desde `web/js/componentes/ui/index.js`.

| Expo (`components/ui`) | Web | Elemento HTML base |
|---|---|---|
| `Pantalla` | `crearPantalla()` | `<main>` + cabecera + contenido + pie |
| `Texto` | Clases `.texto--*` y `.tono--*` sobre el elemento semántico | `<h1>`, `<h2>`, `<p>`, `<span>` |
| `Boton` | `crearBoton()` / `crearEnlaceBoton()` | `<button>` (acción) / `<a>` (navegación) |
| `CampoTexto` | `crearCampo()` | `<label>` + `<input>` + ayuda + error |
| `Selector` | `crearSelector()` | `<fieldset>` + radios nativos con aspecto de chip |
| `Casilla` | `crearCasilla()` | `<input type="checkbox">` + `<label>` |
| `Tarjeta` | `crearTarjeta()` | `<article>` o `<a>` si se puede pulsar |
| `FilaLista` | `crearFila()` | `<li>` + `<a>` |
| `EstadoCarga` | `crearCarga()` | `<div role="status">` |
| `EstadoVacio` | `crearVacio()` | `<section>` + `<h2>` |
| `Aviso` | `crearAviso()` | `<div role="alert">` o `role="status"` |
| `TituloSeccion` | `crearTituloSeccion()` | `<h2>` |
| *(nuevo)* | `crearNavegacion()` | `<nav>` con las 4 pestañas |
| *(nuevo)* | `crearCabecera()` | `<header>` con "‹ Atrás", título y acción |
| *(nuevo, sustituye a `Alert`)* | `confirmar()` | `<dialog>` + `showModal()` |
| *(nuevo)* | `crearFranjaConexion()` | `<div role="status">` "Sin conexión" |

**Estados comunes** (cuando aplican):

| Estado | Cómo se ve | Cómo se comunica |
|---|---|---|
| Normal | Estilo base | — |
| Foco | Anillo de 3 px `primario` (`:focus-visible`), solo al navegar con teclado | El navegador lo anuncia |
| Pulsado | `opacity: .7` (como `pressed` en Expo) | — |
| Deshabilitado | `opacity: .45` (como Expo) | `disabled`, o `aria-disabled="true"` con el motivo (ver Boton) |
| Cargando | Indicador giratorio + texto "Guardando…" | `aria-busy="true"` + texto que cambia |
| Error | Borde `peligro` + mensaje con "✗" | `aria-invalid="true"` + `aria-describedby` al mensaje |

### 3.2 Primitivas

#### Pantalla
```html
<div class="app">                                <!-- rejilla: navegación + página -->
  <nav class="navegacion" aria-label="Principal">…</nav>
  <div class="pagina">
    <header class="cabecera">…</header>
    <div class="franja-conexion" role="status" hidden>…</div>
    <main id="contenido" class="pantalla" tabindex="-1">
      <div class="pantalla__contenido">…</div>    <!-- ancho máximo 640, centrado -->
    </main>
    <div class="pie">                            <!-- opcional: acción principal -->
      <div class="pie__interior">…</div>
    </div>
  </div>
</div>
```
- **Variantes:** con pie o sin él; `.pantalla--sin-margen` para las listas de borde a borde (inventario).
- **Pie:** `position: sticky; bottom: 0`, con el borde superior y el `padding-bottom` de la zona segura (§6.4). Dentro: botones en fila con `gap: var(--espacio-s)`, cada uno con `flex: 1`.
- **Accesibilidad:**
  - `<main>` recibe el foco (`tabindex="-1"`) **al cambiar de pantalla**, para que el lector de pantallas empiece por el contenido nuevo;
  - el título de la pestaña del navegador (`document.title`) cambia con cada pantalla ("Nevera · Recetas Nevera");
  - un enlace "Saltar al contenido" es el primer elemento enfocable.

#### Texto
| Clase | Elemento recomendado | Equivalente |
|---|---|---|
| `.texto--titulo` | `<h1>` (una por pantalla) | `titulo` |
| `.texto--subtitulo` | `<h2>`/`<h3>` o `<p>` | `subtitulo` |
| `.texto--cuerpo` | `<p>` (por defecto) | `cuerpo` |
| `.texto--fuerte` | `<p>`/`<strong>` | `cuerpoFuerte` |
| `.texto--secundario` | `<p>` | `secundario` |
| `.texto--pequeno` | `<p>`/`<small>` | `pequeno` |
| `.texto--seccion` | `<h2>` | `seccion` |

Tonos: `.tono--secundario`, `--tenue`, `--primario`, `--peligro`, `--aviso`, `--exito`. **Los encabezados son `<h1>`/`<h2>` de verdad**, no `<p>` con estilo: así VoiceOver puede saltar de sección en sección con el rotor, como en Expo.

#### Boton
```html
<button type="button" class="boton boton--primario">
  <span class="boton__indicador" aria-hidden="true"></span>
  <span class="boton__texto">Guardar tupper</span>
</button>
```
- **Variantes:** `--primario` (fondo `primario`, texto `sobre-primario`), `--secundario` (borde de 1,5 px `primario`), `--peligro` (fondo `peligro`), `--fantasma` (solo texto `primario`). Más `--ajustado`, que no ocupa todo el ancho (`anchoCompleto: false`).
- **Medidas:** `min-height: calc(var(--tactil) + 4px)` (48 px, como Expo); la fantasma, 44 px. `border-radius: var(--radio-m)`. Texto `--texto-cuerpo` con peso 600; puede ocupar dos líneas.
- **Cargando:** `aria-busy="true"` y `disabled`; el texto pasa a `tituloCargando` ("Guardando…") y aparece el indicador. **Evita las dobles pulsaciones** (doble guardado o doble llamada a la IA).
- **Deshabilitado por un motivo** (sin conexión, falta confirmar líneas): en lugar de `disabled`, `aria-disabled="true"` + `aria-describedby` hacia el motivo visible ("Necesitas conexión para guardar"). Así el botón sigue enfocable y el lector de pantallas **explica por qué** no se puede pulsar. El JS ignora el clic.
- **Navegar o actuar:** si el botón lleva a otra pantalla ("+ Producto", "Ir a Ajustes") se usa `<a class="boton" href="/producto/nuevo">`, que se abre con un toque largo y el lector anuncia "enlace". Si hace algo ("Guardar"), `<button>`.
- **`accessibilityHint`** de Expo → texto visualmente oculto unido con `aria-describedby`.

#### CampoTexto
```html
<div class="campo">
  <label class="campo__etiqueta" for="cantidad">Cantidad</label>
  <input class="campo__entrada" id="cantidad" name="cantidad" inputmode="decimal"
         autocomplete="off" aria-describedby="cantidad-ayuda" />
  <p class="campo__ayuda" id="cantidad-ayuda">Ej. 500</p>
  <p class="campo__error" id="cantidad-error" hidden></p>
</div>
```
- **Variantes por tipo:**
  - texto: nombre, con `autocapitalize="sentences"` y `maxlength="80"`;
  - número decimal: `inputmode="decimal"`, que en iOS saca el teclado numérico con coma;
  - número entero: días, con `inputmode="numeric"`;
  - email: `type="email" autocomplete="email"`;
  - contraseña: `type="password"`, con `autocomplete="current-password"` o `"new-password"` para que funcione el llavero de iCloud;
  - fecha: `type="date"` + "Quitar fecha" (D-32);
  - hora: `type="time"`, en Ajustes.
- **Medidas:** `min-height: var(--tactil)`, borde de 1 px `borde`, radio `--radio-s`. **Tamaño de letra ≥ 16 px** dentro del campo (`--texto-cuerpo`): si es menor, Safari hace zoom al enfocarlo **[sin verificar]** (fase 1).
- **Error:** se rellena y muestra `.campo__error` ("✗ Debe ser un número mayor que 0."), se pone `aria-invalid="true"`, y `aria-describedby` apunta al error (en lugar de a la ayuda, que se oculta como en Expo). El borde pasa a `peligro` **y además** aparece el texto con "✗": la información no depende solo del color.
- **Al pulsar Guardar con errores:** el foco va al **primer campo con error** (el lector de pantallas lo lee con su error). No se anuncian los errores mientras se escribe, para no interrumpir.
- **Deshabilitado:** `disabled` (con el campo tenue).

#### Selector (chips de opción única)
```html
<fieldset class="selector">
  <legend class="selector__leyenda">Ubicación</legend>
  <div class="selector__opciones">
    <input class="oculto-visual" type="radio" name="ubicacion" id="u-nevera" value="nevera" />
    <label class="chip chip--recomendado" for="u-nevera">Nevera<span class="oculto-visual">, recomendado</span></label>
    …
  </div>
</fieldset>
```
- **Por qué radios nativos:** el navegador ya da gratis el grupo (`radiogroup`), las flechas del teclado, el anuncio "1 de 3, seleccionado" y el envío del formulario. El aspecto de chip lo pone el CSS sobre el `<label>`.
- **Estados:**
  - elegido: fondo `primario` y texto `sobre-primario` (`input:checked + .chip`);
  - **recomendado:** borde de 2 px `primario` + "recomendado" para el lector de pantallas. El grosor del borde ya lo distingue sin depender del color;
  - foco: el anillo se dibuja en el chip (`input:focus-visible + .chip`);
  - ninguno elegido: es el estado de "preguntar" (`seleccionado: null` en Expo).
- **Medidas:** `min-height: 40px` (como `TAMANO_TACTIL - 4`) dentro de una fila con `gap: 8px`, más el área del `<label>`. **[sin verificar]** que con 40 px + separación se cumple el objetivo de 44 px; si no, se sube a 44 (fase 1). `flex-wrap: wrap`, así que con letra grande bajan de línea.

#### Casilla
`<label class="casilla"><input type="checkbox" class="casilla__entrada"> <span>Marcar el tupper «Lentejas» como consumido</span></label>`. Toda la fila mide ≥ 44 px y se puede pulsar entera. Se usa `accent-color: var(--color-primario)` sobre la casilla nativa (sin dibujar una propia).

#### Tarjeta
- No pulsable: `<article class="tarjeta">`.
- Pulsable: `<a class="tarjeta tarjeta--enlace" href="/receta/3">` con todo el contenido dentro; el lector de pantallas lee el texto del enlace entero (lo que en Expo era `accessibilityLabel`).
- **Variantes `destacada`:** `--primario` (mañana, elegida), `--exito` (línea confirmada), `--peligro` (fila con problema). Borde de 1,5 px, **siempre acompañado de un texto** ("✓ …", "· mañana", el mensaje del problema).
- Fondo `fondo`, borde `borde`, radio `--radio-m`, `padding: 14px`, `margin-bottom: var(--espacio-m)`.

#### FilaLista
```html
<li><a class="fila" href="/producto/7">
  <span class="fila__textos">
    <span class="fila__titulo">Leche</span>
    <span class="fila__subtitulo tono--aviso">Caduca mañana</span>
  </span>
  <span class="fila__detalle">1 l</span>
</a></li>
```
`min-height: 56px` (44 + 12, como Expo) y borde inferior fino. VoiceOver lee el enlace entero como **un solo elemento**: "Leche, Caduca mañana, 1 l".

#### EstadoCarga
`<div class="carga" role="status"><span class="carga__indicador" aria-hidden="true"></span><p>Leyendo el ticket…</p><p class="tono--tenue">Puede tardar unos segundos.</p></div>`
- Variantes: a pantalla completa, centrado, o en línea dentro de una sección.
- `role="status"` hace que el lector anuncie el mensaje sin interrumpir.
- El indicador es un círculo con un borde que gira en CSS; con *reduced motion*, late suavemente en lugar de girar (sigue viéndose que hay actividad).

#### EstadoVacio
`<section class="vacio"><h2 class="texto--subtitulo">Nevera vacía</h2><p class="tono--tenue">…</p><a class="boton boton--secundario boton--ajustado" href="…">Añadir producto</a></section>`. Siempre explica **por qué** está vacío y **qué hacer**.

#### Aviso
`<div class="aviso aviso--error" role="alert"><p class="texto--fuerte">Título</p><p>Mensaje</p><button class="boton boton--fantasma boton--ajustado">Reintentar</button></div>`
- **Tonos:** `--error` (`peligro` / `fondo-peligro`), `--aviso`, `--exito`, `--info` (borde `primario`, fondo `superficie`).
- **Anuncio:** `role="alert"` (interrumpe) **solo** para los errores; `role="status"` para el resto. El nodo con el rol se inserta ya en el DOM y luego se le pone el texto, para que todos los lectores lo anuncien **[sin verificar]** con VoiceOver en iOS (fase 1).
- **Prefijos visibles** que no dependen del color: "✗" para error, "!" para aviso y "✓" para éxito.

#### TituloSeccion
`<div class="seccion"><h2 class="texto--seccion tono--tenue">Tuppers</h2><a class="boton boton--fantasma boton--ajustado" href="…">Ingredientes</a></div>`. Variante `--primera`, sin margen superior.

#### Navegacion (D-27)
```html
<nav class="navegacion" aria-label="Principal">
  <ul>
    <li><a href="/" aria-current="page"><svg aria-hidden="true">…</svg><span>Inventario</span></a></li>
    <li><a href="/recetas"><svg aria-hidden="true">…</svg><span>Recetas</span></a></li>
    <li><a href="/semana">…<span>Semana</span></a></li>
    <li><a href="/ajustes">…<span>Ajustes</span></a></li>
  </ul>
</nav>
```
- **Pestaña activa:** `aria-current="page"` + color `primario` + **texto en negrita y una barrita encima** (abajo) o a la izquierda (lateral). No depende solo del color.
- Cada pestaña mide ≥ 44 × 44 px. Iconos SVG de 24 px con `stroke="currentColor"` (D-30).
- **Se muestra en las 4 pantallas de pestaña.** En las páginas secundarias del móvil se oculta (más sitio para el formulario y el pie, como los modales de Expo); en escritorio la barra lateral se ve siempre.

#### Cabecera
`<header class="cabecera"><a class="cabecera__atras" href="/">‹ Atrás</a><h1>Nuevo producto</h1><a class="cabecera__accion" href="/ticket">…Ticket</a></header>`
- Variantes: de pestaña (título + acción opcional, como el botón "Ticket" de Inventario) y secundaria ("‹ Atrás" + título).
- Comportamiento de "Atrás" en §5.3.

#### Confirmar (`<dialog>`, D-28)
```html
<dialog class="dialogo" aria-labelledby="d-titulo" aria-describedby="d-texto">
  <form method="dialog">
    <h2 id="d-titulo">Borrar producto</h2>
    <p id="d-texto">¿Seguro que quieres borrar «Leche»?</p>
    <div class="dialogo__acciones">
      <button value="cancelar" class="boton boton--secundario" autofocus>Cancelar</button>
      <button value="confirmar" class="boton boton--peligro">Borrar</button>
    </div>
  </form>
</dialog>
```
- `confirmar({ titulo, texto, textoConfirmar, peligroso })` devuelve una **promesa** con `true`/`false`, el equivalente a `Alert.alert(..., [Cancelar, Borrar])`.
- `showModal()` hace que el navegador ponga el foco dentro, inutilice el fondo y cierre con `Esc` ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)). **El foco empieza en "Cancelar"**, la opción segura. Al cerrar, el foco vuelve al botón que lo abrió.
- `::backdrop` con el fondo semitransparente.

#### FranjaConexion
`<div class="franja-conexion" role="status">Sin conexión · datos de las 18:42</div>`. Fondo `fondo-aviso`, texto `aviso`. Aparece bajo la cabecera y no tapa el contenido. Desaparece con el evento `online`.

### 3.3 Componentes de funcionalidad (`web/js/componentes/`)

| Componente | Responsabilidad | Recibe → devuelve |
|---|---|---|
| `FormularioProducto` | Alta y edición; validación por campo; regla "¿Dónde lo guardas?" (`ubicacionesPosibles()` en cada pulsación del nombre) | `{ inicial?, ubicacionSugerida?, textoBoton, alGuardar(datos) => Promise }` → `<form>` |
| `LineaTicket` | Una línea del ticket: corregir, eliminar o confirmar; vista compacta "✓ Leche · 6 l · Despensa — Toca para editar" | `{ linea, alCambiar, alEliminar }` → `<article>`; exporta `problemaLinea()` |
| `VistaReceta` | Ingredientes con "✓ Tienes 500 g" / "Solo tienes…" / "✗ Te falta", resumen "Tienes todo" / "Te faltan 2 ingredientes" y pasos numerados (`<ol>`) | `{ receta, productos, tuppers, sinPasos? }` → `<section>`; exporta `describirEstado()` |
| `FilaCocinar` | Un ingrediente en "La he cocinado": "¿De cuál lo has usado?", la cantidad a descontar, "Quedarán…", "No descontar" | `{ fila, alCambiar }` → `<article>` |
| `Hueco` | Un hueco del planificador (Comida/Cena) que se puede pulsar | `{ dia, tipo, plato }` → `<a>` |

Igual que en Expo: **no llaman a la API**. Reciben datos y avisan con *callbacks*; quien llama a `api.js` es la pantalla.

---

## 4. Inventario de pantallas

### 4.1 Plantillas de escritorio (≥ 48em)

Todas las pantallas usan **una de estas tres plantillas** en escritorio. El contenido es el mismo que en el móvil, en una columna de 640 px como máximo (`ANCHO_MAXIMO`), porque una columna más ancha haría las filas difíciles de leer. Cada pantalla de §4.2 indica la suya.

```
E-1 · PESTAÑA                                   E-2 · SECUNDARIA CON PIE
┌──────┬───────────────────────────────────┐    ┌──────┬───────────────────────────────────┐
│ [▢]  │      Inventario          [Ticket] │    │ [▢]  │  ‹ Atrás   Nuevo producto         │
│Invent│ ┌───────────────────────────────┐ │    │Invent│ ┌───────────────────────────────┐ │
│      │ │                               │ │    │      │ │ (formulario)                  │ │
│ [⑂]  │ │ contenido, máx. 640 px        │ │    │ [⑂]  │ │                               │ │
│Receta│ │ centrado                      │ │    │Receta│ │                               │ │
│      │ │                               │ │    │      │ │                               │ │
│ [▦]  │ │                               │ │    │ [▦]  │ ├───────────────────────────────┤ │
│Semana│ │                               │ │    │Semana│ │ [   Acción principal (pie)  ] │ │
│ [⚙]  │ └───────────────────────────────┘ │    │ [⚙]  │ └───────────────────────────────┘ │
│Ajust.│                                   │    │Ajust.│                                   │
└──────┴───────────────────────────────────┘    └──────┴───────────────────────────────────┘

E-3 · SIN SESIÓN (entrar, registro, privacidad): sin barra lateral; tarjeta centrada de 440 px.
```

En E-2 el pie no ocupa toda la pantalla: va pegado abajo **dentro de la columna de 640 px**.

### 4.2 Pantallas (móvil)

Leyenda: `[ Botón ]` primario · `[ Botón ]°` secundario · `‹texto›` fantasma o enlace · `( Chip )` / `(●Chip)` elegido / `(*Chip)` recomendado.

#### P-01 · Entrar — `/entrar` · Escritorio E-3
```
┌──────────────────────────────┐
│        🥕 Recetas Nevera      │
│  Recetas con lo que tengas    │
│  en la nevera.                │
│                               │
│  Email                        │
│  [__________________________] │
│  Contraseña                   │
│  [__________________________] │
│                               │
│  [         Entrar          ]  │
│                               │
│  ¿No tienes cuenta? ‹Créala›  │
│  ‹Privacidad›                 │
└──────────────────────────────┘
```

#### P-02 · Crear cuenta — `/registro` · E-3
```
┌──────────────────────────────┐
│  ‹ Atrás     Crear cuenta     │
│  Tu nombre                    │
│  [__________________________] │
│  Email                        │
│  [__________________________] │
│  Contraseña                   │
│  [__________________________] │
│  Mínimo 10 caracteres.        │
│                               │
│  Al crearla aceptas la        │
│  ‹política de privacidad›.    │
│  [      Crear cuenta       ]  │
└──────────────────────────────┘
```

#### P-03 · Bienvenida (primer uso) — `/bienvenida` · E-2 · ver flujo §7.6
```
┌──────────────────────────────┐
│  Bienvenida, Álvaro           │
│  Paso 1 de 3                  │
│ ┌──────────────────────────┐ │
│ │ Tu casa                  │ │
│ │ «Casa de Álvaro»  ‹Cambiar›│
│ │ ¿Vives con alguien?      │ │
│ │ ‹Tengo un código›        │ │
│ │ ‹Invitar más tarde›      │ │
│ └──────────────────────────┘ │
│                               │
│  ‹Saltar›     [ Siguiente  ]  │
└──────────────────────────────┘
```
Paso 2, "Instala la app" (instrucciones de iOS o un botón en Chrome); paso 3, "Activa los avisos". Cada paso se puede saltar.

#### P-04 · Inventario — `/` · E-1
```
┌──────────────────────────────┐
│  Inventario       [🧾 Ticket] │
│ (●Nevera) ( Despensa ) (Cong.)│
│──────────────────────────────│
│  TUPPERS                      │
│  Cocido                Tupper │
│  Caduca mañana  (naranja)     │
│──────────────────────────────│
│  PRODUCTOS                    │
│  Yogur                 2 ud.  │
│  Caduca hoy  (rojo)           │
│  Pechuga de pollo      500 g  │
│  Caduca en 2 días             │
│  Leche                   1 l  │
│──────────────────────────────│
│ [ + Tupper ]° [ + Producto ]  │  ← pie
├──────────────────────────────┤
│ [▢]Inv  [⑂]Rec [▦]Sem [⚙]Aj  │  ← navegación
└──────────────────────────────┘
```
El selector de ubicación se recuerda en la URL (`/?ubicacion=despensa`), así que "Atrás" vuelve a la misma.

#### P-05 · Nuevo / editar producto — `/producto/nuevo?ubicacion=` · `/producto/:id` · E-2
```
┌──────────────────────────────┐
│  ‹ Atrás     Nuevo producto   │
│  Nombre                       │
│  [Pechuga de pollo_________]  │
│  Cantidad                     │
│  [500____]                    │
│  Unidad                       │
│  ( g )( kg )( ml )( l )(●ud.) │
│  Ubicación                    │
│ ┌──────────────────────────┐ │
│ │ ¿Dónde lo guardas?       │ │
│ │ «Pechuga de pollo» puede │ │
│ │ ir en Nevera o Congelador│ │
│ └──────────────────────────┘ │
│ (*Nevera)( Despensa)(*Congel.)│
│  Caducidad (opcional)         │
│  [ 22/10/2026 ▾ ] ‹Quitar fecha›
│──────────────────────────────│
│ [  Añadir al inventario   ]   │
└──────────────────────────────┘
```
Al **editar**, se añaden la sección "MOVER" con `[A Despensa]° [A Congelador]°`, `[Borrar producto]` (peligro, con confirmación) y el botón "Guardar cambios".

#### P-06 · Nuevo tupper — `/tupper/nuevo?ubicacion=` · E-2
```
┌──────────────────────────────┐
│  ‹ Atrás       Nuevo tupper   │
│  ¿Qué hay en el tupper?       │
│  [Cocido___________________]  │
│  Ubicación                    │
│  (●Nevera)( Despensa)( Cong.) │
│  Días máximos que aguanta     │
│  [3__]                        │
│ ┌──────────────────────────┐ │
│ │ Fecha límite: 22/10/2026 │ │
│ │ Te avisaremos el         │ │
│ │ 21/10/2026 a las 10:00.  │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │  ← solo si ningún dispositivo
│ │ ! Este dispositivo no    │ │    del hogar tiene avisos
│ │ tiene los avisos activos.│ │
│ │ ‹Activar avisos›         │ │
│ └──────────────────────────┘ │
│──────────────────────────────│
│ [      Guardar tupper      ]  │
└──────────────────────────────┘
```

#### P-07 · Tupper — `/tupper/:id` · E-2 (**la abre el aviso**)
```
┌──────────────────────────────┐
│  ‹ Inventario                 │
│  Cocido                       │  (h1)
│  Guardado en Nevera           │
│  Fecha límite: 22/10/2026     │
│                               │
│  Caduca mañana   (naranja)    │
│──────────────────────────────│
│ [  Marcar como consumido  ]   │
└──────────────────────────────┘
```
Ya consumido: "✓ Consumido" en verde y sin pie.

#### P-08 · Escanear ticket — `/ticket` · E-2
```
ELEGIR                              REVISAR
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  ‹ Atrás     Escanear ticket  │   │  ‹ Atrás     Revisar ticket   │
│  Haz una foto al ticket o     │   │  Revisa cada producto: corrí- │
│  sube el ticket digital (PDF  │   │  gelo, elimínalo o confírmalo.│
│  o imagen). Claude leerá los  │   │  No se guarda nada hasta que  │
│  productos y podrás revisarlos│   │  pulses «Guardar».            │
│  antes de guardarlos.         │   │ ┌──────────────────────────┐ │
│  Te quedan 9 de 10 consultas  │   │ │ Producto [Pechuga pollo] │ │
│  de IA hoy.                   │   │ │ Cantidad [0,5]           │ │
│                               │   │ │ ( g )(●kg)( ml )( l )(ud)│ │
│  [  Hacer foto al ticket  ]   │   │ │ ¿Dónde lo guardas? Puede │ │
│  [ Elegir de la galería  ]°   │   │ │ ir en Nevera o Congelador│ │
│  [Subir archivo (PDF/imagen)]°│   │ │ (*Nev.)( Desp.)(*Cong.)  │ │
│                               │   │ │ ! Elige dónde lo guardas.│ │
│                               │   │ │ ‹Eliminar›  [✓ Confirmar]│ │
│                               │   │ └──────────────────────────┘ │
│                               │   │ ┌──────────────────────────┐ │
│                               │   │ │✓ Leche · 6 l · Despensa  │ │
│                               │   │ │  Toca para editar        │ │
│                               │   │ └──────────────────────────┘ │
│                               │   │──────────────────────────────│
│                               │   │ [ Faltan 1 por confirmar ]   │
└──────────────────────────────┘   └──────────────────────────────┘
```
La primera vez, antes de "Elegir", aparece el **aviso de privacidad** (SEC-04, §7.1).

#### P-09 · Recetas — `/recetas` · E-1
```
┌──────────────────────────────┐
│  Recetas                      │
│ [Generar recetas con lo que tengo]
│  Claude propone recetas con   │
│  tu inventario, empezando por │
│  lo que caduca antes.         │
│  Te quedan 9 de 10 hoy.       │
│  SUGERENCIAS                  │
│ ┌──────────────────────────┐ │
│ │ Arroz con pollo          │ │
│ │ Pechuga de pollo, arroz… │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Lentejas con chorizo     │ │
│ └──────────────────────────┘ │
│  RECETAS GUARDADAS            │
│ ┌──────────────────────────┐ │
│ │ Tortilla de patatas      │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ [▢]Inv  [⑂]Rec [▦]Sem [⚙]Aj  │
└──────────────────────────────┘
```
Con sugerencias, el botón dice "Generar otras recetas" y avisa con `confirmar()`: "Las sugerencias actuales se sustituirán. Gastarás 1 de tus consultas de hoy."

#### P-10 · Sugerencia — `/sugerencia/:id` · P-11 · Receta guardada — `/receta/:id` · E-2
```
┌──────────────────────────────┐
│  ‹ Recetas                    │
│  Arroz con pollo              │  (h1)
│  Para 2 personas · Te falta   │
│  1 ingrediente  (naranja)     │
│  INGREDIENTES                 │
│  Pechuga de pollo · 300 g     │
│  ✓ Tienes 500 g   (verde)     │
│  Arroz · 200 g                │
│  ✓ Tienes 1 kg                │
│  Pimiento · 1 ud.             │
│  ✗ Te falta       (rojo)      │
│  PASOS                        │
│  1. Corta el pollo en dados.  │
│  2. …                         │
│──────────────────────────────│
│ [Guardar receta]° [La he cocinado]│  ← sugerencia
└──────────────────────────────┘
```
En la receta guardada, el pie solo tiene `[La he cocinado]` y al final hay un `‹Borrar receta›` con confirmación.

#### P-12 · La he cocinado — `/cocinar?receta=:id` · `/cocinar?sugerencia=:id` · E-2
```
┌──────────────────────────────┐
│  ‹ Atrás      La he cocinado  │
│  Arroz con pollo              │
│  Revisa lo que se va a des-   │
│  contar de tu inventario.     │
│ ┌──────────────────────────┐ │
│ │ Pechuga de pollo · 300 g │ │ (h2)
│ │ ¿De cuál lo has usado?   │ │
│ │ (●Pechuga · Nevera 500 g)│ │
│ │ ( Pechuga · Cong. 1 kg ) │ │
│ │ Descontar (g) [300_]     │ │
│ │ Quedarán 200 g.          │ │
│ │ ‹No descontar›           │ │
│ └──────────────────────────┘ │
│ ┌────────────────────────── ┐│  borde rojo
│ │ Huevos · 2 ud.           │ │
│ │ La receta pide 2 ud., pero│ │
│ │ tienes «Huevos» en g.    │ │
│ │ ¿Cuánto has gastado?     │ │
│ │ Descontar (g) [____]     │ │
│ │ ✗ Indica cuánto has gastado.│
│ └──────────────────────────┘ │
│──────────────────────────────│
│ [  Revisa 1 ingrediente   ]   │  (deshabilitado con motivo)
└──────────────────────────────┘
```

#### P-13 · Semana — `/semana` · E-1
```
┌──────────────────────────────┐
│  Semana                       │
│  Toca un hueco para asignar   │
│  una receta guardada o escri- │
│  bir un plato. La noche ante- │
│  rior, a las 21:00, te llegará│
│  un aviso con el plan.        │
│  LUNES                ‹Ingred.›│
│ ┌──────────────────────────┐ │
│ │ Comida   Lentejas        │ │
│ │ Cena     + Añadir        │ │
│ └──────────────────────────┘ │
│  MARTES · MAÑANA      ‹Ingred.›│
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │ borde primario
│ ┃ Comida   + Añadir        ┃ │
│ ┃ Cena     Tortilla        ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│  … hasta DOMINGO              │
├──────────────────────────────┤
│ [▢]Inv  [⑂]Rec [▦]Sem [⚙]Aj  │
└──────────────────────────────┘
```

#### P-14 · Planificar hueco — `/plan/:dia/:tipo` · E-2
```
┌──────────────────────────────┐
│  ‹ Semana   Martes · Cena     │
│  ESCRIBIR UN PLATO            │
│  Nombre del plato             │
│  [Ej. Lentejas_____________]  │
│  [   Usar este plato      ]   │
│  O ELEGIR UNA RECETA GUARDADA │
│ ┌──────────────────────────┐ │
│ │ ✓ Tortilla de patatas    │ │ (elegida)
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Arroz con pollo          │ │
│ └──────────────────────────┘ │
│  ‹Dejar este hueco vacío›     │
└──────────────────────────────┘
```

#### P-15 · Plan del día — `/plan/:dia` · E-2 (**la abre el aviso**)
```
┌──────────────────────────────┐
│  ‹ Semana    Mañana (Martes)  │
│  COMIDA                       │
│  Lentejas                     │
│  Plato escrito a mano: no     │
│  tiene lista de ingredientes. │
│  Esto es lo que hay en casa   │
│  con ese nombre:              │
│  ✓ Lentejas: 1 kg             │
│  CENA                         │
│  Tortilla de patatas          │
│  Para 2 personas · Tienes todo│
│  Huevos · 4 ud. ✓ Tienes 6 ud.│
│  Patatas · 500 g ✓ Tienes 2 kg│
└──────────────────────────────┘
```

#### P-16 · Ajustes — `/ajustes` · E-1
```
┌──────────────────────────────┐
│  Ajustes                      │
│  AVISOS EN ESTE DISPOSITIVO   │
│  ✓ Activados    ‹Enviar prueba›
│  ‹Desactivar›                 │
│  AVISO DEL PLANIFICADOR       │
│  Hora a la que te llega, la   │
│  noche anterior, el aviso.    │
│  [ 21:00 ▾ ]                  │
│  [     Guardar hora       ]°  │
│  TU CASA                      │
│  Casa de Álvaro   ‹Cambiar nombre›
│  Álvaro (tú) · propietario    │
│  Lucía                        │
│  [ Invitar a alguien ]°       │
│  ‹Tengo un código›            │
│  INTELIGENCIA ARTIFICIAL      │
│  Te quedan 9 de 10 hoy.       │
│  CUENTA                       │
│  alvaro@…   ‹Cerrar sesión›   │
│  ‹Privacidad›  ‹Borrar cuenta›│
│  Modelo: claude-sonnet-5-5    │
├──────────────────────────────┤
│ [▢]Inv  [⑂]Rec [▦]Sem [⚙]Aj  │
└──────────────────────────────┘
```
La sección de avisos cambia según el estado (§7.6): "Instala la app para recibir avisos", "Activar avisos", "Has bloqueado los avisos: actívalos en Ajustes del iPhone › Notificaciones › Recetas Nevera" **[sin verificar]** la ruta exacta (fase 4).

#### P-17 · Invitar / unirse — `/hogar/invitar` · `/hogar/unirse` · E-2
```
INVITAR                             UNIRSE
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  ‹ Ajustes      Invitar       │   │  ‹ Ajustes   Unirse a una casa│
│  Dale este código a quien     │   │  Código de invitación         │
│  viva contigo. Caduca en 48 h │   │  [K7M2-QX9P______________]    │
│  y solo sirve una vez.        │   │ ┌──────────────────────────┐ │
│                               │   │ │ ! Tu casa actual y todo  │ │
│      K 7 M 2 - Q X 9 P        │   │ │ su contenido se borrarán │ │
│                               │   │ │ porque te quedarías fuera│ │
│  [   Copiar código   ]        │   │ │ y no queda nadie en ella.│ │
│  [ Compartir… ]°              │   │ └──────────────────────────┘ │
│                               │   │ [      Unirme       ]        │
└──────────────────────────────┘   └──────────────────────────────┘
```
"Compartir…" usa `navigator.share()` si existe.

#### P-18 · Privacidad — `/privacidad` · E-3
Texto: qué datos se guardan y dónde (Neon y Render), que **las fotos de los tickets se envían a Anthropic** para leerlas y no se guardan, la cuota de IA, cómo borrar la cuenta y el contacto. Se puede abrir sin sesión.

#### P-19 · No existe — cualquier ruta desconocida · E-1/E-3
`EstadoVacio` centrado: "Esta pantalla no existe" + `[Ir al inventario]°`. Igual para los parámetros no válidos ("Día no válido", "Este producto ya no existe").

---

## 5. Navegación y rutas

### 5.1 Pestañas
**Inventario** (`/`), **Recetas** (`/recetas`), **Semana** (`/semana`) y **Ajustes** (`/ajustes`). Barra inferior en el móvil y lateral desde 48em (D-27).

### 5.2 Rutas (History API: URLs normales, sin `#`)

Express devuelve `index.html` para cualquier ruta que no sea `/api/*` ni un archivo, y el Service Worker hace lo mismo sin red. `router.js` valida **cada parámetro** antes de pintar (SEC-06).

| Ruta | Pantalla | Pestaña activa | Validación del parámetro | "Atrás" por defecto |
|---|---|---|---|---|
| `/entrar`, `/registro` | P-01, P-02 | — | `?volver=` solo si empieza por `/` y no por `//` (contra redirecciones abiertas) | — |
| `/bienvenida` | P-03 | — | — | — |
| `/` | P-04 | Inventario | `?ubicacion` ∈ `UBICACIONES`, si no `nevera` | — |
| `/producto/nuevo` | P-05 | Inventario | `?ubicacion` ∈ `UBICACIONES` o nada | `/` |
| `/producto/:id` | P-05 | Inventario | `id` entero > 0 | `/` |
| `/tupper/nuevo` | P-06 | Inventario | igual que producto | `/` |
| `/tupper/:id` | P-07 | Inventario | `id` entero > 0 | `/` |
| `/ticket` | P-08 | Inventario | — | `/` |
| `/recetas` | P-09 | Recetas | — | — |
| `/sugerencia/:id` | P-10 | Recetas | `id` entero > 0 | `/recetas` |
| `/receta/:id` | P-11 | Recetas | `id` entero > 0 | `/recetas` |
| `/cocinar` | P-12 | Recetas | **exactamente uno** de `?receta` o `?sugerencia`, entero > 0 | la receta o la sugerencia |
| `/semana` | P-13 | Semana | — | — |
| `/plan/:dia` | P-15 | Semana | `dia` ∈ `DIAS_SEMANA` | `/semana` |
| `/plan/:dia/:tipo` | P-14 | Semana | `dia` ∈ `DIAS_SEMANA`, `tipo` ∈ `TIPOS_COMIDA` | `/semana` |
| `/ajustes` | P-16 | Ajustes | — | — |
| `/hogar/invitar`, `/hogar/unirse` | P-17 | Ajustes | `?codigo` opcional, formato del código | `/ajustes` |
| `/privacidad` | P-18 | — | — | página anterior o `/` |
| otra | P-19 | — | — | `/` |

### 5.3 Reglas de navegación
- **Enlaces internos:** `router.js` intercepta los clics en `<a href="/…">` del propio origen y usa `history.pushState`. Los enlaces se pueden abrir en otra pestaña y el gesto de volver de iOS funciona.
- **"‹ Atrás":** si la entrada anterior del historial es de la app, `history.back()`; si se ha llegado desde un aviso o un enlace directo (no hay anterior), va a la ruta "Atrás por defecto" de la tabla. Así nunca se sale de la app al pulsarlo.
- **Tras guardar** (equivale a `router.back()` + `Alert` en Expo): se vuelve a la pantalla anterior con un **mensaje de éxito** pasado en `history.state`, que la pantalla de destino muestra como `Aviso` `--exito` ("Ticket guardado. Se han añadido 5 productos al inventario."). Se usa `history.replaceState`, para que "Atrás" no lleve de nuevo al formulario.
- **Sin sesión:** cualquier ruta privada → `/entrar?volver=/tupper/12` → al entrar, a la ruta original.
- **Cambio de pantalla:** foco a `<main>`, `document.title` actualizado y scroll arriba (salvo al volver atrás, que restaura la posición).

### 5.4 Qué pantalla abre cada notificación

| Aviso | Título | URL (`navigate`) | Pantalla |
|---|---|---|---|
| Tupper | "Tu tupper de Cocido caduca pronto" | `/tupper/12` | P-07, con "Marcar como consumido" como acción principal |
| Plan | "Mañana comes lentejas y cenas tortilla" | `/plan/martes` | P-15, con lo que tienes y lo que te falta |
| Prueba | "Los avisos funcionan" | `/ajustes` | P-16 |

---

## 6. Diseño responsive (mobile-first)

### 6.1 Puntos de corte

| Ancho | Navegación | Layout | Por qué este punto |
|---|---|---|---|
| **< 48em** (< 816 px con letra por defecto, 1em = 17 px) | Barra inferior; oculta en las páginas secundarias | Columna a todo el ancho con 16 px de margen | Todos los iPhone en vertical |
| **≥ 48em** | Barra lateral de 88 px, siempre visible | Columna de 640 px centrada en el espacio restante | 640 de columna + 88 de barra + 2 × 16 de margen = 760 px: a partir de ahí cabe la barra sin estrechar la columna. Incluye el iPad y el iPhone grande en horizontal, donde la barra lateral ahorra altura |
| **Altura < 30em** (horizontal) | La de su ancho | El pie deja de ser fijo y va al final del contenido | En horizontal un pie fijo taparía media pantalla |

El código CSS es *mobile-first*: los estilos base son los del móvil y `@media (min-width: 48em)` añade la barra lateral. No hace falta un tercer punto: la columna ya está limitada a 640 px.

### 6.2 Cómo cambia cada zona

| Zona | Móvil | ≥ 48em |
|---|---|---|
| Navegación | `position: fixed; bottom: 0`, 4 columnas iguales, icono encima del texto | Columna izquierda fija, icono encima del texto, `aria-current` con una barrita a la izquierda |
| Cabecera | Pegada arriba; título centrado en las secundarias, a la izquierda en las pestañas | Igual, alineada con la columna |
| Pie | `position: sticky; bottom: 0` por encima de la navegación (en las pestañas) o del borde inferior | Pegado abajo dentro de la columna de 640 |
| Listas (inventario) | De borde a borde (`--sin-margen`) | Dentro de la columna, con borde y radio |
| `<dialog>` | Ancho completo menos 16 px por lado, abajo (como una hoja de iOS) | 440 px centrado |

### 6.3 Ancho máximo
`.pantalla__contenido`, `.pie__interior` y `.cabecera__interior` tienen `max-width: var(--ancho-maximo); margin-inline: auto`. Nada usa anchos fijos de pantalla: `flex`, `gap` y porcentajes, como en Expo.

### 6.4 Zonas seguras del iPhone
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. `viewport-fit=cover` hace que la página ocupe también las zonas de la isla y del indicador de inicio, y los `env(safe-area-inset-*)` dejan de ser 0 (**[sin verificar]** en documentación oficial: MDN no lo menciona en la página de `env()`; fase 3).
- **Arriba:** `.cabecera { padding-top: env(safe-area-inset-top, 0px) }` (solo importa en la PWA instalada, sin barra de Safari).
- **Abajo:**
  - la navegación inferior lleva `padding-bottom: env(safe-area-inset-bottom, 0px)`;
  - en las páginas secundarias, el pie lleva `padding-bottom: max(var(--espacio-l), env(safe-area-inset-bottom))`, como `Math.max(insets.bottom, ESPACIO.l)`.
- **Lados (iPhone en horizontal):** `padding-inline` con `env(safe-area-inset-left/right)` en la cabecera, la navegación y el pie.
- **El teclado del iPhone** sobre un pie *sticky*: **[sin verificar]** cómo se comporta (fase 1). Plan B: ocultar el pie mientras haya un campo enfocado y mostrar el botón al final del formulario.

---

## 7. Flujos de UX paso a paso

### 7.1 Escanear ticket → revisar → guardar
1. **Inventario** → "🧾 Ticket" en la cabecera → `/ticket`.
2. **Primera vez** (`avisoIaAceptado = false`): tarjeta *info* "Antes de escanear" con "La foto o el PDF del ticket se envía a Anthropic (Claude) para leer los productos. No la guardamos. Te recomendamos recortar la foto para que solo salga la lista de productos." + `‹Política de privacidad›` + `[Entendido, continuar]` → `POST /api/ia/aviso-aceptado`. Sin aceptar no se ven los botones.
3. **Elegir:** muestra "Te quedan N de 10 consultas de IA hoy". Si es 0, los botones quedan deshabilitados con el motivo "Has usado tus 10 consultas de hoy. Vuelve mañana."
   - "Hacer foto al ticket" → `<input type="file" accept="image/*" capture="environment">`;
   - "Elegir de la galería" → `accept="image/*"`;
   - "Subir archivo (PDF o imagen)" → `accept="application/pdf,image/*"`.

   **[sin verificar]** qué menú ofrece iOS en cada caso (fase 5); si los dos últimos se comportan igual, se unen en uno.
4. **Preparar:** si es una foto, se reduce en el navegador con `<canvas>` (lado mayor 2000 px, JPEG al 0,8 **[sin verificar]** que se lea bien: fase 5) para no pasar de los 5 MB. Si es un PDF de más de 25 MB → "El PDF es demasiado grande (máximo 25 MB)." sin llamar al servidor.
5. **Leyendo:** `EstadoCarga` a pantalla completa "Leyendo el ticket…" / "Puede tardar unos segundos." Hasta 120 s.
6. **Error** (en la misma pantalla de elegir): `Aviso` "No se ha podido leer el ticket" + el mensaje del servidor (los de `ticket.ts`/`claude.ts`) + `[Reintentar con el mismo ticket]` si es reintentable. El archivo se guarda en memoria para reintentar sin repetir la foto.
7. **Revisar:** una `LineaTicket` por producto. La ubicación viene del diccionario si la conoce y si no de Claude; **solo se propone si hay una**; con varias, la línea pregunta (§7.2). Cualquier cambio desconfirma la línea. El pie dice "Faltan N por confirmar" (deshabilitado con el motivo) → "Guardar N productos".
8. **Guardando:** botón "Guardando…" → `POST /api/productos/lote` con su `clave`.
9. **Éxito:** vuelve a Inventario con "✓ Ticket guardado. Se han añadido N productos al inventario."
10. **Fallo:** `Aviso` "No se ha guardado nada. Ha fallado el guardado. Inténtalo de nuevo." + `[Reintentar]` con **la misma `clave`**: si el primer intento sí llegó a guardarse, no se duplica.
11. **Todas las líneas eliminadas:** `EstadoVacio` "No queda ningún producto" + `[Escanear otro ticket]°`.

### 7.2 Preguntar la ubicación
1. En `FormularioProducto` (o `LineaTicket`), cada cambio del nombre recalcula `ubicacionesPosibles(nombre)`.
2. **Una posible** → se marca sola (se puede cambiar). **Ninguna** → la de la pestaña desde la que se abrió. **Varias y es un alta** → ninguna marcada; aparece el recuadro "¿Dónde lo guardas? «Pechuga de pollo» puede ir en Nevera o Congelador." y esas opciones se resaltan.
3. El recuadro tiene `role="status"`, así que se anuncia **una vez** cuando aparece, no con cada letra (la región ya está en el DOM y solo cambia su contenido cuando cambia la pregunta).
4. **Si se pulsa Guardar sin elegir:** "✗ Elige dónde guardas «Pechuga de pollo»." bajo el selector y el foco va al primer chip recomendado.
5. **Al editar** no se pregunta (ya tiene ubicación), como en Expo.

### 7.3 Generar receta → "La he cocinado"
1. **Recetas** → `[Generar recetas con lo que tengo]`, con "Te quedan N de 10 hoy". Si ya hay sugerencias, `confirmar()`: "Las sugerencias actuales se sustituirán. Gastarás 1 de tus consultas de hoy." → `[Generar otras]`.
2. **Generando:** el botón pasa a "Generando recetas…" y aparece "Pensando recetas…" / "Puede tardar hasta un minuto."
3. **Errores:** inventario vacío → "Tu inventario está vacío. Añade productos o tuppers primero." + `‹Ir al inventario›`; cuota agotada; error de Claude + `[Reintentar]`.
4. **Sugerencias** (guardadas en el servidor, D-31): tarjetas con el nombre y los ingredientes. Se ven también desde el otro móvil de la casa.
5. **Sugerencia** → `VistaReceta`: "Para 2 personas · Te falta 1 ingrediente", y cada ingrediente con "✓ Tienes…", "Solo tienes…", "Tienes X (en otra unidad)" o "✗ Te falta", calculado **en el momento** con el inventario recién pedido.
6. `[Guardar receta]°` → `POST /api/sugerencias/:id/guardar` → reemplaza la pantalla por `/receta/:id` (`replaceState`) con "✓ Receta guardada."
7. `[La he cocinado]` → `/cocinar?…`: una `FilaCocinar` por ingrediente, con la propuesta automática (`cantidadPropuesta()`): el producto que antes caduca, la cantidad convertida a su unidad y "Quedarán 200 g." / "«Leche» quedará agotado." Si las unidades no cuadran, campo vacío y la pregunta "¿Cuánto has gastado?". Los tuppers aparecen como casilla "Marcar el tupper «Lentejas» como consumido". "No descontar" deja la fila tenue. Lo que no está en el inventario: "No está en tu inventario: no se descuenta nada."
8. **El pie** dice "Revisa N ingredientes" (deshabilitado con el motivo) o `[Descontar del inventario]`.
9. **Guardando:** "Actualizando…" → `POST /api/cocinar` (con `clave`).
10. **Éxito:** vuelve a la receta con "✓ ¡Que aproveche! Inventario actualizado. Se han agotado: Leche, Huevos."
11. **409** (alguien de la casa gastó algo): `Aviso` "Alguien de tu casa ha cambiado el inventario. Revisa las cantidades." → se recargan las filas con el inventario nuevo y se mantiene lo que el usuario ya había decidido cuando sigue siendo válido.
12. **Otro fallo:** "No se ha descontado nada. Ha fallado la actualización del inventario. Inténtalo de nuevo." + `[Reintentar]`.

### 7.4 Tupper → aviso → "Marcar como consumido"
1. Inventario → `[+ Tupper]°` → `/tupper/nuevo`: nombre, ubicación y días (3 por defecto).
2. **Vista previa** en directo: "Fecha límite: 22/10/2026 · Te avisaremos el 21/10/2026 a las 10:00." Si el límite es mañana: "Como el límite es mañana, el aviso llegará en unos minutos." (en Expo eran segundos; aquí ≤ 5 min, DIF-02).
3. **Si este dispositivo no tiene los avisos activos:** aviso con `‹Activar avisos›` (va a la sección de Ajustes, §7.6).
4. `[Guardar tupper]` → "Guardando…" → vuelve a Inventario con "✓ Tupper guardado." Si `avisoActivo = false`: "Tupper guardado sin aviso: nadie de tu casa tiene los avisos activados." (como el `Alert` de Expo).
5. **El día anterior, entre las 10:00 y las 10:05:** llega "Tu tupper de Cocido caduca pronto" / "Cómetelo antes del 22/10/2026. Toca para marcarlo como consumido." a todos los dispositivos de la casa.
6. **Toque** → la PWA se abre en `/tupper/12` → ficha con "Caduca mañana" → `[Marcar como consumido]` → "Guardando…" → vuelve a Inventario con "✓ Cocido marcado como consumido."
7. **Si otra persona ya lo consumió:** la ficha muestra "✓ Consumido" sin botón.

### 7.5 Planificar → aviso → "¿Tienes todo?"
1. **Semana** → hueco "Martes · Cena" → `/plan/martes/cena`.
2. Escribe "Tortilla de patatas" → `[Usar este plato]`, o pulsa una receta guardada. → "Guardando…" → vuelve a Semana con el hueco relleno.
3. **Si este dispositivo no tiene avisos:** "Plan guardado. Activa los avisos en Ajustes para que te lo recordemos la noche antes." (como el `Alert` "Plan guardado sin aviso").
4. **El lunes a las 21:00** (hora de Ajustes; ≤ 5 min tarde): "Mañana cenas tortilla de patatas" / "¿Tienes todos los ingredientes? Toca para comprobarlo."
5. **Toque** → `/plan/martes` → título "Mañana (Martes)" → por cada plato: receta con "Tienes todo" / "Te faltan 2 ingredientes" y la lista con ✓/✗; o, si es un plato escrito a mano, "Esto es lo que hay en casa con ese nombre:" + ✓ o "✗ No hay nada con ese nombre en el inventario."
6. **Nada planificado** (por ejemplo, alguien borró el plato): "Nada planificado · No hay comida ni cena para el martes." + `[Planificar comida]°`.

### 7.6 Primer uso: cuenta, instalación y permiso de avisos
1. **Abrir la URL en Safari** → `/entrar`. Sin cuenta → `‹Créala›` → `/registro` → `[Crear cuenta]` → el servidor crea la cuenta, la casa "Casa de {nombre}" y la sesión → `/bienvenida`.
2. **Paso 1, tu casa:** nombre editable · `‹Tengo un código›` → `/hogar/unirse` · `‹Invitar más tarde›`.
3. **Paso 2, instalar** (solo si **no** está en modo `standalone`):
   - **iPhone/iPad (Safari):** "Para recibir avisos en el iPhone tienes que añadir la app a la pantalla de inicio: 1. Pulsa Compartir [icono]. 2. Elige «Añadir a pantalla de inicio». 3. Abre Recetas Nevera desde el icono nuevo." **[sin verificar]** los nombres exactos de los menús en el iOS actual (fase 3). Safari no tiene un botón de instalar que se pueda programar.
   - **Chrome/Edge (PC, Android):** botón `[Instalar la app]` si llega el evento `beforeinstallprompt` (**[sin verificar]**, fase 3). Si no, se explica que se puede instalar desde el menú del navegador.
   - **Ya instalada:** se salta el paso.
4. **Paso 3, avisos** (solo dentro de la PWA instalada o en navegadores con `PushManager`):
   - Texto: "Te avisaremos el día antes de que caduque un tupper (a las 10:00) y la noche antes de lo que tengas planificado (a las 21:00)."
   - `[Activar avisos]` → **en ese mismo toque**, `Notification.requestPermission()` (R-02) → el sistema pregunta → si se acepta: suscripción + `POST /api/push/suscripciones` + "✓ Avisos activados" + `‹Enviar un aviso de prueba›`.
   - **Si se rechaza:** "No pasa nada: puedes activarlos más tarde desde Ajustes." Si el permiso queda bloqueado, Ajustes explica cómo desbloquearlo en el sistema.
   - **No compatible:** "Este navegador no puede recibir avisos."
5. **`‹Saltar›`** en cualquier paso → Inventario. Lo pendiente se recuerda con un aviso *info* en Ajustes, no con ventanas emergentes.
6. **Un dispositivo nuevo de la misma persona** (por ejemplo, el PC): tras entrar, Ajustes muestra el estado de los avisos **de ese dispositivo**.

---

## 8. Estados de cada pantalla

Comunes a todas:
- **Sin conexión con copia:** `FranjaConexion` "Sin conexión · datos de las HH:MM" + los botones que escriben con `aria-disabled` y el motivo "Necesitas conexión para guardar".
- **Sin conexión sin copia:** `EstadoVacio` "Sin conexión" / "Conéctate a internet para ver esta pantalla por primera vez." + `[Reintentar]°`.
- **Servidor despertando** (> 3 s sin respuesta): bajo el indicador, "Despertando el servidor… puede tardar un minuto."
- **Sesión caducada (401):** a `/entrar?volver=…` con "Tu sesión ha caducado. Vuelve a entrar."

| Pantalla | Cargando | Vacío | Error (+ acción) | Guardando → fallo al guardar | Con datos |
|---|---|---|---|---|---|
| Entrar / Registro | — | — | "Email o contraseña incorrectos." · "Ya existe una cuenta con ese email." · "Demasiados intentos. Espera unos minutos." | "Entrando…" / "Creando cuenta…" → "No se ha podido conectar. Inténtalo de nuevo." | Formulario |
| Inventario | "Cargando inventario…" | "{Nevera} vacía" / "Añade lo que tienes a mano o escanea el ticket de la compra con el botón «Ticket» de arriba." + `[Añadir producto]°` | "No se ha podido cargar el inventario." + `[Reintentar]` | — | Tuppers + productos por caducidad |
| Nuevo/editar producto | (editar) "Cargando…" | (editar, no existe) "Este producto ya no existe" / "Puede que se haya borrado o agotado." + `[Volver]°` | Errores por campo (los de `FormularioProducto`) | "Guardando…" → "No se ha podido guardar el producto. Inténtalo de nuevo." · Mover: el botón del destino con "Moviendo…" · Borrar: confirmación → "No se ha podido borrar." | Formulario |
| Nuevo tupper | — | — | "Escribe qué hay en el tupper (ej. Cocido)." · "Debe ser un número entero entre 1 y 365." | "Guardando…" → "No se ha podido guardar el tupper. Inténtalo de nuevo." | Formulario + vista previa |
| Tupper | "Cargando…" | "Este tupper ya no existe" + `[Volver]°` | "No se ha podido cargar el tupper." + `[Reintentar]` | "Guardando…" → "No se ha podido marcar como consumido. Inténtalo de nuevo." | Ficha |
| Ticket | Aviso de privacidad / "Leyendo el ticket…" | Todas eliminadas: "No queda ningún producto" + `[Escanear otro ticket]°` | Mensajes de `ticket.ts` y `claude.ts` + `[Reintentar con el mismo ticket]` si es reintentable · "Sin permiso para usar la cámara…" **[sin verificar]** cómo se detecta en la web (fase 5) | "Guardando…" → "No se ha guardado nada…" + `[Reintentar]` | Lista de revisión |
| Recetas | Guardadas: indicador en línea · Generando: "Pensando recetas…" | Guardadas: "Aún no has guardado recetas" / "Genera sugerencias y pulsa «Guardar receta» en las que te gusten." | De generación + `[Reintentar]` / `‹Ir al inventario›` · Al cargar: "No se han podido cargar las recetas." + `[Reintentar]` | — | Sugerencias + guardadas |
| Sugerencia / Receta | "Cargando…" | "Esta sugerencia ya no está disponible" / "Se sustituyó por otras o ya se guardó." · "Esta receta ya no existe" + `[Volver]°` | `[Reintentar]` | Guardar receta: "Guardando…" → "No se ha guardado. Ha fallado el guardado de la receta. Inténtalo de nuevo." · Borrar: confirmación → "No se ha podido borrar." | `VistaReceta` |
| La he cocinado | "Preparando el descuento…" | "Esta receta ya no está disponible" + `[Volver]°` | Errores por fila · 409 "Alguien de tu casa ha cambiado el inventario…" | "Actualizando…" → "No se ha descontado nada…" + `[Reintentar]` | Filas |
| Semana | "Cargando el plan…" | No existe: los 7 días siempre se ven, con "+ Añadir" | "No se ha podido cargar el plan." + `[Reintentar]` | — | Cuadrante |
| Planificar hueco | Recetas: indicador en línea | "Aún no tienes recetas guardadas" / "Genera y guarda alguna en la pestaña Recetas." · Parámetro malo: "Hueco no válido" | — | "Guardando…" → "No se ha guardado. Ha fallado el cambio en el plan. Inténtalo de nuevo." | Formulario + recetas |
| Plan del día | "Comprobando ingredientes…" | "Nada planificado" + `[Planificar comida]°` · "Día no válido" | `[Reintentar]` | — | Platos con ✓/✗ |
| Ajustes | Cada sección con su indicador en línea | — | Hora: "Escribe la hora como HH:MM, por ejemplo 21:00." · Avisos: "No se han podido activar los avisos. Inténtalo de nuevo." | "Guardando…" → "Hora guardada: 21:30." / "No se ha podido guardar la hora." | Secciones |
| Invitar / Unirse | "Creando código…" | — | "Ese código no existe o ha caducado." · "Ese código ya se ha usado." | "Uniéndote…" → "No se ha podido unir. Inténtalo de nuevo." | Código / formulario |

**Mientras se guarda en el servidor:**
- solo se bloquea **el botón** de la acción ("Guardando…", con `aria-busy`); la pantalla se sigue viendo;
- los campos del formulario se deshabilitan para que no cambien a mitad;
- si tarda más de 15 s: "El servidor está tardando demasiado." + `[Reintentar]` (con la misma `clave` donde aplique);
- **nunca** se muestra "guardado" hasta que el servidor responde que sí.

---

## 9. Accesibilidad

| Requisito | Cómo se cumple | Cómo se comprueba |
|---|---|---|
| **Contraste AA** | Solo se usan los pares medidos de `tema.ts` (≥ 4,5:1 en los dos modos). Anillo de foco `primario` sobre `fondo`. Los bordes de los controles (`borde` sobre `fondo`) no transmiten información por sí solos: siempre van con su etiqueta | Herramienta de contraste del navegador en las dos combinaciones, en la fase 1 |
| **Zonas táctiles de 44 px** | `--tactil` como `min-height`/`min-width` en botones, filas, pestañas, casillas y enlaces de acción. Chips de 40 px + separación (**[sin verificar]**, §3.2) | Inspector: medir cada elemento pulsable |
| **Foco visible** | `:focus-visible` con 3 px y separación de 2 px en todo; **nunca `outline: none`** sin sustituto. Orden de foco = orden visual. Foco a `<main>` al cambiar de pantalla y de vuelta al botón al cerrar un `<dialog>` | Recorrer cada pantalla solo con el tabulador |
| **Lectores de pantalla** | HTML semántico (`<nav>`, `<main>`, `<header>`, `<h1>`/`<h2>`, `<button>`, `<a>`, `<fieldset>`/`<legend>`, `<ol>` para los pasos); un `<h1>` por pantalla; `aria-current` en la pestaña; `aria-invalid` + `aria-describedby` en los errores; `role="alert"` solo en errores y `role="status"` para cargas y avisos; `aria-busy` al cargar; iconos con `aria-hidden`; filas leídas como un solo elemento ("Leche, Caduca mañana, 1 l") | VoiceOver en el iPhone (rotor por encabezados y controles) en cada fase con pantallas nuevas |
| **Tamaño de texto del usuario** | §2.3: `-apple-system-body` en iOS y `rem` en todo el texto; contenedores sin altura fija, solo `min-height`; textos que saltan de línea; chips con `flex-wrap`; media queries en `em`. **No** se bloquea el zoom (sin `maximum-scale` ni `user-scalable=no`) | Ajustes del iPhone › Tamaño del texto al máximo (y tamaños grandes de accesibilidad): nada se corta ni se solapa |
| **Nada transmitido solo con color** | "✓ Tienes" / "✗ Te falta" / "Solo tienes…"; caducidad con texto ("Caduca mañana"); errores con "✗" y mensaje; pestaña activa en negrita + barrita; chip elegido con fondo relleno y recomendado con borde grueso + texto oculto; tarjetas destacadas con su texto ("· mañana", "✓ …") | Ver la app en escala de grises (filtro del sistema) |
| **Movimiento reducido** | `prefers-reduced-motion`: sin giros ni transiciones (§2.4) | Activar "Reducir movimiento" en el iPhone |
| **Formularios** | Etiqueta visible y asociada (`<label for>`) en cada campo, también en "Nombre del plato" (en Expo solo tenía `accessibilityLabel`); `autocomplete` correcto (email, contraseñas); `inputmode` adecuado; errores en texto y foco al primero | Rellenar cada formulario con VoiceOver |
| **Idioma** | `<html lang="es">` (la plantilla de Expo tenía `lang="en"`); notificaciones con `lang: "es-ES"` | Inspector |
