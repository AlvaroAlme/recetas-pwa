/**
 * @file Acceso a la tabla `productos` (lib/inventario.ts de la app Expo).
 *
 * Las rutas no escriben SQL: llaman a estas funciones. TODAS reciben el
 * hogar como primer parámetro y filtran por él: así ninguna consulta puede
 * olvidarse de él y un hogar nunca ve los productos de otro (D-03).
 *
 * Traduzco las columnas de la base de datos (snake_case) a los nombres de la
 * API (camelCase) en un solo sitio: aProducto().
 */
import { pool } from '../bd/pool.js';
import { conTransaccion } from '../bd/transaccion.js';

/**
 * Un producto tal como lo devuelve la API.
 * @typedef {Object} Producto
 * @property {number} id
 * @property {string} nombre
 * @property {number} cantidad
 * @property {import('../../compartido/constantes.js').Unidad} unidad
 * @property {import('../../compartido/constantes.js').Ubicacion} ubicacion
 * @property {Date} fechaAlta
 * @property {string | null} fechaCaducidad AAAA-MM-DD
 * @property {boolean} agotado
 */

/** @typedef {import('../../compartido/validacion.js').DatosProducto} DatosProducto */

// Las columnas que leo siempre. La caducidad la pido ya como texto
// AAAA-MM-DD: si dejo que pg la convierta en Date, la pone a las 00:00 de mi
// zona horaria y en UTC puede cambiar de día.
const COLUMNAS = `
  id, nombre, cantidad, unidad, ubicacion, fecha_alta,
  to_char(fecha_caducidad, 'YYYY-MM-DD') AS fecha_caducidad, agotado`;

/**
 * Convierte una fila de la base de datos en un Producto de la API.
 * pg me da BIGINT y NUMERIC como texto: los paso a número.
 * @param {Record<string, any>} fila
 * @returns {Producto}
 */
function aProducto(fila) {
  return {
    id: Number(fila.id),
    nombre: fila.nombre,
    cantidad: Number(fila.cantidad),
    unidad: fila.unidad,
    ubicacion: fila.ubicacion,
    fechaAlta: fila.fecha_alta,
    fechaCaducidad: fila.fecha_caducidad,
    agotado: fila.agotado,
  };
}

/**
 * Productos de una ubicación que no están agotados. Primero los que caducan
 * antes; los que no tienen caducidad, al final (igual que en Expo).
 * @param {number} hogarId
 * @param {import('../../compartido/constantes.js').Ubicacion} ubicacion
 * @returns {Promise<Producto[]>}
 */
export async function listarProductos(hogarId, ubicacion) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS}
       FROM productos
      WHERE hogar_id = $1 AND ubicacion = $2 AND NOT agotado
      ORDER BY productos.fecha_caducidad ASC NULLS LAST, lower(nombre)`,
    [hogarId, ubicacion]
  );
  return rows.map(aProducto);
}

/**
 * Un producto del hogar, o null si no existe o es de otro hogar.
 * @param {number} hogarId
 * @param {number} id
 * @returns {Promise<Producto | null>}
 */
export async function obtenerProducto(hogarId, id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM productos WHERE id = $1 AND hogar_id = $2`,
    [id, hogarId]
  );
  return rows.length > 0 ? aProducto(rows[0]) : null;
}

/**
 * Crea un producto (los datos ya vienen validados) y lo devuelve.
 * La fecha de alta la pone la base de datos (DEFAULT now()).
 * @param {number} hogarId
 * @param {DatosProducto} datos
 * @returns {Promise<Producto>}
 */
export async function crearProducto(hogarId, datos) {
  const { rows } = await pool.query(
    `INSERT INTO productos (hogar_id, nombre, cantidad, unidad, ubicacion, fecha_caducidad)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLUMNAS}`,
    [hogarId, datos.nombre, datos.cantidad, datos.unidad, datos.ubicacion, datos.fechaCaducidad]
  );
  return aProducto(rows[0]);
}

/**
 * Cambia los 5 campos de un producto (los datos ya vienen validados).
 * Como la cantidad que llega siempre es mayor que 0, el producto deja de
 * estar agotado: si no lo pongo a false, el CHECK de la tabla me lo rechaza.
 * @param {number} hogarId
 * @param {number} id
 * @param {DatosProducto} datos
 * @returns {Promise<Producto | null>} null si no existe o es de otro hogar.
 */
export async function actualizarProducto(hogarId, id, datos) {
  const { rows } = await pool.query(
    `UPDATE productos
        SET nombre = $3, cantidad = $4, unidad = $5, ubicacion = $6,
            fecha_caducidad = $7, agotado = false
      WHERE id = $1 AND hogar_id = $2
      RETURNING ${COLUMNAS}`,
    [id, hogarId, datos.nombre, datos.cantidad, datos.unidad, datos.ubicacion, datos.fechaCaducidad]
  );
  return rows.length > 0 ? aProducto(rows[0]) : null;
}

/**
 * Cambia un producto de sitio (de la nevera al congelador, por ejemplo).
 * @param {number} hogarId
 * @param {number} id
 * @param {import('../../compartido/constantes.js').Ubicacion} ubicacion
 * @returns {Promise<Producto | null>} null si no existe o es de otro hogar.
 */
export async function moverProducto(hogarId, id, ubicacion) {
  const { rows } = await pool.query(
    `UPDATE productos SET ubicacion = $3
      WHERE id = $1 AND hogar_id = $2
      RETURNING ${COLUMNAS}`,
    [id, hogarId, ubicacion]
  );
  return rows.length > 0 ? aProducto(rows[0]) : null;
}

/**
 * Borra un producto del hogar.
 * @param {number} hogarId
 * @param {number} id
 * @returns {Promise<boolean>} true si lo he borrado, false si no existía o era de otro hogar.
 */
export async function borrarProducto(hogarId, id) {
  const { rowCount } = await pool.query(
    'DELETE FROM productos WHERE id = $1 AND hogar_id = $2',
    [id, hogarId]
  );
  return rowCount > 0;
}

/**
 * Crea varios productos a la vez (guardar el ticket). Van todos en una
 * transacción: si uno falla, no se guarda ninguno. Prefiero eso a un ticket
 * guardado a medias que luego no sé qué le falta.
 * @param {number} hogarId
 * @param {DatosProducto[]} lista Ya validados, uno a uno.
 * @returns {Promise<number>} Cuántos he creado.
 */
export async function crearProductos(hogarId, lista) {
  return conTransaccion(async (cliente) => {
    for (const datos of lista) {
      await cliente.query(
        `INSERT INTO productos (hogar_id, nombre, cantidad, unidad, ubicacion, fecha_caducidad)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [hogarId, datos.nombre, datos.cantidad, datos.unidad, datos.ubicacion, datos.fechaCaducidad]
      );
    }
    return lista.length;
  });
}
