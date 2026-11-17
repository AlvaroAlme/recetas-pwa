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
import { PLAN_CON_AVISO } from './servicios/avisos.js';

/** Instante (ms) del próximo aviso, o null si no hay nada pendiente. */
let proximaRevision = null;

/**
 * Busca el próximo aviso pendiente y lo apunto: el de un tupper (§7.2) o el
 * del plan de mañana (§7.4), el que llegue antes. Son las mismas condiciones
 * que usa avisos.js para reclamarlos: si no coincidieran, la agenda podría
 * apuntar a un aviso que nunca se envía y miraría la base de datos en cada ping.
 *
 * Si la consulta falla, apunto "ahora": prefiero mirar en el siguiente
 * ping a quedarme sin avisar.
 * @returns {Promise<void>}
 */
export async function recalcular() {
  try {
    // least() se salta los NULL: si una de las dos no tiene nada, vale la otra.
    const { rows } = await pool.query(
      `SELECT least(
         (SELECT min(((t.fecha_limite - 1) + time '10:00') AT TIME ZONE h.zona_horaria)
            FROM tuppers t
            JOIN hogares h ON h.id = t.hogar_id
           WHERE NOT t.consumido AND t.aviso_enviado_en IS NULL
             AND t.fecha_limite >= (now() AT TIME ZONE h.zona_horaria)::date),
         (SELECT min(((c.fecha - 1) + h.hora_aviso_plan) AT TIME ZONE h.zona_horaria)
            FROM cuadrante c
            JOIN hogares h ON h.id = c.hogar_id
           WHERE ${PLAN_CON_AVISO}
             AND NOT EXISTS (SELECT 1 FROM avisos_plan_enviados a WHERE a.hogar_id = c.hogar_id AND a.fecha = c.fecha))
       ) AS proximo`
    );
    proximaRevision = rows[0].proximo ? rows[0].proximo.getTime() : null;
  } catch (error) {
    logError('No se ha podido recalcular la agenda', error);
    proximaRevision = Date.now();
  }
}

/**
 * ¿Toca mirar la base de datos para enviar avisos? Esto NO la toca.
 * @param {number} [ahora] Para las pruebas.
 * @returns {boolean}
 */
export function tocaRevisar(ahora = Date.now()) {
  return proximaRevision !== null && ahora >= proximaRevision;
}

/** Hora (UTC) de la limpieza diaria: de madrugada en España (D-51). */
const HORA_LIMPIEZA_UTC = 4;

/**
 * La próxima vez que toca limpiar: hoy a las 04:00 UTC si aún no han
 * pasado, y si no, mañana.
 * @param {number} ahora ms
 * @returns {number} ms
 */
export function siguienteLimpieza(ahora) {
  const fecha = new Date(ahora);
  const hoy = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate(), HORA_LIMPIEZA_UTC);
  return hoy > ahora ? hoy : hoy + 24 * 60 * 60 * 1000;
}

/** Instante (ms) de la próxima limpieza. Al arrancar limpia index.js. */
let proximaLimpieza = siguienteLimpieza(Date.now());

/**
 * ¿Toca la limpieza diaria? Esto NO toca la base de datos.
 * @param {number} [ahora]
 * @returns {boolean}
 */
export function tocaLimpiar(ahora = Date.now()) {
  return ahora >= proximaLimpieza;
}

/**
 * Apunto que ya he limpiado: la siguiente, mañana a la misma hora.
 * @param {number} [ahora]
 */
export function limpiezaHecha(ahora = Date.now()) {
  proximaLimpieza = siguienteLimpieza(ahora);
}
