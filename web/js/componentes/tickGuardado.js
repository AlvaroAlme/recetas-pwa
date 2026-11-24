/**
 * @file TickGuardado (D-58): el aro verde que se dibuja con su tick cuando
 * vuelvo a Inventario de guardar algo. Flota por encima de todo, no se puede
 * tocar y se quita solo. El texto lo lee VoiceOver; a la vista, solo el tick.
 */
import { el } from '../dom.js';
import { elSvg } from './ui/index.js';

/** Lo que dura todo en pantalla, en ms (DISENO_UI §2.4). */
const DURACION = 1500;

/**
 * Pongo el tick encima de la pantalla y lo quito pasado DURACION.
 * @param {{ texto: string, detalle?: string }} mensaje texto: lo que lee el
 *   lector ("«Yogures» añadido al inventario."); detalle: lo poco que se ve
 *   debajo del aro ("12 productos"), solo tras un ticket.
 */
export function mostrarTickGuardado({ texto, detalle }) {
  const dibujo = elSvg(
    'svg',
    { class: 'tick-guardado__dibujo', viewBox: '0 0 64 64', 'aria-hidden': 'true', focusable: 'false' },
    elSvg('circle', { class: 'tick-guardado__aro', cx: '32', cy: '32', r: '29', pathLength: '1' }),
    elSvg('path', { class: 'tick-guardado__marca', d: 'M20 33l8 8L45 23', pathLength: '1' })
  );
  // El tick va en una tarjeta clara: sin ella, el verde oscuro del modo
  // claro apenas se ve sobre el velo.
  const tarjeta = el(
    'div',
    { class: 'tick-guardado__tarjeta' },
    dibujo,
    detalle && el('p', { class: 'tick-guardado__detalle', 'aria-hidden': 'true' }, detalle)
  );
  const capa = el('div', { class: 'tick-guardado' }, tarjeta, el('p', { class: 'solo-lector', role: 'status' }, texto));
  document.body.append(capa);
  setTimeout(() => capa.remove(), DURACION);
}