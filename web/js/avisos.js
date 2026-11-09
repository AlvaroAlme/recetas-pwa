/**
 * @file Los avisos Web Push de ESTE dispositivo (§7.1): saber en qué estado
 * están, activarlos, desactivarlos y mandar un aviso de prueba. La pantalla
 * (Ajustes, la Bienvenida) decide qué enseñar; aquí no pinto nada.
 *
 * Cada dispositivo tiene su propia suscripción: activar los avisos en el
 * iPhone no los activa en el PC.
 */
import { api } from './api.js';

/**
 * - 'no-compatible': este navegador no tiene Web Push.
 * - 'instalar': iPhone o iPad en Safari; solo hay avisos con la app en la pantalla de inicio (R-01).
 * - 'bloqueados': la persona dijo que no y el sistema ya no deja volver a preguntar.
 * - 'desactivados': se pueden activar con un botón.
 * - 'activados': este dispositivo está suscrito.
 * @typedef {'no-compatible' | 'instalar' | 'bloqueados' | 'desactivados' | 'activados'} EstadoAvisos
 */

/** ¿Tiene este navegador lo necesario? Lo miro por funciones, no por navegador (§7.1). */
const esCompatible = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/**
 * ¿Es un iPhone o un iPad? El iPad moderno dice que es un Mac, pero los
 * Mac no tienen pantalla táctil.
 */
export const esIos = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** ¿Está abierta como app instalada (sin la barra del navegador)? */
export const estaInstalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/**
 * La suscripción de este dispositivo, o null. Uso getRegistration() y no
 * ready: si el Service Worker no se hubiera registrado, ready no acabaría nunca.
 */
async function suscripcionActual() {
  const registro = await navigator.serviceWorker.getRegistration();
  return (await registro?.pushManager.getSubscription()) ?? null;
}

/**
 * En qué estado están los avisos en este dispositivo.
 * @returns {Promise<EstadoAvisos>}
 */
export async function estadoAvisos() {
  if (!esCompatible()) {
    // En Safari de iOS, PushManager solo existe dentro de la app instalada.
    return esIos() && !estaInstalada() ? 'instalar' : 'no-compatible';
  }
  if (Notification.permission === 'denied') return 'bloqueados';
  const suscripcion = Notification.permission === 'granted' ? await suscripcionActual() : null;
  return suscripcion ? 'activados' : 'desactivados';
}

/**
 * La clave pública VAPID llega en base64url; pushManager.subscribe() la
 * quiere en bytes.
 * @param {string} base64url
 * @returns {Uint8Array}
 */
function aBytes(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binario, (letra) => letra.charCodeAt(0));
}

/**
 * Activa los avisos. Hay que llamarla DENTRO del clic en el botón: el
 * navegador solo deja pedir el permiso como respuesta a un toque (R-02). Por
 * eso lo pido lo primero, antes de esperar a nada.
 * @returns {Promise<EstadoAvisos>} El estado en el que quedan.
 * @throws {import('./api.js').ErrorApi | Error} Si falla la suscripción o la API.
 */
export async function activarAvisos() {
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return permiso === 'denied' ? 'bloqueados' : 'desactivados';

  const [{ clave }, registro] = await Promise.all([api.get('/push/clave-publica'), navigator.serviceWorker.ready]);
  const suscripcion = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(clave) });
  try {
    await api.post('/push/suscripciones', suscripcion.toJSON());
  } catch (error) {
    // Si el servidor no la ha guardado, la quito también aquí: si no, este
    // dispositivo diría "Activados" sin recibir nada.
    await suscripcion.unsubscribe();
    throw error;
  }
  return 'activados';
}

/**
 * Quita la suscripción de este dispositivo: del servidor y del navegador.
 * @param {{ avisarAlServidor?: boolean }} [opciones] false tras borrar la
 *   cuenta: ya no hay sesión y el servidor la ha borrado él solo.
 * @throws {import('./api.js').ErrorApi} Si falla el DELETE (y entonces no la quito del navegador).
 */
export async function desactivarAvisos({ avisarAlServidor = true } = {}) {
  if (!esCompatible()) return;
  const suscripcion = await suscripcionActual();
  if (!suscripcion) return;
  if (avisarAlServidor) await api.borrar('/push/suscripciones', { endpoint: suscripcion.endpoint });
  await suscripcion.unsubscribe();
}

/**
 * Manda un aviso de prueba a todos los dispositivos de la persona.
 * @returns {Promise<number>} A cuántos ha llegado.
 */
export async function enviarPrueba() {
  const { enviados } = await api.post('/push/prueba');
  return enviados;
}

// ============ Instalar la app (Chrome, Edge, Android) ============

/**
 * Chrome y Edge lanzan "beforeinstallprompt" cuando la app se puede instalar.
 * Lo guardo para enseñar mi propio botón "Instalar la app" (la Bienvenida).
 * Safari no lo tiene: allí se explica con pasos. Llega pronto, al cargar la
 * página: por eso lo escucho desde app.js, antes de pintar nada.
 * @type {any}
 */
let eventoInstalar = null;

export function escucharInstalacion() {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault(); // que no salga la barra del navegador: el botón es mío
    eventoInstalar = evento;
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalar = null;
  });
}

/** ¿Puedo enseñar el botón "Instalar la app"? */
export const puedeInstalar = () => eventoInstalar !== null;

/**
 * Enseña la ventana de instalar del navegador. Solo se puede usar una vez.
 * @returns {Promise<boolean>} true si la persona ha aceptado.
 */
export async function instalarApp() {
  if (!eventoInstalar) return false;
  const evento = eventoInstalar;
  eventoInstalar = null;
  evento.prompt();
  const { outcome } = await evento.userChoice;
  return outcome === 'accepted';
}
