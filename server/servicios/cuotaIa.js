/**
 * @file Cuotas diarias de IA y una sola petición de IA a la vez por persona
 * (SEC-02). Hay dos cuotas en la misma fila de `uso_ia`: la del ticket
 * (`llamadas`, D-15) y la del chat (`mensajes_chat`, D-51). El "hoy" de la
 * cuota es el de la zona horaria del hogar.
 */
import { CUOTA_CHAT_DIARIA, CUOTA_IA_DIARIA } from '../../compartido/constantes.js';
import { pool } from '../bd/pool.js';
import { ErrorApi } from '../errores.js';

// Quién tiene ahora mismo una petición de IA en marcha (ticket O chat). En
// memoria, como la agenda (D-14): en Render hay un solo proceso.
const enCurso = new Set();

// "Hoy" en la zona horaria del hogar ($2). Lo comparten todas las consultas.
const HOY_DEL_HOGAR = '(SELECT (now() AT TIME ZONE zona_horaria)::date FROM hogares WHERE id = $2)';

/**
 * Las dos cuotas. La columna va DENTRO del SQL (no se puede pasar como $1),
 * así que solo acepto estas dos, escritas por mí: nunca algo que llegue de fuera.
 */
const CUOTAS = Object.freeze({
  ticket: {
    columna: 'llamadas',
    limite: CUOTA_IA_DIARIA,
    agotada: `Has usado la IA ${CUOTA_IA_DIARIA} veces hoy, el máximo. Mañana podrás seguir.`,
    enCurso: 'Ya hay una lectura en marcha. Espera a que termine.',
  },
  chat: {
    columna: 'mensajes_chat',
    limite: CUOTA_CHAT_DIARIA,
    agotada: `Has usado los ${CUOTA_CHAT_DIARIA} mensajes de hoy. Mañana podrás seguir.`,
    enCurso: 'El ayudante aún está respondiendo. Espera a que termine.',
  },
});

/**
 * Lo que lleva hoy la persona de cada cuota (para /api/yo y el chat).
 * @param {number} usuarioId
 * @param {number} hogarId
 * @returns {Promise<{ llamadas: number, mensajesChat: number }>}
 */
export async function usoDeHoy(usuarioId, hogarId) {
  const { rows } = await pool.query(
    `SELECT llamadas, mensajes_chat FROM uso_ia WHERE usuario_id = $1 AND fecha = ${HOY_DEL_HOGAR}`,
    [usuarioId, hogarId]
  );
  return { llamadas: rows[0]?.llamadas ?? 0, mensajesChat: rows[0]?.mensajes_chat ?? 0 };
}

/**
 * Hago una tarea de IA gastando una unidad de una cuota de hoy:
 * 1. Si la persona ya tiene una en marcha, 429 (y no la cuento).
 * 2. La cuento ANTES de llamar a Claude; si no queda, 429.
 * 3. Si la tarea falla con un error reintentable, la devuelvo (D-47).
 * @template T
 * @param {'ticket' | 'chat'} cual
 * @param {number} usuarioId
 * @param {number} hogarId
 * @param {(usadas: number) => Promise<T>} tarea Recibe cuántas lleva hoy, contando esta.
 * @returns {Promise<T>}
 */
async function conCuota(cual, usuarioId, hogarId, tarea) {
  const { columna, limite, agotada, enCurso: mensajeEnCurso } = CUOTAS[cual];
  if (enCurso.has(usuarioId)) {
    throw new ErrorApi(429, 'IA_EN_CURSO', mensajeEnCurso);
  }
  enCurso.add(usuarioId);
  try {
    // Sumo y compruebo el límite en una sola sentencia: dos peticiones a la
    // vez no pueden pasarse de la cuota (§5.2). 0 filas = cuota agotada.
    // `llamadas` no tiene DEFAULT: si la fila nueva es del chat, la pongo a 0.
    const insertar =
      columna === 'llamadas'
        ? `(usuario_id, fecha, llamadas) VALUES ($1, ${HOY_DEL_HOGAR}, 1)`
        : `(usuario_id, fecha, llamadas, ${columna}) VALUES ($1, ${HOY_DEL_HOGAR}, 0, 1)`;
    const { rows } = await pool.query(
      `INSERT INTO uso_ia ${insertar}
       ON CONFLICT (usuario_id, fecha) DO UPDATE SET ${columna} = uso_ia.${columna} + 1
         WHERE uso_ia.${columna} < $3
       RETURNING to_char(fecha, 'YYYY-MM-DD') AS fecha, ${columna} AS usadas`,
      [usuarioId, hogarId, limite]
    );
    if (rows.length === 0) {
      throw new ErrorApi(429, 'CUOTA_IA', agotada);
    }

    try {
      return await tarea(rows[0].usadas);
    } catch (error) {
      // La devuelvo al MISMO día que la conté (por si ha pasado la medianoche).
      if (error.reintentable) {
        await pool.query(
          `UPDATE uso_ia SET ${columna} = ${columna} - 1 WHERE usuario_id = $1 AND fecha = $2 AND ${columna} > 0`,
          [usuarioId, rows[0].fecha]
        );
      }
      throw error;
    }
  } finally {
    enCurso.delete(usuarioId);
  }
}

/**
 * Leer un ticket gastando una llamada de la cuota del ticket (D-15).
 * @template T
 * @param {number} usuarioId
 * @param {number} hogarId
 * @param {() => Promise<T>} tarea
 * @returns {Promise<T>}
 */
export function conCuotaIa(usuarioId, hogarId, tarea) {
  return conCuota('ticket', usuarioId, hogarId, tarea);
}

/**
 * Un mensaje del chat gastando uno de los 30 del día (D-51).
 * @template T
 * @param {number} usuarioId
 * @param {number} hogarId
 * @param {(usadas: number) => Promise<T>} tarea
 * @returns {Promise<T>}
 */
export function conCuotaChat(usuarioId, hogarId, tarea) {
  return conCuota('chat', usuarioId, hogarId, tarea);
}
