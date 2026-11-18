# Diseño de la interfaz — Vigía (antes Recetas Nevera PWA)

| | |
|---|---|
| **Estado** | Fase B **aprobada** el 19 de octubre de 2026 |
| **Fecha** | 19 de octubre de 2026 |
| **Basado en** | `docs/COMPONENTES.md`, `constants/tema.ts` y `app/**/*.tsx` de la app Expo; `docs/ARQUITECTURA.md` (decisiones D-01 a D-32) |
| **Decisiones de diseño** | D-27 navegación · D-28 páginas y `<dialog>` · D-29 tipografía · D-30 iconos · D-31 sugerencias en el servidor · D-32 fecha nativa · D-41 identidad crema y salvia (30-10-2026, sustituida) · D-45 identidad Vigía (07-11-2026) · D-50 cuadrante por fechas · D-51 chat ayudante (registro en `ARQUITECTURA.md` §11) |

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

### 2.1 Colores: Vigía, papel y verde pino (D-45)

Identidad de **Vigía** (D-45, sustituye a la base crema y salvia de D-41). Se eligió así:
- **Base:** un blanco roto neutro, **papel** (`#f6f5f0`), y encima las listas, los campos y los diálogos en **blanco** (`superficie`). En oscuro, un verde casi negro (`#121614`).
- **Primario:** **verde pino** (`#1d5e47`), más profundo que el salvia: el texto blanco del botón da 7,65:1 y el mismo color sirve como texto.
- **Acento:** **azafrán**, "la luz del vigía". Solo en gráficos (la pupila del icono); nunca como texto.
- **Caducidad:** tres estados propios, `ok`, `pronto` y `caducado`, cada uno con su color y su fondo. `peligro`, `aviso` y `exito` son ahora alias de ellos.
- **Estilo:** plano y sobrio, de herramienta (recomendación de ui-ux-pro-max para apps de inventario y lista de la compra): sin degradados, sombras mínimas.

```css
:root {
  /* Avisa al navegador de que hay modo claro y oscuro: así los controles
     nativos (selector de fecha, casillas, barras de scroll) también cambian. */
  color-scheme: light dark;

  /* ---- Modo claro ---- */
  --color-fondo: #f6f5f0;             /* papel: blanco roto neutro */
  --color-superficie: #ffffff;        /* filas y tarjetas encima del papel */
  --color-superficie-2: #ecebe4;      /* zonas hundidas y fila pulsada */
  --color-texto: #1c211e;
  --color-texto-secundario: #424a45;
  --color-texto-tenue: #59625d;
  --color-borde: #d9d8d0;             /* separadores: decorativo */
  --color-borde-control: #7b827d;     /* borde de campos y chips: ≥ 3:1 */
  --color-placeholder: #646c67;
  --color-primario: #1d5e47;          /* verde pino: fondo de botones */
  --color-primario-texto: #1d5e47;    /* el mismo: como texto ya da 7:1 */
  --color-sobre-primario: #ffffff;    /* texto encima de primario */
  --color-acento: #a87108;            /* azafrán, "la luz del vigía": solo gráficos (≥ 3:1), nunca texto */

  /* Caducidad: siempre con texto e icono, nunca solo el color. */
  --color-ok: #1b6a43;
  --color-fondo-ok: #e0f1e6;
  --color-pronto: #8a4a00;
  --color-fondo-pronto: #fcebc9;
  --color-caducado: #b42318;
  --color-fondo-caducado: #fde3df;

  /* Los nombres de siempre, ahora apuntan a los estados. */
  --color-peligro: var(--color-caducado);
  --color-fondo-peligro: var(--color-fondo-caducado);
  --color-sobre-peligro: #ffffff;     /* texto encima de peligro (botón Borrar) */
  --color-aviso: var(--color-pronto);
  --color-fondo-aviso: var(--color-fondo-pronto);
  --color-exito: var(--color-ok);
  --color-fondo-exito: var(--color-fondo-ok);

  /* SOMBRA: muy suave para las filas sobre el papel; más fuerte para lo que flota.
     Van aquí, ANTES del modo oscuro: si fueran después, pisarían las del oscuro. */
  --sombra-1: 0 1px 2px rgb(28 33 30 / 0.06), 0 1px 1px rgb(28 33 30 / 0.04);
  --sombra-flotante: 0 8px 24px rgb(28 33 30 / 0.14);
  /* VELO: lo que oscurece la página detrás de un <dialog> (::backdrop). */
  --color-velo: rgb(18 22 20 / 0.5);
}

@media (prefers-color-scheme: dark) {
  :root {
    /* ---- Modo oscuro ---- */
    --color-fondo: #121614;
    --color-superficie: #1b201d;
    --color-superficie-2: #252b27;
    --color-texto: #eef1ee;
    --color-texto-secundario: #c9cfcb;
    --color-texto-tenue: #a3aba6;
    --color-borde: #313833;
    --color-borde-control: #7d8680;
    --color-placeholder: #939b96;
    --color-primario: #6fcf9f;
    --color-primario-texto: #7fd6a9;
    --color-sobre-primario: #06281a;
    --color-acento: #f2c14e;

    --color-ok: #7fd6a9;
    --color-fondo-ok: #163222;
    --color-pronto: #f5b94a;
    --color-fondo-pronto: #3a2a0c;
    --color-caducado: #ff8a7a;
    --color-fondo-caducado: #3f1813;
    --color-sobre-peligro: #3f1813;   /* en oscuro el rojo es claro: texto oscuro */

    /* En oscuro la sombra no se ve: lo que se separa del fondo es la superficie. */
    --sombra-1: none;
    /* Una sombra clara apenas se ve: la hago más intensa. */
    --sombra-flotante: 0 8px 24px rgb(0 0 0 / 0.5);
  }
}
```

**Contraste medido** (WCAG; texto ≥ 4,5:1, bordes de controles, botón sobre el fondo y gráficos ≥ 3:1):

| Par | Claro | Oscuro |
|---|---|---|
| texto / fondo · superficie | 14,96 · 16,33 | 16,04 · 14,52 |
| texto-secundario / fondo · superficie | 8,37 · 9,14 | 11,53 · 10,44 |
| texto-tenue / fondo · superficie | 5,78 · 6,31 | 7,76 · 7,03 |
| placeholder / fondo · superficie | 4,95 · 5,41 | 6,41 · 5,80 |
| primario-texto / fondo · superficie | 7,01 · 7,65 | 10,51 · 9,52 |
| sobre-primario / primario (texto del botón) | 7,65 | 8,37 |
| primario / fondo (botón y anillo de foco) | 7,01 | 9,65 |
| borde-control / fondo · superficie | 3,61 · 3,94 | 4,86 · 4,40 |
| acento / fondo (solo gráficos) | 3,82 | 10,88 |
| ok / fondo-ok · superficie | 5,61 · 6,58 | 7,99 · 9,52 |
| pronto / fondo-pronto · superficie | 5,84 · 6,86 | 7,86 · 9,38 |
| caducado / fondo-caducado · superficie | 5,39 · 6,57 | 6,78 · 7,21 |
| sobre-peligro / peligro (botón Borrar) | 6,57 | 6,78 |

**Reglas:**
- `--color-primario` es para **rellenos** (botón, chip elegido, pestaña activa); para texto verde se usa `--color-primario-texto` (en claro es el mismo color; en oscuro, un poco más claro).
- `--color-acento` nunca va en texto: solo en gráficos, donde basta 3:1.
- `--color-borde` es solo decorativo (separadores). El borde que **delimita** un campo o un chip es `--color-borde-control`.
- La caducidad se muestra como **etiqueta** con texto e icono distinto (aspa = caducado o caduca hoy, reloj = de 1 a 3 días, punto = aún le queda), nunca solo con el color.
- Solo se combinan los pares de la tabla. Si hace falta uno nuevo, se mide antes de usarlo.

En `index.html` también van dos `<meta name="theme-color">` (uno por modo con `media="(prefers-color-scheme: …)"`) con `#f6f5f0` y `#121614`, para el color de la barra del navegador **[sin verificar]** en la PWA de iOS (fase 3).

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
  --espacio-xxxl: 48px;

  /* RADIO: más contenidos que antes; es una herramienta, no un juguete. */
  --radio-s: 6px;          /* campos de texto */
  --radio-m: 10px;         /* tarjetas, filas y <dialog> */
  --radio-l: 14px;         /* botones */
  --radio-pildora: 999px;  /* chips y etiquetas de caducidad */

  --tactil: 44px;          /* mínimo de cualquier zona pulsable */
  --ancho-maximo: 640px;   /* el contenido no se estira */
  --ancho-barra-lateral: 88px;
  --alto-navegacion: 64px;  /* barra inferior del móvil, sin la zona segura */
}
```

Las sombras y el velo del `<dialog>` están en el bloque de colores de §2.1, **antes** del modo oscuro: si fueran después, pisarían los valores del oscuro.

### 2.3 Tipografía: tamaños de `tema.ts` y tamaño de letra del sistema (D-29)

**El problema:** en iOS, Safari no aplica el tamaño de texto del sistema a una web normal. Solo lo hace si la raíz usa `font: -apple-system-body` ([Vispero](https://vispero.com/resources/text-resizing-web-pages-ios-using-dynamic-type/), [WebKit bug 260880](https://bugs.webkit.org/show_bug.cgi?id=260880)). Ese valor vale 17 px con el tamaño por defecto (**[sin verificar]**, fase 1), no 16.

**La solución:** se toma **17 px como unidad** (`1rem`) en todas partes, y cada tamaño de `tema.ts` se escribe como `px / 17` en `rem`:
- **En el iPhone**, `1rem` es el tamaño de letra del usuario: todo crece o decrece con él.
- **En los demás navegadores**, `html { font-size: 106.25% }` (16 × 1,0625 = 17 px) respeta el tamaño de letra que el usuario haya configurado en su navegador.
- Con el tamaño por defecto, los tamaños son **exactamente los de `tema.ts`**. Si en el iPhone no fuera 17 px, solo hay que cambiar ese número.

**Dos letras (D-29 ampliada por D-45):**
- **Texto:** la del sistema (`--fuente-texto`), para conservar el tamaño de letra de iOS y no descargar nada.
- **Títulos y marca** (`h1`–`h3`, el nombre "Vigía", el código de invitación): **Bricolage Grotesque** (`--fuente-titulos`), licencia OFL, un solo archivo variable de 41 KB en `web/fuentes/` (la CSP solo permite `'self'`), con `font-display: swap` y `preload` en `index.html`. Está en `ARCHIVOS` de `sw.js`, así que también funciona sin red.

```css
@font-face {
  font-family: "Bricolage Grotesque";
  src: url("/fuentes/bricolage-grotesque.woff2") format("woff2");
  font-weight: 200 800;
  font-display: swap;
}
html {
  font-family: var(--fuente-texto);
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
  --fuente-titulos: "Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --fuente-texto: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;

  /* Tamaño (px / 17 rem) · altura de línea. Título y subtítulo, algo mayores
     que en tema.ts para que se note la letra de la marca (D-45). */
  --texto-titulo: calc(26rem / 17);      --linea-titulo: 1.15;     /* 26, 700 */
  --texto-subtitulo: calc(19rem / 17);   --linea-subtitulo: 1.3;   /* 19, 700 en .titulo-seccion */
  --texto-cuerpo: calc(16rem / 17);      --linea-cuerpo: 1.4;      /* 16 */
  --texto-secundario: calc(14rem / 17);  --linea-secundario: 1.429;/* 14 / 20 */
  --texto-pequeno: calc(13rem / 17);     --linea-pequeno: 1.385;   /* 13 / 18 */
  --texto-seccion: calc(13rem / 17);     /* ya no se usa en .titulo-seccion (D-45) */
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
| *(nuevo)* | `crearNavegacion()` | `<nav>` con las pestañas: 4 en la fase 9 (Ajustes pasa a Perfil, D-52) y 5 con la Lista de la compra (fase 10, D-53) |
| *(nuevo)* | `crearCabecera()` | `<header>` con "‹ Atrás", título y acción; en las pestañas, también el botón de Perfil con tu avatar (D-52) |
| *(nuevo)* | `crearAvatar()`, `crearAvatarVivo()` | El avatar de una semilla, dibujado por blobatar: `<img>` quieto o `<svg>` vivo (D-52) |
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
  - el título de la pestaña del navegador (`document.title`) cambia con cada pantalla ("Inventario · Vigía");
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
- **Medidas:** `min-height: calc(var(--tactil) + 4px)` (48 px, como Expo); la fantasma, 44 px. `border-radius: var(--radio-l)` (14 px, D-45). Texto `--texto-cuerpo` con peso 600; puede ocupar dos líneas.
- **Cargando:** `aria-busy="true"` y `disabled`; el texto pasa a `tituloCargando` ("Guardando…") y aparece el indicador. **Evita las dobles pulsaciones** (doble guardado o doble llamada a la IA).
- **Deshabilitado por un motivo** (sin conexión, falta confirmar líneas): en lugar de `disabled`, `aria-disabled="true"` + `aria-describedby` hacia el motivo visible ("Necesitas conexión para guardar"). Así el botón sigue enfocable y el lector de pantallas **explica por qué** no se puede pulsar. El JS ignora el clic.
- **Navegar o actuar:** si el botón lleva a otra pantalla ("+ Producto", "Ir a Perfil") se usa `<a class="boton" href="/producto/nuevo">`, que se abre con un toque largo y el lector anuncia "enlace". Si hace algo ("Guardar"), `<button>`.
- **`accessibilityHint`** de Expo → texto visualmente oculto unido con `aria-describedby`.

#### CampoTexto
```html
<div class="campo">
  <div class="campo__caja">
    <label class="campo__etiqueta" for="cantidad">Cantidad</label>
    <input class="campo__entrada" id="cantidad" name="cantidad" inputmode="decimal"
           autocomplete="off" placeholder="Ej. 500" />
  </div>
  <p class="campo__error" id="cantidad-error" hidden></p>
</div>
```
- **Etiqueta flotante (2026-10-30):** la etiqueta está **dentro** del campo, en el centro, como si fuera el texto de relleno. Al enfocar el campo (o en cuanto tiene algo escrito) **sube** a la parte de arriba, en pequeño, y deja ver el *placeholder*. Sigue siendo un `<label for>` de verdad, así que el lector de pantallas la lee igual. Los campos de fecha y hora la llevan siempre arriba (el navegador ya dibuja su formato dentro).
- **El *placeholder* es un ejemplo** ("Ej. Pechuga de pollo", "Ej. 500"), porque la etiqueta ya dice qué hay que poner. Solo se ve con el campo enfocado, cuando la etiqueta ha subido.
- **Variantes por tipo:**
  - texto: nombre, con `autocapitalize="sentences"` y `maxlength="80"`;
  - número decimal: `inputmode="decimal"`, que en iOS saca el teclado numérico con coma;
  - número entero: días, con `inputmode="numeric"`;
  - email: `type="email" autocomplete="email"`;
  - contraseña: `type="password"`, con `autocomplete="current-password"` o `"new-password"` para que funcione el llavero de iCloud;
  - fecha: `type="date"` + "Quitar fecha" (D-32);
  - hora: `type="time"`, en Perfil › Avisos.
- **Medidas:** unos 58 px de alto (espacio para la etiqueta subida y el texto), borde de 1 px `borde-control`, radio `--radio-s`. **Tamaño de letra ≥ 16 px** dentro del campo (`--texto-cuerpo`): si es menor, Safari hace zoom al enfocarlo (comprobado en el iPhone el 2026-11-12: sin zoom).
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

#### Autocompletar (D-42)
Desplegable de sugerencias bajo un `CampoTexto` (el nombre del producto). Patrón *combobox* de ARIA:
- el input lleva `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded` y `aria-controls` hacia la lista; la lista es `role="listbox"` y cada sugerencia `role="option"` (≥ 44 px de alto);
- **flechas** arriba y abajo recorren las opciones (`aria-activedescendant` marca la activa, el foco se queda en el input), **Intro** elige y **Escape** cierra;
- las del historial del hogar van primero y muestran su unidad y ubicación en `texto-tenue` ("l · Nevera"); después, las de la lista fija;
- se pide al servidor cuando hay 2 letras o más, esperando 250 ms desde la última tecla; sin red, solo la lista fija;
- elegir una del historial propone también su **unidad y ubicación** (se pueden cambiar).

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
    <li><a href="/ayudante">…<span>Ayudante</span></a></li>
  </ul>
</nav>
<!-- Fase 10 (D-53): <li><a href="/lista">…<span>Lista</span></a></li> va detrás de Inventario. -->
```
- **Pestaña activa:** `aria-current="page"` + color `primario` + **texto en negrita y una barrita encima** (abajo) o a la izquierda (lateral). No depende solo del color.
- Cada pestaña mide ≥ 44 × 44 px. Iconos SVG de 24 px con `stroke="currentColor"` (D-30). Como mucho **5 pestañas**: en un iPhone de 375 px caben 75 px por pestaña; con 6 quedarían 62 px y "Ayudante" no cabría (por eso Ajustes pasa a la cabecera como Perfil, D-52). El texto va en `--texto-pequeno` y en una sola línea. Icono de Ayudante: un bocadillo de conversación.
- **Se muestra en las pantallas de pestaña.** En las páginas secundarias del móvil se oculta (más sitio para el formulario y el pie, como los modales de Expo); en escritorio la barra lateral se ve siempre.

#### Cabecera
`<header class="cabecera"><a class="cabecera__atras" href="/">‹ Atrás</a><h1>Nuevo producto</h1><a class="cabecera__accion" href="/ticket">…Ticket</a></header>`
- Variantes: de pestaña (título + acción opcional, como el botón "Ticket" de Inventario) y secundaria ("‹ Atrás" + título).
- Comportamiento de "Atrás" en §5.3.
- **Botón de Perfil (D-52), en todas las cabeceras de pestaña**, el último por la derecha: `<a class="cabecera__perfil" href="/perfil" aria-label="Perfil"><svg class="avatar" aria-hidden="true">…</svg></a>`. Zona táctil de 44 × 44 px con el avatar de 32 px dentro; foco visible como el resto (§2.4). En Perfil y sus apartados no sale (ya estás dentro) y "‹ Atrás" vuelve a la pestaña de la que venías. En escritorio, igual: arriba a la derecha de la columna.

#### Avatar (D-52)
Lo dibuja **blobatar** 2.7.0 (`web/js/componentes/avatar.js`) desde la semilla de la persona: un "blob" de color con dos ojos, sobre un círculo claro (`background: 'circle'`). Diez siluetas y colores en OKLCh; los ojos contrastan al menos 4,5:1 con el cuerpo.
- **Quieto** — `crearAvatar({ semilla, tamano })` → `<img class="avatar" src="data:image/svg+xml,…" alt="">`. En la cabecera (32 px) y junto a cada persona del hogar (24 px). Es lo que recomienda blobatar para avatares pequeños, y la CSP ya admite imágenes `data:`.
- **Vivo** — `crearAvatarVivo({ semilla, tamano })` → `<svg class="avatar avatar--vivo">` con `motion.css` (`<link>` a `/vendor/blobatar/motion.css`): respira, parpadea y echa alguna mirada, con tiempos propios de cada semilla. Solo arriba en Perfil (96 px). Con "Reducir movimiento", `motion.css` lo deja quieto.
- **Mira hacia donde tocas** — `mirarAlToque(avatar, zona)`: al tocar (o hacer clic) en la pantalla, el grupo de los ojos (`.mo-eyes`) se desplaza 3,5 unidades hacia ese punto con una transición de CSS y vuelve a los 1,4 s; mientras, se paran sus miradas de reposo. Devuelve una función para dejar de escuchar al salir de la pantalla. El seguimiento de blobatar (`gaze`) no sirve: solo se activa con ratón (`pointer: fine`).
- **Sin `innerHTML`** (SEC-07): el SVG vivo se lee con `DOMParser` (con los `style="…"` renombrados para que la CSP no se queje) y cada nodo se crea de nuevo; los estilos van por `style.setProperty`, que la CSP sí permite.
- **Es decorativo** (`alt=""` / `aria-hidden`): siempre va junto al nombre de la persona o dentro de un botón con su `aria-label`. No transmite información.

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
| `VistaReceta` | Ingredientes con "✓ Tienes 500 g" / "Solo tienes…" / "Tienes «X» en otra unidad: revísalo." / "Tienes el tupper «…»" / "✗ Te falta" (de `estadoIngrediente()`), resumen "Tienes todo" / "Te faltan 2 ingredientes" (cuenta `falta` y `poco`) y pasos numerados (`<ol>`) | `{ receta, productos, tuppers }` → `<section>`; exporta `describirEstado()` |
| `FormularioReceta` | Alta y edición de una receta (P-20, D-49): nombre, raciones opcionales, filas de ingredientes (autocompletado de Producto y `<select>` de unidad) con "Añadir" y "Quitar", y pasos en un `<textarea>`; validación por campo con `validarReceta()` | `{ inicial?, textoBoton, alGuardar(datos) => Promise, buscarHistorial? }` → `{ formulario, boton }` (como `FormularioProducto`) |
| `FilaCocinar` | Un ingrediente en "La he cocinado": "¿De cuál lo has usado?", la cantidad a descontar, "Quedarán…", "No descontar" | `{ fila, alCambiar }` → `<article>` |
| `Hueco` | Un hueco del cuadrante (Comida/Cena) que se puede pulsar: el plato y su grupo en tono tenue, "Fuera de casa" o "+ Añadir" | `{ fecha, tipo, hueco \| null }` → `<a href="/plan/:fecha/:tipo">` |
| `MensajeChat` | Un mensaje del chat (D-51): el tuyo a la derecha con fondo `superficie-2`; el del ayudante a la izquierda, sin burbuja, a todo el ancho. Texto con `textContent` y `white-space: pre-wrap`. Mientras llega, `aria-busy="true"` y una línea tenue con lo que hace ("Mirando tu inventario…") | `{ rol, texto, tarjetas }` → `<article>`; `agregarTexto(trozo)` y `ponerEstado(texto)` para el streaming |
| `TarjetaReceta` | La receta que propone el ayudante: nombre, "Para 2 personas · Te falta 1 ingrediente" (con `VistaReceta` y el inventario recién pedido), `‹Ver ingredientes y pasos›` (un `<details>`), `[Guardar receta]` y `‹Descartar›`. Guardada: "✓ Guardada en Recetas" + `‹Ver receta›`; descartada: "Descartada", en tono tenue | `{ tarjeta, productos, tuppers, alGuardar, alDescartar }` → `<article>` |
| `TarjetaHuecos` | Los huecos que propone: una casilla por hueco ("Lun 23 · Cena: Lentejas con chorizo · Legumbres"), marcadas de inicio; "Sustituye a «Pizza»" en tono aviso si el hueco ya tiene algo; un hueco que ahora es "fuera de casa" sale sin casilla ("Ya no se puede: fuera de casa"). `[Añadir 2 al cuadrante]` (cuenta las marcadas; deshabilitado con 0) y `‹Descartar›`. Guardada: "✓ Añadidos 2 huecos" + `‹Ver la semana›` | `{ tarjeta, alGuardar(elegidos), alDescartar }` → `<article>` |
| `EquilibrioSemana` | Cuántas veces sale cada grupo frente a AESAN 2022 (`equilibrioSemana()`, D-50): "Legumbres · 2 de 4 o más" con su tono y su texto, nunca solo el color; los grupos sin objetivo, en una línea; y "Orientativo, no sustituye el consejo de un profesional." con la fuente | `{ huecos }` → `<section>` |

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
│        [icono] Vigía          │
│  Controla lo que tienes,      │
│  no desperdicies.             │
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
│[▢]Inv [⑂]Rec [▦]Sem [◌]Ayu [⚙]Aj│  ← navegación
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
│                               │   │ │ ¿Dónde lo guardas? Puede │ │
│                               │   │ │ ir en Nevera o Congelador│ │
│                               │   │ │ (*Nev.)( Desp.)(*Cong.)  │ │
│                               │   │ │ ! Elige dónde lo guardas.│ │
│                               │   │ │ ‹Eliminar›  [✓ Confirmar]│ │
│                               │   │ └──────────────────────────┘ │
│                               │   │ ┌──────────────────────────┐ │
│                               │   │ │✓ Leche · 6 l · Despensa  │ │
│                               │   │ │  Toca para editar        │ │
│                               │   │ └──────────────────────────┘ │
│───────────────────────────────│   │──────────────────────────────│
│  [   Elegir el ticket    ]    │   │ [ Faltan 1 por confirmar ]   │
└──────────────────────────────┘   └──────────────────────────────┘
```
La primera vez, antes de "Elegir", aparece el **aviso de privacidad** (SEC-04, §7.1) y el pie dice `[Entendido, continuar]`. Un **solo botón** con un `<input type="file">` sin `capture` (R-08): el menú del sistema ofrece cámara, fotos y archivo.

#### P-09 · Recetas — `/recetas` · E-1 (sin IA, D-48)
```
┌──────────────────────────────┐
│  Recetas                      │
│ ┌──────────────────────────┐ │
│ │ Tortilla de patatas    › │ │
│ │ Para 4 personas          │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Lentejas con chorizo   › │ │
│ └──────────────────────────┘ │
│──────────────────────────────│
│ [        + Receta         ]   │
├──────────────────────────────┤
│[▢]Inv [⑂]Rec [▦]Sem [◌]Ayu [⚙]Aj│
└──────────────────────────────┘
```
- Lista con `crearFila`, **las más recientes primero** (el orden de `GET /api/recetas`). Subtítulo "Para N personas" solo si la receta tiene raciones.
- "Qué me falta" **no** se calcula en la lista (habría que cruzar cada receta con todo el inventario): está en el detalle (P-11).
- Vacía: `EstadoVacio` "Aún no tienes recetas" / "Escribe las que cocinas a menudo y Vigía te dirá qué te falta antes de ponerte." + `[+ Receta]`.
- `[+ Receta]` en el pie → `/receta/nueva` (P-20).

#### P-10 · Sugerencia — sustituida por las tarjetas del Ayudante (D-48, D-51)
Las recetas que propone la IA son tarjetas de P-21 (`TarjetaReceta`). Esta pantalla no se hace.

#### P-11 · Receta — `/receta/:id` · E-2
```
┌──────────────────────────────┐
│  ‹ Recetas            Editar  │
│  Tortilla de patatas          │  (h1)
│  Para 4 personas · Te faltan  │
│  2 ingredientes  (naranja)    │
│  INGREDIENTES                 │
│  Patatas · 1 kg               │
│  ✓ Tienes 1,5 kg   (verde)    │
│  Huevos · 6 ud.               │
│  Solo tienes 4 ud. (naranja)  │
│  Cebolla · 1 ud.              │
│  ✗ Te falta        (rojo)     │
│  Aceite · 100 ml              │
│  Tienes «Aceite» en otra      │
│  unidad: revísalo. (tenue)    │
│  PASOS                        │
│  1. Pela y corta las patatas. │
│  2. …                         │
│  ‹Borrar receta›              │
│──────────────────────────────│
│ [     La he cocinado      ]   │
└──────────────────────────────┘
```
- Estado de cada ingrediente con `estadoIngrediente()` (`compartido/cocina.js`), siempre con **texto además del color** (principio 4):

  | Estado | Texto | Tono |
  |---|---|---|
  | `tienes` | "✓ Tienes 1,5 kg" | `exito` |
  | `poco` | "Solo tienes 200 g" | `aviso` |
  | `otra_unidad` | "Tienes «Aceite» en otra unidad: revísalo." | `tenue` |
  | `tupper` | "Tienes el tupper «Lentejas con chorizo»" | `exito` |
  | `falta` | "✗ Te falta" | `peligro` |

- Resumen bajo el título: "Tienes todo" (`exito`) o "Te faltan N ingredientes" (`aviso`), contando **`falta` y `poco`**. `otra_unidad` no cuenta: sí lo tienes, y "La he cocinado" preguntará cuánto has gastado.
- Se calcula **al abrir**, con los productos y los tuppers del hogar recién pedidos a la API (si alguien de la casa acaba de gastar algo, ya sale).
- `Editar` en la cabecera → `/receta/:id/editar` (P-20).
- `‹Borrar receta›` (botón fantasma, al final) con `confirmar()`: "Borrar receta" / "Se borrará «Tortilla de patatas». No se puede deshacer." / `[Borrar]` peligroso → vuelve a Recetas con "✓ «Tortilla de patatas» borrada."
- El pie **solo** tiene `[La he cocinado]` → `/cocinar?receta=:id` (P-12).

#### P-20 · Nueva / editar receta — `/receta/nueva` · `/receta/:id/editar` · E-2 (D-49)
```
┌──────────────────────────────┐
│  ‹ Atrás      Nueva receta    │
│  Nombre                       │
│  [Ej. Tortilla de patatas___] │
│  Raciones (opcional)          │
│  [Ej. 4__]                    │
│  ⓘ Solo para saber para       │
│    cuántas personas es.       │
│  INGREDIENTES                 │
│ ┌──────────────────────────┐ │
│ │ Ingrediente              │ │
│ │ [Ej. Patatas___________] │ │
│ │ Cantidad     Unidad      │ │
│ │ [Ej. 500]    [ g      ▾] │ │
│ │                ‹Quitar›  │ │
│ └──────────────────────────┘ │
│ [+ Añadir ingrediente]°       │
│  Pasos                        │
│  [__________________________] │
│  [__________________________] │
│  ⓘ Escribe un paso por línea. │
│──────────────────────────────│
│ [     Guardar receta      ]   │  ("Guardar cambios" al editar)
└──────────────────────────────┘
```
Reglas de formularios (skill reglas-diseno-web): etiqueta siempre visible (la flotante, elegida a sabiendas), placeholder solo de ejemplo, ayuda bajo el campo con `aria-describedby` y "(opcional)" en vez de asteriscos.
- **Nombre:** `CampoTexto`, máximo 80, placeholder "Ej. Tortilla de patatas".
- **Raciones (opcional):** `inputmode="numeric"`, de 1 a 20, ayuda "Solo para saber para cuántas personas es."
- **Ingredientes:** una `Tarjeta` por fila (empieza con **una fila vacía**):
  - Ingrediente: `CampoTexto` con el **autocompletado de Producto** (historial del hogar + lista fija, D-42): si se escribe igual que en el inventario, "qué me falta" lo encuentra.
  - Cantidad: `inputmode="decimal"` (acepta coma). Unidad: **`<select>` nativo** (g, kg, ml, l, unidades), al lado de la cantidad: con chips cada fila tendría 5 más y la pantalla se haría muy larga; en el iPhone abre la rueda del sistema.
  - `‹Quitar›` solo si hay más de una fila. `[+ Añadir ingrediente]°` añade una fila vacía y lleva el foco a su nombre; con 30 filas se deshabilita con el motivo "Como mucho 30 ingredientes".
- **Pasos:** `<textarea>` que crece con el texto, ayuda "Escribe un paso por línea." Al guardar se parte por líneas y se quitan las vacías (lo que espera `validarReceta()`). Al editar, los pasos se unen con un salto de línea.
- **Errores:** `validarReceta()` (la misma del servidor, D-40) los da por campo, también los de cada fila (`ingredientes.2.cantidad`): se marca ese campo y el foco va al primero que falla.
- **Al guardar** (`POST` o `PUT /api/recetas`): "Guardando…" → reemplaza el formulario en el historial por `/receta/:id` con "✓ Receta guardada." o "✓ Cambios guardados." (así "Atrás" no vuelve al formulario).

#### P-12 · La he cocinado — `/cocinar?receta=:id` · E-2
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

#### P-13 · Semana — `/semana` · `/semana/:lunes` · E-1 (D-50)
```
┌──────────────────────────────┐
│  Semana                       │
│  [‹]  Semana del 23 al 29  [›]│  ‹ y › con aria-label
│       de noviembre            │  ("Semana anterior/siguiente")
│  ‹Ir a esta semana›           │  (solo si no es la actual)
│ ┌──────────────────────────┐ │  Aviso info (semana actual o
│ │ Caduca pronto: Pollo     │ │  futura, avisoCaducidad())
│ │ (mañana), Leche (hoy).   │ │
│ └──────────────────────────┘ │
│  LUNES 23            ‹Ver día›│  ‹Ver día› → P-15, si tiene algo
│ ┌──────────────────────────┐ │
│ │ Comida  Lentejas         │ │
│ │         Legumbres        │ │  (grupo en tono tenue)
│ │ Cena    + Añadir         │ │
│ └──────────────────────────┘ │
│  MARTES 24 · HOY             │
│  Carne roja en la comida y en │  aviso del día (tono aviso),
│  la cena: mejor variar.       │  avisosDia()
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │  borde primario (hoy)
│ ┃ Comida  Hamburguesa      ┃ │
│ ┃         Carne roja       ┃ │
│ ┃ Cena    Filete           ┃ │
│ ┃         Carne roja       ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│  MIÉRCOLES 25                 │
│ ┌──────────────────────────┐ │
│ │ Comida  Fuera de casa    │ │  (tenue)
│ │         Comida aniversario│ │  su nota, si la tiene
│ └──────────────────────────┘ │
│  … hasta DOMINGO 29           │
│  EQUILIBRIO DE LA SEMANA      │
│  Legumbres  1 de 4 o más      │  tono aviso + texto
│  Pescado    3 de 3 o más ✓    │  tono éxito
│  Huevos     1 (hasta 4) ✓     │
│  Carne      4 (máx. 3)        │  tono aviso: "Mejor aves y conejo."
│  También: verduras 2, pasta   │
│  o arroz 1.                   │
│  Orientativo, no sustituye el │
│  consejo de un profesional.   │
│  Cuenta los platos con grupo, │
│  no las raciones. Fuente:     │
│  ‹AESAN 2022›                 │  enlace externo
├──────────────────────────────┤
│[▢]Inv [⑂]Rec [▦]Sem [◌]Ayu [⚙]Aj│
└──────────────────────────────┘
```
- `/semana` muestra la semana de hoy (en la zona del navegador); `/semana/:lunes` tiene que ser un lunes dentro del margen de un año (si no, "Semana no válida" + `‹Ir a esta semana›`).
- Los 7 días se ven siempre, aunque estén vacíos: una semana nueva aparece vacía.
- ‹ y › cambian de semana con `navegar()` (sin "reemplazar": "Atrás" vuelve a la semana anterior vista). Al llegar al margen, el botón se deshabilita con su motivo.
- "HOY" y "MAÑANA" junto al día que toque. Los días pasados se pueden editar igual (por si se apunta tarde lo que se comió).
- **Avisos del día** (`avisosDia()`, D-50), bajo su título y en tono aviso: el mismo grupo en la comida y en la cena ("Carne roja en la comida y en la cena: mejor variar.") y el día en que se pasa de un máximo de AESAN ("Cuarta vez de carne esta semana (AESAN: 3 como mucho)."). El equilibrio de abajo es el resumen de la semana.

#### P-14 · Planificar hueco — `/plan/:fecha/:tipo` · E-2 (D-50)
```
┌──────────────────────────────┐
│  ‹ Semana   Martes 24 · Cena  │
│  ¿QUÉ VAS A COMER?            │  (legend)
│  (●) Una receta guardada      │
│  ( ) Escribir un plato        │
│  ( ) Fuera de casa            │
│  ELIGE LA RECETA              │  (si "receta")
│  (●) Tortilla de patatas      │
│  ( ) Arroz con pollo          │
│  Nota (opcional)              │  (solo si "fuera de casa")
│  GRUPO DE ALIMENTOS (opcional)│  (oculto si "fuera de casa")
│  [ Huevos               ▾ ]   │  <select>, primera opción "Sin grupo"
│  ‹Dejar este hueco vacío›     │  (solo si ya tiene algo)
│──────────────────────────────│
│ [        Guardar          ]   │
└──────────────────────────────┘
```
- "Escribir un plato": un campo "Nombre del plato" (`Ej. Lentejas con chorizo`, 1 a 80 caracteres) con el autocompletado de nombres de producto.
- "Fuera de casa": un campo "Nota (opcional)" (`Ej. Comida aniversario`, hasta 80 caracteres): una cita no es un plato. Vacía, se guarda sin nota.
- Sin recetas guardadas: en vez de la lista, "Aún no tienes recetas guardadas." + `‹Escribir una›` (→ `/receta/nueva`); la opción por defecto pasa a ser "Escribir un plato".
- Al abrir un hueco que ya tiene algo, sale lo que tiene marcado.
- Guardar → "Guardando…" → vuelve a la semana del hueco (`reemplazar`) con "✓ Plan guardado." Si este dispositivo no tiene los avisos activos: "Plan guardado. Activa los avisos en Perfil › Avisos para que te lo recordemos la noche antes."
- ‹Dejar este hueco vacío› → `DELETE` sin confirmar (se deshace volviendo a planificarlo) → vuelve con "✓ Hueco vaciado."

#### P-15 · Plan del día — `/plan/:fecha` · E-2 (**la abre el aviso**)
```
┌──────────────────────────────┐
│  ‹ Semana   Mañana (martes 24)│
│  COMIDA                       │
│  Lentejas                     │
│  Plato escrito a mano: no     │
│  tiene lista de ingredientes. │
│  Esto es lo que hay en casa   │
│  para este plato:             │
│  ✓ Lentejas: 1 kg             │
│  CENA                         │
│  Tortilla de patatas  ‹Ver›   │  ‹Ver› → /receta/:id
│  Para 2 personas · Tienes todo│
│  Huevos · 4 ud. ✓ Tienes 6 ud.│
│  Patatas · 500 g ✓ Tienes 2 kg│
└──────────────────────────────┘
```
- Título: "Hoy (martes 24)", "Mañana (martes 24)" o "Martes 24 de noviembre".
- Cada plato con `‹Cambiar›` (→ P-14); una receta, además, con `‹Ver receta›` (→ P-11). Un hueco sin nada: "Sin planificar." + `‹Planificar›`. En la Semana, `‹Ver día›` junto a cada día que tenga algo.
- Una receta: el resumen y los ingredientes de `VistaReceta` (sin los pasos). Un plato escrito a mano: `productosDelPlato()` (los productos que comparten una palabra con el plato, sin contar "asado", "frito"…), o "✗ No hay nada para este plato en el inventario." "Fuera de casa": eso y su nota, si la tiene.
- Nada planificado: "Nada planificado" / "No hay comida ni cena para el martes 24." + `[Planificar comida]°` (→ `/plan/:fecha/comida`).

#### P-21 · Ayudante — `/ayudante` · E-1 (D-48, D-51)
```
┌──────────────────────────────┐
│  Ayudante  ‹Nueva conversación›
│                               │
│        ┌───────────────────┐  │
│        │ ¿Qué ceno hoy con │  │  tu mensaje, a la derecha
│        │ lo que tengo?     │  │
│        └───────────────────┘  │
│  Mirando tu inventario…       │  tenue, mientras usa una herramienta
│  Tienes pollo que caduca      │  la respuesta aparece mientras se escribe
│  mañana. Te propongo esto:    │
│ ┌──────────────────────────┐ │
│ │ RECETA PROPUESTA         │ │  TarjetaReceta
│ │ Pollo al ajillo          │ │
│ │ Para 2 · Te falta 1 ingr.│ │
│ │ ‹Ver ingredientes y pasos›│ │
│ │ [Guardar receta] ‹Descartar›│
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ AÑADIR AL CUADRANTE      │ │  TarjetaHuecos
│ │ ☑ Lun 23 · Cena          │ │
│ │   Lentejas · Legumbres   │ │
│ │ ☑ Mar 24 · Cena          │ │
│ │   Merluza · Pescado      │ │
│ │   Sustituye a «Pizza»    │ │
│ │ [Añadir 2 al cuadrante]  │ │
│ │ ‹Descartar›              │ │
│ └──────────────────────────┘ │
│──────────────────────────────│
│ [Escribe tu pregunta…   ][➤] │  pie: área de texto + Enviar
│ Te quedan 27 mensajes hoy.   │
├──────────────────────────────┤
│[▢]Inv [⑂]Rec [▦]Sem [◌]Ayu [⚙]Aj│
└──────────────────────────────┘
```
- **Primera vez** (sin `avisoAceptado`): en lugar de la conversación, un `Aviso` *info*: "Tus mensajes, y lo que el ayudante lea de tu inventario, tus recetas y tu plan, se envían a Anthropic (la empresa de Claude) para responderte. La conversación se guarda 30 días y solo la ves tú." + `‹Más información›` (→ P-18) + `[Empezar]`. El pie no se ve hasta aceptarlo.
- **Vacía:** `EstadoVacio` "Pregúntame lo que quieras de cocina" / "Puedo ver tu inventario, tus recetas y tu semana, y proponerte recetas y platos. Nada se guarda sin que lo confirmes." + 3 ejemplos como botones secundarios que **escriben** el texto en el área (no lo envían): "¿Qué ceno hoy con lo que tengo?", "Rellena las cenas de esta semana", "¿Cuánto dura el arroz cocido en la nevera?".
- **El pie** (como en E-2, pegado encima de la navegación): `<textarea>` de 1 a 4 líneas que crece al escribir, con la etiqueta flotante "Escribe tu pregunta"; contador "1980 / 2000" solo a partir de 1800 caracteres; botón Enviar de 44 × 44 px con `aria-label="Enviar"`. **Intro** hace un salto de línea (en el iPhone no hay Mayús + Intro cómodo); se envía con el botón. Debajo, "Te quedan N mensajes hoy." en tono tenue.
- **Mientras responde:** el área y Enviar se deshabilitan ("Respondiendo…"), la página baja sola mientras llega texto **solo si ya estabas abajo** (si has subido a leer, no te mueve) y, al acabar, un `role="status"` oculto dice "Respuesta lista" (el texto que llega a trozos no se anuncia: el lector lo leería palabra a palabra).
- **Al guardar una tarjeta:** el botón pasa a "Guardando…" y después la tarjeta cambia a su estado final. Las demás tarjetas y el chat siguen usables.
- `‹Nueva conversación›` → `confirmar()` "¿Empezar una conversación nueva? La de ahora se borrará y no se puede recuperar." `[Empezar de nuevo]` (peligro) → `DELETE /api/chat` → vacía.
- **Conversación llena** (40 preguntas): el pie se sustituye por "Esta conversación ha llegado al máximo." + `[Nueva conversación]`.

#### P-16 · Perfil — `/perfil` · E-2 (D-52; sustituye a Ajustes)
```
┌──────────────────────────────┐
│  ‹ Atrás          Perfil      │
│            (•‿•)              │  avatar VIVO de 96 px
│            Álvaro             │  (h2)
│      alvaro@ejemplo.es        │  tenue
│ ┌──────────────────────────┐ │
│ │ Datos personales       › │ │  FilaLista con su resumen
│ │ Tu nombre y tu avatar    │ │
│ ├──────────────────────────┤ │
│ │ Seguridad              › │ │
│ │ Contraseña y sesiones    │ │
│ ├──────────────────────────┤ │
│ │ Hogar                  › │ │
│ │ Casa de Álvaro · 2 pers. │ │
│ ├──────────────────────────┤ │
│ │ Avisos                 › │ │
│ │ Activados · plan 21:00   │ │
│ ├──────────────────────────┤ │
│ │ Inteligencia artificial › │ │
│ │ Te quedan 9 tickets y 28 │ │
│ │ mensajes hoy             │ │
│ ├──────────────────────────┤ │
│ │ Privacidad             › │ │
│ └──────────────────────────┘ │
│  Modelo: claude-sonnet-5-5    │  tenue
└──────────────────────────────┘
```
Sin barra de pestañas (es una pantalla secundaria). El avatar grande es el **vivo**: parpadea y mira hacia donde toques en la pantalla (`mirarAlToque`). Cada fila lleva a su apartado; el resumen se calcula con lo que ya devuelve `GET /api/yo`. El resumen de Avisos depende de **este dispositivo** (§7.6): "Activados", "Desactivados", "Instala la app para recibir avisos"…

#### P-22 · Datos personales — `/perfil/datos` · E-2 (D-52)
```
┌──────────────────────────────┐
│  ‹ Perfil   Datos personales  │
│            (◕‿◕)              │
│      ‹Otro avatar›            │  botón secundario
│  Nombre                       │
│  [Álvaro__________________]   │
│  Email                        │
│  alvaro@ejemplo.es            │  solo se ve (fase 11)
│  Pronto podrás cambiarlo.     │  tenue
│──────────────────────────────│
│ [     Guardar nombre      ]   │
└──────────────────────────────┘
```
- "Otro avatar" → `POST /api/yo/avatar` y el avatar cambia al momento (también el de la cabecera). Sin confirmar: si no gusta, se pulsa otra vez.
- Nombre con `crearCampo()` y la misma validación que en el registro. "Guardando…" → "✓ Nombre guardado." (`role="status"`).

#### P-23 · Seguridad — `/perfil/seguridad` · E-2 (D-52)
```
┌──────────────────────────────┐
│  ‹ Perfil       Seguridad     │
│  CAMBIAR LA CONTRASEÑA        │
│  Contraseña actual            │
│  [••••••••••••] Mostrar       │
│  Contraseña nueva             │
│  [••••••••••••] Mostrar       │
│  De 10 a 128 caracteres.      │
│  [  Cambiar contraseña   ]°   │
│  SESIONES                     │
│  Cierra la sesión en tus      │
│  otros dispositivos.          │
│  ‹Cerrar las demás sesiones›  │
│  ‹Cerrar sesión›              │
│  ‹Borrar cuenta›   (peligro)  │
└──────────────────────────────┘
```
- Cambiar la contraseña: `autocomplete="current-password"` y `"new-password"` (el llavero de iOS propone una). Contraseña actual mal → error en su campo ("La contraseña actual no es correcta."). Bien → "✓ Contraseña cambiada. Hemos cerrado la sesión en tus otros dispositivos." y se vacían los campos.
- "Cerrar las demás sesiones" → `confirmar()` → "✓ Hemos cerrado 2 sesiones." (o "No había otras sesiones abiertas.").
- "Cerrar sesión" y "Borrar cuenta" como estaban en Ajustes; "Borrar cuenta" lleva a `/cuenta/borrar`.

#### P-24 · Hogar — `/perfil/hogar` · E-2 (D-52)
Lo que era la sección "Tu casa" de Ajustes: nombre de la casa con `‹Cambiar nombre›`, las personas (**cada una con su avatar de 24 px**, "(tú)" y su rol), `[Invitar a alguien]`, `‹Tengo un código›` y `‹Salir de esta casa›`.

#### P-25 · Avisos — `/perfil/avisos` · E-2 (D-52)
Lo que eran las secciones "Avisos en este dispositivo" y "Aviso del plan" de Ajustes, con sus estados (§7.6): "Instala la app para recibir avisos", "Activar avisos", "Has bloqueado los avisos: actívalos en Ajustes del iPhone › Notificaciones › Vigía" **[sin verificar]** la ruta exacta, `‹Enviar prueba›`, `‹Desactivar›` y la hora del aviso del plan.

#### P-26 · Inteligencia artificial — `/perfil/ia` · E-2 (D-52)
Lo que era la sección de IA de Ajustes: "Tickets: te quedan 9 de 10 hoy." · "Ayudante: te quedan 28 de 30 mensajes hoy." · "Se renuevan cada día a medianoche." y el modelo en tono tenue.

#### P-17 · Invitar / unirse — `/hogar/invitar` · `/hogar/unirse` · E-2
```
INVITAR                             UNIRSE
┌──────────────────────────────┐   ┌──────────────────────────────┐
│  ‹ Hogar        Invitar       │   │  ‹ Hogar     Unirse a una casa│
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
Texto: qué datos se guardan y dónde (Neon y Render), que **las fotos de los tickets se envían a Anthropic** para leerlas y no se guardan, que **los mensajes del Ayudante** (y lo que lee de tu inventario, tus recetas y tu plan) también se envían a Anthropic y la conversación se guarda 30 días, solo la ve quien la escribe y se borra con "Nueva conversación" o al borrar la cuenta (D-51), la cuota de IA, cómo borrar la cuenta y el contacto. Se puede abrir sin sesión.

#### P-19 · No existe — cualquier ruta desconocida · E-1/E-3
`EstadoVacio` centrado: "Esta pantalla no existe" + `[Ir al inventario]°`. Igual para los parámetros no válidos ("Día no válido", "Este producto ya no existe").

---

## 5. Navegación y rutas

### 5.1 Pestañas
**Inventario** (`/`), **Recetas** (`/recetas`), **Semana** (`/semana`) y **Ayudante** (`/ayudante`, fase 8, D-51); en la fase 10, **Lista** (`/lista`, D-53) detrás de Inventario. **Ajustes ya no es una pestaña:** pasa a Perfil, que se abre con el avatar de la cabecera (D-52). Barra inferior en el móvil y lateral desde 48em (D-27).

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
| `/receta/nueva` | P-20 | Recetas | — (va antes que `/receta/:id`) | `/recetas` |
| `/receta/:id` | P-11 | Recetas | `id` entero > 0 | `/recetas` |
| `/receta/:id/editar` | P-20 | Recetas | `id` entero > 0 | `/receta/:id` |
| `/cocinar` | P-12 | Recetas | `?receta` entero > 0 | `/receta/:id` |
| `/semana` | P-13 | Semana | — (la semana de hoy) | — |
| `/semana/:lunes` | P-13 | Semana | `lunes`: fecha ISO, lunes, dentro del margen de un año (D-50) | — |
| `/plan/:fecha` | P-15 | Semana | `fecha`: fecha ISO dentro del margen | `/semana/:lunes` de esa fecha |
| `/plan/:fecha/:tipo` | P-14 | Semana | `fecha` igual, `tipo` ∈ `TIPOS_COMIDA` | `/semana/:lunes` de esa fecha |
| `/ayudante` | P-21 | Ayudante | — | — |
| `/perfil` | P-16 | — (el avatar de la cabecera, D-52) | — | `/` |
| `/perfil/datos` | P-22 | — | — | `/perfil` |
| `/perfil/seguridad` | P-23 | — | — | `/perfil` |
| `/perfil/hogar` | P-24 | — | — | `/perfil` |
| `/perfil/avisos` | P-25 | — | — | `/perfil` |
| `/perfil/ia` | P-26 | — | — | `/perfil` |
| `/ajustes` | Lleva a `/perfil` (`reemplazar`): avisos y enlaces antiguos (D-52) | — | — | — |
| `/hogar/invitar`, `/hogar/unirse` | P-17 | — | `?codigo` opcional, formato del código | `/perfil/hogar` |
| `/cuenta/borrar` | Borrar cuenta (fase 2): aviso de lo que se borra + contraseña | — | — | `/perfil/seguridad` |
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
| Plan | "Mañana comes lentejas y cenas tortilla" | `/plan/2026-11-24` | P-15, con lo que tienes y lo que te falta |
| Prueba | "Los avisos funcionan" | `/perfil/avisos` (D-52) | P-25 |

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
- **El teclado del iPhone** sobre un pie *sticky*: comprobado en el iPhone (fases 5 y 3, 2026-11-11/12): no tapa los campos, así que no hace falta el plan B. Plan B, por si cambia: ocultar el pie mientras haya un campo enfocado y mostrar el botón al final del formulario.

---

## 7. Flujos de UX paso a paso

### 7.1 Escanear ticket → revisar → guardar
1. **Inventario** → "🧾 Ticket" en la cabecera → `/ticket`.
2. **Primera vez** (`avisoIaAceptado = false`): tarjeta *info* "Antes de escanear" con "La foto o el PDF del ticket se envía a Anthropic (Claude) para leer los productos. No la guardamos. Te recomendamos recortar la foto para que solo salga la lista de productos." + `‹Política de privacidad›` + `[Entendido, continuar]` → `POST /api/ia/aviso-aceptado`. Sin aceptar no se ven los botones.
3. **Elegir:** muestra "Te quedan N de 10 consultas de IA hoy". Si es 0, el botón queda deshabilitado con el motivo "Has usado tus 10 consultas de hoy. Vuelve mañana."
   - Un solo botón, "Elegir el ticket", que abre un `<input type="file" accept="image/*,application/pdf">` **sin `capture`** (R-08: `capture` no funciona en todos los navegadores y, si funciona, solo abre la cámara). En iOS el propio menú del sistema ofrece hacer una foto, la fototeca o un archivo (comprobado en el iPhone el 2026-11-11).
4. **Preparar** (`web/js/archivoTicket.js`): si es una foto, se reduce en el navegador con `<canvas>` (lado mayor 2000 px, JPEG al 0,8; comprobado en el iPhone el 2026-11-11 que Claude la lee bien) para no pasar de los 5 MB. Si es un PDF de más de 20 MB (D-47) → "El PDF es demasiado grande (máximo 20 MB)." sin llamar al servidor.
5. **Leyendo:** `EstadoCarga` a pantalla completa "Leyendo el ticket…" / "Puede tardar unos segundos." Claude espera como mucho 60 s y `api.js` 75 s (D-47): si se pasa, error reintentable.
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

### 7.3 Escribir una receta → ver qué me falta → "La he cocinado" (fase 6, sin IA, D-48)
1. **Recetas** → `[+ Receta]` → **P-20**: nombre, raciones (opcional), filas de ingredientes y pasos (uno por línea). Errores por campo con `validarReceta()`.
2. **Guardar** → `POST /api/recetas` → reemplaza el formulario por `/receta/:id` con "✓ Receta guardada." (Editar: `PUT`, "✓ Cambios guardados.")
3. **Receta (P-11)** → `VistaReceta`: "Para 4 personas · Te faltan 2 ingredientes", y cada ingrediente con "✓ Tienes…", "Solo tienes…", "Tienes «X» en otra unidad: revísalo.", "Tienes el tupper «…»" o "✗ Te falta", calculado **en el momento** con el inventario y los tuppers recién pedidos.
4. Las recetas son del hogar: se ven también desde el otro móvil de la casa. (Las propuestas por la IA llegan en la fase 8.)
5. `[La he cocinado]` → `/cocinar?…`: una `FilaCocinar` por ingrediente, con la propuesta automática (`cantidadPropuesta()`): el producto que antes caduca, la cantidad convertida a su unidad y "Quedarán 200 g." / "«Leche» quedará agotado." Si las unidades no cuadran, campo vacío y la pregunta "¿Cuánto has gastado?". Los tuppers aparecen como casilla "Marcar el tupper «Lentejas» como consumido". "No descontar" deja la fila tenue. Lo que no está en el inventario: "No está en tu inventario: no se descuenta nada."
6. **El pie** dice "Revisa N ingredientes" (deshabilitado con el motivo) o `[Descontar del inventario]`.
7. **Guardando:** "Actualizando…" → `POST /api/cocinar` (con `clave`).
8. **Éxito:** vuelve a la receta con "✓ ¡Que aproveche! Inventario actualizado. Se han agotado: Leche, Huevos."
9. **409** (alguien de la casa gastó algo): `Aviso` "Alguien de tu casa ha cambiado el inventario. Revisa las cantidades." → se recargan las filas con el inventario nuevo y se mantiene lo que el usuario ya había decidido cuando sigue siendo válido.
10. **Otro fallo:** "No se ha descontado nada. Ha fallado la actualización del inventario. Inténtalo de nuevo." + `[Reintentar]`.

### 7.4 Tupper → aviso → "Marcar como consumido"
1. Inventario → `[+ Tupper]°` → `/tupper/nuevo`: nombre, ubicación y días (3 por defecto).
2. **Vista previa** en directo: "Fecha límite: 22/10/2026 · Te avisaremos el 21/10/2026 a las 10:00." Si el límite es mañana: "Como el límite es mañana, el aviso llegará en unos minutos." (en Expo eran segundos; aquí ≤ 5 min, DIF-02).
3. **Si este dispositivo no tiene los avisos activos:** aviso con `‹Activar avisos›` (va a Perfil › Avisos, §7.6).
4. `[Guardar tupper]` → "Guardando…" → vuelve a Inventario con "✓ Tupper guardado." Si `avisoActivo = false`: "Tupper guardado sin aviso: nadie de tu casa tiene los avisos activados." (como el `Alert` de Expo).
5. **El día anterior, entre las 10:00 y las 10:05:** llega "Tu tupper de Cocido caduca pronto" / "Cómetelo antes del 22/10/2026. Toca para marcarlo como consumido." a todos los dispositivos de la casa.
6. **Toque** → la PWA se abre en `/tupper/12` → ficha con "Caduca mañana" → `[Marcar como consumido]` → "Guardando…" → vuelve a Inventario con "✓ Cocido marcado como consumido."
7. **Si otra persona ya lo consumió:** la ficha muestra "✓ Consumido" sin botón.

### 7.5 Planificar → aviso → "¿Tienes todo?" (fase 7, D-50)
1. **Semana** (`/semana`, la de hoy; ‹ › para cambiar) → hueco "Martes 24 · Cena" → `/plan/2026-11-24/cena`.
2. Elige "Una receta guardada" y pulsa una, o "Escribir un plato" ("Lentejas con chorizo"), o "Fuera de casa" (con una nota, si quiere: "Comida aniversario"); si quiere, el grupo de alimentos → `[Guardar]` → "Guardando…" → vuelve a esa semana con el hueco relleno y el equilibrio recalculado.
3. **Si este dispositivo no tiene avisos:** "Plan guardado. Activa los avisos en Perfil › Avisos para que te lo recordemos la noche antes."
4. **El lunes 23 a las 21:00** (hora de Perfil › Avisos; ≤ 5 min tarde): "Mañana cenas tortilla de patatas" / "¿Tienes todos los ingredientes? Toca para comprobarlo." Solo una vez; "fuera de casa" no avisa.
5. **Toque** → `/plan/2026-11-24` → título "Mañana (martes 24)" → por cada plato: receta con "Tienes todo" / "Te faltan 2 ingredientes" y la lista con ✓/✗; o, si es un plato escrito a mano, "Esto es lo que hay en casa para este plato:" + ✓ o "✗ No hay nada para este plato en el inventario."
6. **Nada planificado** (por ejemplo, alguien vació el hueco o borró la receta): "Nada planificado · No hay comida ni cena para el martes 24." + `[Planificar comida]°`.

### 7.6 Primer uso: cuenta, instalación y permiso de avisos
1. **Abrir la URL en Safari** → `/entrar`. Sin cuenta → `‹Créala›` → `/registro` → `[Crear cuenta]` → el servidor crea la cuenta, la casa "Casa de {nombre}" y la sesión → `/bienvenida`.
2. **Paso 1, tu casa:** nombre editable · `‹Tengo un código›` → `/hogar/unirse` · `‹Invitar más tarde›`.
3. **Paso 2, instalar** (solo si **no** está en modo `standalone`):
   - **iPhone/iPad (Safari):** "Para recibir avisos en el iPhone tienes que añadir la app a la pantalla de inicio: 1. Pulsa Compartir [icono]. 2. Elige «Añadir a pantalla de inicio». 3. Abre Vigía desde el icono nuevo." **[sin verificar]** los nombres exactos de los menús en el iOS actual (fase 3). Safari no tiene un botón de instalar que se pueda programar.
   - **Chrome/Edge (PC, Android):** botón `[Instalar la app]` si llega el evento `beforeinstallprompt` (**[sin verificar]**, fase 3). Si no, se explica que se puede instalar desde el menú del navegador.
   - **Ya instalada:** se salta el paso.
4. **Paso 3, avisos** (solo dentro de la PWA instalada o en navegadores con `PushManager`):
   - Texto: "Te avisaremos el día antes de que caduque un tupper (a las 10:00) y la noche antes de lo que tengas planificado (a las 21:00)."
   - `[Activar avisos]` → **en ese mismo toque**, `Notification.requestPermission()` (R-02) → el sistema pregunta → si se acepta: suscripción + `POST /api/push/suscripciones` + "✓ Avisos activados" + `‹Enviar un aviso de prueba›`.
   - **Si se rechaza:** "No pasa nada: puedes activarlos más tarde desde Perfil › Avisos." Si el permiso queda bloqueado, Perfil › Avisos explica cómo desbloquearlo en el sistema.
   - **No compatible:** "Este navegador no puede recibir avisos."
5. **`‹Saltar›`** en cualquier paso → Inventario. Lo pendiente se recuerda con un aviso *info* en Perfil › Avisos, no con ventanas emergentes.
6. **Un dispositivo nuevo de la misma persona** (por ejemplo, el PC): tras entrar, Perfil › Avisos muestra el estado de los avisos **de ese dispositivo**.

### 7.7 Preguntar al Ayudante → tarjeta → guardar (fase 8, D-51)
1. **Ayudante** (`/ayudante`) → la primera vez, el aviso de privacidad → `[Empezar]`.
2. Escribe "Rellena las cenas de esta semana" → Enviar → aparece su mensaje y, debajo, "Mirando tu semana…", "Mirando tu inventario…" mientras el ayudante usa las herramientas.
3. La respuesta llega a trozos y termina con una `TarjetaHuecos`: los días que faltan, con grupos distintos, lo que caduca antes primero y nunca un hueco "fuera de casa".
4. Desmarca uno → `[Añadir 3 al cuadrante]` → "Guardando…" → "✓ Añadidos 3 huecos" + `‹Ver la semana›` (→ P-13, con el equilibrio recalculado).
5. Si mientras tanto alguien de la casa marcó uno de esos huecos como "fuera de casa", se salta y la tarjeta lo dice: "Añadidos 2 huecos. El jueves 26 ya no se podía: fuera de casa."
6. **Al recargar** o desde otro dispositivo de la misma persona, la conversación y el estado de las tarjetas siguen ahí; otra persona de la casa ve **su** conversación, no esta.

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
| Recetas | "Cargando…" | "Aún no tienes recetas" / "Escribe las que cocinas a menudo y Vigía te dirá qué te falta antes de ponerte." + `[+ Receta]` | "No se han podido cargar las recetas." + `[Reintentar]` | — | Lista de recetas |
| Receta | "Cargando…" | "Esta receta ya no existe" + `[Volver]°` | "No se ha podido abrir la receta." + `[Reintentar]` | Borrar: confirmación → "No se ha podido borrar la receta." | `VistaReceta` |
| Nueva / editar receta | Al editar: "Cargando…" | — | Por campo (`validarReceta()`) · "No se ha guardado. Ha fallado el guardado de la receta. Inténtalo de nuevo." | "Guardando…" | `FormularioReceta` |
| La he cocinado | "Preparando el descuento…" | "Esta receta ya no está disponible" + `[Volver]°` | Errores por fila · 409 "Alguien de tu casa ha cambiado el inventario…" | "Actualizando…" → "No se ha descontado nada…" + `[Reintentar]` | Filas |
| Semana | "Cargando el plan…" | No existe: los 7 días siempre se ven, con "+ Añadir" · Fecha mala: "Semana no válida" + `‹Ir a esta semana›` | "No se ha podido cargar el plan." + `[Reintentar]` | — | Cuadrante + equilibrio |
| Planificar hueco | Recetas: indicador en línea | "Aún no tienes recetas guardadas." + `‹Escribir una›` · Parámetro malo: "Hueco no válido" | — | "Guardando…" → "No se ha guardado. Ha fallado el cambio en el plan. Inténtalo de nuevo." | Formulario + recetas |
| Plan del día | "Comprobando ingredientes…" | "Nada planificado" + `[Planificar comida]°` · Fecha mala: "Día no válido" | `[Reintentar]` | — | Platos con ✓/✗ |
| Ayudante | "Cargando la conversación…" | "Pregúntame lo que quieras de cocina" + 3 ejemplos · Primera vez: el aviso de privacidad | Cuota: "Has usado los 30 mensajes de hoy. Mañana podrás seguir." · Respuesta cortada: "La respuesta se ha cortado. No se ha gastado el mensaje." + `[Reintentar]` (vuelve a enviar el mismo texto) si es reintentable · Rechazo: "No puedo ayudarte con eso." · Sin conexión: el pie con `aria-disabled` y "Necesitas conexión para hablar con el ayudante" | "Respondiendo…" · Tarjeta: "Guardando…" → "No se ha guardado. Inténtalo de nuevo." · 409: "Esta propuesta ya se había guardado." (y se recarga) | Mensajes y tarjetas |
| Perfil y sus apartados | Cada apartado con su indicador en línea | — | Hora: "Escribe la hora como HH:MM, por ejemplo 21:00." · Avisos: "No se han podido activar los avisos. Inténtalo de nuevo." | "Guardando…" → "Hora guardada: 21:30." / "No se ha podido guardar la hora." | Secciones |
| Invitar / Unirse | "Creando código…" | — | "Ese código no existe o ha caducado." · "Ese código ya se ha usado." | "Uniéndote…" → "No se ha podido unir. Inténtalo de nuevo." | Código / formulario |

**Mientras se guarda en el servidor:**
- solo se bloquea **el botón** de la acción ("Guardando…", con `aria-busy`); la pantalla se sigue viendo;
- los campos del formulario se deshabilitan para que no cambien a mitad;
- si tarda más de 75 s: "El servidor está tardando demasiado." + `[Reintentar]` (con la misma `clave` donde aplique);
- **nunca** se muestra "guardado" hasta que el servidor responde que sí.

---

## 9. Accesibilidad

| Requisito | Cómo se cumple | Cómo se comprueba |
|---|---|---|
| **Contraste AA** | Solo se usan los pares medidos de §2.1 (texto ≥ 4,5:1 en los dos modos, D-45). El texto verde usa `primario-texto`, nunca `primario`. Anillo de foco `primario` sobre `fondo` (≥ 3:1). Los campos y casillas se delimitan con `borde-control` (≥ 3:1); `borde` es solo decorativo | Herramienta de contraste del navegador en las dos combinaciones, en la fase 1 |
| **Zonas táctiles de 44 px** | `--tactil` como `min-height`/`min-width` en botones, filas, pestañas, casillas y enlaces de acción. Chips de 40 px + separación (**[sin verificar]**, §3.2) | Inspector: medir cada elemento pulsable |
| **Foco visible** | `:focus-visible` con 3 px y separación de 2 px en todo; **nunca `outline: none`** sin sustituto. Orden de foco = orden visual. Foco a `<main>` al cambiar de pantalla y de vuelta al botón al cerrar un `<dialog>` | Recorrer cada pantalla solo con el tabulador |
| **Lectores de pantalla** | HTML semántico (`<nav>`, `<main>`, `<header>`, `<h1>`/`<h2>`, `<button>`, `<a>`, `<fieldset>`/`<legend>`, `<ol>` para los pasos); un `<h1>` por pantalla; `aria-current` en la pestaña; `aria-invalid` + `aria-describedby` en los errores; `role="alert"` solo en errores y `role="status"` para cargas y avisos; `aria-busy` al cargar; iconos con `aria-hidden`; filas leídas como un solo elemento ("Leche, Caduca mañana, 1 l") | VoiceOver en el iPhone (rotor por encabezados y controles) en cada fase con pantallas nuevas |
| **Tamaño de texto del usuario** | §2.3: `-apple-system-body` en iOS y `rem` en todo el texto; contenedores sin altura fija, solo `min-height`; textos que saltan de línea; chips con `flex-wrap`; media queries en `em`. **No** se bloquea el zoom (sin `maximum-scale` ni `user-scalable=no`) | Ajustes del iPhone › Tamaño del texto al máximo (y tamaños grandes de accesibilidad): nada se corta ni se solapa |
| **Nada transmitido solo con color** | "✓ Tienes" / "✗ Te falta" / "Solo tienes…"; caducidad con texto ("Caduca mañana"); errores con "✗" y mensaje; pestaña activa en negrita + barrita; chip elegido con fondo relleno y recomendado con borde grueso + texto oculto; tarjetas destacadas con su texto ("· mañana", "✓ …") | Ver la app en escala de grises (filtro del sistema) |
| **Movimiento reducido** | `prefers-reduced-motion`: sin giros ni transiciones (§2.4) | Activar "Reducir movimiento" en el iPhone |
| **Formularios** | Etiqueta visible y asociada (`<label for>`) en cada campo, también en "Nombre del plato" (en Expo solo tenía `accessibilityLabel`); `autocomplete` correcto (email, contraseñas); `inputmode` adecuado; errores en texto y foco al primero | Rellenar cada formulario con VoiceOver |
| **Idioma** | `<html lang="es">` (la plantilla de Expo tenía `lang="en"`); notificaciones con `lang: "es-ES"` | Inspector |
