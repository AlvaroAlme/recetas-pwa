/**
 * @file La limpieza diaria (D-51): borro lo que ya no sirve. La agenda la
 * lanza una vez al día (a las 04:00 UTC) y index.js al arrancar.
 *
 * Antes (fases 5 a 7) solo limpiaba cuando tocaba un aviso, así que una casa
 * sin tuppers ni plan no limpiaba nunca.
 */
import { pool } from '../bd/pool.js';
import * as conversaciones from './conversaciones.js';
import * as operaciones from './operaciones.js';
import * as plan from './plan.js';
import * as recuperacion from './recuperacion.js';

/** Días que guardo la cuota de cada día: luego no la mira nadie. */
const DIAS_USO_IA = 30;

/**
 * Borro, cada cosa en su consulta (si una falla, la siguiente se intenta en
 * la próxima limpieza):
 * - las claves de idempotencia de más de 7 días (operaciones);
 * - los huecos del cuadrante de hace más de un año y los avisos del plan
 *   enviados hace más de 7 días (plan);
 * - las conversaciones del chat sin mensajes desde hace más de 30 días;
 * - la cuota de IA de hace más de 30 días;
 * - los enlaces por correo caducados hace más de 7 días (D-53).
 */
export async function limpiar() {
  await operaciones.borrarAntiguas();
  await plan.borrarAntiguos();
  await conversaciones.borrarAntiguas();
  await pool.query('DELETE FROM uso_ia WHERE fecha < current_date - $1::int', [DIAS_USO_IA]);
  await recuperacion.borrarAntiguos();
}
