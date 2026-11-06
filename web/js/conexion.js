/**
 * @file El estado de la conexión (ARQUITECTURA §8.2). Sé si estoy viendo
 * datos guardados y lo digo en la franja de debajo de la cabecera.
 *
 * Me avisan dos sitios: api.js, con cada respuesta (del servidor o una copia
 * del Service Worker), y el navegador, con los eventos online y offline.
 */
import { el } from './dom.js';
import { repintar } from './router.js';

/** Lo que puede tardar el servidor en despertar en Render (R-09). */
const ESPERA_SALUD_MS = 60_000;

/** El id del motivo: los botones que escriben lo enlazan con aria-describedby. */
const ID_MOTIVO = 'motivo-conexion';

let conexion = true;
// El texto que hay ahora en la franja: si no cambia, no la toco (y el
// lector de pantallas no lo repite con cada petición).
let textoActual = '';



/**
 * api.js me cuenta cómo ha ido cada petición.
 * @param {boolean} hay true si la respuesta viene del servidor.
 * @param {string | null} [fechaDatos] Si es una copia, su fecha (X-Desde-Cache).
 */
export function avisarConexion(hay, fechaDatos = null) {
  conexion = hay;
  const texto = hay ? '' : textoFranja(fechaDatos);
    actualizarEscrituras();
  if (texto === textoActual) return;
  textoActual = texto;
  document
    .getElementById('franja-conexion')
    .replaceChildren(
      ...(texto
        ? [
            el(
              'p',
              { class: 'franja-conexion' },
              texto,
              el('span', { class: 'franja-conexion__motivo', id: ID_MOTIVO }, 'Necesitas conexión para guardar cambios.')
            ),
          ]
        : [])
    );
}

/**
 * Los botones que escriben (marcados con data-escribe) quedan deshabilitados
 * sin conexión, con el motivo (DISENO_UI §3.1). Con aria-disabled y no con
 * disabled: así se pueden enfocar y el lector dice por qué no se pulsan.
 */
function actualizarEscrituras() {
  for (const boton of document.querySelectorAll('[data-escribe]')) {
    if (conexion) {
      boton.removeAttribute('aria-disabled');
      boton.removeAttribute('aria-describedby');
    } else {
      boton.setAttribute('aria-disabled', 'true');
      boton.setAttribute('aria-describedby', ID_MOTIVO);
    }
  }
}

/**
 * Sin conexión, el clic en un botón que escribe no hace nada. Lo freno en la
 * fase de captura, antes de que llegue a su onclick o envíe el formulario.
 * (Pulsar Intro en un campo también "pulsa" el botón de enviar: lo freno igual.)
 * @param {MouseEvent} evento
 */
function frenarEscritura(evento) {
  if (conexion || !evento.target.closest('[data-escribe]')) return;
  evento.preventDefault();
  evento.stopImmediatePropagation();
}

/**
 * "Sin conexión · datos de las 18:42" (o "del 5/11" si no son de hoy).
 * @param {string | null} fechaDatos
 * @returns {string}
 */
function textoFranja(fechaDatos) {
  const fecha = fechaDatos ? new Date(fechaDatos) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) return 'Sin conexión';
  const esDeHoy = fecha.toDateString() === new Date().toDateString();
  const cuando = esDeHoy
    ? `de las ${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
    : `del ${fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric' })}`;
  return `Sin conexión · datos ${cuando}`;
}

/**
 * El navegador dice que vuelve a haber red, pero puede que el servidor aún
 * no responda: lo compruebo con /api/salud (de esa ruta no se guarda copia).
 * Si responde, quito la franja y recargo la pantalla, salvo que tenga un
 * formulario: recargarla borraría lo que se está escribiendo.
 */
async function comprobarAlVolver() {
  try {
    const respuesta = await fetch('/api/salud', { signal: AbortSignal.timeout(ESPERA_SALUD_MS) });
    if (!respuesta.ok) return;
  } catch {
    return; // Sigue sin responder: la franja se queda.
  }
  avisarConexion(true);
  if (!document.querySelector('#pantalla form')) repintar();
}

/** Escucho al navegador. Si ya arranco sin red, lo digo desde el principio. */
export function iniciarConexion() {
  window.addEventListener('offline', () => avisarConexion(false));
  window.addEventListener('online', comprobarAlVolver);
  document.addEventListener('click', frenarEscritura, true);
  // Cada pantalla nueva trae botones nuevos: cuando cambia la página, los repaso.
  new MutationObserver(actualizarEscrituras).observe(document.querySelector('.pagina'), {
    childList: true,
    subtree: true,
  });
  if (!navigator.onLine) avisarConexion(false);
}