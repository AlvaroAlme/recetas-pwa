/**
 * @file La conversación del chat en la base de datos (D-51): tablas
 * `conversaciones`, `mensajes_chat` y `tarjetas_chat`.
 *
 * Es de la PERSONA (usuario_id), no del hogar: otra persona de la casa no
 * la ve. Los mensajes solo se AÑADEN: nunca edito uno, porque la API exige
 * el historial idéntico para conservar el razonamiento.
 */
import { DIAS_CONVERSACION, MAX_PREGUNTAS_CONVERSACION } from '../../compartido/constantes.js';
import { pool } from '../bd/pool.js';
import { conTransaccion } from '../bd/transaccion.js';
import { ErrorApi } from '../errores.js';

/** Un error nuevo cada vez (cada uno con su traza). */
const conversacionLlena = () =>
  new ErrorApi(409, 'CONVERSACION_LLENA', 'Esta conversación ha llegado al máximo. Empieza una nueva.');

/**
 * Mi conversación, o null si no tengo. Si es de OTRA casa (me he cambiado
 * de hogar), la borro: habla de otro inventario y otro cuadrante.
 * @param {number} usuarioId
 * @param {number} hogarId
 * @returns {Promise<{ id: number, preguntas: number } | null>}
 */
export async function obtenerConversacion(usuarioId, hogarId) {
  const { rows } = await pool.query('SELECT id, hogar_id, preguntas FROM conversaciones WHERE usuario_id = $1', [usuarioId]);
  if (rows.length === 0) return null;
  if (Number(rows[0].hogar_id) !== hogarId) {
    await borrarConversacion(usuarioId);
    return null;
  }
  return { id: Number(rows[0].id), preguntas: rows[0].preguntas };
}

/**
 * ¿Puedo preguntar algo más en esta conversación? Lo miro ANTES de gastar
 * cuota: si está llena, 409 sin llamar a Claude.
 * @param {{ preguntas: number } | null} conversacion
 * @throws {ErrorApi} 409 CONVERSACION_LLENA
 */
export function comprobarHueco(conversacion) {
  if (conversacion && conversacion.preguntas >= MAX_PREGUNTAS_CONVERSACION) throw conversacionLlena();
}

/**
 * Los mensajes de una conversación, en orden, tal cual se guardaron.
 * @param {number} conversacionId
 * @returns {Promise<{ rol: 'user' | 'assistant', contenido: any[] }[]>}
 */
export async function leerMensajes(conversacionId) {
  const { rows } = await pool.query('SELECT rol, contenido FROM mensajes_chat WHERE conversacion_id = $1 ORDER BY id', [
    conversacionId,
  ]);
  return rows;
}

/**
 * El estado de las tarjetas ya decididas (sin fila = pendiente).
 * @param {number} conversacionId
 * @returns {Promise<Map<string, { estado: 'guardada' | 'descartada', resultado: object | null }>>}
 */
export async function leerEstadosTarjetas(conversacionId) {
  const { rows } = await pool.query('SELECT tool_use_id, estado, resultado FROM tarjetas_chat WHERE conversacion_id = $1', [
    conversacionId,
  ]);
  return new Map(rows.map((fila) => [fila.tool_use_id, { estado: fila.estado, resultado: fila.resultado }]));
}

/**
 * Guardo un turno ENTERO (tu pregunta, las vueltas de herramientas y la
 * respuesta) en una transacción: o todo, o nada. Suma 1 a `preguntas`.
 *
 * Lo guardo en la MISMA conversación con la que respondió Claude
 * (`conversacionId`, o null si era la primera pregunta). Si mientras tanto
 * ha cambiado (otra pestaña pulsó "Nueva conversación"), no lo guardo: el
 * turno no tendría sentido sin la conversación de antes.
 * @param {number} usuarioId
 * @param {number} hogarId
 * @param {number | null} conversacionId
 * @param {{ role: 'user' | 'assistant', content: any[] }[]} mensajes Los del turno, en orden.
 * @returns {Promise<{ preguntas: number }>}
 * @throws {ErrorApi} 409 CONVERSACION_LLENA o CONVERSACION_CAMBIADA
 */
export async function guardarTurno(usuarioId, hogarId, conversacionId, mensajes) {
  return conTransaccion(async (cliente) => {
    let rows;
    if (conversacionId === null) {
      // La primera pregunta: creo la conversación. Si ya existe una (otra
      // pestaña ha empezado otra a la vez), ON CONFLICT no devuelve nada.
      ({ rows } = await cliente.query(
        `INSERT INTO conversaciones (usuario_id, hogar_id, preguntas) VALUES ($1, $2, 1)
         ON CONFLICT (usuario_id) DO NOTHING RETURNING id, preguntas`,
        [usuarioId, hogarId]
      ));
    } else {
      // El UPDATE bloquea la fila hasta el COMMIT: nadie más la toca a la vez.
      ({ rows } = await cliente.query(
        `UPDATE conversaciones SET preguntas = preguntas + 1, actualizada_en = now()
          WHERE id = $1 AND usuario_id = $2 AND preguntas < $3
          RETURNING id, preguntas`,
        [conversacionId, usuarioId, MAX_PREGUNTAS_CONVERSACION]
      ));
      if (rows.length === 0) {
        const { rowCount } = await cliente.query('SELECT 1 FROM conversaciones WHERE id = $1', [conversacionId]);
        if (rowCount > 0) throw conversacionLlena();
      }
    }
    if (rows.length === 0) {
      throw new ErrorApi(409, 'CONVERSACION_CAMBIADA', 'La conversación ha cambiado mientras respondía. Vuelve a preguntar.', {
        reintentable: true,
      });
    }
    const id = Number(rows[0].id);

    // Todos los mensajes en UNA consulta y en orden (WITH ORDINALITY, como
    // los ingredientes): el id que les da la base de datos sigue ese orden.
    await cliente.query(
      `INSERT INTO mensajes_chat (conversacion_id, rol, contenido)
       SELECT $1, rol, contenido
         FROM unnest($2::text[], $3::jsonb[]) WITH ORDINALITY AS m(rol, contenido, orden)
        ORDER BY orden`,
      [id, mensajes.map((mensaje) => mensaje.role), mensajes.map((mensaje) => JSON.stringify(mensaje.content))]
    );
    return { preguntas: rows[0].preguntas };
  });
}

/**
 * "Nueva conversación": la borro con todo (CASCADE a mensajes y tarjetas).
 * @param {number} usuarioId
 */
export async function borrarConversacion(usuarioId) {
  await pool.query('DELETE FROM conversaciones WHERE usuario_id = $1', [usuarioId]);
}

/**
 * Busco una tarjeta de MI conversación: el bloque tool_use de una propuesta
 * cuyo resultado NO fue un error (si fue un error, nunca se enseñó).
 * Va dentro de la transacción de quien me llama.
 * @param {import('pg').PoolClient} cliente
 * @param {number} usuarioId
 * @param {number} hogarId
 * @param {string} toolUseId
 * @returns {Promise<{ conversacionId: number, nombre: string, entrada: unknown } | null>}
 */
export async function buscarTarjeta(cliente, usuarioId, hogarId, toolUseId) {
  // jsonb_array_elements() saca cada bloque de la lista como una fila: así
  // busco el tool_use por su id sin traerme toda la conversación.
  const { rows } = await cliente.query(
    `SELECT c.id AS conversacion_id, b.bloque->>'name' AS nombre, b.bloque->'input' AS entrada
       FROM conversaciones c
       JOIN mensajes_chat m ON m.conversacion_id = c.id AND m.rol = 'assistant'
       CROSS JOIN LATERAL jsonb_array_elements(m.contenido) AS b(bloque)
      WHERE c.usuario_id = $1 AND c.hogar_id = $2
        AND b.bloque->>'type' = 'tool_use' AND b.bloque->>'id' = $3
        AND b.bloque->>'name' IN ('proponer_receta', 'proponer_huecos')
        AND EXISTS (
          SELECT 1
            FROM mensajes_chat r
            CROSS JOIN LATERAL jsonb_array_elements(r.contenido) AS t(bloque)
           WHERE r.conversacion_id = c.id AND r.rol = 'user'
             AND t.bloque->>'type' = 'tool_result' AND t.bloque->>'tool_use_id' = $3
             AND coalesce((t.bloque->>'is_error')::boolean, false) = false)`,
    [usuarioId, hogarId, toolUseId]
  );
  if (rows.length === 0) return null;
  return { conversacionId: Number(rows[0].conversacion_id), nombre: rows[0].nombre, entrada: rows[0].entrada };
}

/**
 * Reclamo una tarjeta: si ya estaba guardada o descartada, 409. Como en
 * operaciones.js, el INSERT … ON CONFLICT DO NOTHING lo hago LO PRIMERO: si
 * otra pestaña la está guardando a la vez, espero a que termine.
 * @param {import('pg').PoolClient} cliente
 * @param {number} conversacionId
 * @param {string} toolUseId
 * @param {'guardada' | 'descartada'} estado
 * @throws {ErrorApi} 409 TARJETA_USADA
 */
export async function reclamarTarjeta(cliente, conversacionId, toolUseId, estado) {
  const { rows } = await cliente.query(
    `INSERT INTO tarjetas_chat (conversacion_id, tool_use_id, estado) VALUES ($1, $2, $3)
     ON CONFLICT (conversacion_id, tool_use_id) DO NOTHING RETURNING tool_use_id`,
    [conversacionId, toolUseId, estado]
  );
  if (rows.length === 0) {
    throw new ErrorApi(409, 'TARJETA_USADA', 'Esta propuesta ya se había guardado o descartado.');
  }
}

/**
 * Apunto lo que ha hecho la tarjeta ({ recetaId } o { guardados, saltados }).
 * @param {import('pg').PoolClient} cliente
 * @param {number} conversacionId
 * @param {string} toolUseId
 * @param {object} resultado
 */
export async function apuntarResultado(cliente, conversacionId, toolUseId, resultado) {
  await cliente.query('UPDATE tarjetas_chat SET resultado = $3 WHERE conversacion_id = $1 AND tool_use_id = $2', [
    conversacionId,
    toolUseId,
    resultado,
  ]);
}

/**
 * Limpieza diaria (D-51): las conversaciones sin mensajes desde hace más de
 * 30 días, con todo lo suyo.
 */
export async function borrarAntiguas() {
  await pool.query('DELETE FROM conversaciones WHERE actualizada_en < now() - make_interval(days => $1)', [DIAS_CONVERSACION]);
}
