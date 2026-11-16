/**
 * @file Validación de lo que llega a /api/plan: las fechas y comida/cena de
 * la URL y lo que se guarda en un hueco (validarHueco(), el mismo que el
 * formulario, D-40). El margen de un año va contra el "hoy" DE LA CASA (D-50).
 */
import { TIPOS_COMIDA } from '../../compartido/constantes.js';
import { esFechaIso, sumarDias } from '../../compartido/fechas.js';
import { dentroDelMargen, esLunes } from '../../compartido/plan.js';
import { validarHueco } from '../../compartido/validacion.js';
import { ErrorApi } from '../errores.js';

/** Un error nuevo cada vez (cada uno con su propia traza). */
const fueraDeMargen = () =>
  new ErrorApi(400, 'FECHA_FUERA_DE_MARGEN', 'Solo puedes planificar desde un año atrás hasta un año adelante.');

/**
 * Una fecha de la URL (/api/plan/2026-11-24).
 * @param {unknown} texto
 * @param {string} hoy El hoy de la casa (AAAA-MM-DD).
 * @returns {string}
 * @throws {ErrorApi} 400 VALIDACION o FECHA_FUERA_DE_MARGEN
 */
export function leerFechaPlan(texto, hoy) {
  if (!esFechaIso(texto)) throw new ErrorApi(400, 'VALIDACION', 'La fecha no es válida.');
  if (!dentroDelMargen(texto, hoy)) throw fueraDeMargen();
  return texto;
}

/**
 * El lunes de ?desde= (GET /api/plan?desde=2026-11-23). Toda la semana tiene
 * que caber en el margen: compruebo el lunes y el domingo.
 * @param {unknown} texto
 * @param {string} hoy
 * @returns {string}
 * @throws {ErrorApi} 400 VALIDACION o FECHA_FUERA_DE_MARGEN
 */
export function leerLunes(texto, hoy) {
  if (!esLunes(texto)) throw new ErrorApi(400, 'VALIDACION', 'La semana tiene que empezar en lunes (AAAA-MM-DD).');
  // Basta con que un día de la semana esté dentro: así las semanas del borde
  // se pueden ver (los días de fuera, la pantalla no deja tocarlos).
  if (!dentroDelMargen(texto, hoy) && !dentroDelMargen(sumarDias(texto, 6), hoy)) throw fueraDeMargen();
  return texto;
}

/**
 * Comida o cena, de la URL.
 * @param {unknown} texto
 * @returns {import('../../compartido/constantes.js').TipoComida}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerTipo(texto) {
  if (!TIPOS_COMIDA.includes(texto)) throw new ErrorApi(400, 'VALIDACION', 'Elige comida o cena.');
  return texto;
}

/**
 * Lo que se guarda en el hueco: una receta, un texto o "fuera de casa".
 * @param {unknown} cuerpo
 * @returns {import('../../compartido/validacion.js').DatosHueco}
 * @throws {ErrorApi} 400 VALIDACION con un error por campo.
 */
export function leerHueco(cuerpo) {
  const resultado = validarHueco(cuerpo);
  if (!resultado.ok) {
    const { general, ...campos } = resultado.errores;
    // Si solo hay error general, no mando "campos" vacío.
    const extra = Object.keys(campos).length > 0 ? { campos } : {};
    throw new ErrorApi(400, 'VALIDACION', general ?? 'Revisa los campos marcados.', extra);
  }
  return resultado.datos;
}
