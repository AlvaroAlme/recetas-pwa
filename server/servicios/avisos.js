/**
 * @file Envío de los avisos, a todos los dispositivos de la casa:
 * - de los tuppers (§7.2): el día anterior a su fecha límite a las 10:00;
 * - del plan (§7.4): la noche anterior, a la hora de Ajustes (21:00 por
 *   defecto), si mañana hay comida o cena planificada.
 * Las horas son las de la casa (su zona horaria).
 */
import { isoATexto } from '../../compartido/fechas.js';
import { textoAviso } from '../../compartido/plan.js';
import { pool } from '../bd/pool.js';
import { crearMensaje, enviarAlHogar } from './push.js';

/**
 * Qué huecos del cuadrante (c, con su hogar h) tienen un aviso del plan
 * que enviar: con receta o plato ("fuera de casa" no avisa), desde la hora
 * del aviso de la víspera hasta la medianoche que empieza ese día (pasada
 * la medianoche, "mañana comes…" ya no tiene sentido). La agenda usa la
 * MISMA condición para saber cuándo mirar.
 */
export const PLAN_CON_AVISO = `NOT c.fuera_de_casa AND (c.receta_id IS NOT NULL OR c.texto_libre IS NOT NULL)
             AND now() < c.fecha::timestamp AT TIME ZONE h.zona_horaria`;

/** Envío todo lo que ya toca: tuppers y plan. Devuelvo cuántos avisos han llegado. */
export async function enviarPendientes() {
  return (await enviarTuppers()) + (await enviarPlan());
}

/**
 * Reclama los avisos de tuppers que ya tocan y los envía. Devuelve cuántos han llegado.
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
async function enviarTuppers() {
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

/**
 * El aviso del plan (§7.4): "Mañana comes lentejas y cenas tortilla".
 * Reclamo cada (hogar, día) con INSERT … ON CONFLICT DO NOTHING ANTES de
 * enviar: si dos pings coinciden, solo uno se lo queda, y no llega dos
 * veces. Como con los tuppers, "como mucho una vez".
 * @returns {Promise<number>} Cuántos avisos han llegado.
 */
async function enviarPlan() {
  // pendientes: los días que ya tocan. reclamados: los que me quedo yo (los
  // que ya estaban en avisos_plan_enviados no salen). Luego, sus platos.
  const { rows } = await pool.query(
    `WITH pendientes AS (
       SELECT DISTINCT c.hogar_id, c.fecha
         FROM cuadrante c
         JOIN hogares h ON h.id = c.hogar_id
        WHERE ${PLAN_CON_AVISO}
          AND now() >= ((c.fecha - 1) + h.hora_aviso_plan) AT TIME ZONE h.zona_horaria
     ), reclamados AS (
       INSERT INTO avisos_plan_enviados (hogar_id, fecha)
       SELECT hogar_id, fecha FROM pendientes
       ON CONFLICT DO NOTHING
       RETURNING hogar_id, fecha
     )
     SELECT r.hogar_id, r.fecha::text AS fecha, c.tipo_comida, COALESCE(rec.nombre, c.texto_libre) AS plato
       FROM reclamados r
       JOIN cuadrante c ON c.hogar_id = r.hogar_id AND c.fecha = r.fecha
       LEFT JOIN recetas rec ON rec.id = c.receta_id
      WHERE NOT c.fuera_de_casa AND (c.receta_id IS NOT NULL OR c.texto_libre IS NOT NULL)`
  );

  // Junto la comida y la cena de cada hogar y día en un solo aviso.
  /** @type {Map<string, { hogarId: number, fecha: string, comida: string | null, cena: string | null }>} */
  const dias = new Map();
  for (const fila of rows) {
    const clave = `${fila.hogar_id}/${fila.fecha}`;
    if (!dias.has(clave)) dias.set(clave, { hogarId: Number(fila.hogar_id), fecha: fila.fecha, comida: null, cena: null });
    dias.get(clave)[fila.tipo_comida] = fila.plato;
  }

  let enviados = 0;
  for (const { hogarId, fecha, comida, cena } of dias.values()) {
    const mensaje = crearMensaje({
      titulo: textoAviso(comida, cena),
      cuerpo: '¿Tienes todos los ingredientes? Toca para comprobarlo.',
      ruta: `/plan/${fecha}`,
      etiqueta: `plan-${fecha}`,
    });
    enviados += await enviarAlHogar(hogarId, mensaje);
  }
  return enviados;
}
