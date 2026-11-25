/**
 * @file Recetario del hogar: tablas `recetas` y `receta_ingredientes`
 * (lib/recetas.ts de la app Expo, sin la parte de la IA, D-48).
 *
 * Como en inventario.js, TODAS las funciones reciben el hogar y filtran por
 * él: un hogar nunca ve ni toca las recetas de otro (D-03).
 * Los pasos se guardan juntos en `instrucciones`, uno por línea.
 */
import { pool } from '../bd/pool.js';
import { conTransaccion } from '../bd/transaccion.js';
import { redondear } from '../../compartido/cocina.js';
import { cruzaUmbral } from '../../compartido/lista.js';
import { ErrorApi } from '../errores.js';
import * as lista from './lista.js';
import { conClave } from './operaciones.js';

/** @typedef {import('../../compartido/validacion.js').DatosReceta} DatosReceta */

/**
 * Las recetas del hogar, de la más nueva a la más antigua.
 * @param {number} hogarId
 * @returns {Promise<{ id: number, nombre: string, raciones: number | null, createdAt: Date }[]>}
 */
export async function listarRecetas(hogarId) {
  const { rows } = await pool.query(
    'SELECT id, nombre, raciones, created_at FROM recetas WHERE hogar_id = $1 ORDER BY created_at DESC',
    [hogarId]
  );
  return rows.map((fila) => ({ id: Number(fila.id), nombre: fila.nombre, raciones: fila.raciones, createdAt: fila.created_at }));
}

/**
 * Una receta con sus ingredientes y sus pasos, o null si no existe o es de otro hogar.
 * @param {number} hogarId
 * @param {number} id
 * @returns {Promise<(DatosReceta & { id: number }) | null>}
 */
export async function obtenerReceta(hogarId, id) {
  const { rows } = await pool.query(
    'SELECT id, nombre, raciones, instrucciones FROM recetas WHERE hogar_id = $1 AND id = $2',
    [hogarId, id]
  );
  if (rows.length === 0) return null;

  // Ya sé que la receta es de este hogar: sus ingredientes los busco solo por receta.
  const { rows: ingredientes } = await pool.query(
    'SELECT nombre, cantidad, unidad FROM receta_ingredientes WHERE receta_id = $1 ORDER BY id',
    [id]
  );
  const [receta] = rows;
  return {
    id: Number(receta.id),
    nombre: receta.nombre,
    raciones: receta.raciones,
    ingredientes: ingredientes.map((fila) => ({ nombre: fila.nombre, cantidad: Number(fila.cantidad), unidad: fila.unidad })),
    pasos: receta.instrucciones.split('\n'),
  };
}

/**
 * Las recetas más recientes CON sus ingredientes (sin los pasos), para la
 * herramienta leer_recetas del chat (D-51), y cuántas tiene la casa en total.
 * Todo en UNA consulta: json_agg junta los ingredientes de cada receta en
 * una lista, y count(*) OVER () cuenta todas antes de aplicar el LIMIT.
 * @param {number} hogarId
 * @param {number} limite
 * @returns {Promise<{ recetas: { id: number, nombre: string, raciones: number | null, ingredientes: { nombre: string, cantidad: number, unidad: string }[] }[], total: number }>}
 */
export async function listarRecetasConIngredientes(hogarId, limite) {
  const { rows } = await pool.query(
    `SELECT r.id, r.nombre, r.raciones, count(*) OVER () AS total,
            (SELECT json_agg(json_build_object('nombre', i.nombre, 'cantidad', i.cantidad, 'unidad', i.unidad) ORDER BY i.id)
               FROM receta_ingredientes i WHERE i.receta_id = r.id) AS ingredientes
       FROM recetas r
      WHERE r.hogar_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2`,
    [hogarId, limite]
  );
  return {
    recetas: rows.map((fila) => ({
      id: Number(fila.id),
      nombre: fila.nombre,
      raciones: fila.raciones,
      // En JSON, NUMERIC llega como número; lo paso por Number() por si acaso.
      ingredientes: (fila.ingredientes ?? []).map((i) => ({ nombre: i.nombre, cantidad: Number(i.cantidad), unidad: i.unidad })),
    })),
    total: rows.length > 0 ? Number(rows[0].total) : 0,
  };
}

/**
 * Los nombres de unas recetas DE ESTA CASA (las que no son suyas no salen).
 * Para comprobar los recetaId que propone el chat.
 * @param {number} hogarId
 * @param {number[]} ids
 * @param {import('pg').Pool | import('pg').PoolClient} [cliente]
 * @returns {Promise<Map<number, string>>} id → nombre.
 */
export async function nombresDeRecetas(hogarId, ids, cliente = pool) {
  if (ids.length === 0) return new Map();
  const { rows } = await cliente.query('SELECT id, nombre FROM recetas WHERE hogar_id = $1 AND id = ANY($2::bigint[])', [hogarId, ids]);
  return new Map(rows.map((fila) => [Number(fila.id), fila.nombre]));
}

/**
 * Inserto los ingredientes de una receta en UNA sola consulta, en el orden
 * de la lista. Va dentro de la transacción de quien me llama.
 * @param {import('pg').PoolClient} cliente
 * @param {number} recetaId
 * @param {DatosReceta['ingredientes']} ingredientes
 */
async function insertarIngredientes(cliente, recetaId, ingredientes) {
  await cliente.query(
    `INSERT INTO receta_ingredientes (receta_id, nombre, cantidad, unidad)
     SELECT $1, nombre, cantidad, unidad
       FROM unnest($2::text[], $3::numeric[], $4::text[]) WITH ORDINALITY AS i(nombre, cantidad, unidad, orden)
      ORDER BY orden`,
    [
      recetaId,
      ingredientes.map((ingrediente) => ingrediente.nombre),
      ingredientes.map((ingrediente) => ingrediente.cantidad),
      ingredientes.map((ingrediente) => ingrediente.unidad),
    ]
  );
}

/**
 * Creo una receta con sus ingredientes: o todo, o nada.
 * @param {number} hogarId
 * @param {DatosReceta} datos
 * @returns {Promise<number>} El id de la receta nueva.
 */
export async function crearReceta(hogarId, datos) {
  return conTransaccion((cliente) => insertarReceta(cliente, hogarId, datos));
}

/**
 * Lo mismo que crearReceta(), pero dentro de una transacción que ya tiene
 * quien me llama: la de guardar una tarjeta del chat (D-51), que en la misma
 * TX marca la tarjeta como guardada.
 * @param {import('pg').PoolClient} cliente
 * @param {number} hogarId
 * @param {DatosReceta} datos
 * @returns {Promise<number>} El id de la receta nueva.
 */
export async function insertarReceta(cliente, hogarId, { nombre, raciones, ingredientes, pasos }) {
  const { rows } = await cliente.query(
    'INSERT INTO recetas (hogar_id, nombre, raciones, instrucciones) VALUES ($1, $2, $3, $4) RETURNING id',
    [hogarId, nombre, raciones, pasos.join('\n')]
  );
  const id = Number(rows[0].id);
  await insertarIngredientes(cliente, id, ingredientes);
  return id;
}

/**
 * Cambio una receta: sus datos y TODOS sus ingredientes (borro los que
 * tenía y meto los del formulario). O todo, o nada.
 * @param {number} hogarId
 * @param {number} id
 * @param {DatosReceta} datos
 * @returns {Promise<boolean>} false si no existe o es de otro hogar.
 */
export async function actualizarReceta(hogarId, id, { nombre, raciones, ingredientes, pasos }) {
  return conTransaccion(async (cliente) => {
    const { rowCount } = await cliente.query(
      'UPDATE recetas SET nombre = $3, raciones = $4, instrucciones = $5 WHERE hogar_id = $1 AND id = $2',
      [hogarId, id, nombre, raciones, pasos.join('\n')]
    );
    if (rowCount === 0) return false;
    await cliente.query('DELETE FROM receta_ingredientes WHERE receta_id = $1', [id]);
    await insertarIngredientes(cliente, id, ingredientes);
    return true;
  });
}

/**
 * Borro una receta. ON DELETE CASCADE se lleva sus ingredientes.
 * @param {number} hogarId
 * @param {number} id
 * @returns {Promise<boolean>} false si no existe o es de otro hogar.
 */
export async function borrarReceta(hogarId, id) {
  const { rowCount } = await pool.query('DELETE FROM recetas WHERE hogar_id = $1 AND id = $2', [hogarId, id]);
  return rowCount > 0;
}

/**
 * "La he cocinado" (P-07, P-06): descuento los productos y marco los tuppers
 * como consumidos en UNA transacción. Si otra persona del hogar ha gastado
 * algo mientras tanto y ya no llega, no recorto en silencio: 409 y la persona
 * decide. Repetir la misma clave no descuenta dos veces.
 * @param {number} hogarId
 * @param {number} usuarioId
 * @param {string} clave
 * @param {{ productoId: number, cantidad: number }[]} descuentos En la unidad del producto.
 * @param {number[]} tuppersConsumidos
 * @returns {Promise<{ agotados: string[] }>} Los productos que se han acabado.
 */
export async function cocinar(hogarId, usuarioId, clave, descuentos, tuppersConsumidos) {
  // Dos ingredientes pueden salir del mismo producto (sal en la masa y en la
  // salsa): los sumo, o el segundo UPDATE pisaría al primero.
  const porProducto = new Map();
  for (const { productoId, cantidad } of descuentos) {
    porProducto.set(productoId, redondear((porProducto.get(productoId) ?? 0) + cantidad));
  }
  const ids = [...porProducto.keys()];

  return conTransaccion((cliente) =>
    conClave(cliente, clave, usuarioId, async () => {
      // Bloqueo las filas hasta el COMMIT, siempre en el mismo orden (ORDER BY
      // id): dos personas cocinando a la vez nunca se esperan en círculo.
      const { rows } = await cliente.query(
        `SELECT id, nombre, cantidad, unidad, cantidad_inicial FROM productos
          WHERE hogar_id = $1 AND id = ANY($2::bigint[]) AND NOT agotado
          ORDER BY id
          FOR UPDATE`,
        [hogarId, ids]
      );

      // ¿Falta alguno (borrado, agotado o de otra casa) o ya no llega?
      const haCambiado =
        rows.length !== ids.length || rows.some((fila) => porProducto.get(Number(fila.id)) > Number(fila.cantidad));
      if (haCambiado) {
        throw new ErrorApi(409, 'INVENTARIO_CAMBIADO', 'El inventario ha cambiado: alguien ha gastado algo mientras tanto. Revisa las cantidades.');
      }

      const agotados = [];
      for (const fila of rows) {
        const restante = redondear(Number(fila.cantidad) - porProducto.get(Number(fila.id)));
        await cliente.query('UPDATE productos SET cantidad = $1::numeric, agotado = ($1::numeric = 0) WHERE id = $2', [restante, fila.id]);
        if (restante === 0) agotados.push(fila.nombre);
        // Si con esto se está acabando (10 %, o 1 unidad), a la lista de la compra (D-54).
        const referencia = fila.cantidad_inicial === null ? null : Number(fila.cantidad_inicial);
        if (cruzaUmbral(Number(fila.cantidad), restante, referencia, fila.unidad)) {
          await lista.anadirSola(cliente, hogarId, usuarioId, { nombre: fila.nombre, cantidad: referencia, unidad: fila.unidad });
        }
      }

      if (tuppersConsumidos.length > 0) {
        await cliente.query('UPDATE tuppers SET consumido = true WHERE hogar_id = $1 AND id = ANY($2::bigint[])', [hogarId, tuppersConsumidos]);
      }
      return { agotados };
    })
  );
}