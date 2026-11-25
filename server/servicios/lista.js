/**
 * @file Acceso a la tabla `lista_compra` (fase 12, D-54).
 *
 * Igual que en tuppers.js: TODAS las funciones reciben el hogar como primer
 * parámetro y filtran por él, y traduzco las columnas a los nombres de la
 * API en un solo sitio: aLinea().
 *
 * nombre_normalizado lo calculo aquí con claveNombre() (PostgreSQL no puede
 * llamar a una función de JavaScript): con él, el índice único no deja
 * tener dos "leche entera" sin tachar en la misma casa, ni "turrón de
 * chocolate" y "turrón chocolate" (claveNombre() quita las palabras vacías).
 */
import { DIAS_LISTA_COMPRADAS, MAX_LINEAS_LISTA } from '../../compartido/constantes.js';
import { claveNombre } from '../../compartido/texto.js';
import { pool } from '../bd/pool.js';
import { ErrorApi } from '../errores.js';

/**
 * Una línea de la lista tal como la devuelve la API.
 * @typedef {Object} LineaLista
 * @property {number} id
 * @property {string} nombre
 * @property {number | null} cantidad
 * @property {import('../../compartido/constantes.js').Unidad | null} unidad
 * @property {'manual' | 'auto'} origen 'auto' = la añadió Vigía (P-30: "Añadida sola").
 * @property {Date} creadaEn
 * @property {Date | null} compradaEn null = sin tachar.
 */

const COLUMNAS = 'id, nombre, cantidad, unidad, origen, creada_en, comprada_en';

/**
 * Convierte una fila de la base de datos en una LineaLista de la API.
 * pg devuelve los NUMERIC como texto ("6.000"): lo paso a número.
 * @param {Record<string, any>} fila
 * @returns {LineaLista}
 */
function aLinea(fila) {
  return {
    id: Number(fila.id),
    nombre: fila.nombre,
    cantidad: fila.cantidad === null ? null : Number(fila.cantidad),
    unidad: fila.unidad,
    origen: fila.origen,
    creadaEn: fila.creada_en,
    compradaEn: fila.comprada_en,
  };
}

/**
 * Toda la lista de la casa: primero lo que falta por comprar (lo último
 * apuntado arriba) y después lo comprado (lo último tachado arriba).
 * @param {number} hogarId
 * @returns {Promise<LineaLista[]>}
 */
export async function listarLista(hogarId) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS}
       FROM lista_compra
      WHERE hogar_id = $1
      ORDER BY comprada_en IS NOT NULL, comprada_en DESC, creada_en DESC, id DESC`,
    [hogarId]
  );
  return rows.map(aLinea);
}

/**
 * Apunto una línea a mano (los datos ya vienen validados). Si ya estaba sin
 * tachar, no la repito: devuelvo la que había con yaEstaba = true.
 * @param {number} hogarId
 * @param {number} usuarioId Quién la apunta.
 * @param {import('../../compartido/validacion.js').DatosLineaLista} datos
 * @returns {Promise<{ linea: LineaLista, yaEstaba: boolean }>}
 * @throws {ErrorApi} 409 LISTA_LLENA si ya hay MAX_LINEAS_LISTA sin tachar.
 */
export async function anadirLinea(hogarId, usuarioId, { nombre, cantidad, unidad }) {
  const nombreNormalizado = claveNombre(nombre);
  const pendiente = await buscarPendiente(hogarId, nombreNormalizado);
  if (pendiente) return { linea: pendiente, yaEstaba: true };

  const { rows: cuenta } = await pool.query(
    'SELECT count(*)::int AS total FROM lista_compra WHERE hogar_id = $1 AND comprada_en IS NULL',
    [hogarId]
  );
  if (cuenta[0].total >= MAX_LINEAS_LISTA) {
    throw new ErrorApi(409, 'LISTA_LLENA', `La lista ya tiene ${MAX_LINEAS_LISTA} cosas por comprar. Tacha o quita alguna.`);
  }

  // ON CONFLICT: si otra persona la ha apuntado justo ahora, entre mi
  // búsqueda y este INSERT, el índice único lo para y no se repite. La
  // condición del WHERE es la del índice parcial (si no, no lo encuentra).
  const { rows } = await pool.query(
    `INSERT INTO lista_compra (hogar_id, nombre, nombre_normalizado, cantidad, unidad, origen, creada_por)
     VALUES ($1, $2, $3, $4, $5, 'manual', $6)
     ON CONFLICT (hogar_id, nombre_normalizado) WHERE comprada_en IS NULL DO NOTHING
     RETURNING ${COLUMNAS}`,
    [hogarId, nombre, nombreNormalizado, cantidad, unidad, usuarioId]
  );
  if (rows.length > 0) return { linea: aLinea(rows[0]), yaEstaba: false };
  return { linea: /** @type {LineaLista} */ (await buscarPendiente(hogarId, nombreNormalizado)), yaEstaba: true };
}

/**
 * La línea SIN TACHAR con esa clave de nombre, o null.
 * @param {number} hogarId
 * @param {string} nombreNormalizado
 * @returns {Promise<LineaLista | null>}
 */
async function buscarPendiente(hogarId, nombreNormalizado) {
  const { rows } = await pool.query(
    `SELECT ${COLUMNAS} FROM lista_compra
      WHERE hogar_id = $1 AND nombre_normalizado = $2 AND comprada_en IS NULL`,
    [hogarId, nombreNormalizado]
  );
  return rows.length > 0 ? aLinea(rows[0]) : null;
}

/**
 * Tacho (comprada = true) o destacho (false) una línea. null si no existe o
 * es de otro hogar.
 *
 * Al destachar puede que ya haya otra igual sin tachar (la ha apuntado otra
 * persona): el índice único no deja tener dos, así que borro la tachada y
 * devuelvo la que ya estaba (D-54). Ojo: entonces el id cambia.
 * @param {number} hogarId
 * @param {number} id
 * @param {boolean} comprada
 * @returns {Promise<LineaLista | null>}
 */
export async function marcarComprada(hogarId, id, comprada) {
  try {
    // COALESCE: si ya estaba tachada, se queda la hora en que se tachó.
    const { rows } = await pool.query(
      `UPDATE lista_compra
          SET comprada_en = ${comprada ? 'COALESCE(comprada_en, now())' : 'NULL'}
        WHERE id = $1 AND hogar_id = $2
        RETURNING ${COLUMNAS}`,
      [id, hogarId]
    );
    return rows.length > 0 ? aLinea(rows[0]) : null;
  } catch (error) {
    // 23505 = se ha saltado el índice único: ya hay otra igual sin tachar.
    if (error.code !== '23505') throw error;
    const { rows } = await pool.query(
      'DELETE FROM lista_compra WHERE id = $1 AND hogar_id = $2 RETURNING nombre_normalizado',
      [id, hogarId]
    );
    if (rows.length === 0) return null;
    return buscarPendiente(hogarId, rows[0].nombre_normalizado);
  }
}

/**
 * Quito una línea. false si no existe o es de otro hogar.
 * @param {number} hogarId
 * @param {number} id
 * @returns {Promise<boolean>}
 */
export async function borrarLinea(hogarId, id) {
  const { rowCount } = await pool.query('DELETE FROM lista_compra WHERE id = $1 AND hogar_id = $2', [id, hogarId]);
  return rowCount > 0;
}

/**
 * "Borrar comprados": quito todas las tachadas de la casa.
 * @param {number} hogarId
 * @returns {Promise<number>} Cuántas he borrado.
 */
export async function borrarComprados(hogarId) {
  const { rowCount } = await pool.query(
    'DELETE FROM lista_compra WHERE hogar_id = $1 AND comprada_en IS NOT NULL',
    [hogarId]
  );
  return rowCount ?? 0;
}

// ============ Lo automático (paso 4 de la fase 12) ============
// Estas funciones reciben el `cliente` de la transacción de quien me llama
// (inventario.js, recetas.js): así la lista cambia en la MISMA transacción
// que el inventario, y si algo falla no se guarda ni lo uno ni lo otro.

/**
 * Han entrado productos en el inventario (a mano o con el ticket): tacho las
 * líneas sin tachar con la misma clave de nombre ("Leche entera" tacha
 * "leche entera" y "Turrón de chocolate" tacha "turrón chocolate", pero
 * no "Leche").
 * @param {import('pg').PoolClient} cliente
 * @param {number} hogarId
 * @param {string[]} nombres Los nombres de los productos que han entrado.
 */
export async function tacharAlEntrar(cliente, hogarId, nombres) {
  // Set: si el ticket trae dos veces "Leche", la busco una sola vez.
  const normalizados = [...new Set(nombres.map(claveNombre))];
  await cliente.query(
    `UPDATE lista_compra SET comprada_en = now()
      WHERE hogar_id = $1 AND comprada_en IS NULL AND nombre_normalizado = ANY($2::text[])`,
    [hogarId, normalizados]
  );
}

/**
 * Un producto se está acabando (cruzaUmbral): lo apunto solo, con lo
 * que se compró la última vez (cantidad_inicial). Si ya está sin tachar, o
 * la lista está llena, no hago nada: no es un error de quien gasta.
 * @param {import('pg').PoolClient} cliente
 * @param {number} hogarId
 * @param {number} usuarioId Quien ha gastado (queda como creada_por).
 * @param {{ nombre: string, cantidad: number, unidad: string }} producto
 */
export async function anadirSola(cliente, hogarId, usuarioId, { nombre, cantidad, unidad }) {
  // INSERT … SELECT … WHERE: solo inserta si la cuenta de pendientes no ha
  // llegado al máximo. Con SELECT, PostgreSQL no sabe de qué tipo es cada $n
  // (en VALUES lo deduce de la columna): por eso los ::bigint, ::text…
  await cliente.query(
    `INSERT INTO lista_compra (hogar_id, nombre, nombre_normalizado, cantidad, unidad, origen, creada_por)
     SELECT $1::bigint, $2::text, $3::text, $4::numeric, $5::text, 'auto', $6::bigint
      WHERE (SELECT count(*) FROM lista_compra WHERE hogar_id = $1 AND comprada_en IS NULL) < $7::int
     ON CONFLICT (hogar_id, nombre_normalizado) WHERE comprada_en IS NULL DO NOTHING`,
    [hogarId, nombre, claveNombre(nombre), cantidad, unidad, usuarioId, MAX_LINEAS_LISTA]
  );
}

/**
 * Limpieza diaria: borro las líneas tachadas hace más de DIAS_LISTA_COMPRADAS.
 */
export async function borrarAntiguas() {
  await pool.query(
    'DELETE FROM lista_compra WHERE comprada_en < now() - make_interval(days => $1)',
    [DIAS_LISTA_COMPRADAS]
  );
}
