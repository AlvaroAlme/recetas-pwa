/**
 * @file El único sitio desde el que el navegador habla con la API.
 *
 * Las pantallas nunca usan fetch directamente: llaman a api.get(), api.post()…
 * Así los errores (sin conexión, tiempo agotado, 404, 400 con campos…) se
 * tratan en un solo sitio y siempre llegan igual: un ErrorApi con un mensaje
 * en español listo para enseñar (ARQUITECTURA §8.3).
 *
 * Trato el tiempo máximo, sin conexión, el 401 (ir a /entrar), los errores
 * de la API y "Despertando el servidor…" cuando Render tarda.
 */
import { navegar } from './router.js';
import { avisarConexion, avisarDespertando } from './conexion.js';

/**
 * Tiempo máximo de una petición normal (las de IA tendrán más, fase 5).
 * 75 s y no 15: Render gratis tarda un minuto en despertar (R-09), y con
 * 15 s la primera petición del día siempre daría "tarda demasiado".
 */
const TIEMPO_MAXIMO_MS = 75_000;

/** Si en 3 s no hay respuesta, aviso de que el servidor puede estar despertando. */
const AVISO_DESPERTANDO_MS = 3_000;

/** En el chat (flujo()), lo que espero sin que llegue nada antes de darlo por perdido. */
const SILENCIO_MAXIMO_MS = 90_000;

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
  // Si a los 3 s no ha llegado nada, lo digo en la franja. Me acuerdo de si
  // he avisado para quitar el aviso al terminar (y solo entonces).
  let avisado = false;
  const temporizador = setTimeout(() => {
    avisado = true;
    avisarDespertando(true);
  }, AVISO_DESPERTANDO_MS);
  try {
    try {
      respuesta = await fetch(`/api${ruta}`, opciones);
    } catch (error) {
      // A veces la primera petición tras un rato falla sin respuesta y la
      // segunda va bien (una conexión vieja que ya estaba cerrada). Si
      // repetirla es seguro, lo intento UNA vez más, con su propio reloj.
      if (error.name === 'TimeoutError' || !sePuedeRepetir(metodo, cuerpo)) throw error;
      opciones.signal = AbortSignal.timeout(TIEMPO_MAXIMO_MS);
      respuesta = await fetch(`/api${ruta}`, opciones);
    }
  } catch (error) {
    throw errorSinRespuesta(error);
  } finally {
    // Haya ido bien o mal, la espera ha terminado: paro el reloj y quito el aviso.
    clearTimeout(temporizador);
    if (avisado) avisarDespertando(false);
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

  if (!respuesta.ok) throw await errorDeRespuesta(respuesta, datos);
  return datos;
}

/**
 * ¿Puedo repetir la petición sin miedo a hacer algo dos veces? Una lectura
 * (GET) sí. Una escritura, solo si lleva clave (P-06): si la primera llegó,
 * el servidor no la aplica otra vez y me da la misma respuesta
 * ("Guardar ticket" y "La he cocinado").
 * @param {string} metodo
 * @param {unknown} cuerpo
 * @returns {boolean}
 */
function sePuedeRepetir(metodo, cuerpo) {
  return metodo === 'GET' || (typeof cuerpo === 'object' && cuerpo !== null && 'clave' in cuerpo);
}

/**
 * El error cuando fetch falla SIN respuesta: o se agotó el tiempo o no hay red.
 * @param {Error} error El que lanza fetch.
 * @returns {ErrorApi}
 */
function errorSinRespuesta(error) {
  if (error.name === 'TimeoutError') {
    return new ErrorApi(0, 'TIEMPO_AGOTADO', 'El servidor está tardando demasiado.', { reintentable: true });
  }
  avisarConexion(false);
  return new ErrorApi(0, 'SIN_CONEXION', 'No hay conexión a internet. Comprueba la red e inténtalo de nuevo.', {
    reintentable: true,
  });
}

/**
 * El error de una respuesta que no es 2xx, con lo que diga el JSON de error
 * del servidor (§5.1). Si es que no hay sesión, además llevo a Entrar.
 * @param {Response} respuesta
 * @param {any} datos El JSON de la respuesta (o null).
 * @returns {Promise<ErrorApi>}
 */
async function errorDeRespuesta(respuesta, datos) {
  const error = datos?.error;
  // Sin sesión (o caducada): a Entrar, y al entrar vuelvo aquí (DISENO_UI §5.3).
  // Solo con SIN_SESION: el 401 del login ("contraseña mal") NO es esto.
  if (respuesta.status === 401 && error?.codigo === 'SIN_SESION' && location.pathname !== '/entrar') {
    await borrarCopiaDeDatos();
    navegar(`/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`, { reemplazar: true });
  }
  return new ErrorApi(
    respuesta.status,
    error?.codigo ?? 'INTERNO',
    error?.mensaje ?? 'Algo ha fallado en el servidor.',
    { campos: error?.campos, reintentable: error?.reintentable ?? respuesta.status >= 500 }
  );
}

/**
 * Un POST que contesta por STREAMING (el chat, D-51): una línea JSON por
 * evento (NDJSON). Llamo a alEvento con cada línea según llega y termino con
 * la de { tipo: 'fin' }. Si llega { tipo: 'error' }, lanzo un ErrorApi con
 * su código y su mensaje. Si el servidor contesta antes con un error normal
 * (la cuota, el aviso sin aceptar…), lo lanzo igual que peticion().
 *
 * No pongo un tiempo máximo total (con las herramientas, la respuesta puede
 * tardar), sino de SILENCIO: si en 90 s no llega nada, la doy por perdida.
 * @param {string} ruta
 * @param {unknown} cuerpo
 * @param {(evento: any) => void} alEvento
 * @returns {Promise<void>}
 * @throws {ErrorApi} Si se corta por el camino: RESPUESTA_CORTADA (estado 0).
 */
async function flujo(ruta, cuerpo, alEvento) {
  const control = new AbortController();
  let reloj;
  // Cada vez que llega algo, el reloj del silencio vuelve a empezar.
  const vigilar = () => {
    clearTimeout(reloj);
    reloj = setTimeout(() => control.abort(new DOMException('Sin respuesta', 'TimeoutError')), SILENCIO_MAXIMO_MS);
  };

  let avisado = false;
  const temporizador = setTimeout(() => {
    avisado = true;
    avisarDespertando(true);
  }, AVISO_DESPERTANDO_MS);
  vigilar();
  try {
    let respuesta;
    try {
      respuesta = await fetch(`/api${ruta}`, {
        method: 'POST',
        headers: { Accept: 'application/x-ndjson, application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: control.signal,
      });
    } catch (error) {
      throw errorSinRespuesta(error);
    } finally {
      clearTimeout(temporizador);
      if (avisado) avisarDespertando(false);
    }
    avisarConexion(true);

    if (!respuesta.ok) {
      throw await errorDeRespuesta(respuesta, await respuesta.json().catch(() => null));
    }

    // Leo el cuerpo a trozos. Un trozo puede traer media línea: lo que queda
    // detrás del último salto de línea lo guardo para el trozo siguiente.
    const lector = respuesta.body.pipeThrough(new TextDecoderStream()).getReader();
    let pendiente = '';
    while (true) {
      let trozo;
      try {
        trozo = await lector.read();
      } catch (error) {
        if (error.name === 'TimeoutError') {
          throw new ErrorApi(0, 'TIEMPO_AGOTADO', 'El ayudante ha dejado de contestar.', { reintentable: true });
        }
        break; // la conexión se ha cortado (la red, la app en segundo plano…)
      }
      if (trozo.done) break;
      vigilar();
      pendiente += trozo.value;
      const lineas = pendiente.split('\n');
      pendiente = lineas.pop();
      for (const linea of lineas) {
        if (linea.trim() === '') continue;
        const evento = JSON.parse(linea);
        if (evento.tipo === 'error') {
          // La respuesta HTTP fue un 200: el error ha llegado dentro.
          throw new ErrorApi(200, evento.codigo, evento.mensaje, { reintentable: evento.reintentable });
        }
        alEvento(evento);
        if (evento.tipo === 'fin') return;
      }
    }
    // Se ha cerrado sin 'fin' ni 'error': se ha cortado por el camino.
    throw new ErrorApi(0, 'RESPUESTA_CORTADA', 'Se ha cortado la conexión mientras el ayudante respondía.', {
      reintentable: true,
    });
  } finally {
    clearTimeout(reloj);
  }
}

/** Atajos para cada método. "delete" es palabra reservada: lo llamo borrar. */
export const api = {
  get: (ruta) => peticion('GET', ruta),
  post: (ruta, cuerpo) => peticion('POST', ruta, cuerpo),
  put: (ruta, cuerpo) => peticion('PUT', ruta, cuerpo),
  patch: (ruta, cuerpo) => peticion('PATCH', ruta, cuerpo),
  borrar: (ruta, cuerpo) => peticion('DELETE', ruta, cuerpo),
  flujo,
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

