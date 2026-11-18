/**
 * @file Los enlaces que van por correo (D-53): el token, su hash y la URL.
 * Sin base de datos ni red: así lo pruebo sin Neon. Lo que toca la base de
 * datos está en recuperacion.js.
 *
 * Igual que en las sesiones: el token va en el enlace y en enlaces_correo
 * guardo solo su SHA-256. Basta SHA-256 (y no scrypt) porque el token lo
 * genero yo, es largo y aleatorio: no se puede adivinar probando.
 */
import { createHash, randomBytes } from 'node:crypto';

/** Cuánto vale cada tipo de enlace, en minutos (D-53). */
export const MINUTOS_ENLACE = Object.freeze({ recuperar: 30, email: 24 * 60 });

/** 32 bytes en base64url son siempre 43 caracteres de A-Z, a-z, 0-9, - y _. */
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/;

/**
 * Un token nuevo y su hash.
 * @returns {{ token: string, hash: string }} El token va al correo y NUNCA se guarda.
 */
export function crearToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashDeToken(token) };
}

/**
 * El SHA-256 de un token, en hexadecimal (64 caracteres).
 * @param {string} token
 * @returns {string}
 */
export function hashDeToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * ¿Tiene forma de token? Lo miro antes de ir a la base de datos: si alguien
 * manda basura, ni la busco.
 * @param {unknown} token
 * @returns {token is string}
 */
export function esFormatoToken(token) {
  return typeof token === 'string' && FORMATO_TOKEN.test(token);
}

/**
 * La URL que va en el correo. El origen es SIEMPRE el de la configuración
 * (APP_ORIGEN), nunca la cabecera Host de la petición: esa la manda quien
 * llama, y podría hacer que el enlace llevara a su web (host header
 * injection). El token va detrás de "#": esa parte no se envía al servidor,
 * así que no acaba en los logs ni en la cabecera Referer.
 * @param {string} origen config.appOrigen, sin barra final.
 * @param {'/restablecer' | '/confirmar-email'} ruta
 * @param {string} token
 * @returns {string}
 */
export function urlDeEnlace(origen, ruta, token) {
  return `${origen}${ruta}#t=${token}`;
}
