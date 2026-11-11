/**
 * @file La agenda de avisos (§7.3, D-14): guardo en memoria CUÁNDO toca el
 * próximo aviso. El ping de cron-job.org llega cada 5 minutos, pero solo
 * miro la base de datos si ya ha llegado esa hora. Así Neon puede dormirse
 * casi todo el día y no gasto las 100 CU-h gratis del mes.
 *
 * Si Render reinicia, la variable se pierde: index.js envía lo pendiente y
 * recalcula al arrancar.
 */
import { pool } from './bd/pool.js';
import { logError } from './log.js';

/** Instante (ms) del próximo aviso, o null si no hay nada pendiente. */
let proximaRevision = null;

/**
 * Busca el próximo aviso pendiente y lo apunto. Es la misma condición que
 * usa avisos.js para reclamarlos: si no coincidieran, la agenda podría
 * apuntar a un aviso que nunca se envía y miraría la base de datos en cada ping.
 *
 * Si la consulta falla, apunto "ahora": prefiero mirar en el siguiente
 * ping a quedarme sin avisar.
 * @returns {Promise<void>}
 */
export async function recalcular() {
  try {
    const { rows } = await pool.query(
      `SELECT min(((t.fecha_limite - 1) + time '10:00') AT TIME ZONE h.zona_horaria) AS proximo
         FROM tuppers t
         JOIN hogares h ON h.id = t.hogar_id
        WHERE NOT t.consumido AND t.aviso_enviado_en IS NULL
          AND t.fecha_limite >= (now() AT TIME ZONE h.zona_horaria)::date`
    );
    proximaRevision = rows[0].proximo ? rows[0].proximo.getTime() : null;
  } catch (error) {
    logError('No se ha podido recalcular la agenda', error);
    proximaRevision = Date.now();
  }
}

/**
 * ¿Toca mirar la base de datos? Esto NO la toca.
 * @param {number} [ahora] Para las pruebas.
 * @returns {boolean}
 */
export function tocaRevisar(ahora = Date.now()) {
  return proximaRevision !== null && ahora >= proximaRevision;
}
