/**
 * @file Deslizar desde el borde izquierdo para volver atrás (D-56, pedido
 * por el autor el 2026-11-18). En Safari este gesto lo pone iOS, pero en la
 * app instalada en la pantalla de inicio no hay ninguno: lo hago yo.
 *
 * Cómo va:
 * 1. Un dedo empieza a menos de 30 px del borde izquierdo, en una pantalla
 *    que tiene flecha Atrás y sin ninguna ventana (<dialog>) abierta.
 * 2. Si se mueve más en horizontal que en vertical, la pantalla sigue al
 *    dedo (transform: translateX, como el resto de animaciones de D-56).
 * 3. Al soltar: si ha pasado de 80 px (o va deprisa), la pantalla acaba de
 *    irse y pulso yo la flecha Atrás (la misma transición que con ella).
 *    Si no, vuelve a su sitio.
 *
 * Solo en la app instalada: en Safari ya está el gesto de iOS, y los dos a
 * la vez se pelearían.
 */
import { estaInstalada } from './avisos.js';
import { sinMovimiento } from './movimiento.js';

/** Hasta dónde cuenta como "el borde", en px. */
const BORDE_PX = 30;
/** Lo que hay que moverse para decidir si es horizontal o vertical. */
const DECIDIR_PX = 10;
/** A partir de aquí, al soltar, se vuelve atrás. */
const VOLVER_PX = 80;
/** O si el dedo va así de rápido hacia la derecha (px por ms). */
const VOLVER_VELOCIDAD = 0.5;
/** Lo que tarda en irse o en volver a su sitio al soltar (--duracion-rapida). */
const SOLTAR_MS = 150;

/** @returns {HTMLAnchorElement | null} La flecha Atrás de la cabecera, si hay. */
const flechaAtras = () => document.querySelector('#atras-cabecera a');

/** @returns {HTMLElement | null} Lo que se mueve: la pantalla de ahora (no la cabecera ni el pie). */
const pantallaActual = () => document.querySelector('#pantalla > *');

/**
 * Pone la pantalla en su sitio (o donde va el dedo) por el CSSOM: la CSP
 * no deja escribir style="…", pero element.style sí.
 * @param {HTMLElement} pantalla
 * @param {number} x
 * @param {boolean} [conTransicion]
 */
function mover(pantalla, x, conTransicion = false) {
  pantalla.style.transition = conTransicion ? `transform ${SOLTAR_MS}ms ease-out, opacity ${SOLTAR_MS}ms ease-out` : 'none';
  pantalla.style.transform = x > 0 ? `translateX(${x}px)` : '';
  // Se va apagando un poco según se aleja (como en iOS).
  pantalla.style.opacity = x > 0 ? String(Math.max(0.4, 1 - x / (innerWidth * 1.5))) : '';
}

/** Empieza a escuchar. Lo llama app.js una vez. */
export function iniciarGestoAtras() {
  /** @type {{ x: number, y: number, t: number, pantalla: HTMLElement, horizontal: boolean | null, dx: number } | null} */
  let gesto = null;

  document.addEventListener(
    'touchstart',
    (evento) => {
      gesto = null;
      if (evento.touches.length !== 1 || !estaInstalada()) return;
      const toque = evento.touches[0];
      if (toque.clientX > BORDE_PX) return;
      if (!flechaAtras() || document.querySelector('dialog[open]')) return;
      const pantalla = pantallaActual();
      if (!pantalla) return;
      gesto = { x: toque.clientX, y: toque.clientY, t: evento.timeStamp, pantalla, horizontal: null, dx: 0 };
    },
    { passive: true }
  );

  document.addEventListener(
    'touchmove',
    (evento) => {
      if (!gesto) return;
      const toque = evento.touches[0];
      const dx = toque.clientX - gesto.x;
      const dy = toque.clientY - gesto.y;
      if (gesto.horizontal === null) {
        if (Math.hypot(dx, dy) < DECIDIR_PX) return;
        gesto.horizontal = Math.abs(dx) > Math.abs(dy) && dx > 0;
        // Si es vertical, es un scroll normal: lo dejo en paz.
        if (!gesto.horizontal) {
          gesto = null;
          return;
        }
      }
      gesto.dx = Math.max(0, dx);
      mover(gesto.pantalla, gesto.dx);
    },
    { passive: true }
  );

  const soltar = (evento) => {
    if (!gesto) return;
    const { pantalla, dx, t, horizontal } = gesto;
    gesto = null;
    if (!horizontal) return;
    const velocidad = dx / Math.max(1, evento.timeStamp - t);
    const flecha = flechaAtras();
    if (evento.type === 'touchend' && flecha && (dx > VOLVER_PX || velocidad > VOLVER_VELOCIDAD)) {
      // Acaba de irse y vuelvo como con la flecha (su transición "atrás").
      // La pantalla movida desaparece al pintar la anterior: no hace falta
      // devolverla a su sitio.
      if (sinMovimiento()) {
        flecha.click();
        return;
      }
      mover(pantalla, innerWidth * 0.5, true);
      setTimeout(() => flecha.click(), SOLTAR_MS);
    } else {
      // No ha llegado: a su sitio, y después quito los estilos.
      mover(pantalla, 0, true);
      setTimeout(() => {
        pantalla.style.transition = '';
      }, SOLTAR_MS);
    }
  };
  document.addEventListener('touchend', soltar, { passive: true });
  document.addEventListener('touchcancel', soltar, { passive: true });
}
