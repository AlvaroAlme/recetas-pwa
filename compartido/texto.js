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

/**
 * Palabras que no cambian qué alimento es: "turrón de chocolate" y "turrón
 * chocolate" son lo mismo. Ya van sin tildes, como las deja normalizar().
 */
const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'en', 'al', 'a']);

/**
 * La clave con la que comparo nombres en la lista de la compra (D-54):
 * normalizar() y sin las palabras vacías, con un solo espacio entre las
 * demás. "Turrón de  chocolate" -> "turron chocolate".
 *
 * Si el nombre SOLO tiene palabras vacías (alguien apunta "de"), me quedo
 * con el nombre normalizado entero: la clave nunca puede quedar vacía.
 *
 * @param {string} texto
 * @returns {string}
 */
export function claveNombre(texto) {
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
  const utiles = palabras.filter((palabra) => !PALABRAS_VACIAS.has(palabra));
  return (utiles.length > 0 ? utiles : palabras).join(' ');
}
