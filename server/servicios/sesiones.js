/**
 * @file Sesiones (D-04, D-17). La cookie lleva un token aleatorio y en la
 * tabla sesiones guardo solo su SHA-256: si alguien leyera la base de
 * datos, no podría hacerse pasar por nadie.
 *
 * Aquí basta SHA-256 (no scrypt): el token lo genero yo, es largo y
 * aleatorio, y no se puede adivinar probando como una contraseña.
 */
import { createHash, randomBytes } from 'node:crypto';
import { pool } from '../bd/pool.js';

/** Cuánto dura una sesión: 30 días (D-17). */
export const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * El SHA-256 de un token, en hexadecimal (64 caracteres).
 * @param {string} token
 * @returns {string}
 */
function hashDeToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Lo que la app sabe de quien ha iniciado sesión.
 * @typedef {Object} Sesion
 * @property {{ id: number, email: string, nombre: string, rol: string }} usuario
 * @property {number} hogarId
 */

/**
 * Crea una sesión nueva. Recibe dónde hacer la consulta: el pool, o el
 * cliente de una transacción (el registro la crea dentro de la suya).
 * @param {import('pg').Pool | import('pg').PoolClient} bd
 * @param {number} usuarioId
 * @returns {Promise<{ token: string, caducaEn: Date }>} El token va a la cookie y NUNCA se guarda.
 */
export async function crearSesion(bd, usuarioId) {
  // 32 bytes aleatorios = 256 bits: imposible de adivinar. base64url: sin + ni /, seguro en una cookie.
  const token = randomBytes(32).toString('base64url');
  const caducaEn = new Date(Date.now() + DURACION_SESION_MS);
  // De paso, limpio las sesiones caducadas de esta persona.
  await bd.query('DELETE FROM sesiones WHERE usuario_id = $1 AND caduca_en <= now()', [usuarioId]);
  await bd.query('INSERT INTO sesiones (token_hash, usuario_id, caduca_en) VALUES ($1, $2, $3)', [
    hashDeToken(token),
    usuarioId,
    caducaEn,
  ]);
  return { token, caducaEn };
}

/**
 * La sesión de un token, con su usuario y su hogar. null si no existe o ha caducado.
 * @param {string} token El que llega en la cookie.
 * @returns {Promise<Sesion | null>}
 */
export async function buscarSesion(token) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.nombre, m.rol, m.hogar_id
       FROM sesiones s
       JOIN usuarios u ON u.id = s.usuario_id
       JOIN miembros m ON m.usuario_id = u.id
      WHERE s.token_hash = $1 AND s.caduca_en > now()`,
    [hashDeToken(token)]
  );
  if (rows.length === 0) return null;
  const fila = rows[0];
  return {
    usuario: { id: Number(fila.id), email: fila.email, nombre: fila.nombre, rol: fila.rol },
    hogarId: Number(fila.hogar_id),
  };
}

/**
 * Cierra una sesión (logout). Si ya no existía, no pasa nada.
 * @param {string} token
 */
export async function borrarSesion(token) {
  await pool.query('DELETE FROM sesiones WHERE token_hash = $1', [hashDeToken(token)]);
}