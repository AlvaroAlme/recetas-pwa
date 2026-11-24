/**
 * @file Reglas de la lista de la compra (D-54) que no necesitan la base de
 * datos. Están en compartido/ para poder probarlas sin servidor.
 */
import { UMBRAL_LISTA } from './constantes.js';

/**
 * ¿El producto acaba de bajar al 10 % de su referencia? Solo cuenta el
 * momento de CRUZARLO (antes por encima, ahora en el 10 % o menos): si ya
 * estaba por debajo, no vuelvo a añadirlo a la lista (lo habrás tachado o
 * quitado a propósito).
 *
 * Ejemplo: referencia 1 l → umbral 0,1 l. De 0,5 a 0,1: sí. De 0,1 a 0,05: no.
 *
 * @param {number} antes Cantidad antes de gastar o editar.
 * @param {number} despues Cantidad después (0 si se ha agotado).
 * @param {number | null} referencia cantidad_inicial del producto; null = sin referencia.
 * @returns {boolean}
 */
export function cruzaUmbral(antes, despues, referencia) {
  if (referencia === null || !(referencia > 0)) return false;
  const umbral = referencia * UMBRAL_LISTA;
  return antes > umbral && despues <= umbral;
}
