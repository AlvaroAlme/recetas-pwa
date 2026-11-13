/**
 * @file Validación de lo que llega a /api/recetas. Los datos de la receta
 * los compruebo con compartido/validacion.js, igual que el formulario (D-40).
 */
import { validarReceta } from '../../compartido/validacion.js';
import { ErrorApi } from '../errores.js';

/**
 * Comprueba una receta (alta o edición).
 * @param {unknown} cuerpo
 * @returns {import('../../compartido/validacion.js').DatosReceta}
 * @throws {ErrorApi} 400 VALIDACION con un error por campo.
 */
export function leerReceta(cuerpo) {
  const resultado = validarReceta(cuerpo);
  if (!resultado.ok) {
    throw new ErrorApi(400, 'VALIDACION', 'Revisa los campos marcados.', { campos: resultado.errores });
  }
  return resultado.datos;
}