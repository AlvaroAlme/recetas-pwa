/**
 * @file MenuFiltro (P-04, D-61): un icono de filtrar que abre, justo debajo,
 * un menú con casillas. Se pueden marcar varias; ninguna quiere decir "sin
 * filtro". Cada cambio se aplica al momento, sin botón de "Aplicar".
 *
 * Es el patrón "disclosure" (un botón con aria-expanded que enseña y esconde
 * un bloque), no un menú de ARIA: dentro hay casillas normales, que el lector
 * ya sabe leer y que se manejan con Tab y Espacio. Se cierra con Escape, al
 * tocar fuera, al sacar el foco o con el mismo icono.
 */
import { el } from '../dom.js';
import { crearIcono } from './iconos.js';

/** Para que cada menú tenga su id (aria-controls). */
let contador = 0;

/**
 * @param {{
 *   leyenda: string,
 *   opciones: { valor: string, etiqueta: string }[],
 *   elegidas: string[],
 *   alCambiar: (elegidas: string[]) => void
 * }} opciones leyenda: lo que lee el lector en el icono y el título del menú
 *   ("Filtrar por ubicación").
 * @returns {{ elemento: HTMLElement, ponerElegidas: (elegidas: string[]) => void }}
 */
export function crearMenuFiltro({ leyenda, opciones, elegidas, alCambiar }) {
  const id = `menu-filtro-${++contador}`;
  const casillas = opciones.map(({ valor }) =>
    el('input', { class: 'casilla__entrada', type: 'checkbox', value: valor, checked: elegidas.includes(valor), onchange: cambiar })
  );
  const menu = el(
    'fieldset',
    { class: 'menu-filtro__menu', id, hidden: true },
    el('legend', { class: 'menu-filtro__leyenda' }, leyenda),
    opciones.map(({ etiqueta }, i) => el('label', { class: 'casilla' }, casillas[i], etiqueta))
  );
  const boton = el(
    'button',
    {
      class: 'boton-icono menu-filtro__boton',
      type: 'button',
      title: leyenda,
      'aria-expanded': 'false',
      'aria-controls': id,
      onclick: () => (menu.hidden ? abrir() : cerrar()),
    },
    crearIcono('filtrar')
  );
  const elemento = el('div', { class: 'menu-filtro', onkeydown: alPulsarTecla, onfocusout: alPerderFoco }, boton, menu);
  actualizarBoton();

  /** Las que están marcadas, en el orden de las opciones. */
  function leerElegidas() {
    return casillas.filter((casilla) => casilla.checked).map((casilla) => casilla.value);
  }

  /**
   * El icono se rellena si hay algo filtrado, y el lector oye cuántas:
   * "Filtrar por ubicación, 2 elegidas".
   */
  function actualizarBoton() {
    const cuantas = leerElegidas().length;
    boton.classList.toggle('menu-filtro__boton--activo', cuantas > 0);
    let nombre = leyenda;
    if (cuantas === 1) nombre = `${leyenda}, 1 elegida`;
    else if (cuantas > 1) nombre = `${leyenda}, ${cuantas} elegidas`;
    boton.setAttribute('aria-label', nombre);
  }

  function cambiar() {
    actualizarBoton();
    alCambiar(leerElegidas());
  }

  function abrir() {
    menu.hidden = false;
    boton.setAttribute('aria-expanded', 'true');
    casillas[0].focus();
    // Un toque fuera lo cierra. Lo escucho solo mientras está abierto.
    document.addEventListener('pointerdown', alTocarFuera);
  }

  /** @param {{ devolverFoco?: boolean }} [opciones] */
  function cerrar({ devolverFoco = false } = {}) {
    if (menu.hidden) return;
    menu.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', alTocarFuera);
    if (devolverFoco) boton.focus();
  }

  /** @param {PointerEvent} evento */
  function alTocarFuera(evento) {
    if (!elemento.contains(evento.target)) cerrar();
  }

  /** @param {KeyboardEvent} evento Escape cierra y devuelve el foco al icono. */
  function alPulsarTecla(evento) {
    if (evento.key === 'Escape' && !menu.hidden) {
      evento.stopPropagation();
      cerrar({ devolverFoco: true });
    }
  }

  /** @param {FocusEvent} evento Si el foco se va a otra parte de la página, cierro. */
  function alPerderFoco(evento) {
    if (evento.relatedTarget && !elemento.contains(evento.relatedTarget)) cerrar();
  }

  /**
   * Marco las que me digan desde fuera (al quitar un filtro con su "✗").
   * @param {string[]} nuevas
   */
  function ponerElegidas(nuevas) {
    for (const casilla of casillas) casilla.checked = nuevas.includes(casilla.value);
    actualizarBoton();
  }

  return { elemento, ponerElegidas };
}
