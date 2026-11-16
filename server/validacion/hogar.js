/**
 * @file Validación de lo que llega a /api/hogar.
 */
import { validarHora } from '../../compartido/horas.js';
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
 * El cuerpo de PATCH /api/hogar: { nombre?, zonaHoraria?, horaAvisoPlan? },
 * al menos uno. La hora es la del aviso del plan, HH:MM (fase 7).
 * @param {unknown} cuerpo
 * @returns {{ nombre: string | null, zonaHoraria: string | null, horaAvisoPlan: string | null }} null = no cambia.
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerCambiosHogar(cuerpo) {
  /** @type {Record<string, string>} */
  const campos = {};
  let nombre = null;
  let zonaHoraria = null;
  let horaAvisoPlan = null;

  if (cuerpo?.nombre !== undefined) {
    const resultado = validarNombreCasa(cuerpo.nombre);
    if (resultado.ok) nombre = resultado.datos;
    else Object.assign(campos, resultado.errores);
  }
  if (cuerpo?.zonaHoraria !== undefined) {
    if (ZONAS.has(cuerpo.zonaHoraria)) zonaHoraria = cuerpo.zonaHoraria;
    else campos.zonaHoraria = 'Esa zona horaria no existe.';
  }
  if (cuerpo?.horaAvisoPlan !== undefined) {
    const resultado = validarHora(cuerpo.horaAvisoPlan);
    if (resultado.ok) horaAvisoPlan = resultado.datos;
    else Object.assign(campos, resultado.errores);
  }
  if (Object.keys(campos).length === 0 && nombre === null && zonaHoraria === null && horaAvisoPlan === null) {
    campos.general = 'No hay nada que cambiar.';
  }

  if (Object.keys(campos).length > 0) {
    throw new ErrorApi(400, 'VALIDACION', 'Revisa los campos marcados.', { campos });
  }
  return { nombre, zonaHoraria, horaAvisoPlan };
}
