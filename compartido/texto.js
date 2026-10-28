/**
 * @file Utilidades de texto, compartidas por el navegador y el servidor.
 */

/**
 * Pasa a minúsculas, quita las tildes y los espacios de los extremos:
 * " Salmón " -> "salmon". Sirve para comparar nombres sin que importen las
 * mayúsculas ni las tildes ("Salmón" y "salmon" son el mismo alimento).
 *
 * Ojo: igual que en la app Expo, la ñ también pierde su tilde ("Piña" -> "pina").
 *
 * @param {string} texto
 * @returns {string}
 */
export function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}