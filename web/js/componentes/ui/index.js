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
 * @param {{ etiqueta: string | Array<string | Node>, nombre: string, valor?: string, ayuda?: string, atributos?: Record<string, any> }} opciones
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

/**
 * Una sugerencia del autocompletado.
 * @typedef {Object} Sugerencia
 * @property {string} texto Lo que se escribe en el campo al elegirla.
 * @property {string} [detalle] Texto pequeño a la derecha ("l · Nevera").
 * @property {any} [datos] Lo que necesite quien la elige (no se enseña).
 */

/**
 * Convierte un campo de texto en un combobox con sugerencias debajo
 * (D-42, DISENO_UI §3.2 Autocompletar). El foco se queda SIEMPRE en el
 * input: las flechas mueven la opción activa con aria-activedescendant.
 * @param {HTMLDivElement} campo El que devuelve crearCampo().
 * @param {{
 *   buscar: (texto: string) => Promise<Sugerencia[]>,
 *   alElegir: (sugerencia: Sugerencia) => void,
 *   espera?: number
 * }} opciones buscar no debe lanzar errores: si algo falla, que devuelva [].
 *   espera: milisegundos desde la última tecla antes de buscar.
 */
export function crearAutocompletar(campo, { buscar, alElegir, espera = 250 }) {
  const entrada = campo.querySelector('.campo__entrada');
  const idLista = `${entrada.id}-sugerencias`;
  const lista = el('ul', { class: 'sugerencias', id: idLista, role: 'listbox', 'aria-label': 'Sugerencias', hidden: true });
  campo.querySelector('.campo__caja').append(lista);

  entrada.setAttribute('role', 'combobox');
  entrada.setAttribute('aria-autocomplete', 'list');
  entrada.setAttribute('aria-expanded', 'false');
  entrada.setAttribute('aria-controls', idLista);

  /** @type {Sugerencia[]} */
  let opciones = [];
  let activa = -1; // la opción marcada con las flechas (-1 = ninguna)
  let temporizador;
  let turno = 0;

  function cerrar() {
    lista.hidden = true;
    entrada.setAttribute('aria-expanded', 'false');
    entrada.removeAttribute('aria-activedescendant');
    activa = -1;
  }

  /** @param {Sugerencia[]} sugerencias */
  function pintar(sugerencias) {
    opciones = sugerencias;
    activa = -1;
    lista.replaceChildren(
      ...sugerencias.map((sugerencia, indice) =>
        el(
          'li',
          {
            class: 'sugerencias__opcion',
            id: `${idLista}-${indice}`,
            role: 'option',
            'aria-selected': 'false',
            // Sin esto, al pulsar la opción el input perdería el foco (blur),
            // la lista se cerraría y el clic no llegaría a la opción.
            onmousedown: (evento) => evento.preventDefault(),
            onclick: () => elegir(indice),
          },
          el('span', {}, sugerencia.texto),
          sugerencia.detalle && el('span', { class: 'sugerencias__detalle' }, sugerencia.detalle)
        )
      )
    );
    if (sugerencias.length === 0) {
      cerrar();
      return;
    }
    lista.hidden = false;
    entrada.setAttribute('aria-expanded', 'true');
  }

  /** @param {number} indice */
  function marcar(indice) {
    activa = indice;
    for (const [i, opcion] of [...lista.children].entries()) {
      opcion.setAttribute('aria-selected', String(i === indice));
    }
    const opcion = lista.children[indice];
    entrada.setAttribute('aria-activedescendant', opcion.id);
    opcion.scrollIntoView({ block: 'nearest' });
  }

  /** @param {number} indice */
  function elegir(indice) {
    const sugerencia = opciones[indice];
    cerrar();
    entrada.value = sugerencia.texto;
    alElegir(sugerencia);
  }

  // Busco cuando el usuario deja de escribir 250 ms, no con cada tecla.
  entrada.addEventListener('input', () => {
    clearTimeout(temporizador);
    const texto = entrada.value;
    temporizador = setTimeout(async () => {
      const miTurno = ++turno;
      const sugerencias = await buscar(texto);
      // Si mientras buscaba ha escrito más, o se ha ido del campo, no pinto.
      if (miTurno === turno && document.activeElement === entrada) pintar(sugerencias);
    }, espera);
  });

  entrada.addEventListener('keydown', (evento) => {
    if (lista.hidden) return;
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      marcar((activa + 1) % opciones.length);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      marcar(activa <= 0 ? opciones.length - 1 : activa - 1);
    } else if (evento.key === 'Enter' && activa >= 0) {
      evento.preventDefault(); // que Intro elija, no que envíe el formulario
      elegir(activa);
    } else if (evento.key === 'Escape') {
      evento.preventDefault();
      cerrar();
    }
  });

  entrada.addEventListener('blur', cerrar);
}

/**
 * Pregunta de confirmación en un <dialog> (D-28), como Alert.alert de Expo.
 * showModal() pone el foco dentro, bloquea el resto de la página y cierra
 * con Esc. El foco empieza en "Cancelar" (lo seguro) y, al cerrar, vuelve
 * al botón que lo abrió.
 * @param {{ titulo: string, texto: string, textoConfirmar: string, peligroso?: boolean }} opciones
 * @returns {Promise<boolean>} true si pulsa el botón de confirmar.
 */
export function confirmar({ titulo, texto, textoConfirmar, peligroso = false }) {
  const idTitulo = nuevoId('dialogo-titulo');
  const idTexto = nuevoId('dialogo-texto');
  const dialogo = el(
    'dialog',
    { class: 'dialogo', 'aria-labelledby': idTitulo, 'aria-describedby': idTexto },
    // method="dialog": al pulsar un botón, el formulario cierra el diálogo
    // y deja su value en dialogo.returnValue.
    el(
      'form',
      { method: 'dialog' },
      el('h2', { class: 'dialogo__titulo', id: idTitulo }, titulo),
      el('p', { id: idTexto }, texto),
      el(
        'div',
        { class: 'dialogo__acciones' },
        el('button', { class: 'boton boton--secundario', value: 'cancelar', autofocus: true }, 'Cancelar'),
        el('button', { class: `boton ${peligroso ? 'boton--peligro' : 'boton--primario'}`, value: 'confirmar' }, textoConfirmar)
      )
    )
  );

  const anterior = document.activeElement;
  document.body.append(dialogo);
  dialogo.showModal();

  return new Promise((resolver) => {
    dialogo.addEventListener(
      'close',
      () => {
        dialogo.remove();
        anterior?.focus();
        resolver(dialogo.returnValue === 'confirmar');
      },
      { once: true }
    );
  });
}

/**
 * Lo que hay escrito en un campo de crearCampo().
 * @param {HTMLElement} campo
 * @returns {string}
 */
export function leerCampo(campo) {
  return campo.querySelector('.campo__entrada').value;
}