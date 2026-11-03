/**
 * @file Validación de lo que llega a /api/hogar.
 */
import { validarCodigoInvitacion } from '../../compartido/validacion.js';
import { ErrorApi } from '../errores.js';

/**
 * El cuerpo de "unirse": { codigo, confirmarBorrado? }.
 * @param {unknown} cuerpo
 * @returns {{ codigo: string, confirmarBorrado: boolean }}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerUnirse(cuerpo) {
  const resultado = validarCodigoInvitacion(cuerpo?.codigo);
  if (!resultado.ok) {
    throw new ErrorApi(400, 'VALIDACION', 'Revisa los campos marcados.', { campos: resultado.errores });
  }
  // Solo true de verdad confirma: "true", 1 o "sí" no cuentan.
  return { codigo: resultado.datos, confirmarBorrado: cuerpo.confirmarBorrado === true };
}