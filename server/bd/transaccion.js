/**
 * @file Transacciones: o se guarda todo, o no se guarda nada.
 *
 * Para que BEGIN, las consultas y COMMIT formen una transacción tienen que ir
 * por la MISMA conexión. Aquí cojo una conexión del grupo solo para el
 * trabajo, la uso y la devuelvo. Así nadie tiene que acordarse de hacerlo bien.
 */
import { pool } from './pool.js';

/**
 * Hace `trabajo` dentro de una transacción. Si todo va bien, guarda los
 * cambios (COMMIT). Si algo falla, los deshace todos (ROLLBACK) y vuelve a
 * lanzar el error para que lo trate quien me llamó.
 *
 * Ejemplo:
 *   await conTransaccion(async (cliente) => {
 *     await cliente.query('INSERT …', [...]);
 *     await cliente.query('UPDATE …', [...]);
 *   });
 *
 * @template T
 * @param {(cliente: import('pg').PoolClient) => Promise<T>} trabajo Función que
 *   recibe la conexión y hace las consultas. Tiene que usar ESE `cliente`, no `pool`.
 * @returns {Promise<T>} Lo que devuelva `trabajo`.
 */
export async function conTransaccion(trabajo) {
  const cliente = await pool.connect();
  // Si ni siquiera puedo hacer ROLLBACK, la conexión está rota: no la devuelvo al grupo.
  let rota = false;
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch {
      rota = true;
    }
    throw error;
  } finally {
    // Devuelvo la conexión al grupo. Con `true` el grupo la cierra en vez de reutilizarla.
    cliente.release(rota);
  }
}