/**
 * @file Cómo se muestran las cantidades en pantalla, compartido por el
 * navegador y el servidor. Igual que formatearCantidad() de la app Expo.
 */

/** @typedef {import('./constantes.js').Unidad} Unidad */

/**
 * Cantidad lista para enseñar, en formato español y con su unidad:
 * 1.5 kg -> "1,5 kg", 2 unidades -> "2 ud.", 0.333 l -> "0,33 l".
 *
 * Redondeo a 2 decimales solo para mostrarla: en la base de datos se guarda
 * tal cual (con hasta 3 decimales).
 *
 * @param {number} cantidad Un número de verdad. Lo que llega de la base de
 *   datos como texto ('1.500') hay que pasarlo antes por Number().
 * @param {Unidad} unidad
 * @returns {string}
 */
export function formatearCantidad(cantidad, unidad) {
  const numero = String(Math.round(cantidad * 100) / 100).replace('.', ',');
  return unidad === 'unidades' ? `${numero} ud.` : `${numero} ${unidad}`;
}