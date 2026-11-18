/**
 * @file Validación de lo que llega a /api/auth. Las reglas están en
 * compartido/validacion.js (D-40): las mismas que usará el formulario.
 */
import { validarCambioContrasena, validarLogin, validarNombrePersona, validarRegistro } from '../../compartido/validacion.js';
import { ErrorApi } from '../errores.js';
import {MAX_LONGITUD_CONTRASENA} from '../../compartido/constantes.js';

const REVISA_CAMPOS = 'Revisa los campos marcados.';

/**
 * @param {unknown} cuerpo
 * @returns {import('../../compartido/validacion.js').DatosRegistro}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerRegistro(cuerpo) {
  const resultado = validarRegistro(cuerpo);
  if (!resultado.ok) throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, { campos: resultado.errores });
  return resultado.datos;
}

/**
 * @param {unknown} cuerpo
 * @returns {{ email: string, contrasena: string }}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerLogin(cuerpo) {
  const resultado = validarLogin(cuerpo);
  if (!resultado.ok) throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, { campos: resultado.errores });
  return resultado.datos;
}

/**
 * El cuerpo de "borrar mi cuenta": { contrasena }.
 * @param {unknown} cuerpo
 * @returns {string}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerBorrarCuenta(cuerpo) {
  const contrasena = typeof cuerpo?.contrasena === 'string' ? cuerpo.contrasena : '';
  if (contrasena === '' || contrasena.length > MAX_LONGITUD_CONTRASENA) {
    throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, {
      campos: { contrasena: 'Escribe tu contraseña para confirmar.' },
    });
  }
  return contrasena;
}

/**
 * El cuerpo de "cambiar mi nombre" (PATCH /api/yo): { nombre }.
 * @param {unknown} cuerpo
 * @returns {string} El nombre limpio.
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerCambioNombre(cuerpo) {
  const resultado = validarNombrePersona(cuerpo?.nombre);
  if (!resultado.ok) throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, { campos: resultado.errores });
  return resultado.datos;
}

/**
 * El cuerpo de "cambiar la contraseña" (PUT /api/yo/contrasena): { actual, nueva }.
 * @param {unknown} cuerpo
 * @returns {{ actual: string, nueva: string }}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerCambioContrasena(cuerpo) {
  const resultado = validarCambioContrasena(cuerpo);
  if (!resultado.ok) throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, { campos: resultado.errores });
  return resultado.datos;
}
