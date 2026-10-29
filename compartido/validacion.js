/**
 * @file Validación de lo que escribe el usuario, compartida por el formulario
 * (navegador) y la API (servidor), D-40. Mismas reglas y mismos mensajes en
 * los dos lados.
 *
 * El servidor valida SIEMPRE, aunque el formulario ya lo haya hecho: una
 * petición se puede fabricar sin pasar por el formulario.
 */
import { MAX_CANTIDAD, MAX_LONGITUD_NOMBRE, UBICACIONES, UNIDADES } from './constantes.js';
import { esFechaIso } from './fechas.js';

/**
 * Un producto ya comprobado y limpio.
 * @typedef {Object} DatosProducto
 * @property {string} nombre Sin espacios a los lados.
 * @property {number} cantidad Mayor que 0, con 3 decimales como mucho.
 * @property {import('./constantes.js').Unidad} unidad
 * @property {import('./constantes.js').Ubicacion} ubicacion
 * @property {string | null} fechaCaducidad AAAA-MM-DD, o null si no tiene.
 */

/**
 * O los datos limpios, o un mensaje de error por cada campo que falla.
 * @typedef {{ ok: true, datos: DatosProducto } | { ok: false, errores: Record<string, string> }} ResultadoProducto
 */

/**
 * Comprueba los datos de un producto (alta o edición).
 *
 * Solo devuelve los campos que conozco: si me mandan algo más (por ejemplo,
 * un hogarId para colarse en otro hogar), lo ignoro.
 *
 * @param {unknown} entrada Lo que llega del formulario o del cuerpo de la petición.
 * @returns {ResultadoProducto}
 */
export function validarProducto(entrada) {
  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) {
    return { ok: false, errores: { general: 'Los datos del producto no son válidos.' } };
  }

  const { nombre, cantidad, unidad, ubicacion, fechaCaducidad = null } = entrada;
  /** @type {Record<string, string>} */
  const errores = {};

  const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
  if (nombreLimpio === '') {
    errores.nombre = 'Escribe el nombre del producto.';
  } else if (nombreLimpio.length > MAX_LONGITUD_NOMBRE) {
    errores.nombre = `El nombre puede tener como mucho ${MAX_LONGITUD_NOMBRE} caracteres.`;
  }

  // La base de datos guarda 3 decimales: redondeo antes de comprobar, porque
  // 0.0001 se quedaría en 0 y no es una cantidad válida.
  const cantidadRedondeada = typeof cantidad === 'number' ? Math.round(cantidad * 1000) / 1000 : NaN;
  if (!Number.isFinite(cantidadRedondeada) || cantidadRedondeada <= 0) {
    errores.cantidad = 'Debe ser un número mayor que 0.';
  } else if (cantidadRedondeada > MAX_CANTIDAD) {
    errores.cantidad = 'La cantidad es demasiado grande.';
  }

  if (!UNIDADES.includes(unidad)) {
    errores.unidad = 'Elige una unidad.';
  }

  if (!UBICACIONES.includes(ubicacion)) {
    errores.ubicacion = `Elige dónde guardas «${nombreLimpio || 'el producto'}».`;
  }

  if (fechaCaducidad !== null && !esFechaIso(fechaCaducidad)) {
    errores.fechaCaducidad = 'La fecha de caducidad no es válida.';
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }
  return {
    ok: true,
    datos: { nombre: nombreLimpio, cantidad: cantidadRedondeada, unidad, ubicacion, fechaCaducidad },
  };
}