/**
 * @file Service Worker (ARQUITECTURA §8.1). Al instalarme guardo los archivos
 * de la app, y luego los sirvo desde esa caché: así la app abre al instante y
 * también sin red. Estoy en la raíz de web/ para que mi alcance sea toda la app.
 *
 * Cada vez que cambie algo de web/ o de compartido/ tengo que subir VERSION:
 * el navegador ve que este archivo es distinto, instala el nuevo y borra la
 * caché vieja.
 */
const VERSION = 'app-v6';

/** La copia de las respuestas de la API. Mismo nombre que en api.js. */
const CACHE_API = 'api-v1';

/** Lo que espero a la red antes de contestar con la copia (§8.1). */
const ESPERA_RED_MS = 8_000;

/** Lecturas de la API de las que no guardo copia. */
const SIN_COPIA = ['/api/salud', '/api/productos/nombres'];

/** Todo lo que necesita la app para arrancar sin red. */
const ARCHIVOS = [
  '/index.html',
  '/manifest.webmanifest',
  '/css/tokens.css',
  '/css/base.css',
  '/css/componentes.css',
  '/js/app.js',
  '/js/api.js',
  '/js/conexion.js',
  '/js/dom.js',
  '/js/router.js',
  '/js/componentes/formularioProducto.js',
  '/js/componentes/ui/index.js',
  '/js/pantallas/ajustes.js',
  '/js/pantallas/borrarCuenta.js',
  '/js/pantallas/entrar.js',
  '/js/pantallas/inventario.js',
  '/js/pantallas/invitar.js',
  '/js/pantallas/noExiste.js',
  '/js/pantallas/producto.js',
  '/js/pantallas/registro.js',
  '/js/pantallas/unirse.js',
  '/compartido/constantes.js',
  '/compartido/fechas.js',
  '/compartido/formato.js',
  '/compartido/sugerencias.js',
  '/compartido/texto.js',
  '/compartido/ubicaciones.js',
  '/compartido/validacion.js',
  '/iconos/icono.svg',
  '/iconos/icono-192.png',
  '/iconos/icono-512.png',
  '/iconos/apple-touch-icon.png',
  '/fuentes/bricolage-grotesque.woff2',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(precachear());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(borrarVersionesViejas());
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  const url = new URL(peticion.url);

  // Solo me ocupo de las lecturas (GET) a mi propio servidor.
  if (peticion.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) {
  if (SIN_COPIA.includes(url.pathname)) return;
  const red = pedirYGuardar(peticion);
  // Aunque conteste con la copia, sigo vivo hasta guardar lo que llegue de la red.
  evento.waitUntil(red.catch(() => {}));
  evento.respondWith(primeroLaRed(peticion, red));
  return;
  }

  // Cualquier URL de la app (/ajustes, /producto/3…) es la misma index.html:
  // la sirvo y el router pinta la pantalla.
  const clave = peticion.mode === 'navigate' ? '/index.html' : peticion;
  evento.respondWith(desdeLaCache(clave, peticion));
});

/**
 * Pido al servidor todos los archivos y los guardo. Si falla uno solo, la
 * instalación falla entera (mejor eso que una app a medias sin red).
 */
async function precachear() {
  const cache = await caches.open(VERSION);
  // cache: 'reload' → que me los dé el servidor, no la caché HTTP del navegador.
  await cache.addAll(ARCHIVOS.map((ruta) => new Request(ruta, { cache: 'reload' })));
  await self.skipWaiting();
}

/** Borro las cachés de versiones anteriores de la app y tomo el control. */
async function borrarVersionesViejas() {
  const nombres = await caches.keys();
  const viejas = nombres.filter((nombre) => nombre.startsWith('app-') && nombre !== VERSION);
  await Promise.all(viejas.map((nombre) => caches.delete(nombre)));
  await self.clients.claim();
}

/**
 * Primero la caché. Si el archivo no está, a la red.
 * @param {Request | string} clave Lo que busco en la caché.
 * @param {Request} peticion Lo que pido a la red si no está.
 * @returns {Promise<Response>}
 */
async function desdeLaCache(clave, peticion) {
  const cache = await caches.open(VERSION);
  const guardada = await cache.match(clave);
  return guardada ?? fetch(peticion);
}

/**
 * Pido a la red y, si va bien, guardo una copia de la respuesta.
 * @param {Request} peticion
 * @returns {Promise<Response>}
 */
async function pedirYGuardar(peticion) {
  const respuesta = await fetch(peticion);
  if (respuesta.ok) {
    const cache = await caches.open(CACHE_API);
    await cache.put(peticion, respuesta.clone());
  }
  return respuesta;
}

/**
 * Primero la red. Si falla, o tarda más de ESPERA_RED_MS, la última copia,
 * marcada con X-Desde-Cache. Si no tengo copia, espero a la red y que decida ella.
 * @param {Request} peticion
 * @param {Promise<Response>} red La petición que ya está en marcha.
 * @returns {Promise<Response>}
 */
async function primeroLaRed(peticion, red) {
  const cache = await caches.open(CACHE_API);
  const copia = await cache.match(peticion);
  if (!copia) return red;
  try {
    const respuesta = await Promise.race([red, esperar(ESPERA_RED_MS)]);
    if (respuesta) return respuesta;
  } catch {
    // Sin red: sigo con la copia.
  }
  return marcarComoCopia(copia);
}

/**
 * Una promesa que se cumple, sin valor, al cabo de ms milisegundos.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/**
 * Devuelvo la copia con la cabecera X-Desde-Cache: la fecha en que la dio el
 * servidor. Con ella, la franja del paso 3 dirá "datos de las 18:42".
 * @param {Response} copia
 * @returns {Response}
 */
function marcarComoCopia(copia) {
  const cabeceras = new Headers(copia.headers);
  cabeceras.set('X-Desde-Cache', copia.headers.get('Date') ?? '');
  return new Response(copia.body, { status: copia.status, statusText: copia.statusText, headers: cabeceras });
}