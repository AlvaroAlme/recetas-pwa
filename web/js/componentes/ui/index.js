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
/**
 * Chips de opción única. Por dentro son radios nativos: el navegador me da
 * gratis las flechas del teclado y el "1 de 3, seleccionado" del lector.
 * @param {{
 *   leyenda: string,
 *   nombre: string,
 *   opciones: { valor: string, etiqueta: string }[],
 *   seleccionado?: string | null,
 *   alCambiar?: (valor: string) => void,
 *   leyendaVisible?: boolean
 * }} opciones
 * @returns {HTMLFieldSetElement}
 */
export function crearSelector({ leyenda, nombre, opciones, seleccionado = null, alCambiar, leyendaVisible = true }) {
  const idError = nuevoId(`${nombre}-error`);
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
        onchange: () => alCambiar?.(valor),
      }),
      // ", recomendado" solo lo oye el lector, y solo cuando se recomienda.
      el('label', { class: 'chip', for: id }, etiqueta, el('span', { class: 'solo-lector', hidden: true }, ', recomendado')),
    ];
  });
  return el(
    'fieldset',
    { class: 'selector', 'aria-describedby': idError },
    el('legend', { class: leyendaVisible ? 'selector__leyenda' : 'solo-lector' }, leyenda),
    el('div', { class: 'selector__opciones' }, chips),
    el('p', { class: 'campo__error', id: idError, hidden: true })
  );
}

/**
 * Marca una opción del selector (o ninguna, con null).
 * @param {HTMLFieldSetElement} selector
 * @param {string | null} valor
 */
export function elegirEnSelector(selector, valor) {
  for (const radio of selector.querySelectorAll('input[type="radio"]')) {
    radio.checked = radio.value === valor;
  }
}

/**
 * La opción marcada, o null si no hay ninguna.
 * @param {HTMLFieldSetElement} selector
 * @returns {string | null}
 */
export function leerSelector(selector) {
  return selector.querySelector('input:checked')?.value ?? null;
}

/**
 * Resalta las opciones recomendadas (borde grueso y "recomendado" para el lector).
 * @param {HTMLFieldSetElement} selector
 * @param {readonly string[]} valores
 */
export function recomendarEnSelector(selector, valores) {
  for (const radio of selector.querySelectorAll('input[type="radio"]')) {
    const chip = radio.nextElementSibling;
    const recomendada = valores.includes(radio.value);
    chip.classList.toggle('chip--recomendado', recomendada);
    chip.querySelector('.solo-lector').hidden = !recomendada;
  }
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

/**
 * Campo de texto con su etiqueta, su ayuda y su hueco para el error (§3.2 CampoTexto).
 * @param {{ etiqueta: string, nombre: string, valor?: string, ayuda?: string, atributos?: Record<string, any> }} opciones
 *   atributos: los del <input> (type, placeholder, inputmode, oninput…).
 * @returns {HTMLDivElement}
 */
export function crearCampo({ etiqueta, nombre, valor, ayuda, atributos = {} }) {
  const id = nuevoId(nombre);
  const idAyuda = `${id}-ayuda`;
  return el(
    'div',
    { class: 'campo' },
        el(
      'div',
      { class: 'campo__caja' },
      el('label', { class: 'campo__etiqueta', for: id }, etiqueta),
      el('input', {
        class: 'campo__entrada',
        type: 'text',
        id,
        name: nombre,
        value: valor,
        'aria-describedby': ayuda ? idAyuda : null,
        ...atributos,
      })
    ),
    ayuda && el('p', { class: 'campo__ayuda', id: idAyuda }, ayuda),
    el('p', { class: 'campo__error', id: `${id}-error`, hidden: true })
  );
}

/**
 * Pone (o quita, sin mensaje) el error de un campo o de un selector. El
 * error no depende solo del color: lleva "✗" y texto, y el lector lo lee
 * porque el campo apunta a él con aria-describedby.
 * @param {HTMLElement} campo Lo que devuelve crearCampo() o crearSelector().
 * @param {string | null | undefined} mensaje
 */
export function ponerErrorCampo(campo, mensaje) {
  const error = campo.querySelector('.campo__error');
  error.textContent = mensaje ? `✗ ${mensaje}` : '';
  error.hidden = !mensaje;

  const entrada = campo.querySelector('.campo__entrada');
  if (!entrada) return; // los selectores ya apuntan siempre a su error
  const ayuda = campo.querySelector('.campo__ayuda');
  if (ayuda) ayuda.hidden = Boolean(mensaje);
  if (mensaje) {
    entrada.setAttribute('aria-invalid', 'true');
    entrada.setAttribute('aria-describedby', error.id);
  } else {
    entrada.removeAttribute('aria-invalid');
    if (ayuda) {
      entrada.setAttribute('aria-describedby', ayuda.id);
    } else {
      entrada.removeAttribute('aria-describedby');
    }
  }
}

/**
 * Botón en estado "Guardando…": no se puede volver a pulsar (evita guardar
 * dos veces) y el lector sabe que está ocupado.
 * @param {HTMLButtonElement} boton
 * @param {boolean} cargando
 * @param {string} [textoCargando]
 */
export function ponerCargando(boton, cargando, textoCargando = 'Guardando…') {
  if (cargando) {
    boton.dataset.texto = boton.textContent;
    boton.textContent = textoCargando;
  } else if (boton.dataset.texto) {
    boton.textContent = boton.dataset.texto;
  }
  boton.disabled = cargando;
  boton.setAttribute('aria-busy', String(cargando));
}