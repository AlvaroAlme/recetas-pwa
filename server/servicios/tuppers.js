/**
 * @file Acceso a la tabla `tuppers` (lib/tuppers.ts de la app Expo).
 *
 * Igual que en inventario.js: TODAS las funciones reciben el hogar como
 * primer parámetro y filtran por él, y traduzco las columnas a los nombres
 * de la API en un solo sitio: aTupper().
 */
import { pool } from '../bd/pool.js';

/**
 * Un tupper tal como lo devuelve la API.
 * @typedef {Object} Tupper
 * @property {number} id
 * @property {string} nombre
 * @property {import('../../compartido/constantes.js').Ubicacion} ubicacion
 * @property {Date} fechaAlta
 * @property {number} diasMaximos
 * @property {string} fechaLimite AAAA-MM-DD
 * @property {boolean} consumido
 */

// La fecha límite la pido como texto, por lo mismo que la caducidad de los
// productos: si pg la convierte en Date, en UTC puede cambiar de día.
const COLUMNAS = `
  id, nombre, ubicacion, fecha_alta, dias_maximos,
  to_char(fecha_limite, 'YYYY-MM-DD') AS fecha_limite, consumido`;

/**
 * Convierte una fila de la base de datos en un Tupper de la API.
 * @param {Record<string, any>} fila
 * @returns {Tupper}
 */
function aTupper(fila) {
  return {
    id: Number(fila.id),
    nombre: fila.nombre,
    ubicacion: fila.ubicacion,
    fechaAlta: fila.fecha_alta,
    diasMaximos: fila.dias_maximos,
    fechaLimite: fila.fecha_limite,
    consumido: fila.consumido,
  };
}

/**
 * Tuppers de una ubicación que no se han consumido. Primero los que antes
 * llegan a su límite.
 * @param {number} hogarId
 * @param {import('../../compartido/constantes.js').Ubicacion} ubicacion
 * @returns {Promise<Tupper[]>}
 */
export async function listarTuppers(hogarId, ubicacion) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS}
       FROM tuppers
      WHERE hogar_id = $1 AND ubicacion = $2 AND NOT consumido
      ORDER BY tuppers.fecha_limite, lower(nombre)`,
    [hogarId, ubicacion]
  );
  return rows.map(aTupper);
}

/**
 * Un tupper del hogar, también si ya se ha consumido (la ficha muestra
 * "✓ Consumido"). null si no existe o es de otro hogar.
 * @param {number} hogarId
 * @param {number} id
 * @returns {Promise<Tupper | null>}
 */
export async function obtenerTupper(hogarId, id) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM tuppers WHERE id = $1 AND hogar_id = $2`,
    [id, hogarId]
  );
  return rows.length > 0 ? aTupper(rows[0]) : null;
}

/**
 * Crea un tupper (los datos ya vienen validados).
 *
 * La fecha límite la calcula PostgreSQL: `now() AT TIME ZONE zona` es la
 * hora que marca el reloj en casa; `::date` se queda con el día, y le sumo
 * los días. Si lo hiciera con hoyIso() en Render (UTC), entre las 00:00 y
 * las 01:00 de Madrid saldría el día anterior.
 * @param {number} hogarId
 * @param {import('../../compartido/validacion.js').DatosTupper} datos
 * @returns {Promise<Tupper>}
 */
export async function crearTupper(hogarId, datos) {
  const { rows } = await pool.query(
    `INSERT INTO tuppers (hogar_id, nombre, ubicacion, dias_maximos, fecha_limite)
     SELECT $1, $2, $3, $4, (now() AT TIME ZONE h.zona_horaria)::date + $4::integer
       FROM hogares h
      WHERE h.id = $1
     RETURNING ${COLUMNAS}`,
    [hogarId, datos.nombre, datos.ubicacion, datos.diasMaximos]
  );
  return aTupper(rows[0]);
}

/**
 * Marca un tupper como consumido. Es idempotente: si ya lo estaba (porque
 * otra persona de la casa se adelantó), lo devuelvo igual, sin error.
 * @param {number} hogarId
 * @param {number} id
 * @returns {Promise<Tupper | null>} null si no existe o es de otro hogar.
 */
export async function consumirTupper(hogarId, id) {
  const { rows } = await pool.query(
    `UPDATE tuppers SET consumido = true
      WHERE id = $1 AND hogar_id = $2
      RETURNING ${COLUMNAS}`,
    [id, hogarId]
  );
  return rows.length > 0 ? aTupper(rows[0]) : null;
}

/**
 * ¿Alguien de la casa tiene los avisos activados en algún dispositivo?
 * Si no, la pantalla dice "Tupper guardado sin aviso" (§7.4).
 * @param {number} hogarId
 * @returns {Promise<boolean>}
 */
export async function hayAvisoEnHogar(hogarId) {
  const { rows } = await pool.query(
    `SELECT EXISTS (
       SELECT 1
         FROM suscripciones_push s
         JOIN miembros m ON m.usuario_id = s.usuario_id
        WHERE m.hogar_id = $1
     ) AS hay`,
    [hogarId]
  );
  return rows[0].hay;
}
