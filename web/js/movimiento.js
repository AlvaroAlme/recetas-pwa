/**
 * @file Movimiento (D-56): las piezas que entran y salen de la pantalla sin
 * volver a pintarla entera (una fila de ingrediente, una línea del ticket,
 * un mensaje del Ayudante). La animación está en el CSS (.entra y .sale en
 * componentes.css); aquí solo pongo la clase y, al salir, espero a que
 * termine antes de quitar el nodo.
 *
 * Con "Reducir movimiento" la regla de base.css deja las animaciones en
 * 0,01 ms, así que todo aparece y desaparece al momento.
 */

/** Lo que dura .sale como mucho (--duracion-media), con margen. */
const MAXIMO_SALIDA_MS = 400;

/** @returns {boolean} true si la persona tiene activado "Reducir movimiento". */
export const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Hace entrar un nodo que acabo de añadir: se funde y sube 8 px. Quito la
 * clase al terminar, para que no vuelva a animarse si lo muevo de sitio.
 * @template {Element} T
 * @param {T} nodo
 * @returns {T} El mismo nodo, para poder escribir lista.append(entrar(fila)).
 */
export function entrar(nodo) {
  nodo.classList.add('entra');
  nodo.addEventListener('animationend', () => nodo.classList.remove('entra'), { once: true });
  return nodo;
}

/**
 * Hace salir un nodo (se funde y se aparta 16 px) y después lo quita.
 * Si animationend no llega (la pestaña en segundo plano, una animación que
 * el navegador se salta), lo quito igual pasado un momento.
 * @param {Element} nodo
 * @returns {Promise<void>} Se cumple cuando el nodo ya no está.
 */
export function salir(nodo) {
  if (sinMovimiento()) {
    nodo.remove();
    return Promise.resolve();
  }
  return new Promise((resolver) => {
    const quitar = () => {
      clearTimeout(temporizador);
      nodo.remove();
      resolver();
    };
    const temporizador = setTimeout(quitar, MAXIMO_SALIDA_MS);
    nodo.addEventListener('animationend', quitar, { once: true });
    // Mientras sale no se puede volver a pulsar nada de dentro.
    nodo.setAttribute('inert', '');
    nodo.classList.add('sale');
  });
}
