/**
 * @file El único sitio desde el que el navegador habla con la API.
 *
 * Las pantallas nunca usan fetch directamente: llaman a api.get(), api.post()…
 * Así los errores (sin conexión, tiempo agotado, 404, 400 con campos…) se
 * tratan en un solo sitio y siempre llegan igual: un ErrorApi con un mensaje
 * en español listo para enseñar (ARQUITECTURA §8.3).
 *
 * De momento: tiempo máximo, sin conexión y errores de la API. El 401 (ir a
 * /entrar) llega en la fase 2 y "Despertando el servidor…" en la fase 3.
 */
import { navegar } from './router.js';
import { avisarConexion } from './conexion.js';

/** Tiempo máximo de una petición normal (las de IA tendrán más, fase 5). */
const TIEMPO_MAXIMO_MS = 15_000;

/** La copia de la API que guarda el Service Worker. Mismo nombre que en sw.js. */
const CACHE_API = 'api-v1';

/**
 * Las rutas que cambian quién eres o de qué casa. Después de una escritura en
 * ellas, la copia sin red ya no vale, y además es privada (§4.2).
 */
const CAMBIAN_DE_CASA = ['/auth/', '/hogar/', '/yo'];

/** Borro la copia de los datos. Si no hay Cache Storage o falla, no pasa nada. */
async function borrarCopiaDeDatos() {
  try {
    await globalThis.caches?.delete(CACHE_API);
  } catch {
    // No hay copia que borrar.
  }
}

/**
 * Error de una petición. Tiene la misma forma que el JSON de error del
 * servidor (§5.1), y algunos códigos solo del navegador:
 * SIN_CONEXION y TIEMPO_AGOTADO (estado 0: no llegó respuesta).
 */
export class ErrorApi extends Error {
  /**
   * @param {number} estado Código HTTP, o 0 si no hubo respuesta.
   * @param {string} codigo NO_EXISTE, VALIDACION, SIN_CONEXION…
   * @param {string} mensaje Texto en español para enseñar.
   * @param {{ campos?: Record<string, string>, reintentable?: boolean }} [extra]
   */
  constructor(estado, codigo, mensaje, { campos, reintentable = false } = {}) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = codigo;
    this.campos = campos;
    this.reintentable = reintentable;
  }
}

/**
 * Hace la petición y devuelve el JSON de la respuesta (o null si es un 204).
 * @param {string} metodo 'GET', 'POST'…
 * @param {string} ruta Lo que va detrás de /api, por ejemplo '/productos/2'.
 * @param {unknown} [cuerpo] Lo que mando como JSON (solo POST, PUT y PATCH).
 * @returns {Promise<any>}
 * @throws {ErrorApi}
 */
async function peticion(metodo, ruta, cuerpo) {
  /** @type {RequestInit} */
  const opciones = {
    method: metodo,
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
  };
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, opciones);
  } catch (error) {
    // fetch solo falla así si NO llega respuesta: o se agotó el tiempo o no hay red.
    if (error.name === 'TimeoutError') {
      throw new ErrorApi(0, 'TIEMPO_AGOTADO', 'El servidor está tardando demasiado.', { reintentable: true });
    }
    avisarConexion(false);
    throw new ErrorApi(0, 'SIN_CONEXION', 'No hay conexión a internet. Comprueba la red e inténtalo de nuevo.', {
      reintentable: true,
    });
  }

  // ¿Respuesta del servidor o copia del Service Worker? Se lo cuento a la franja.
  const fechaCopia = respuesta.headers.get('X-Desde-Cache');
  avisarConexion(fechaCopia === null, fechaCopia);

  // Si he cambiado de cuenta o de casa, la copia sin red ya no es mía.
  if (respuesta.ok && metodo !== 'GET' && CAMBIAN_DE_CASA.some((prefijo) => ruta.startsWith(prefijo))) {
    await borrarCopiaDeDatos();
  }

  if (respuesta.status === 204) return null;

  // Si el cuerpo no es JSON (no debería pasar en /api), sigo con null.
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = datos?.error;
    // Sin sesión (o caducada): a Entrar, y al entrar vuelvo aquí (DISENO_UI §5.3).
    // Solo con SIN_SESION: el 401 del login ("contraseña mal") NO es esto.
    if (respuesta.status === 401 && error?.codigo === 'SIN_SESION' && location.pathname !== '/entrar') {
      await borrarCopiaDeDatos();
      navegar(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`, { reemplazar: true });
    }
    throw new ErrorApi(
      respuesta.status,
      error?.codigo ?? 'INTERNO',
      error?.mensaje ?? 'Algo ha fallado en el servidor.',
      { campos: error?.campos, reintentable: error?.reintentable ?? respuesta.status >= 500 }
    );
  }
  return datos;
}

/** Atajos para cada método. "delete" es palabra reservada: lo llamo borrar. */
export const api = {
  get: (ruta) => peticion('GET', ruta),
  post: (ruta, cuerpo) => peticion('POST', ruta, cuerpo),
  put: (ruta, cuerpo) => peticion('PUT', ruta, cuerpo),
  patch: (ruta, cuerpo) => peticion('PATCH', ruta, cuerpo),
  borrar: (ruta, cuerpo) => peticion('DELETE', ruta, cuerpo),
};

/**
 * El mensaje que enseño cuando falla una acción. Si el error ya trae uno que
 * le sirve al usuario (sin red, tarda demasiado, ya no existe), ese; si no,
 * el general que me pasan ("No se ha podido borrar.").
 * @param {ErrorApi} error
 * @param {string} general
 * @returns {string}
 */
export function mensajeDeError(error, general) {
  return ['SIN_CONEXION', 'TIEMPO_AGOTADO', 'NO_EXISTE'].includes(error.codigo) ? error.message : general;
}

