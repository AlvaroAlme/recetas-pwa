/**
 * @file MensajeChat (DISENO_UI §3.3, P-21): un mensaje de la conversación
 * con el ayudante. El mío, a la derecha en una burbuja; el del ayudante, a
 * todo el ancho y sin burbuja, con sus tarjetas debajo.
 *
 * Mientras llega la respuesta (streaming), la pantalla me va pasando los
 * trozos con agregarTexto() y lo que está haciendo con ponerEstado()
 * ("Mirando tu inventario…"). El texto va SIEMPRE como texto (textContent):
 * lo escribe la IA y nunca lo meto como HTML (§9.7).
 */
import { el } from '../dom.js';

/**
 * @typedef {Object} MensajeChat
 * @property {HTMLElement} elemento El <article> que va en la lista.
 * @property {(trozo: string) => void} agregarTexto Añade un trozo de la respuesta.
 * @property {(texto: string) => void} ponerEstado "Mirando tu semana…" (tenue).
 * @property {(tarjeta: Node) => void} agregarTarjeta Una tarjeta debajo del texto.
 * @property {() => void} terminar Ya ha llegado todo: quito el estado y el aria-busy.
 */

/**
 * @param {{ rol: 'tu' | 'ayudante', texto?: string, tarjetas?: Node[], esperando?: boolean }} opciones
 *   esperando: la respuesta aún está llegando.
 * @returns {MensajeChat}
 */
export function crearMensajeChat({ rol, texto = '', tarjetas = [], esperando = false }) {
  const parrafo = el('p', { class: 'mensaje__texto' }, texto);
  const estado = el('p', { class: 'mensaje__estado tono--tenue', hidden: true });
  const zonaTarjetas = el('div', { class: 'mensaje__tarjetas' }, tarjetas);
  // Después de una herramienta, el texto que llega es otro bloque: lo separo
  // con una línea en blanco, como en la conversación guardada (vistaChat.js).
  let bloqueNuevo = false;

  const elemento = el(
    'article',
    { class: `mensaje mensaje--${rol}`, 'aria-busy': esperando ? 'true' : null },
    // Para el lector: así puede saltar de mensaje en mensaje por los títulos.
    el('h2', { class: 'solo-lector' }, rol === 'tu' ? 'Tú' : 'Ayudante'),
    parrafo,
    estado,
    zonaTarjetas
  );
  parrafo.hidden = texto === '';

  return {
    elemento,
    agregarTexto(trozo) {
      if (bloqueNuevo && parrafo.textContent !== '') parrafo.append('\n\n');
      bloqueNuevo = false;
      parrafo.append(trozo);
      parrafo.hidden = false;
      // Si ya escribe, ya no está "mirando": quito el estado.
      estado.hidden = true;
    },
    ponerEstado(texto) {
      estado.textContent = texto;
      estado.hidden = false;
      bloqueNuevo = true;
    },
    agregarTarjeta(tarjeta) {
      zonaTarjetas.append(tarjeta);
      bloqueNuevo = true;
    },
    terminar() {
      estado.hidden = true;
      elemento.removeAttribute('aria-busy');
    },
  };
}
