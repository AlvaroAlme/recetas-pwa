/**
 * @file Validación de lo que llega a /api/auth. Las reglas están en
 * compartido/validacion.js (D-40): las mismas que usará el formulario.
 */
import {
  validarCambioContrasena,
  validarCambioEmail,
  validarContrasenaNueva,
  validarEmail,
  validarLogin,
  validarNombrePersona,
  validarRegistro,
} from '../../compartido/validacion.js';
import { esFormatoToken } from '../servicios/enlaces.js';
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

// ============ Correo (fase 10, D-53) ============

/** El error de un enlace que no sirve: el MISMO si no existe, ha caducado o ya se usó. */
export const ENLACE_NO_VALIDO = () => new ErrorApi(400, 'ENLACE_NO_VALIDO', 'Este enlace ya no sirve. Pide otro.');

/**
 * El cuerpo de "¿Has olvidado la contraseña?": { email }.
 * @param {unknown} cuerpo
 * @returns {string} El email limpio.
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerOlvide(cuerpo) {
  const resultado = validarEmail(cuerpo?.email);
  if (!resultado.ok) throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, { campos: resultado.errores });
  return resultado.datos;
}

/**
 * El cuerpo de "Contraseña nueva": { token, contrasena }. Un token sin forma
 * de token es un enlace que no sirve (el mismo error que uno caducado).
 * @param {unknown} cuerpo
 * @returns {{ token: string, contrasena: string }}
 * @throws {ErrorApi} 400 ENLACE_NO_VALIDO o VALIDACION
 */
export function leerRestablecer(cuerpo) {
  if (!esFormatoToken(cuerpo?.token)) throw ENLACE_NO_VALIDO();
  const resultado = validarContrasenaNueva(cuerpo.contrasena);
  if (!resultado.ok) throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, { campos: resultado.errores });
  return { token: cuerpo.token, contrasena: resultado.datos };
}

/**
 * El cuerpo de "Confirmar email": { token }.
 * @param {unknown} cuerpo
 * @returns {string}
 * @throws {ErrorApi} 400 ENLACE_NO_VALIDO
 */
export function leerToken(cuerpo) {
  if (!esFormatoToken(cuerpo?.token)) throw ENLACE_NO_VALIDO();
  return cuerpo.token;
}

/**
 * El cuerpo de "Cambiar email": { emailNuevo, contrasena }.
 * @param {unknown} cuerpo
 * @param {string} emailActual
 * @returns {{ emailNuevo: string, contrasena: string }}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerCambioEmail(cuerpo, emailActual) {
  const resultado = validarCambioEmail(cuerpo, emailActual);
  if (!resultado.ok) throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, { campos: resultado.errores });
  return resultado.datos;
}
