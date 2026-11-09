/**
 * @file Validación de lo que llega a /api/hogar.
 */
import { validarCodigoInvitacion, validarNombreCasa } from '../../compartido/validacion.js';
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
/** Las zonas horarias que conoce Node (lista IANA). La calculo una vez. */
const ZONAS = new Set([...Intl.supportedValuesOf('timeZone'), 'UTC']);

/**
 * El cuerpo de PATCH /api/hogar: { nombre?, zonaHoraria? }, al menos uno.
 * La hora del aviso del plan (horaAvisoPlan) llega en la fase 7.
 * @param {unknown} cuerpo
 * @returns {{ nombre: string | null, zonaHoraria: string | null }} null = no cambia.
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerCambiosHogar(cuerpo) {
  /** @type {Record<string, string>} */
  const campos = {};
  let nombre = null;
  let zonaHoraria = null;

  if (cuerpo?.nombre !== undefined) {
    const resultado = validarNombreCasa(cuerpo.nombre);
    if (resultado.ok) nombre = resultado.datos;
    else Object.assign(campos, resultado.errores);
  }
  if (cuerpo?.zonaHoraria !== undefined) {
    if (ZONAS.has(cuerpo.zonaHoraria)) zonaHoraria = cuerpo.zonaHoraria;
    else campos.zonaHoraria = 'Esa zona horaria no existe.';
  }
  if (Object.keys(campos).length === 0 && nombre === null && zonaHoraria === null) {
    campos.general = 'No hay nada que cambiar.';
  }

  if (Object.keys(campos).length > 0) {
    throw new ErrorApi(400, 'VALIDACION', 'Revisa los campos marcados.', { campos });
  }
  return { nombre, zonaHoraria };
}
