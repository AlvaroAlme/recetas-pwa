/**
 * @file Validación de lo que escribe el usuario, compartida por el formulario
 * (navegador) y la API (servidor), D-40. Mismas reglas y mismos mensajes en
 * los dos lados.
 *
 * El servidor valida SIEMPRE, aunque el formulario ya lo haya hecho: una
 * petición se puede fabricar sin pasar por el formulario.
 */
import {
  ALFABETO_CODIGO,
  LONGITUD_CODIGO,
  MAX_CANTIDAD,
  MAX_DIAS_TUPPER,
  MAX_INGREDIENTES_RECETA,
  MAX_LONGITUD_CONTRASENA,
  MAX_LONGITUD_EMAIL,
  MAX_LONGITUD_NOMBRE,
  MAX_LONGITUD_PASO,
  MIN_DIAS_TUPPER,
  MIN_LONGITUD_CONTRASENA,
  MAX_PASOS_RECETA,
  MAX_RACIONES,
  MIN_RACIONES,
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
 * Redondeo la cantidad a 3 decimales (los que guarda la base de datos) y
 * compruebo que vale. Redondeo antes: 0.0001 se quedaría en 0.
 * @param {unknown} cantidad
 * @returns {{ valor: number } | { error: string }}
 */
export function leerCantidad(cantidad) {
  const valor = typeof cantidad === 'number' ? Math.round(cantidad * 1000) / 1000 : NaN;
  if (!Number.isFinite(valor) || valor <= 0) return { error: 'Debe ser un número mayor que 0.' };
  if (valor > MAX_CANTIDAD) return { error: 'La cantidad es demasiado grande.' };
  return { valor };
}

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

  const cantidadLeida = leerCantidad(cantidad);
  if ('error' in cantidadLeida) errores.cantidad = cantidadLeida.error;

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
    datos: { nombre: nombreLimpio, cantidad: cantidadLeida.valor, unidad, ubicacion, fechaCaducidad },
  };
}
// ============ Tuppers ============

/**
 * Un tupper ya comprobado y limpio.
 * @typedef {Object} DatosTupper
 * @property {string} nombre Sin espacios a los lados.
 * @property {import('./constantes.js').Ubicacion} ubicacion
 * @property {number} diasMaximos Entero de 1 a 365.
 */

/**
 * Comprueba los datos de un tupper nuevo (P-06). La fecha límite NO llega:
 * la calcula el servidor con el "hoy" de la zona horaria de la casa.
 * @param {unknown} entrada
 * @returns {{ ok: true, datos: DatosTupper } | { ok: false, errores: Record<string, string> }}
 */
export function validarTupper(entrada) {
  if (!esObjeto(entrada)) {
    return { ok: false, errores: { general: 'Los datos del tupper no son válidos.' } };
  }
  const { nombre, ubicacion, diasMaximos } = entrada;
  /** @type {Record<string, string>} */
  const errores = {};

  const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
  if (nombreLimpio === '') {
    errores.nombre = 'Escribe qué hay en el tupper.';
  } else if (nombreLimpio.length > MAX_LONGITUD_NOMBRE) {
    errores.nombre = `El nombre puede tener como mucho ${MAX_LONGITUD_NOMBRE} caracteres.`;
  }

  if (!UBICACIONES.includes(ubicacion)) {
    errores.ubicacion = 'Elige dónde guardas el tupper.';
  }

  // Number.isInteger ya descarta los textos ("3"), los decimales y NaN.
  if (!Number.isInteger(diasMaximos) || diasMaximos < MIN_DIAS_TUPPER || diasMaximos > MAX_DIAS_TUPPER) {
    errores.diasMaximos = `Escribe un número de días entre ${MIN_DIAS_TUPPER} y ${MAX_DIAS_TUPPER}.`;
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, datos: { nombre: nombreLimpio, ubicacion, diasMaximos } };
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

// ============ Hogar ============

/**
 * Comprueba el nombre de la casa (Bienvenida, Ajustes).
 * @param {unknown} valor
 * @returns {{ ok: true, datos: string } | { ok: false, errores: Record<string, string> }}
 */
export function validarNombreCasa(valor) {
  const nombre = typeof valor === 'string' ? valor.trim() : '';
  if (nombre === '') return { ok: false, errores: { nombre: 'Escribe el nombre de tu casa.' } };
  if (nombre.length > MAX_LONGITUD_NOMBRE) {
    return { ok: false, errores: { nombre: `El nombre puede tener como mucho ${MAX_LONGITUD_NOMBRE} caracteres.` } };
  }
  return { ok: true, datos: nombre };
}

/**
 * Limpia un código de invitación como lo escriba la persona ("6s4a-jmrb",
 * " 6S4A JMRB ") y comprueba que PUEDE ser uno de verdad. Si existe, lo
 * dice el servidor.
 * @param {unknown} valor
 * @returns {{ ok: true, datos: string } | { ok: false, errores: Record<string, string> }}
 */
export function validarCodigoInvitacion(valor) {
  const codigo = typeof valor === 'string' ? valor.toUpperCase().replace(/[\s-]/g, '') : '';
  const valido = codigo.length === LONGITUD_CODIGO && [...codigo].every((letra) => ALFABETO_CODIGO.includes(letra));
  if (!valido) {
    return { ok: false, errores: { codigo: `El código son ${LONGITUD_CODIGO} letras y números.` } };
  }
  return { ok: true, datos: codigo };
}

// ============ Recetas ============

/**
 * Un ingrediente ya comprobado y limpio.
 * @typedef {{ nombre: string, cantidad: number, unidad: import('./constantes.js').Unidad }} DatosIngrediente
 */

/**
 * Una receta ya comprobada y limpia.
 * @typedef {Object} DatosReceta
 * @property {string} nombre Sin espacios a los lados.
 * @property {number | null} raciones Entero de 1 a 20, o null si no lo sé.
 * @property {DatosIngrediente[]} ingredientes De 1 a 30, en el orden del formulario.
 * @property {string[]} pasos De 1 a 30, sin líneas vacías.
 */

/**
 * Comprueba una receta (alta o edición, D-49). Los pasos llegan ya como
 * lista: el formulario parte el área de texto por líneas.
 * Los errores de cada ingrediente van en "ingredientes.N.campo" (N desde 0),
 * para poder marcar el campo exacto de esa fila.
 * @param {unknown} entrada
 * @returns {{ ok: true, datos: DatosReceta } | { ok: false, errores: Record<string, string> }}
 */
export function validarReceta(entrada) {
  if (!esObjeto(entrada)) {
    return { ok: false, errores: { general: 'Los datos de la receta no son válidos.' } };
  }

  const { nombre, raciones = null, ingredientes, pasos } = entrada;
  /** @type {Record<string, string>} */
  const errores = {};

  const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
  if (nombreLimpio === '') {
    errores.nombre = 'Escribe el nombre de la receta.';
  } else if (nombreLimpio.length > MAX_LONGITUD_NOMBRE) {
    errores.nombre = `El nombre puede tener como mucho ${MAX_LONGITUD_NOMBRE} caracteres.`;
  }

  if (raciones !== null && !(Number.isInteger(raciones) && raciones >= MIN_RACIONES && raciones <= MAX_RACIONES)) {
    errores.raciones = `Escribe un número entero de ${MIN_RACIONES} a ${MAX_RACIONES}, o déjalo vacío.`;
  }

  /** @type {DatosIngrediente[]} */
  const ingredientesLimpios = [];
  if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
    errores.ingredientes = 'Añade al menos un ingrediente.';
  } else if (ingredientes.length > MAX_INGREDIENTES_RECETA) {
    errores.ingredientes = `Puedes poner como mucho ${MAX_INGREDIENTES_RECETA} ingredientes.`;
  } else {
    ingredientes.forEach((ingrediente, i) => {
      const fila = esObjeto(ingrediente) ? ingrediente : {};
      const nombreIngrediente = typeof fila.nombre === 'string' ? fila.nombre.trim() : '';
      const cantidadLeida = leerCantidad(fila.cantidad);

      if (nombreIngrediente === '') {
        errores[`ingredientes.${i}.nombre`] = 'Escribe el ingrediente.';
      } else if (nombreIngrediente.length > MAX_LONGITUD_NOMBRE) {
        errores[`ingredientes.${i}.nombre`] = `Como mucho ${MAX_LONGITUD_NOMBRE} caracteres.`;
      }
      if ('error' in cantidadLeida) errores[`ingredientes.${i}.cantidad`] = cantidadLeida.error;
      if (!UNIDADES.includes(fila.unidad)) errores[`ingredientes.${i}.unidad`] = 'Elige una unidad.';

      if (nombreIngrediente !== '' && 'valor' in cantidadLeida) {
        ingredientesLimpios.push({ nombre: nombreIngrediente, cantidad: cantidadLeida.valor, unidad: fila.unidad });
      }
    });
  }

  // Cada paso es una línea: si uno trae un salto de línea dentro, al
  // guardarlos juntos se partiría en dos.
  const pasosValidos = Array.isArray(pasos) && pasos.every((paso) => typeof paso === 'string' && !/[\r\n]/.test(paso));
  const pasosLimpios = pasosValidos ? pasos.map((paso) => paso.trim()).filter((paso) => paso !== '') : [];
  const pasoLargo = pasosLimpios.findIndex((paso) => paso.length > MAX_LONGITUD_PASO);
  if (pasosLimpios.length === 0) {
    errores.pasos = 'Escribe al menos un paso.';
  } else if (pasosLimpios.length > MAX_PASOS_RECETA) {
    errores.pasos = `Puedes poner como mucho ${MAX_PASOS_RECETA} pasos (uno por línea).`;
  } else if (pasoLargo !== -1) {
    errores.pasos = `El paso ${pasoLargo + 1} es demasiado largo (como mucho ${MAX_LONGITUD_PASO} caracteres).`;
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }
  return { ok: true, datos: { nombre: nombreLimpio, raciones, ingredientes: ingredientesLimpios, pasos: pasosLimpios } };
}