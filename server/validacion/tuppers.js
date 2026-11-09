/**
 * @file Validación de lo que llega a /api/tuppers. Los datos del tupper los
 * compruebo con compartido/validacion.js, igual que el formulario (D-40).
 * El id y la ubicación los leo con las funciones de productos.js.
 */
import { validarTupper } from '../../compartido/validacion.js';
import { ErrorApi } from '../errores.js';

/**
 * Comprueba los datos de un tupper nuevo.
 * @param {unknown} cuerpo
 * @returns {import('../../compartido/validacion.js').DatosTupper}
 * @throws {ErrorApi} 400 VALIDACION con un error por campo.
 */
export function leerTupper(cuerpo) {
  const resultado = validarTupper(cuerpo);
  if (!resultado.ok) {
    throw new ErrorApi(400, 'VALIDACION', 'Revisa los campos marcados.', { campos: resultado.errores });
  }
  return resultado.datos;
}
