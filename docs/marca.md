# Marca: Stockpot

Identidad visual de la app desde el 2026-11-25. Sustituye a "Vigía" (D-45).
Pendiente: apuntar la decisión nueva en `docs/ARQUITECTURA.md` §11.

Lienzo con todas las pantallas y los iconos:
https://claude.ai/artifact/F3uFtsRhebMsvBSXbvPgLy

## Nombre
- **Stockpot**: "stock" es el inventario y también el caldo; un *stockpot* es la olla de caldo.
- `name` y `short_name` del manifest: `Stockpot` (8 caracteres, cabe bajo el icono).
- La interfaz sigue en español.

## Icono (propuesta A: olla con vapor)
- Fondo marino `#0f2f45` a sangre; olla y vapor arena `#f6ead2`; franja azul polvo `#8fb3c9`; pomo coral `#e8877b`.
- Todo dentro del 80 % central (zona segura de los iconos "maskable").
- Archivos: `icono.svg`, `icono-512.png`, `icono-192.png`, `apple-touch-icon.png` (180 px, sin transparencia).

## Tipografía
- Títulos y marca: **Fraunces** 700 (Google Fonts, OFL), la usada en los prototipos. Pendiente de confirmar.
  Por la CSP se sirve desde `/fuentes` en `.woff2`, como Bricolage Grotesque ahora.
- Texto: la fuente del sistema, sin cambios.

## Colores (versión 4)
Mismos nombres de token que `web/css/tokens.css`: solo cambian los valores.
Nuevos: `--color-tinte` y `--color-sobre-tinte`.

| Token | Claro | Oscuro |
|---|---|---|
| `--color-fondo` | `#f6ead2` | `#0b1822` |
| `--color-superficie` | `#fffbf3` | `#132330` |
| `--color-superficie-2` | `#ede0c4` | `#1c2f3e` |
| `--color-texto` | `#1b2630` | `#f6ead2` |
| `--color-texto-secundario` | `#3d4852` | `#d8cfbe` |
| `--color-texto-tenue` | `#545f69` | `#aab4bc` |
| `--color-borde` | `#e3d3b2` | `#263a49` |
| `--color-borde-control` | `#6f7a83` | `#7f8d98` |
| `--color-placeholder` | `#5e6972` | `#96a2ab` |
| `--color-primario` | `#0f2f45` | `#8fb3c9` |
| `--color-primario-texto` | `#0f2f45` | `#8fb3c9` |
| `--color-sobre-primario` | `#ffffff` | `#0f2f45` |
| `--color-acento` | `#8c1c13` | `#e8877b` |
| `--color-tinte` (nuevo) | `#8fb3c9` | `#24465e` |
| `--color-sobre-tinte` (nuevo) | `#0f2f45` | `#f6ead2` |
| `--color-ok` / `--color-fondo-ok` | `#1b6a43` / `#e0f1e6` | sin cambios |
| `--color-pronto` / `--color-fondo-pronto` | `#8a4a00` / `#f5d38f` | sin cambios |
| `--color-caducado` / `--color-fondo-caducado` | `#a3121b` / `#f5c6bd` | sin cambios |

`theme_color` y `background_color` del manifest y `<meta name="theme-color">`: `#f6ead2` (claro) y `#0b1822` (oscuro).

Reglas:
- El principal no puede ser verde, ámbar ni rojo: son los colores de caducidad.
- El acento vino es para la marca y los gráficos, nunca para botones ni texto pequeño.
- El tinte azul polvo solo como relleno con texto marino encima (6,3:1); sobre la arena da 1,9:1.
- Los avisos de caducidad llevan borde del color de su estado (sobre la arena el fondo solo no basta).

Contraste comprobado (WCAG AA): texto 12,9:1 / 15,1:1; tenue 5,5:1 / 8,5:1;
botón 13,9:1 / 6,3:1; borde de campos 3,7:1 / 5,3:1; estados entre 5,6:1 y 8:1.

## Dónde aparece el nombre "Vigía" (a cambiar)
- `web/index.html`: `<title>`, `apple-mobile-web-app-title`, `.marca__nombre` (y el `<h1>` sobrante "Recetas Nevera").
- `web/manifest.webmanifest`: `name`, `short_name`, colores.
- `web/js/router.js` (título de la pestaña), `pantallas/perfil.js`, `bienvenida.js`, `privacidad.js`, `lista.js`, `invitar.js`.
- `web/sw.js`: título de las notificaciones.
- Servidor: `servicios/mensajesCorreo.js`, `servicios/push.js`, `CORREO_REMITENTE` en `.env` y en Render.
- Mirar antes `server/pruebas/correo.test.js`: puede comprobar los textos con "Vigía".

## NO tocar (aunque lleven el nombre viejo)
- El evento `'vigia:escritura'` (`api.js` y quien lo escucha): identificador interno.
- `CACHE_API = 'api-v1'`, la cookie `'sesion'`, `start_url` y `scope` del manifest.
- `VERSION` de `sw.js`: no cambiar su forma, pero SÍ subir el número al cambiar el CSS.

## Barra de pestañas
- Barra flotante de color superficie (`#fffbf3`, borde `#d9c7a3`, radio 30 px) con Inventario, Lista, Recetas y Semana.
- La pestaña activa se expande en una pastilla marino con su nombre; las demás solo muestran el icono
  (su nombre sigue ahí para el lector de pantallas: `.sr-only` o `aria-label`, nunca borrado).
- El Ayudante sale de la barra: botón redondo de 60 px a la derecha, azul polvo con icono marino;
  con borde marino de 3 px cuando es la página actual.
- Oscuro: barra `#132330`, activa `#8fb3c9` con texto marino, Ayudante `#24465e` con borde `#8fb3c9`.
- Respetar `env(safe-area-inset-bottom)` en el iPhone y dejar margen inferior al contenido para que no quede debajo.
- Estilo de la activa colgado de `a[aria-current="page"]` si el router ya lo pone (comprobar en `router.js`).
