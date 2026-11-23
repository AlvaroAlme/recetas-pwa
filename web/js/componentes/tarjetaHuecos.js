/**
 * @file TarjetaHuecos (DISENO_UI §3.3, P-21): los platos que propone el
 * ayudante para el cuadrante. Una casilla por hueco, marcadas de inicio:
 * guardo solo los que dejes marcados. Si un hueco ya tiene algo, digo qué
 * sustituye; si ya no se puede (ha pasado, ahora es "fuera de casa" o se
 * ha borrado la receta), sale sin casilla y con el motivo.
 *
 * Como TarjetaReceta, no llamo a la API: la pantalla me pasa guardar() y
 * descartar().
 */
import { ETIQUETAS_GRUPO, ETIQUETAS_TIPO, lunesDe, textoDia } from '/compartido/plan.js';
import { conMarca, ponerCargando } from './ui/index.js';
import { falloEnTarjeta } from './tarjetaReceta.js';
import { el } from '../dom.js';

/** Por qué ya no se puede añadir un hueco (lo que dice el servidor → lo que leo). */
const MOTIVOS = Object.freeze({
  pasado: 'ese día ya ha pasado',
  'fuera de casa': 'ahora es «fuera de casa»',
  'receta borrada': 'la receta se ha borrado',
  'no válido': 'el plato no es válido',
});

/**
 * "Lunes 23 · Cena": el día y el hueco.
 * @param {{ fecha: string, tipo: 'comida' | 'cena' }} hueco
 * @returns {string}
 */
function cuando(hueco) {
  return `${textoDia(hueco.fecha)} · ${ETIQUETAS_TIPO[hueco.tipo]}`;
}

/**
 * "Lunes 23 · Cena: Lentejas con chorizo · Legumbres".
 * @param {any} hueco
 * @returns {string}
 */
function textoHueco(hueco) {
  const grupo = hueco.grupo ? ` · ${ETIQUETAS_GRUPO[hueco.grupo]}` : '';
  return `${cuando(hueco)}: ${hueco.nombre}${grupo}`;
}

/**
 * "El lunes 23 (cena) ya no se podía: ahora es «fuera de casa»."
 * @param {{ fecha: string, tipo: 'comida' | 'cena', motivo: string }} saltado
 * @returns {string}
 */
function textoSaltado(saltado) {
  const dia = textoDia(saltado.fecha).toLocaleLowerCase('es');
  return `El ${dia} (${saltado.tipo}) ya no se podía: ${MOTIVOS[saltado.motivo] ?? saltado.motivo}.`;
}

/**
 * @param {{ tarjeta: import('./tarjetaReceta.js').TarjetaChat } & import('./tarjetaReceta.js').AccionesTarjeta} opciones
 *   guardar recibe { elegidos: [0, 2] }: las posiciones (indice) de los huecos marcados.
 * @returns {HTMLElement}
 */
export function crearTarjetaHuecos({ tarjeta, guardar, descartar, alCambiar }) {
  const { huecos } = tarjeta.propuesta;
  const idTitulo = `tarjeta-${tarjeta.id}`;
  const zonaError = el('div');
  const pie = el('div', { class: 'tarjeta-chat__pie' });
  const pendiente = tarjeta.estado === 'pendiente';

  // Cada hueco: con casilla si se puede añadir (y la tarjeta sigue pendiente).
  /** @type {{ indice: number, casilla: HTMLInputElement }[]} */
  const casillas = [];
  const filas = huecos.map((hueco) => {
    // Lo que hay AHORA en ese hueco solo importa mientras decido: en una
    // tarjeta ya guardada, el hueco guardado "sustituiría" a sí mismo.
    const detalles = pendiente && [
      hueco.noSePuede && el('span', { class: 'tono--tenue' }, `Ya no se puede: ${MOTIVOS[hueco.noSePuede] ?? hueco.noSePuede}`),
      !hueco.noSePuede && hueco.sustituyeA && el('span', { class: 'tono--aviso' }, `Sustituye a «${hueco.sustituyeA}»`),
    ];
    if (!pendiente || hueco.noSePuede) {
      return el('li', { class: 'tarjeta-chat__hueco' }, el('span', {}, textoHueco(hueco)), detalles);
    }
    const casilla = el('input', { class: 'casilla__entrada', type: 'checkbox', checked: true, onchange: contar });
    casillas.push({ indice: hueco.indice, casilla });
    return el(
      'li',
      {},
      el(
        'label',
        { class: 'casilla tarjeta-chat__hueco' },
        casilla,
        el('span', { class: 'tarjeta-chat__textos' }, el('span', {}, textoHueco(hueco)), detalles)
      )
    );
  });

  const botonGuardar = el(
    'button',
    { class: 'boton boton--primario boton--ajustado', type: 'button', 'data-escribe': true, onclick: alGuardar },
    'Añadir al cuadrante'
  );
  const botonDescartar = el(
    'button',
    { class: 'boton boton--fantasma boton--ajustado', type: 'button', 'data-escribe': true, onclick: alDescartar },
    'Descartar'
  );

  /** "Añadir 2 al cuadrante": cuenta las marcadas. Con 0, no se puede pulsar. */
  function contar() {
    const marcadas = casillas.filter(({ casilla }) => casilla.checked).length;
    botonGuardar.textContent = marcadas === 0 ? 'Añadir al cuadrante' : `Añadir ${marcadas} al cuadrante`;
    botonGuardar.disabled = marcadas === 0;
  }

  /** Cómo queda la tarjeta según su estado. */
  function pintarPie(estado, resultado, conFoco = false) {
    let texto;
    if (estado === 'guardada') {
      const { guardados = 0, saltados = [] } = resultado ?? {};
      let titulo = `✓ Añadidos ${guardados} huecos`;
      if (guardados === 1) titulo = '✓ Añadido 1 hueco';
      else if (guardados === 0) titulo = 'No se ha añadido ningún hueco';
      texto = el('p', { class: guardados > 0 ? 'tono--exito' : 'tono--aviso', tabindex: '-1' }, conMarca(titulo));
      pie.replaceChildren(
        texto,
        ...saltados.map((saltado) => el('p', { class: 'tono--tenue' }, textoSaltado(saltado))),
        // La semana del primer hueco propuesto (van ordenados por fecha).
        huecos.length > 0 &&
          el('a', { class: 'boton boton--fantasma boton--ajustado', href: `/semana/${lunesDe(huecos[0].fecha)}` }, 'Ver la semana')
      );
    } else if (estado === 'descartada') {
      texto = el('p', { class: 'tono--tenue', tabindex: '-1' }, 'Descartada');
      pie.replaceChildren(texto);
    } else {
      pie.replaceChildren(
        casillas.length === 0 ? el('p', { class: 'tono--tenue' }, 'Ya no se puede añadir ninguno.') : botonGuardar,
        botonDescartar
      );
      contar();
    }
    if (conFoco) texto?.focus();
  }

  async function alGuardar() {
    zonaError.replaceChildren();
    ponerCargando(botonGuardar, true);
    botonDescartar.disabled = true;
    const elegidos = casillas.filter(({ casilla }) => casilla.checked).map(({ indice }) => indice);
    try {
      const resultado = await guardar({ elegidos });
      // Ya no se puede cambiar lo elegido: quito las casillas que no se han guardado.
      for (const { casilla } of casillas) casilla.disabled = true;
      pintarPie('guardada', resultado, true);
    } catch (error) {
      ponerCargando(botonGuardar, false);
      botonDescartar.disabled = false;
      contar();
      falloEnTarjeta(error, zonaError, alCambiar, 'No se ha guardado. Inténtalo de nuevo.');
    }
  }

  async function alDescartar() {
    zonaError.replaceChildren();
    ponerCargando(botonDescartar, true, 'Descartando…');
    botonGuardar.disabled = true;
    try {
      await descartar();
      for (const { casilla } of casillas) casilla.disabled = true;
      pintarPie('descartada', null, true);
    } catch (error) {
      ponerCargando(botonDescartar, false);
      contar();
      falloEnTarjeta(error, zonaError, alCambiar, 'No se ha podido descartar. Inténtalo de nuevo.');
    }
  }

  pintarPie(tarjeta.estado, tarjeta.resultado);
  return el(
    'article',
    { class: 'tarjeta tarjeta-chat', 'aria-labelledby': idTitulo },
    el('h3', { class: 'tarjeta-chat__tipo', id: idTitulo }, 'Añadir al cuadrante'),
    el('ul', { class: 'tarjeta-chat__huecos' }, filas),
    zonaError,
    pie
  );
}
