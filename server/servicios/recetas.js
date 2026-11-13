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
export async function crearReceta(hogarId, { nombre, raciones, ingredientes, pasos }) {
  return conTransaccion(async (cliente) => {
    const { rows } = await cliente.query(
      'INSERT INTO recetas (hogar_id, nombre, raciones, instrucciones) VALUES ($1, $2, $3, $4) RETURNING id',
      [hogarId, nombre, raciones, pasos.join('\n')]
    );
    const id = Number(rows[0].id);
    await insertarIngredientes(cliente, id, ingredientes);
    return id;
  });
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