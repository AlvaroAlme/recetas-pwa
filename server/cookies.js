/**
 * @file La cookie de sesión: ponerla, borrarla y leerla. Leerla es código
 * propio, sin paquetes (D-12): son pocas líneas y así se entiende qué pasa.
 */
import { config } from './config.js';

export const NOMBRE_COOKIE = 'sesion';

/**
 * Opciones de la cookie (ARQUITECTURA §9.2 y §9.4):
 * - httpOnly: JavaScript no puede leerla, así que un XSS no puede robarla.
 * - secure: solo viaja por HTTPS. En mi PC es http, así que solo en producción.
 * - sameSite 'lax': no se envía en peticiones POST que vengan de otras webs (CSRF).
 * - path '/': vale para toda la app.
 */
const OPCIONES = Object.freeze({
  httpOnly: true,
  secure: config.esProduccion,
  sameSite: 'lax',
  path: '/',
});

/**
 * Pone la cookie con el token de la sesión. Caduca a la vez que la sesión.
 * @param {import('express').Response} res
 * @param {{ token: string, caducaEn: Date }} sesion
 */
export function ponerCookieSesion(res, { token, caducaEn }) {
  res.cookie(NOMBRE_COOKIE, token, { ...OPCIONES, expires: caducaEn });
}

/**
 * Le dice al navegador que borre la cookie (con las mismas opciones; si no, no la borra).
 * @param {import('express').Response} res
 */
export function borrarCookieSesion(res) {
  res.clearCookie(NOMBRE_COOKIE, OPCIONES);
}

/**
 * Lee una cookie de la cabecera Cookie: "sesion=abc; tema=oscuro".
 * @param {import('express').Request} req
 * @param {string} nombre
 * @returns {string | null}
 */
export function leerCookie(req, nombre) {
  const cabecera = req.headers.cookie;
  if (!cabecera) return null;
  for (const trozo of cabecera.split(';')) {
    const [clave, ...resto] = trozo.trim().split('=');
    if (clave !== nombre) continue;
    try {
      return decodeURIComponent(resto.join('='));
    } catch {
      return null; // un % mal escrito: la cookie no vale
    }
  }
  return null;
}