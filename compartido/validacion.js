/**
 * @file Validación de lo que escribe el usuario, compartida por el formulario
 * (navegador) y la API (servidor), D-40. Mismas reglas y mismos mensajes en
 * los dos lados.
 *
 * El servidor valida SIEMPRE, aunque el formulario ya lo haya hecho: una
 * petición se puede fabricar sin pasar por el formulario.
 */
import {
  MAX_CANTIDAD,
  MAX_LONGITUD_CONTRASENA,
  MAX_LONGITUD_EMAIL,
  MAX_LONGITUD_NOMBRE,
  MIN_LONGITUD_CONTRASENA,
  UBICACIONES,
  UNIDADES,
} from './constantes.js';
import { esFechaIso } from './fechas.js';

/**
 * ¿Es un objeto normal ({ … })? null y los arrays también son "object" en
 * JavaScript, así que typeof solo no basta.
 * @param {unknown} valor
 * @returns {valor is Record<string, unknown>}
 */
function esObjeto(valor) {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

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
  if (!esObjeto(entrada)) {
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
// ============ Cuentas ============

/**
 * Formato BÁSICO de email: algo@algo.algo, sin espacios. No intento más: la
 * prueba de verdad de que un email existe es que llegue un correo.
 */
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * El email como se guarda: sin espacios a los lados y en minúsculas (así el
 * UNIQUE de la tabla usuarios funciona, aunque escribas "Ana@Correo.com").
 * @param {unknown} valor
 * @returns {string}
 */
function limpiarEmail(valor) {
  return typeof valor === 'string' ? valor.trim().toLowerCase() : '';
}

/**
 * @param {string} email Ya limpio.
 * @returns {string | null} El error, o null si está bien.
 */
function errorDeEmail(email) {
  if (email === '') return 'Escribe tu email.';
  if (email.length > MAX_LONGITUD_EMAIL || !FORMATO_EMAIL.test(email)) return 'Ese email no parece válido.';
  return null;
}

/**
 * Datos para crear una cuenta, ya limpios.
 * @typedef {Object} DatosRegistro
 * @property {string} email En minúsculas.
 * @property {string} nombre Sin espacios a los lados.
 * @property {string} contrasena Tal cual: los espacios también cuentan.
 */

/**
 * Comprueba el formulario de "Crear cuenta" (P-02).
 * @param {unknown} entrada
 * @returns {{ ok: true, datos: DatosRegistro } | { ok: false, errores: Record<string, string> }}
 */
export function validarRegistro(entrada) {
  if (!esObjeto(entrada)) {
    return { ok: false, errores: { general: 'Los datos de la cuenta no son válidos.' } };
  }
  const email = limpiarEmail(entrada.email);
  const nombre = typeof entrada.nombre === 'string' ? entrada.nombre.trim() : '';
  const contrasena = typeof entrada.contrasena === 'string' ? entrada.contrasena : '';
  /** @type {Record<string, string>} */
  const errores = {};

  const fallo = errorDeEmail(email);
  if (fallo) errores.email = fallo;

  if (nombre === '') {
    errores.nombre = 'Escribe tu nombre.';
  } else if (nombre.length > MAX_LONGITUD_NOMBRE) {
    errores.nombre = `Tu nombre puede tener como mucho ${MAX_LONGITUD_NOMBRE} caracteres.`;
  }

  if (contrasena.length < MIN_LONGITUD_CONTRASENA) {
    errores.contrasena = `La contraseña tiene que tener al menos ${MIN_LONGITUD_CONTRASENA} caracteres.`;
  } else if (contrasena.length > MAX_LONGITUD_CONTRASENA) {
    errores.contrasena = `La contraseña puede tener como mucho ${MAX_LONGITUD_CONTRASENA} caracteres.`;
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { email, nombre, contrasena } };
}

/**
 * Comprueba el formulario de "Entrar". Aquí NO miro el mínimo de 10: si la
 * contraseña es corta, simplemente no coincidirá, y el error será el
 * genérico ("Email o contraseña incorrectos").
 * @param {unknown} entrada
 * @returns {{ ok: true, datos: { email: string, contrasena: string } } | { ok: false, errores: Record<string, string> }}
 */
export function validarLogin(entrada) {
  if (!esObjeto(entrada)) {
    return { ok: false, errores: { general: 'Escribe tu email y tu contraseña.' } };
  }
  const email = limpiarEmail(entrada.email);
  const contrasena = typeof entrada.contrasena === 'string' ? entrada.contrasena : '';
  /** @type {Record<string, string>} */
  const errores = {};

  const fallo = errorDeEmail(email);
  if (fallo) errores.email = fallo;

  if (contrasena === '') {
    errores.contrasena = 'Escribe tu contraseña.';
  } else if (contrasena.length > MAX_LONGITUD_CONTRASENA) {
    errores.contrasena = `La contraseña puede tener como mucho ${MAX_LONGITUD_CONTRASENA} caracteres.`;
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { email, contrasena } };
}
