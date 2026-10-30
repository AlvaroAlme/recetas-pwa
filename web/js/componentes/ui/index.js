/**
 * @file Primitivas de la interfaz (DISENO_UI §3.2): piezas que no saben nada
 * de comida. Cada una es una función que recibe opciones y devuelve un
 * elemento, como los componentes de components/ui en Expo.
 * De momento, las que usa el Inventario.
 */
import { el } from '../../dom.js';

let contadorIds = 0;

/**
 * Un id único en la página, para unir cada <label for> con su <input>.
 * @param {string} prefijo
 * @returns {string}
 */
function nuevoId(prefijo) {
  contadorIds += 1;
  return `${prefijo}-${contadorIds}`;
}

/**
 * Chips de opción única. Por dentro son radios nativos: el navegador me da
 * gratis las flechas del teclado y el "1 de 3, seleccionado" del lector.
 * @param {{
 *   leyenda: string,
 *   nombre: string,
 *   opciones: { valor: string, etiqueta: string }[],
 *   seleccionado?: string | null,
 *   alCambiar: (valor: string) => void,
 *   leyendaVisible?: boolean
 * }} opciones
 * @returns {HTMLFieldSetElement}
 */
export function crearSelector({ leyenda, nombre, opciones, seleccionado = null, alCambiar, leyendaVisible = true }) {
  const chips = opciones.flatMap(({ valor, etiqueta }) => {
    const id = nuevoId(nombre);
    return [
      el('input', {
        class: 'solo-lector',
        type: 'radio',
        name: nombre,
        id,
        value: valor,
        checked: valor === seleccionado,
        onchange: () => alCambiar(valor),
      }),
      el('label', { class: 'chip', for: id }, etiqueta),
    ];
  });
  return el(
    'fieldset',
    { class: 'selector' },
    el('legend', { class: leyendaVisible ? 'selector__leyenda' : 'solo-lector' }, leyenda),
    el('div', { class: 'selector__opciones' }, chips)
  );
}

/**
 * Fila de una lista que lleva a otra pantalla. Es UN enlace, así que el
 * lector la lee entera: "Leche, Caduca mañana, 1 l".
 * @param {{ href: string, titulo: string, subtitulo?: string, tono?: string, detalle?: string }} opciones
 * @returns {HTMLLIElement}
 */
export function crearFila({ href, titulo, subtitulo, tono = 'tenue', detalle }) {
  return el(
    'li',
    {},
    el(
      'a',
      { class: 'fila', href },
      el(
        'span',
        { class: 'fila__textos' },
        el('span', { class: 'fila__titulo' }, titulo),
        subtitulo && el('span', { class: `fila__subtitulo tono--${tono}` }, subtitulo)
      ),
      detalle && el('span', { class: 'fila__detalle' }, detalle)
    )
  );
}

/**
 * Estado "cargando": un círculo que gira y el mensaje. role="status" hace
 * que el lector lo anuncie sin interrumpir.
 * @param {string} mensaje
 * @returns {HTMLDivElement}
 */
export function crearCarga(mensaje) {
  return el(
    'div',
    { class: 'carga', role: 'status' },
    el('span', { class: 'carga__indicador', 'aria-hidden': 'true' }),
    el('p', {}, mensaje)
  );
}

/**
 * Estado vacío: dice POR QUÉ está vacío y QUÉ hacer.
 * @param {{ titulo: string, descripcion: string, accion?: Node }} opciones
 * @returns {HTMLElement}
 */
export function crearVacio({ titulo, descripcion, accion }) {
  return el(
    'section',
    { class: 'vacio' },
    el('h2', { class: 'vacio__titulo' }, titulo),
    el('p', { class: 'tono--tenue' }, descripcion),
    accion
  );
}

/**
 * Mensaje destacado. Los errores usan role="alert" (el lector los dice al
 * momento); el resto, role="status".
 * @param {{ tipo?: 'error' | 'aviso' | 'exito', mensaje: string, accion?: Node }} opciones
 * @returns {HTMLDivElement}
 */
export function crearAviso({ tipo = 'error', mensaje, accion }) {
  return el(
    'div',
    { class: `aviso aviso--${tipo}`, role: tipo === 'error' ? 'alert' : 'status' },
    el('p', {}, mensaje),
    accion
  );
}