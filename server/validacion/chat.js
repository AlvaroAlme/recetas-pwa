/**
 * @file Validación de lo que llega a /api/chat (D-51): el mensaje que
 * escribes y el id de una tarjeta de la URL.
 */
import { MAX_CARACTERES_MENSAJE } from '../../compartido/constantes.js';
import { ErrorApi } from '../errores.js';

/**
 * El mensaje: { texto }, de 1 a 2000 caracteres sin contar los espacios de
 * los lados.
 * @param {unknown} cuerpo
 * @returns {string}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerMensaje(cuerpo) {
  const texto = typeof cuerpo === 'object' && cuerpo !== null && typeof cuerpo.texto === 'string' ? cuerpo.texto.trim() : '';
  if (texto === '') {
    throw new ErrorApi(400, 'VALIDACION', 'Escribe tu pregunta.', { campos: { texto: 'Escribe tu pregunta.' } });
  }
  if (texto.length > MAX_CARACTERES_MENSAJE) {
    const mensaje = `Tu mensaje puede tener como mucho ${MAX_CARACTERES_MENSAJE} caracteres.`;
    throw new ErrorApi(400, 'VALIDACION', mensaje, { campos: { texto: mensaje } });
  }
  return texto;
}

/**
 * El id de una tarjeta (el del bloque tool_use, "toolu_01A…"). Si no tiene
 * esa forma, no puede ser una tarjeta: 404, como cualquier cosa que no existe.
 * @param {unknown} texto
 * @returns {string}
 * @throws {ErrorApi} 404 NO_EXISTE
 */
export function leerIdTarjeta(texto) {
  if (typeof texto !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(texto)) {
    throw new ErrorApi(404, 'NO_EXISTE', 'Esta propuesta ya no existe.');
  }
  return texto;
}
