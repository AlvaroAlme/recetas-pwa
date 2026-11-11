/**
 * @file Idempotencia (P-06): si el móvil repite una operación porque se cortó
 * la red DESPUÉS de guardarla, devuelvo la respuesta de la primera vez y no
 * la aplico otra vez. La uso en "Guardar ticket" y, en la fase 6, en "La he cocinado".
 */
import { pool } from '../bd/pool.js';
import { ErrorApi } from '../errores.js';

/**
 * Hago `trabajo` solo si la clave es nueva. Va DENTRO de una transacción:
 * si el trabajo falla, el ROLLBACK borra también la clave y se puede reintentar.
 * @template T
 * @param {import('pg').PoolClient} cliente La conexión de la transacción.
 * @param {string} clave UUID que genera el navegador al abrir la pantalla.
 * @param {number} usuarioId
 * @param {() => Promise<T>} trabajo
 * @returns {Promise<T>} Lo que devuelva `trabajo`, o lo que devolvió la primera vez.
 * @throws {ErrorApi} 409 CLAVE_USADA si la clave es de otra persona.
 */
export async function conClave(cliente, clave, usuarioId, trabajo) {
  // Reservo la clave lo PRIMERO. Si otra petición con la misma clave está a
  // medias, PostgreSQL me hace esperar a que termine: nunca se aplican las dos.
  const { rows } = await cliente.query(
    `INSERT INTO operaciones (clave, usuario_id, respuesta) VALUES ($1, $2, '{}')
     ON CONFLICT (clave) DO NOTHING
     RETURNING clave`,
    [clave, usuarioId]
  );

  if (rows.length === 0) {
    // Ya la hice: devuelvo lo que contesté entonces (solo si la clave es mía).
    const guardada = await cliente.query(
      'SELECT respuesta FROM operaciones WHERE clave = $1 AND usuario_id = $2',
      [clave, usuarioId]
    );
    if (guardada.rows.length === 0) {
      throw new ErrorApi(409, 'CLAVE_USADA', 'Esta operación ya no se puede repetir. Vuelve a abrir la pantalla.');
    }
    return guardada.rows[0].respuesta;
  }

  const respuesta = await trabajo();
  await cliente.query('UPDATE operaciones SET respuesta = $2 WHERE clave = $1', [clave, JSON.stringify(respuesta)]);
  return respuesta;
}

/** Borro las claves de más de 7 días (§9): nadie reintenta tan tarde. */
export async function borrarAntiguas() {
  await pool.query('DELETE FROM operaciones WHERE created_at < now() - make_interval(days => 7)');
}