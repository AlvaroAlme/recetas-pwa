/**
 * @file Validación de lo que llega a /api/lista (D-54). La línea nueva la
 * compruebo con compartido/validacion.js, igual que el formulario (D-40).
 * El id lo leo con leerId() de productos.js, con su propio mensaje.
 */
import { validarLineaLista } from '../../compartido/validacion.js';
import { ErrorApi } from '../errores.js';

/**
 * Comprueba una línea nueva de la lista.
 * @param {unknown} cuerpo
 * @returns {import('../../compartido/validacion.js').DatosLineaLista}
 * @throws {ErrorApi} 400 VALIDACION con un error por campo.
 */
export function leerLineaLista(cuerpo) {
  const resultado = validarLineaLista(cuerpo);
  if (!resultado.ok) {
    throw new ErrorApi(400, 'VALIDACION', 'Revisa los campos marcados.', { campos: resultado.errores });
  }
  return resultado.datos;
}

/**
 * Lee { comprada: true | false } de PATCH /api/lista/:id. Solo vale un
 * booleano de verdad: "true" (texto) o 1 no.
 * @param {unknown} cuerpo
 * @returns {boolean}
 * @throws {ErrorApi} 400 VALIDACION.
 */
export function leerComprada(cuerpo) {
  const comprada = /** @type {any} */ (cuerpo)?.comprada;
  if (typeof comprada !== 'boolean') {
    throw new ErrorApi(400, 'VALIDACION', 'Falta decir si está comprada.');
  }
  return comprada;
}
