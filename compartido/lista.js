/**
 * @file Reglas de la lista de la compra (D-54) que no necesitan la base de
 * datos. Están en compartido/ para poder probarlas sin servidor.
 */
import { UMBRAL_LISTA } from './constantes.js';

/**
 * ¿Por debajo de cuánto se está acabando un producto?
 *
 * - En g, kg, ml y l: el 10 % de la referencia (1 l → 0,1 l).
 * - En unidades, el 10 % casi nunca llega (4 yogures → 0,4): si entraron
 *   más de 1, al quedar 1 (4 yogures → 1); si entró 1, al gastarse
 *   (1 solomillo → 0). Cambio del autor del 2026-11-25.
 *
 * @param {number} referencia cantidad_inicial del producto (mayor que 0).
 * @param {import('./constantes.js').Unidad} unidad
 * @returns {number}
 */
export function umbralLista(referencia, unidad) {
  if (unidad === 'unidades') return referencia > 1 ? 1 : 0;
  return referencia * UMBRAL_LISTA;
}

/**
 * ¿El producto se acaba de quedar por debajo de su umbral (umbralLista)?
 * Solo cuenta el momento de CRUZARLO (antes por encima, ahora en el umbral
 * o menos): si ya estaba por debajo, no vuelvo a añadirlo a la lista (lo
 * habrás tachado o quitado a propósito).
 *
 * Ejemplos: referencia 1 l → umbral 0,1 l. De 0,5 a 0,1: sí. De 0,1 a 0,05: no.
 * 4 yogures → umbral 1. De 2 a 1: sí. 1 solomillo → umbral 0. De 1 a 0: sí.
 *
 * @param {number} antes Cantidad antes de gastar o editar.
 * @param {number} despues Cantidad después (0 si se ha agotado).
 * @param {number | null} referencia cantidad_inicial del producto; null = sin referencia.
 * @param {import('./constantes.js').Unidad} unidad La del producto (la misma antes y después).
 * @returns {boolean}
 */
export function cruzaUmbral(antes, despues, referencia, unidad) {
  if (referencia === null || !(referencia > 0)) return false;
  const umbral = umbralLista(referencia, unidad);
  return antes > umbral && despues <= umbral;
}
