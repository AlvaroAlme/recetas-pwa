/**
 * @file Validación de lo que llega a /api/productos y no comparte el
 * formulario: el id de la URL, la ubicación y el lote del ticket. Los datos
 * de un producto los valido con compartido/validacion.js (D-40).
 *
 * Aquí no devuelvo { ok, errores }: lanzo directamente un ErrorApi y el
 * middleware de errores lo convierte en la respuesta. Así cada ruta lo
 * resuelve en una línea: const id = leerId(req.params.id);
 */
import { MAX_LONGITUD_NOMBRE, MAX_PRODUCTOS_TICKET, UBICACIONES } from '../../compartido/constantes.js';
import { validarProducto } from '../../compartido/validacion.js';
import { ErrorApi } from '../errores.js';

const REVISA_CAMPOS = 'Revisa los campos marcados.';

/**
 * Lee el id de la URL (/api/productos/:id), que siempre llega como texto.
 * Si no es un entero positivo, ese producto no puede existir: contesto 404,
 * igual que si fuera de otro hogar (§5.1).
 * También lo uso para los tuppers, con su propio mensaje.
 * @param {string} texto
 * @param {string} [mensaje] El texto del 404.
 * @returns {number}
 * @throws {ErrorApi} 404 NO_EXISTE
 */
export function leerId(texto, mensaje = 'Este producto ya no existe.') {
  const id = Number(texto);
  if (!/^[1-9]\d*$/.test(texto) || !Number.isSafeInteger(id)) {
    throw new ErrorApi(404, 'NO_EXISTE', mensaje);
  }
  return id;
}

/**
 * Comprueba una ubicación (la de ?ubicacion= al listar, o la de mover).
 * @param {unknown} valor
 * @returns {import('../../compartido/constantes.js').Ubicacion}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerUbicacion(valor) {
  if (!UBICACIONES.includes(valor)) {
    throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, {
      campos: { ubicacion: 'Elige una ubicación.' },
    });
  }
  return valor;
}

/**
 * Comprueba los datos de un producto (crear o editar) con el mismo
 * validador que el formulario.
 * @param {unknown} cuerpo
 * @returns {import('../../compartido/validacion.js').DatosProducto}
 * @throws {ErrorApi} 400 VALIDACION con un error por campo.
 */
export function leerProducto(cuerpo) {
  const resultado = validarProducto(cuerpo);
  if (!resultado.ok) {
    throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, { campos: resultado.errores });
  }
  return resultado.datos;
}

// Un UUID: 8-4-4-4-12 caracteres hexadecimales (lo que da crypto.randomUUID()).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Compruebo la clave de idempotencia (P-06): el UUID que genera el navegador
 * al abrir la pantalla. La comparten "Guardar ticket" y "La he cocinado".
 * @param {unknown} clave
 * @returns {string}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerClave(clave) {
  if (typeof clave !== 'string' || !UUID.test(clave)) {
    throw new ErrorApi(400, 'VALIDACION', 'Falta la clave de la operación. Vuelve a abrir la pantalla.');
  }
  return clave;
}

/**
 * Comprueba el lote del ticket: { clave, productos: [...] }, entre 1 y 100.
 * La `clave` es el UUID de idempotencia (P-06). Valido TODOS los productos
 * antes de guardar nada, y los errores van con la posición del producto
 * ("productos.2.cantidad") para marcar la línea que falla.
 * @param {unknown} cuerpo
 * @returns {{ clave: string, lista: import('../../compartido/validacion.js').DatosProducto[] }}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerLote(cuerpo) {
  const clave = leerClave(cuerpo?.clave);
  const productos = cuerpo?.productos;
  if (!Array.isArray(productos) || productos.length === 0) {
    throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, {
      campos: { productos: 'No hay ningún producto que guardar.' },
    });
  }
  if (productos.length > MAX_PRODUCTOS_TICKET) {
    throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, {
      campos: { productos: `Como mucho ${MAX_PRODUCTOS_TICKET} productos de una vez.` },
    });
  }

  const lista = [];
  /** @type {Record<string, string>} */
  const campos = {};
  for (const [posicion, producto] of productos.entries()) {
    const resultado = validarProducto(producto);
    if (resultado.ok) {
      lista.push(resultado.datos);
    } else {
      for (const [campo, mensaje] of Object.entries(resultado.errores)) {
        campos[`productos.${posicion}.${campo}`] = mensaje;
      }
    }
  }

  if (Object.keys(campos).length > 0) {
    throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, { campos });
  }
  return { clave, lista };
}

/**
 * El texto para sugerir nombres (?q=). Con menos de 2 letras saldría casi
 * todo, así que no merece la pena preguntar.
 * @param {unknown} valor
 * @returns {string}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerBusqueda(valor) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (texto.length < 2 || texto.length > MAX_LONGITUD_NOMBRE) {
    throw new ErrorApi(400, 'VALIDACION', REVISA_CAMPOS, {
      campos: { q: `Escribe entre 2 y ${MAX_LONGITUD_NOMBRE} letras.` },
    });
  }
  return texto;
}
