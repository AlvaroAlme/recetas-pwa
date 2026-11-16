/**
 * @file Cuadrante por fechas (D-48, D-50): tabla `cuadrante`.
 *
 * Como en el resto de servicios, TODAS las funciones reciben el hogar y
 * filtran por él (D-03). Un hueco sin receta, sin texto y sin "fuera de
 * casa" está VACÍO (por ejemplo, si se borró su receta): no lo devuelvo.
 */
import { pool } from '../bd/pool.js';
import { ErrorApi } from '../errores.js';
import { obtenerReceta } from './recetas.js';

/**
 * @typedef {Object} Hueco
 * @property {string} fecha AAAA-MM-DD
 * @property {import('../../compartido/constantes.js').TipoComida} tipo
 * @property {{ id: number, nombre: string } | null} receta
 * @property {string | null} texto
 * @property {boolean} fueraDeCasa
 * @property {import('../../compartido/constantes.js').GrupoAlimentos | null} grupo
 */

// La fecha la pido como texto (::text): si no, pg me da un Date a medianoche
// en la hora del servidor, y al pasarlo a JSON podría cambiar de día.
const COLUMNAS = `c.fecha::text AS fecha, c.tipo_comida, c.receta_id, r.nombre AS receta_nombre,
                  c.texto_libre, c.fuera_de_casa, c.grupo`;

// Lo que cuenta como hueco con algo.
const NO_VACIO = '(c.receta_id IS NOT NULL OR c.texto_libre IS NOT NULL OR c.fuera_de_casa)';

/**
 * Una fila de la consulta → Hueco.
 * @param {any} fila
 * @returns {Hueco}
 */
function aHueco(fila) {
  return {
    fecha: fila.fecha,
    tipo: fila.tipo_comida,
    receta: fila.receta_id === null ? null : { id: Number(fila.receta_id), nombre: fila.receta_nombre },
    texto: fila.texto_libre,
    fueraDeCasa: fila.fuera_de_casa,
    grupo: fila.grupo,
  };
}

/**
 * Qué día es hoy en la casa, con su zona horaria (el servidor va en UTC).
 * @param {number} hogarId
 * @returns {Promise<string>} AAAA-MM-DD
 */
export async function hoyDelHogar(hogarId) {
  const { rows } = await pool.query('SELECT (now() AT TIME ZONE zona_horaria)::date::text AS hoy FROM hogares WHERE id = $1', [
    hogarId,
  ]);
  return rows[0].hoy;
}

/**
 * Los huecos con algo de una semana, del lunes al domingo.
 * @param {number} hogarId
 * @param {string} lunes
 * @returns {Promise<Hueco[]>}
 */
export async function listarSemana(hogarId, lunes) {
  // Comida antes que cena. Por orden alfabético saldría al revés ('ce' < 'co'):
  // ordeno por "¿es cena?", y false va antes que true.
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS}
       FROM cuadrante c
       LEFT JOIN recetas r ON r.id = c.receta_id
      WHERE c.hogar_id = $1 AND c.fecha BETWEEN $2::date AND $2::date + 6 AND ${NO_VACIO}
      ORDER BY c.fecha, c.tipo_comida = 'cena'`,
    [hogarId, lunes]
  );
  return rows.map(aHueco);
}

/**
 * Los huecos de un día, cada receta COMPLETA (con sus ingredientes): es lo
 * que abre el aviso, para calcular qué tengo y qué me falta (P-15).
 * @param {number} hogarId
 * @param {string} fecha
 * @returns {Promise<(Omit<Hueco, 'receta'> & { receta: Awaited<ReturnType<typeof obtenerReceta>> })[]>}
 */
export async function obtenerDia(hogarId, fecha) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS}
       FROM cuadrante c
       LEFT JOIN recetas r ON r.id = c.receta_id
      WHERE c.hogar_id = $1 AND c.fecha = $2 AND ${NO_VACIO}
      ORDER BY c.tipo_comida = 'cena'`,
    [hogarId, fecha]
  );
  // Como mucho dos huecos (comida y cena): dos consultas más, como mucho.
  return Promise.all(
    rows.map(async (fila) => ({
      ...aHueco(fila),
      receta: fila.receta_id === null ? null : await obtenerReceta(hogarId, Number(fila.receta_id)),
    }))
  );
}

/**
 * Guardo un hueco: si ya tenía algo, lo SUSTITUYO entero (por eso el
 * DO UPDATE pone las cuatro columnas, también las que vienen a null).
 * @param {number} hogarId
 * @param {string} fecha
 * @param {import('../../compartido/constantes.js').TipoComida} tipo
 * @param {import('../../compartido/validacion.js').DatosHueco} datos
 * @returns {Promise<Hueco>}
 * @throws {ErrorApi} 404 NO_EXISTE si la receta no existe o es de otro hogar.
 */
export async function guardarHueco(hogarId, fecha, tipo, { recetaId, texto, fueraDeCasa, grupo }) {
  try {
    // El CTE (WITH) me deja hacer el INSERT y, en la misma consulta, unir
    // la fila guardada con su receta para devolver el nombre.
    const { rows } = await pool.query(
      `WITH c AS (
         INSERT INTO cuadrante (hogar_id, fecha, tipo_comida, receta_id, texto_libre, fuera_de_casa, grupo)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (hogar_id, fecha, tipo_comida) DO UPDATE
           SET receta_id = EXCLUDED.receta_id, texto_libre = EXCLUDED.texto_libre,
               fuera_de_casa = EXCLUDED.fuera_de_casa, grupo = EXCLUDED.grupo
         RETURNING *
       )
       SELECT ${COLUMNAS} FROM c LEFT JOIN recetas r ON r.id = c.receta_id`,
      [hogarId, fecha, tipo, recetaId, texto, fueraDeCasa, grupo]
    );
    return aHueco(rows[0]);
  } catch (error) {
    // 23503 = se ha saltado una FK: la receta no existe o no es de este
    // hogar (la FK compuesta lo comprueba por mí, incluso si alguien la
    // borra justo a la vez). Para quien llama, da igual cuál de las dos.
    if (error.code === '23503') throw new ErrorApi(404, 'NO_EXISTE', 'Esta receta ya no existe.');
    throw error;
  }
}

/**
 * Vacío un hueco. Si ya estaba vacío, no pasa nada (lo que se quería ya es así).
 * @param {number} hogarId
 * @param {string} fecha
 * @param {import('../../compartido/constantes.js').TipoComida} tipo
 */
export async function vaciarHueco(hogarId, fecha, tipo) {
  await pool.query('DELETE FROM cuadrante WHERE hogar_id = $1 AND fecha = $2 AND tipo_comida = $3', [hogarId, fecha, tipo]);
}

/**
 * Limpieza (la hace la tarea de avisos): los huecos de hace más de un año,
 * que ya no se pueden ver (D-50), y los avisos del plan enviados hace más
 * de 7 días, que ya no pueden repetirse. current_date es el día del
 * servidor (UTC): con estos márgenes, un día arriba o abajo da igual.
 */
export async function borrarAntiguos() {
  await pool.query('DELETE FROM cuadrante WHERE fecha < current_date - 366');
  await pool.query('DELETE FROM avisos_plan_enviados WHERE fecha < current_date - 7');
}
