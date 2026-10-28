/**
 * @file Dónde se puede guardar cada alimento y cómo se llama cada ubicación.
 *
 * Es la base de la regla "si un alimento puede ir en varios sitios, la app
 * PREGUNTA en vez de decidir". Mismo diccionario que lib/ubicaciones.ts de
 * la app Expo.
 */
import { normalizar } from './texto.js';

/** @typedef {import('./constantes.js').Ubicacion} Ubicacion */

/**
 * Nombre de cada ubicación tal como se ve en pantalla.
 * @type {Readonly<Record<Ubicacion, string>>}
 */
export const ETIQUETAS_UBICACION = Object.freeze({
  nevera: 'Nevera',
  despensa: 'Despensa',
  congelador: 'Congelador',
});

// Combinaciones que se repiten mucho en el diccionario.
const NEVERA_O_CONGELADOR = Object.freeze(['nevera', 'congelador']);
const DESPENSA_O_NEVERA = Object.freeze(['despensa', 'nevera']);
const DESPENSA_O_CONGELADOR = Object.freeze(['despensa', 'congelador']);

/**
 * Alimentos conocidos y dónde se pueden guardar. Las claves van sin tildes y
 * en minúsculas, porque las comparo con cada palabra del nombre ya normalizada.
 * Uso un Map y no un objeto normal: así una palabra como "constructor" no
 * encuentra por error cosas que JavaScript mete en todos los objetos.
 * @type {ReadonlyMap<string, readonly Ubicacion[]>}
 */
const ALIMENTOS = new Map([
  // Carnes y pescados frescos: se guardan en la nevera o se congelan.
  ['carne', NEVERA_O_CONGELADOR],
  ['pollo', NEVERA_O_CONGELADOR],
  ['pavo', NEVERA_O_CONGELADOR],
  ['cerdo', NEVERA_O_CONGELADOR],
  ['ternera', NEVERA_O_CONGELADOR],
  ['cordero', NEVERA_O_CONGELADOR],
  ['filete', NEVERA_O_CONGELADOR],
  ['filetes', NEVERA_O_CONGELADOR],
  ['pechuga', NEVERA_O_CONGELADOR],
  ['pechugas', NEVERA_O_CONGELADOR],
  ['hamburguesa', NEVERA_O_CONGELADOR],
  ['hamburguesas', NEVERA_O_CONGELADOR],
  ['salchichas', NEVERA_O_CONGELADOR],
  ['pescado', NEVERA_O_CONGELADOR],
  ['merluza', NEVERA_O_CONGELADOR],
  ['salmon', NEVERA_O_CONGELADOR],
  ['bacalao', NEVERA_O_CONGELADOR],
  ['gambas', NEVERA_O_CONGELADOR],
  ['langostinos', NEVERA_O_CONGELADOR],
  ['calamar', NEVERA_O_CONGELADOR],
  ['calamares', NEVERA_O_CONGELADOR],
  ['mantequilla', NEVERA_O_CONGELADOR],
  ['espinacas', NEVERA_O_CONGELADOR],
  // Aguantan fuera, pero mucha gente los guarda en la nevera.
  ['huevos', DESPENSA_O_NEVERA],
  ['leche', DESPENSA_O_NEVERA],
  ['tomate', DESPENSA_O_NEVERA],
  ['tomates', DESPENSA_O_NEVERA],
  ['fruta', DESPENSA_O_NEVERA],
  ['chorizo', DESPENSA_O_NEVERA],
  // El pan se deja fuera o se congela.
  ['pan', DESPENSA_O_CONGELADOR],
  // Con un solo sitio habitual: no hace falta preguntar.
  ['arroz', ['despensa']],
  ['pasta', ['despensa']],
  ['macarrones', ['despensa']],
  ['espaguetis', ['despensa']],
  ['lentejas', ['despensa']],
  ['garbanzos', ['despensa']],
  ['alubias', ['despensa']],
  ['harina', ['despensa']],
  ['azucar', ['despensa']],
  ['sal', ['despensa']],
  ['aceite', ['despensa']],
  ['patatas', ['despensa']],
  ['cebolla', ['despensa']],
  ['cebollas', ['despensa']],
  ['ajo', ['despensa']],
  ['ajos', ['despensa']],
  ['yogur', ['nevera']],
  ['yogures', ['nevera']],
  ['queso', ['nevera']],
  ['nata', ['nevera']],
  ['lechuga', ['nevera']],
  ['jamon', ['nevera']],
  ['helado', ['congelador']],
  ['hielo', ['congelador']],
]);

/** Palabras que indican conserva: "atún en lata" va a la despensa. */
const PALABRAS_CONSERVA = Object.freeze(['lata', 'latas', 'conserva', 'bote', 'tarro']);

/**
 * Dónde se puede guardar un producto según su nombre.
 * - Varias ubicaciones: hay que PREGUNTAR.
 * - Una: se puede proponer directamente.
 * - Ninguna (alimento que no conozco): lo decide el usuario.
 *
 * @param {string} nombre Nombre del producto, tal cual lo escribe el usuario.
 * @returns {readonly Ubicacion[]}
 */
export function ubicacionesPosibles(nombre) {
  const palabras = normalizar(nombre).split(/[^a-zñ]+/).filter(Boolean);

  if (palabras.some((palabra) => PALABRAS_CONSERVA.includes(palabra))) {
    return ['despensa'];
  }

  // Uso la primera palabra que conozco: en "pechuga de pollo" las dos dan lo mismo.
  for (const palabra of palabras) {
    const ubicaciones = ALIMENTOS.get(palabra);
    if (ubicaciones) return ubicaciones;
  }
  return [];
}
