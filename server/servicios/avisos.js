/**
 * @file Envío de los avisos de tuppers (§7.2): el día anterior a su fecha
 * límite a las 10:00, hora de la casa, a todos los dispositivos de la casa.
 */
import { isoATexto } from '../../compartido/fechas.js';
import { pool } from '../bd/pool.js';
import { crearMensaje, enviarAlHogar } from './push.js';

/**
 * Reclama los avisos que ya tocan y los envía. Devuelve cuántos han llegado.
 *
 * "Reclamar" = marcar aviso_enviado_en ANTES de enviar, en una sola
 * sentencia atómica. Si dos pings coinciden, cada tupper solo lo reclama
 * uno. Elijo "como mucho una vez": si el envío fallara, ese aviso se pierde
 * (queda en el log) en vez de repetirse cada 5 minutos.
 *
 * `(fecha - 1) + time '10:00'` es "el día anterior a las 10:00" sin zona, y
 * `AT TIME ZONE` lo convierte en el instante real de la casa (el cambio de
 * hora lo resuelve PostgreSQL). Si el tupper ya ha pasado su fecha límite,
 * no aviso: "caduca pronto" ya no sería verdad.
 * @returns {Promise<number>}
 */
export async function enviarPendientes() {
  const { rows } = await pool.query(
    `UPDATE tuppers t SET aviso_enviado_en = now()
       FROM hogares h
      WHERE h.id = t.hogar_id
        AND NOT t.consumido AND t.aviso_enviado_en IS NULL
        AND t.fecha_limite >= (now() AT TIME ZONE h.zona_horaria)::date
        AND now() >= ((t.fecha_limite - 1) + time '10:00') AT TIME ZONE h.zona_horaria
    RETURNING t.id, t.nombre, to_char(t.fecha_limite, 'YYYY-MM-DD') AS fecha_limite, t.hogar_id`
  );

  let enviados = 0;
  for (const tupper of rows) {
    const mensaje = crearMensaje({
      titulo: `Tu tupper de ${tupper.nombre} caduca pronto`,
      cuerpo: `Cómetelo antes del ${isoATexto(tupper.fecha_limite)}. Toca para marcarlo como consumido.`,
      ruta: `/tupper/${tupper.id}`,
      etiqueta: `tupper-${tupper.id}`,
    });
    enviados += await enviarAlHogar(Number(tupper.hogar_id), mensaje);
  }
  return enviados;
}
