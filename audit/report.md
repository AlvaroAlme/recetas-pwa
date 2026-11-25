# Vigía — Auditoría de UI/UX y accesibilidad

**Fecha:** 2026-11-25 · **URL:** http://localhost:3000 (servidor de desarrollo, `app-v54`) · **Build:** sin paso de build: Express sirve los mismos archivos de `web/` en desarrollo y en producción (sin minificar ni empaquetar)
**Herramientas:** @playwright/mcp 0.0.85 (Chrome 159) · axe-core 4.14.1 (metido en cada pantalla con Playwright) y a11y-mcp 1.1.1 (axe-core 4.14.0) · Lighthouse 13.6.0 (lighthouse-mcp 0.1.21 y su CLI)
**Recorrido:** las 4 pantallas públicas y, tras entrar con la cuenta de prueba `ana@prueba.test`, 22 pantallas de la app (Inventario, Lista, Recetas, Nueva receta, Semana, Plan del día, Planificar hueco, Ayudante, Perfil y sus 5 apartados, Nuevo producto, Editar producto, Nuevo tupper, Tupper, Escanear ticket, Borrar cuenta, Unirse a una casa y Bienvenida).
**Anchos:** 1440×900, 768×1024 y 375×812, y 375×812 en modo oscuro: 104 capturas en `audit/screenshots/` (no se suben al repositorio; se regeneran con la skill).
**Avisos:**
- axe y Lighthouse por MCP no llevan la sesión: con ellos solo se auditan las pantallas públicas. Las 22 pantallas con sesión se auditaron con axe-core metido por Playwright en un contexto con la sesión de Ana (y la CSP desactivada SOLO en ese contexto de prueba, para poder cargar axe).
- Lighthouse, con `127.0.0.1` (el servidor de desarrollo solo escucha ahí, SEC-01; el Chrome de Lighthouse resuelve `localhost` a `::1`). La primera medida justo tras reiniciar el servidor dio un LCP de 5,6 s; las tres siguientes, 1,4 s. Valen las tres estables.
- No auditado: el chat con una respuesta de verdad, el ticket leyendo una foto y la ruleta del avatar (gastan IA o cambian datos), ni VoiceOver real (eso se prueba en el iPhone).

**Prueba de humo:** `tests/smoke.spec.ts` (Playwright) repite el recorrido: Entrar en los tres anchos, y entrar → Inventario → Lista (apuntar, tachar y quitar una línea, que deja la lista como estaba). Sus selectores se comprobaron contra el servidor; para ejecutarla hace falta `@playwright/test`, que no está instalado, y `npm test` no la lanza.

**Arreglado el mismo día (`app-v55`):** los dos P2 y la regla `region`. Tras el arreglo, axe da 0 problemas en las 26 pantallas, en claro y en oscuro, y el color de todos los enlaces se comprobó pantalla a pantalla (solo cambian los 4 que salían en azul). Quedan los P3, para que decida el autor.

## 1. Hallazgos de UX (por impacto)

No hay ningún P0 ni P1: no se ha encontrado ningún control muerto, ningún error en la consola en ninguna de las 26 pantallas y nada se sale del ancho de la pantalla en ninguno de los tres anchos ni en modo oscuro.

### P2 — Enlaces sin el estilo de la app (azul y morado del navegador) — ✅ arreglado
- **Lo que vi:** "Leer la política de privacidad" en las ventanas de aviso de la IA (`12-ayudante-*.png`, `23-ticket-*.png`), "política de privacidad" y "mi perfil de GitHub" en Privacidad (`04-privacidad-*.png`) y "AESAN 2022" en Semana (`09-semana-*.png`) salen con el azul por defecto del navegador (morado si ya se visitó). El resto de enlaces de la app (Entrar, Crear cuenta) van en verde y en negrita.
- **Por qué importa:** parece otra app; en modo oscuro el morado de "visitado" desentona aún más. El contraste pasa, así que no es un fallo de accesibilidad, sino de coherencia.
- **Arreglo:** una regla general en `web/css/base.css`: `a { color: var(--color-primario-texto); text-underline-offset: 0.2em; }` (el token ya existe en claro, `#1d5e47`, y en oscuro, `#7fd6a9`). Así `.acceso a` solo tiene que añadir la negrita.

### P2 — Perfil › Seguridad: los tres botones de sesiones no caben a 375 px — ✅ arreglado
- **Lo que vi:** "Cerrar las demás sesiones", "Cerrar sesión" y "Borrar cuenta" van en una sola fila; el primero se parte en tres líneas y los botones quedan estrechos y de alturas distintas (`15-perfil-seguridad-375.png`).
- **Por qué importa:** es la pantalla con las acciones más delicadas (cerrar y borrar), y se lee peor justo donde más cuidado hace falta.
- **Arreglo:** en móvil, uno debajo de otro y a todo el ancho (`flex-direction: column` en ese grupo por debajo de 48em), con "Borrar cuenta" al final y separado, como acción de peligro.

### P3 — El foco empieza en "Aceptar" en las ventanas de privacidad de la IA
- **Lo que vi:** al abrir el aviso del Ayudante o del ticket, el foco va a "Aceptar" (`avisoPrivacidad.js`, con un comentario que explica que es lo primero que se puede pulsar). La ventana de `confirmar()` pone el foco en "Cancelar" (`autofocus`).
- **Por qué importa:** con un teclado, o con un toque sin querer en Intro, se acepta enviar datos a Anthropic sin haberlo leído. Para un consentimiento, lo prudente es que lo por defecto sea lo que no comparte nada.
- **Arreglo (decisión del autor):** el foco en "Ahora no", o en el título de la ventana (`tabindex="-1"`), como en `confirmar()`.

### P3 — Con el teclado, la barra de pestañas va antes que el contenido
- **Lo que vi:** tras "Saltar al contenido", el tabulador recorre Inventario, Lista, Recetas, Semana y Ayudante, luego Perfil y luego el contenido. En el móvil la barra está abajo, así que el orden del foco no sigue el orden en que se ve.
- **Por qué importa:** poco: el enlace "Saltar al contenido" ya evita pasar por la barra, y en escritorio la barra es un carril a la izquierda, donde sí va primero.
- **Arreglo:** si se quiere, mover `<nav class="navegacion">` detrás de `<main>` en `index.html` (su posición la decide el CSS, no el orden).

### P3 — En escritorio, una columna estrecha en mucho espacio vacío
- **Lo que vi:** a 1440 px el contenido es una columna de unos 480 px con el carril de pestañas a la izquierda (`05-inventario-1440.png`).
- **Por qué importa:** es una app pensada para el iPhone y en escritorio funciona bien; solo se ve vacía. No hace falta tocarlo.

### Lo que está bien
- Todas las zonas que se tocan miden 44 px o más (salvo los enlaces dentro de una frase, como "AESAN 2022", que WCAG 2.5.8 permite); los chips llevan su foco visible en la etiqueta (`input:focus-visible + .chip`).
- Hay un enlace "Saltar al contenido", cada pantalla tiene su `<h1>` y su `<title>`, y los botones de solo icono llevan `aria-label` (D-55).
- El modo oscuro no pierde contraste en ninguna pantalla (axe, `color-contrast`, sin fallos).

## 2. Accesibilidad (axe-core, WCAG 2.1 A/AA + buenas prácticas)

26 pantallas a 375 px, en claro y en oscuro. Una sola regla, la misma en los dos modos:

| # | Regla | Gravedad | Elemento | Detalle | Arreglo |
|---|---|---|---|---|---|
| 1 | `region` ✅ arreglado | moderada | `#pie` en `/` (Inventario), `/recetas` y `/bienvenida` | "Some page content is not contained by landmarks": los botones del pie ("Tupper", "Producto", "Receta", "Saltar", "Siguiente") están fuera de `<main>` y de cualquier otra zona con nombre | Darle al pie una zona con nombre: `<section class="pie" id="pie" aria-label="Acciones" hidden>` en `index.html` (un `<section>` con nombre es una región para el lector). En otras pantallas con pie (Nuevo producto, Nueva receta…) axe no lo marca; el arreglo vale para todas |

Las 4 pantallas públicas, con a11y-mcp: 0 problemas (40 comprobaciones pasadas en Crear cuenta).

## 3. Lighthouse — móvil, con limitación de red simulada

| Categoría | Entrar | Privacidad |
|---|---|---|
| Rendimiento | 100 🟢 | 100 🟢 |
| Accesibilidad | 100 🟢 | 100 🟢 |
| Buenas prácticas | 100 🟢 | 100 🟢 |
| SEO | 100 🟢 | 100 🟢 |

| Métrica | Entrar |
|---|---|
| First Contentful Paint | 1,4 s |
| Largest Contentful Paint | 1,4 s |
| Total Blocking Time | 0 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 1,4 s |

Las 3 mejoras, por lo que ahorrarían (ninguna baja ya la nota):
1. **CSS que bloquea el primer pintado** (~750 ms estimados): `tokens.css`, `base.css` y `componentes.css` se piden por separado antes de pintar. Se podría juntar en uno solo, pero sin paso de build eso es mantener un archivo más; tras la primera visita el Service Worker los sirve de su caché.
2. **Sin compresión:** Express no comprime (`document-latency-insight`: "No compression applied"; JavaScript sin minificar, ~144 KiB que se ahorrarían). Antes de tocar nada, mirar en producción si Render ya comprime (cabecera `content-encoding` en las respuestas).
3. **CSS sin usar en Entrar** (~49 KiB): es el CSS de toda la app en un archivo; normal en una PWA que lo guarda una vez.
