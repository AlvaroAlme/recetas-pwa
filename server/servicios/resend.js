/**
 * @file Enviar un correo con la API de Resend (D-53): UNA petición HTTPS
 * (POST /emails), con fetch y sin paquetes, como el ticket con Claude. Render
 * gratis bloquea el SMTP, así que no hay otra forma.
 *
 * No importo config: la key y el remitente me llegan como parámetros. Así
 * pruebo este archivo con un fetch falso, sin red y sin .env.
 */

/** La API de Resend para enviar (comprobada en su documentación el 2026-11-18). */
export const URL_RESEND = 'https://api.resend.com/emails';

/** Lo que espero a Resend. Si tarda más, lo doy por fallido (y queda en el log). */
const TIEMPO_MAXIMO_MS = 15_000;

/**
 * Las direcciones .test están reservadas (RFC 2606): no existen. Las cuentas
 * de prueba (ana@prueba.test…) usan una, y un correo a ellas rebotaría y
 * empeoraría la reputación del dominio. Nunca las envío.
 * @param {string} email
 */
export const esDireccionDePrueba = (email) => /\.test$/i.test(email.trim());

/**
 * El cuerpo JSON que pide Resend.
 * @param {import('./mensajesCorreo.js').Correo} correo
 * @param {string} remitente "Stockpot <no-responder@…>"
 */
export function cuerpoResend({ para, asunto, texto, html }, remitente) {
  return { from: remitente, to: [para], subject: asunto, text: texto, html };
}

/**
 * Envía el correo. Si Resend no contesta 2xx, lanzo un error con su estado y
 * su código, pero SIN el correo ni la dirección: los errores acaban en el
 * log, y ahí no quiero emails ni enlaces (SEC-09).
 * @param {import('./mensajesCorreo.js').Correo} correo
 * @param {{ apiKey: string, remitente: string, fetch?: typeof fetch }} opciones
 *   fetch: solo lo cambian las pruebas.
 * @returns {Promise<string>} El id que da Resend al correo.
 * @throws {Error}
 */
export async function enviarConResend(correo, { apiKey, remitente, fetch: pedir = globalThis.fetch }) {
  const respuesta = await pedir(URL_RESEND, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpoResend(correo, remitente)),
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
  });
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    // Resend devuelve { name, message } en los errores: guardo solo el nombre
    // (validation_error, daily_quota_exceeded…), que no lleva datos de nadie.
    throw new Error(`Resend ha respondido ${respuesta.status}${datos?.name ? ` (${datos.name})` : ''}.`);
  }
  return datos?.id ?? '';
}
