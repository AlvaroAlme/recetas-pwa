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

/** Tiempo máximo de una petición normal (las de IA tendrán más, fase 5). */
const TIEMPO_MAXIMO_MS = 15_000;

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
    throw new ErrorApi(0, 'SIN_CONEXION', 'No hay conexión a internet. Comprueba la red e inténtalo de nuevo.', {
      reintentable: true,
    });
  }

  if (respuesta.status === 204) return null;

  // Si el cuerpo no es JSON (no debería pasar en /api), sigo con null.
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = datos?.error;
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
  borrar: (ruta) => peticion('DELETE', ruta),
};