/**
 * @file El hogar compartido (D-03, D-16): invitaciones, unirse y salir.
 * De momento, crear invitaciones; unirse y salir llegan en los pasos 6b y 6c.
 */
import { createHash, randomInt } from 'node:crypto';
import { ALFABETO_CODIGO, LONGITUD_CODIGO, MAX_LONGITUD_NOMBRE } from '../../compartido/constantes.js';
import { pool } from '../bd/pool.js';
import { conTransaccion } from '../bd/transaccion.js';

/** Una invitación vale 48 horas. */
const DURACION_INVITACION_MS = 48 * 60 * 60 * 1000;

/**
 * El SHA-256 de un código (ya limpio, en mayúsculas). Es lo que guardo:
 * quien lea la base de datos no puede usar los códigos pendientes.
 * @param {string} codigo
 * @returns {string}
 */
export function hashDeCodigo(codigo) {
  return createHash('sha256').update(codigo).digest('hex');
}

/**
 * Un código aleatorio de 8 caracteres del alfabeto legible.
 * @returns {string}
 */
function generarCodigo() {
  let codigo = '';
  for (let i = 0; i < LONGITUD_CODIGO; i++) {
    codigo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
  }
  return codigo;
}

/**
 * Crea un código para invitar a alguien a mi hogar.
 * @param {number} hogarId
 * @param {number} usuarioId Quien invita.
 * @returns {Promise<{ codigo: string, caducaEn: Date }>} El código solo sale aquí: no se guarda.
 */
export async function crearInvitacion(hogarId, usuarioId) {
  const codigo = generarCodigo();
  const caducaEn = new Date(Date.now() + DURACION_INVITACION_MS);
  await pool.query(
    'INSERT INTO invitaciones (codigo_hash, hogar_id, creada_por, caduca_en) VALUES ($1, $2, $3, $4)',
    [hashDeCodigo(codigo), hogarId, usuarioId, caducaEn]
  );
  return { codigo, caducaEn };
}

/**
 * Saca a una persona de su hogar, DENTRO de una transacción (D-16):
 * - si era la única: borro el hogar entero (CASCADE borra sus productos y
 *   su fila de miembros). Si tenía datos, solo con confirmación.
 * - si había más gente: me quito de miembros y, si yo era la propietaria,
 *   la propiedad pasa a quien lleve más tiempo.
 * @param {import('pg').PoolClient} cliente
 * @param {number} usuarioId
 * @param {number} hogarId
 * @param {boolean} confirmarBorrado
 * @returns {Promise<'HECHO' | 'CONFIRMAR_BORRADO'>}
 */
export async function dejarHogar(cliente, usuarioId, hogarId, confirmarBorrado) {
  // FOR UPDATE: bloqueo a los miembros del hogar hasta el COMMIT, para que
  // nadie entre ni salga mientras decido.
  const { rows: miembros } = await cliente.query(
    'SELECT usuario_id, rol FROM miembros WHERE hogar_id = $1 ORDER BY unido_en, usuario_id FOR UPDATE',
    [hogarId]
  );
  const yo = miembros.find((miembro) => Number(miembro.usuario_id) === usuarioId);
  const otros = miembros.filter((miembro) => miembro !== yo);

  if (otros.length === 0) {
    const {
      rows: [{ hay_datos: hayDatos }],
    } = await cliente.query('SELECT EXISTS (SELECT 1 FROM productos WHERE hogar_id = $1) AS hay_datos', [hogarId]);
    if (hayDatos && !confirmarBorrado) return 'CONFIRMAR_BORRADO';
    await cliente.query('DELETE FROM hogares WHERE id = $1', [hogarId]);
    return 'HECHO';
  }

  if (yo?.rol === 'propietario') {
    // otros[0] es el más antiguo: la consulta va ordenada por unido_en.
    await cliente.query('UPDATE miembros SET rol = $1 WHERE usuario_id = $2', ['propietario', otros[0].usuario_id]);
  }
  await cliente.query('DELETE FROM miembros WHERE usuario_id = $1', [usuarioId]);
  return 'HECHO';
}

/**
 * Lo que pasa al intentar unirse. La ruta decide el código HTTP de cada motivo.
 * @typedef {{ ok: true, hogar: { id: number, nombre: string } }
 *   | { ok: false, motivo: 'NO_VALIDO' | 'USADO' | 'MISMO_HOGAR' | 'CONFIRMAR_BORRADO' }} ResultadoUnirse
 */

/**
 * Me une al hogar de una invitación. Todo en una transacción: o me cambio
 * de hogar y gasto el código, o no pasa nada.
 * @param {number} usuarioId
 * @param {number} hogarActualId
 * @param {string} codigo Ya limpio (8 caracteres en mayúsculas).
 * @param {boolean} confirmarBorrado
 * @returns {Promise<ResultadoUnirse>}
 */
export async function unirse(usuarioId, hogarActualId, codigo, confirmarBorrado) {
  return conTransaccion(async (cliente) => {
    // FOR UPDATE: si otra persona usa el mismo código a la vez, espera aquí
    // hasta mi COMMIT y después ya ve usada_en puesto.
    const {
      rows: [invitacion],
    } = await cliente.query(
      'SELECT hogar_id, caduca_en > now() AS vigente, usada_en FROM invitaciones WHERE codigo_hash = $1 FOR UPDATE',
      [hashDeCodigo(codigo)]
    );
    if (!invitacion || !invitacion.vigente) return { ok: false, motivo: 'NO_VALIDO' };
    if (invitacion.usada_en !== null) return { ok: false, motivo: 'USADO' };

    const hogarNuevoId = Number(invitacion.hogar_id);
    if (hogarNuevoId === hogarActualId) return { ok: false, motivo: 'MISMO_HOGAR' };

    if ((await dejarHogar(cliente, usuarioId, hogarActualId, confirmarBorrado)) === 'CONFIRMAR_BORRADO') {
      return { ok: false, motivo: 'CONFIRMAR_BORRADO' };
    }
    await cliente.query('INSERT INTO miembros (usuario_id, hogar_id, rol) VALUES ($1, $2, $3)', [
      usuarioId,
      hogarNuevoId,
      'miembro',
    ]);
    await cliente.query('UPDATE invitaciones SET usada_en = now() WHERE codigo_hash = $1', [hashDeCodigo(codigo)]);

    const {
      rows: [hogar],
    } = await cliente.query('SELECT id, nombre FROM hogares WHERE id = $1', [hogarNuevoId]);
    return { ok: true, hogar: { id: Number(hogar.id), nombre: hogar.nombre } };
  });
}

/**
 * El nombre del hogar de una persona: "Casa de Ana". Cortado a 80, porque
 * "Casa de " + un nombre de 80 no cabría en el CHECK de hogares.
 * @param {string} nombre
 * @returns {string}
 */
export function nombreDeCasa(nombre) {
  return `Casa de ${nombre}`.slice(0, MAX_LONGITUD_NOMBRE);
}

/**
 * Mi hogar y quién vive en él (para GET /api/yo y Ajustes).
 * @param {number} hogarId
 * @returns {Promise<{ id: number, nombre: string, miembros: { id: number, nombre: string, rol: string }[] }>}
 */
export async function obtenerHogar(hogarId) {
  const { rows } = await pool.query(
    `SELECT h.id, h.nombre, u.id AS usuario_id, u.nombre AS usuario_nombre, m.rol
       FROM hogares h
       JOIN miembros m ON m.hogar_id = h.id
       JOIN usuarios u ON u.id = m.usuario_id
      WHERE h.id = $1
      ORDER BY m.unido_en, u.id`,
    [hogarId]
  );
  return {
    id: Number(rows[0].id),
    nombre: rows[0].nombre,
    miembros: rows.map((fila) => ({ id: Number(fila.usuario_id), nombre: fila.usuario_nombre, rol: fila.rol })),
  };
}

/**
 * Salgo de mi hogar y me quedo en uno nuevo, vacío y mío. Si soy la única
 * persona, no tiene sentido: aviso (la ruta da 409).
 * @param {{ id: number, nombre: string }} usuario
 * @param {number} hogarId
 * @returns {Promise<{ ok: true, hogar: { id: number, nombre: string } } | { ok: false }>}
 */
export async function salir(usuario, hogarId) {
  return conTransaccion(async (cliente) => {
    const { rows: miembros } = await cliente.query('SELECT usuario_id FROM miembros WHERE hogar_id = $1 FOR UPDATE', [
      hogarId,
    ]);
    if (miembros.length <= 1) return { ok: false };

    await dejarHogar(cliente, usuario.id, hogarId, false);
    const {
      rows: [hogar],
    } = await cliente.query('INSERT INTO hogares (nombre) VALUES ($1) RETURNING id, nombre', [nombreDeCasa(usuario.nombre)]);
    await cliente.query('INSERT INTO miembros (usuario_id, hogar_id, rol) VALUES ($1, $2, $3)', [
      usuario.id,
      hogar.id,
      'propietario',
    ]);
    return { ok: true, hogar: { id: Number(hogar.id), nombre: hogar.nombre } };
  });
}