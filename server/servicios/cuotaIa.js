/**
 * @file Cuota diaria de IA (D-15) y una sola petición de IA a la vez por
 * persona (SEC-02). El "hoy" de la cuota es el de la zona horaria del hogar.
 */
import { CUOTA_IA_DIARIA } from '../../compartido/constantes.js';
import { pool } from '../bd/pool.js';
import { ErrorApi } from '../errores.js';

// Quién tiene ahora mismo una petición de IA en marcha. En memoria, como la
// agenda (D-14): en Render hay un solo proceso.
const enCurso = new Set();

// "Hoy" en la zona horaria del hogar ($2). Lo comparten las dos consultas.
const HOY_DEL_HOGAR = '(SELECT (now() AT TIME ZONE zona_horaria)::date FROM hogares WHERE id = $2)';

/**
 * Las llamadas que lleva hoy la persona (para /api/yo).
 * @param {number} usuarioId
 * @param {number} hogarId
 * @returns {Promise<number>}
 */
export async function llamadasDeHoy(usuarioId, hogarId) {
  const { rows } = await pool.query(
    `SELECT llamadas FROM uso_ia WHERE usuario_id = $1 AND fecha = ${HOY_DEL_HOGAR}`,
    [usuarioId, hogarId]
  );
  return rows[0]?.llamadas ?? 0;
}

/**
 * Hago una tarea de IA gastando una llamada de la cuota de hoy:
 * 1. Si la persona ya tiene una en marcha, 429 (y no la cuento).
 * 2. Cuento la llamada ANTES de llamar a Claude; si no queda cuota, 429.
 * 3. Si la tarea falla con un error reintentable, devuelvo la llamada (D-47).
 * @template T
 * @param {number} usuarioId
 * @param {number} hogarId
 * @param {() => Promise<T>} tarea
 * @returns {Promise<T>}
 */
export async function conCuotaIa(usuarioId, hogarId, tarea) {
  if (enCurso.has(usuarioId)) {
    throw new ErrorApi(429, 'IA_EN_CURSO', 'Ya hay una lectura en marcha. Espera a que termine.');
  }
  enCurso.add(usuarioId);
  try {
    // Sumo y compruebo el límite en una sola sentencia: dos peticiones a la
    // vez no pueden pasarse de la cuota (§5.2). 0 filas = cuota agotada.
    const { rows } = await pool.query(
      `INSERT INTO uso_ia (usuario_id, fecha, llamadas) VALUES ($1, ${HOY_DEL_HOGAR}, 1)
       ON CONFLICT (usuario_id, fecha) DO UPDATE SET llamadas = uso_ia.llamadas + 1
         WHERE uso_ia.llamadas < $3
       RETURNING to_char(fecha, 'YYYY-MM-DD') AS fecha`,
      [usuarioId, hogarId, CUOTA_IA_DIARIA]
    );
    if (rows.length === 0) {
      throw new ErrorApi(429, 'CUOTA_IA', `Has usado la IA ${CUOTA_IA_DIARIA} veces hoy, el máximo. Mañana podrás seguir.`);
    }

    try {
      return await tarea();
    } catch (error) {
      // Devuelvo la llamada al MISMO día que la conté (por si ha pasado la medianoche).
      if (error.reintentable) {
        await pool.query(
          'UPDATE uso_ia SET llamadas = llamadas - 1 WHERE usuario_id = $1 AND fecha = $2 AND llamadas > 0',
          [usuarioId, rows[0].fecha]
        );
      }
      throw error;
    }
  } finally {
    enCurso.delete(usuarioId);
  }
}