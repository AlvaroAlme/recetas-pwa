/**
 * @file Validación de lo que llega a /api/push.
 *
 * Lo importante es el `endpoint`: es la URL a la que mi servidor hará
 * peticiones para enviar los avisos. Si aceptara cualquiera, alguien podría
 * hacer que mi servidor llamara a direcciones internas (SSRF, §9.8). Por eso
 * solo acepto HTTPS y servicios de push conocidos.
 */
import { ErrorApi } from '../errores.js';

/**
 * Servicios de push permitidos (comprobado el 2026-11-08):
 * - Apple: "allow URLs from *.push.apple.com" (webkit.org/blog/13878).
 * - Firefox: updates.push.services.mozilla.com (documentación de autopush).
 * - Edge en Windows: el dominio notify.windows.com; Microsoft avisa de que
 *   el subdominio cambia y no hay que mirarlo (learn.microsoft.com, WNS).
 * - Chrome: fcm.googleapis.com (developer.chrome.com/blog/web-push-interop-wins).
 * @param {string} host En minúsculas (URL ya lo pasa).
 * @returns {boolean}
 */
export function esServicioPermitido(host) {
  return (
    host.endsWith('.push.apple.com') ||
    host === 'fcm.googleapis.com' ||
    host === 'updates.push.services.mozilla.com' ||
    host === 'notify.windows.com' ||
    host.endsWith('.notify.windows.com')
  );
}

/** Las claves de la suscripción vienen en base64url. */
const BASE64URL = /^[A-Za-z0-9_-]+=*$/;

/**
 * Comprueba el endpoint: texto, URL válida, HTTPS sin puerto raro y de un
 * servicio permitido.
 * @param {unknown} endpoint
 * @returns {string | null} El error, o null si está bien.
 */
function errorDeEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return 'El endpoint no es válido.';
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return 'El endpoint no es válido.';
  }
  if (url.protocol !== 'https:' || url.port !== '' || url.username !== '' || url.password !== '') {
    return 'El endpoint tiene que ser HTTPS.';
  }
  if (!esServicioPermitido(url.hostname)) return 'Ese servicio de avisos no está admitido.';
  return null;
}

/**
 * El cuerpo de "guardar suscripción": lo que da pushManager.subscribe()
 * pasado a JSON, { endpoint, keys: { p256dh, auth } }. El resto lo ignoro.
 * @param {unknown} cuerpo
 * @returns {{ endpoint: string, p256dh: string, auth: string }}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerSuscripcion(cuerpo) {
  /** @type {Record<string, string>} */
  const campos = {};
  const fallo = errorDeEndpoint(cuerpo?.endpoint);
  if (fallo) campos.endpoint = fallo;

  const p256dh = cuerpo?.keys?.p256dh;
  const auth = cuerpo?.keys?.auth;
  // Los mismos topes que los CHECK de la tabla.
  if (typeof p256dh !== 'string' || p256dh.length > 200 || !BASE64URL.test(p256dh)) {
    campos.p256dh = 'La clave p256dh no es válida.';
  }
  if (typeof auth !== 'string' || auth.length > 100 || !BASE64URL.test(auth)) {
    campos.auth = 'La clave auth no es válida.';
  }

  if (Object.keys(campos).length > 0) {
    throw new ErrorApi(400, 'VALIDACION', 'La suscripción a los avisos no es válida.', { campos });
  }
  return { endpoint: cuerpo.endpoint, p256dh, auth };
}

/**
 * El cuerpo de "borrar suscripción": { endpoint }. Aquí no miro la lista
 * de servicios: si no es de este usuario, el DELETE no borra nada.
 * @param {unknown} cuerpo
 * @returns {string}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerEndpoint(cuerpo) {
  const endpoint = cuerpo?.endpoint;
  if (typeof endpoint !== 'string' || endpoint === '' || endpoint.length > 1000) {
    throw new ErrorApi(400, 'VALIDACION', 'La suscripción a los avisos no es válida.', {
      campos: { endpoint: 'El endpoint no es válido.' },
    });
  }
  return endpoint;
}
