/**
 * @file El avatar de cada persona (D-52), dibujado por blobatar (versión
 * fija 2.7.0, servida en /vendor/blobatar/ desde node_modules). De la
 * semilla de la persona (usuarios.avatar_semilla) sale SIEMPRE el mismo
 * "blob" con ojos.
 *
 * Dos formas de pintarlo:
 * - Quieto: un <img> con el SVG dentro de una URL data:. Es lo que
 *   recomienda blobatar para avatares pequeños y la CSP ya admite imágenes
 *   data: (img-src). Es decorativo: alt vacío. (Desde el 2026-11-18 no lo uso:
 *   el autor quiere que parpadee en todas partes.)
 * - Vivo (cabecera, Perfil y los miembros de Hogar): un <svg> de verdad, que
 *   respira y parpadea con motion.css; en Perfil, además, mira hacia donde
 *   tocas (mirarAlToque).
 *
 * La CSP (style-src 'self') bloquea los atributos style="…" escritos en el
 * HTML. Por eso nunca meto el SVG con innerHTML: lo leo con DOMParser, creo
 * yo cada nodo y paso los estilos por el CSSOM (style.setProperty), que la
 * CSP sí permite.
 */
import { blobatar } from '/vendor/blobatar/index.js';
import { _parts } from '/vendor/blobatar/internal.js';
import { el } from '../dom.js';
import { elSvg } from './ui/index.js';

const SVG = 'http://www.w3.org/2000/svg';

/** Cuánto se mueven los ojos hacia donde tocas, en unidades del dibujo (100 × 100). */
const RECORRIDO_MIRADA = 3.5;

/** Cuánto rato miran hacia el toque antes de volver a lo suyo. */
const DURACION_MIRADA_MS = 1400;

/**
 * El avatar quieto: un <img> con el SVG de blobatar.
 * @param {{ semilla: string, tamano: number }} opciones tamano en px.
 * @returns {HTMLImageElement}
 */
export function crearAvatar({ semilla, tamano }) {
  const svg = blobatar(semilla, { background: 'circle' });
  return el('img', {
    class: 'avatar',
    src: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    alt: '',
    width: tamano,
    height: tamano,
    decoding: 'async',
  });
}

/**
 * El avatar vivo: respira, parpadea y echa alguna mirada (motion.css, modo
 * "always"). Si la persona tiene activado "Reducir movimiento", motion.css
 * lo deja quieto él solo.
 * @param {{ semilla: string, tamano: number }} opciones
 * @returns {SVGSVGElement}
 */
export function crearAvatarVivo({ semilla, tamano }) {
  // _parts es la pieza que usan los adaptadores de React y Vue: el dibujo
  // con las clases de la animación y sus variables (tiempos, colores…).
  const partes = _parts(semilla, OPCIONES_VIVO);
  const svg = elSvg('svg', {
    class: 'avatar avatar--vivo',
    viewBox: '0 0 100 100',
    width: String(tamano),
    height: String(tamano),
    'aria-hidden': 'true',
    focusable: 'false',
  });
  for (const [variable, valor] of Object.entries(partes.vars ?? {})) svg.style.setProperty(variable, valor);
  if (partes.bg) svg.append(elSvg('path', { d: partes.bg.d, fill: partes.bg.fill }));
  const grupo = elSvg('g', { class: partes.cls ?? '' });
  grupo.append(...leerSvg(partes.inner));
  svg.append(grupo);
  vivos.set(svg, { semilla, grupo, variables: new Set(Object.keys(partes.vars ?? {})) });
  return svg;
}

/** Las opciones del avatar vivo: con su círculo y siempre animado. */
const OPCIONES_VIVO = { background: 'circle', animate: 'always' };

/**
 * Lo que necesito de cada avatar vivo para cambiarle la cara: su semilla,
 * el grupo que lleva las clases y las variables que le he puesto. En un
 * WeakMap: cuando el avatar desaparece de la pantalla, se olvida solo.
 * @type {WeakMap<SVGSVGElement, { semilla: string, grupo: SVGGElement, variables: Set<string> }>}
 */
const vivos = new WeakMap();

/**
 * Le pongo una expresión a un avatar vivo (D-56): happy, sad, thinking… de
 * /vendor/blobatar/expression.js, o idle para volver a la normal. Una
 * expresión son solo variables de CSS (cuánto se estiran o se inclinan los
 * ojos…) y la clase mo-expr: blobatar pasa de una a otra con una transición.
 * Las pongo con setProperty, que la CSP permite.
 * @param {SVGSVGElement} avatar El de crearAvatarVivo().
 * @param {object} pose
 */
export function ponerExpresion(avatar, pose) {
  const vivo = vivos.get(avatar);
  if (!vivo) return;
  const partes = _parts(vivo.semilla, { ...OPCIONES_VIVO, expression: pose });
  const nuevas = partes.vars ?? {};
  // Las de la expresión anterior que esta no trae, fuera (vuelven a su valor de reposo).
  for (const variable of vivo.variables) {
    if (!(variable in nuevas)) avatar.style.removeProperty(variable);
  }
  for (const [variable, valor] of Object.entries(nuevas)) avatar.style.setProperty(variable, valor);
  vivo.variables = new Set(Object.keys(nuevas));
  vivo.grupo.setAttribute('class', partes.cls ?? '');
}

/**
 * Los ojos del avatar vivo miran un momento hacia donde tocas (o haces clic)
 * dentro de `zona`. blobatar trae su propio seguimiento (gaze), pero solo
 * funciona con ratón: en el iPhone no se activa. Este es más sencillo: muevo
 * el grupo de los ojos con una transición de CSS (.avatar--vivo .mo-eyes).
 * Con "Reducir movimiento" no hago nada.
 * @param {SVGSVGElement} avatar El de crearAvatarVivo().
 * @param {HTMLElement | Document} zona Dónde escucho los toques.
 * @returns {() => void} Para dejar de escuchar (al salir de la pantalla).
 */
export function mirarAlToque(avatar, zona) {
  const reducir = matchMedia('(prefers-reduced-motion: reduce)');
  let temporizador;

  const alTocar = (evento) => {
    if (reducir.matches) return;
    const caja = avatar.getBoundingClientRect();
    const dx = evento.clientX - (caja.left + caja.width / 2);
    const dy = evento.clientY - (caja.top + caja.height / 2);
    const distancia = Math.hypot(dx, dy);
    if (distancia < 1) return;
    // Siempre el mismo recorrido, hacia donde has tocado.
    avatar.style.setProperty('--mirar-x', ((dx / distancia) * RECORRIDO_MIRADA).toFixed(2));
    avatar.style.setProperty('--mirar-y', ((dy / distancia) * RECORRIDO_MIRADA).toFixed(2));
    avatar.classList.add('avatar--mirando');
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      avatar.classList.remove('avatar--mirando');
      avatar.style.removeProperty('--mirar-x');
      avatar.style.removeProperty('--mirar-y');
    }, DURACION_MIRADA_MS);
  };

  zona.addEventListener('pointerdown', alTocar);
  return () => {
    zona.removeEventListener('pointerdown', alTocar);
    clearTimeout(temporizador);
  };
}

/**
 * Convierte el SVG en texto de blobatar en nodos, sin innerHTML: DOMParser
 * lo lee en un documento aparte (que no ejecuta nada) y yo copio cada
 * elemento. Los style="…" van por el CSSOM; los on…="…" y los style que
 * quedaran, fuera (blobatar no los trae, pero por si acaso).
 * @param {string} contenido Lo que va DENTRO del <svg>.
 * @returns {SVGElement[]}
 */
function leerSvg(contenido) {
  // Hasta DOMParser intenta aplicar los style="…" (y la CSP se queja en la
  // consola). Les cambio el nombre antes de leer, y los aplico yo después.
  const sinEstilos = contenido.replaceAll(' style="', ' data-estilo="');
  const documento = new DOMParser().parseFromString(`<svg xmlns="${SVG}">${sinEstilos}</svg>`, 'image/svg+xml');
  if (documento.querySelector('parsererror')) return [];
  return [...documento.documentElement.children].map(copiarNodo);
}

/**
 * @param {Element} origen
 * @returns {SVGElement}
 */
function copiarNodo(origen) {
  const nodo = document.createElementNS(SVG, origen.localName);
  for (const { name, value } of origen.attributes) {
    if (name === 'data-estilo') ponerEstilos(nodo, value);
    else if (name !== 'style' && !name.toLowerCase().startsWith('on')) nodo.setAttribute(name, value);
  }
  nodo.append(...[...origen.children].map(copiarNodo));
  return nodo;
}

/**
 * "--mo-wrap:-1;transform-origin:41.4px 48.7px" → una a una con setProperty.
 * @param {SVGElement} nodo
 * @param {string} declaraciones
 */
function ponerEstilos(nodo, declaraciones) {
  for (const declaracion of declaraciones.split(';')) {
    const dosPuntos = declaracion.indexOf(':');
    if (dosPuntos < 1) continue;
    nodo.style.setProperty(declaracion.slice(0, dosPuntos).trim(), declaracion.slice(dosPuntos + 1).trim());
  }
}
