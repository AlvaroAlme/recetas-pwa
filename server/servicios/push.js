/**
 * @file Web Push: guardar y borrar las suscripciones de cada dispositivo, y
 * enviar avisos con el paquete `web-push` (D-11), que firma con VAPID y
 * cifra el mensaje (solo el navegador de destino puede leerlo).
 *
 * Todos los avisos usan el mismo formato (D-13): el de Declarative Web Push
 * de iOS 18.4+ (R-04). Si en el iPhone el Service Worker no enseña el aviso,
 * iOS lo enseña solo con este JSON; en el resto, lo lee sw.js.
 */
import webpush from 'web-push';
import { pool } from '../bd/pool.js';
import { config } from '../config.js';

webpush.setVapidDetails(config.vapid.sujeto, config.vapid.publica, config.vapid.privada);

/** Cuánto guarda el servicio de push un aviso si el móvil está apagado: 1 día. */
const TTL_SEGUNDOS = 24 * 60 * 60;

/**
 * @typedef {Object} Aviso
 * @property {string} titulo
 * @property {string} cuerpo
 * @property {string} ruta Pantalla que se abre al tocarlo ('/tupper/12').
 * @property {string} etiqueta Un aviso nuevo con la misma etiqueta sustituye al anterior.
 */

/**
 * El JSON que viaja dentro del aviso (formato de WebKit, R-04). La URL la
 * construyo yo con mi origen: el SW solo abre URLs de la propia app (SEC-06).
 * @param {Aviso} aviso
 * @returns {string}
 */
export function crearMensaje({ titulo, cuerpo, ruta, etiqueta }) {
  return JSON.stringify({
    web_push: 8030,
    notification: {
      title: titulo,
      body: cuerpo,
      navigate: new URL(ruta, config.appOrigen).href,
      lang: 'es-ES',
      tag: etiqueta,
    },
  });
}

/**
 * Guarda la suscripción de un dispositivo. Si el endpoint ya existía (el
 * mismo dispositivo con otra cuenta), pasa a esta persona: así un móvil
 * nunca recibe los avisos de una cuenta de la que ya ha salido.
 * @param {number} usuarioId
 * @param {{ endpoint: string, p256dh: string, auth: string }} suscripcion Ya validada.
 */
export async function guardarSuscripcion(usuarioId, { endpoint, p256dh, auth }) {
  await pool.query(
    `INSERT INTO suscripciones_push (usuario_id, endpoint, p256dh, auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint)
     DO UPDATE SET usuario_id = EXCLUDED.usuario_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [usuarioId, endpoint, p256dh, auth]
  );
}

/**
 * Borra la suscripción de un dispositivo, solo si es de esta persona.
 * @param {number} usuarioId
 * @param {string} endpoint
 */
export async function borrarSuscripcion(usuarioId, endpoint) {
  await pool.query('DELETE FROM suscripciones_push WHERE usuario_id = $1 AND endpoint = $2', [usuarioId, endpoint]);
}

/**
 * Envía un aviso a una lista de suscripciones, una a una. Si una falla, sigo
 * con las demás. Si el servicio dice 404 o 410, ese dispositivo ya no existe
 * (desinstaló la app, quitó el permiso…): borro su suscripción.
 * @param {{ endpoint: string, p256dh: string, auth: string }[]} suscripciones
 * @param {string} mensaje El de crearMensaje().
 * @returns {Promise<number>} A cuántas ha llegado.
 */
export async function enviarA(suscripciones, mensaje) {
  let enviados = 0;
  for (const { endpoint, p256dh, auth } of suscripciones) {
    try {
      await webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, mensaje, { TTL: TTL_SEGUNDOS });
      enviados++;
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await pool.query('DELETE FROM suscripciones_push WHERE endpoint = $1', [endpoint]);
      } else {
        // Solo el código: el endpoint identifica al dispositivo y no va al log (SEC-09).
        console.error('No se ha podido enviar un aviso:', error.statusCode ?? error.message);
      }
    }
  }
  return enviados;
}

/**
 * Las suscripciones de una persona (todos sus dispositivos).
 * @param {number} usuarioId
 */
async function suscripcionesDe(usuarioId) {
  const { rows } = await pool.query(
    'SELECT endpoint, p256dh, auth FROM suscripciones_push WHERE usuario_id = $1',
    [usuarioId]
  );
  return rows;
}

/**
 * Envía un aviso a todos los dispositivos de todas las personas de una casa.
 * @param {number} hogarId
 * @param {string} mensaje El de crearMensaje().
 * @returns {Promise<number>} A cuántos ha llegado.
 */
export async function enviarAlHogar(hogarId, mensaje) {
  const { rows } = await pool.query(
    `SELECT s.endpoint, s.p256dh, s.auth
       FROM suscripciones_push s
       JOIN miembros m ON m.usuario_id = s.usuario_id
      WHERE m.hogar_id = $1`,
    [hogarId]
  );
  return enviarA(rows, mensaje);
}

/**
 * "Enviar un aviso de prueba" (Ajustes): a todos los dispositivos de la
 * persona, para comprobar que el iPhone los recibe.
 * @param {number} usuarioId
 * @returns {Promise<number>} A cuántos ha llegado.
 */
export async function enviarPrueba(usuarioId) {
  const mensaje = crearMensaje({
    titulo: 'Aviso de prueba',
    cuerpo: 'Si ves esto, los avisos de Vigía funcionan en este dispositivo.',
    ruta: '/ajustes',
    etiqueta: 'prueba',
  });
  return enviarA(await suscripcionesDe(usuarioId), mensaje);
}
