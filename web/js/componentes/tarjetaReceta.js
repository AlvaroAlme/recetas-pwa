/**
 * @file TarjetaReceta (DISENO_UI §3.3, P-21): la receta que propone el
 * ayudante. Enseño qué me falta (con VistaReceta y el inventario recién
 * pedido), los ingredientes y los pasos plegados, y "Guardar receta" o
 * "Descartar". Nada se guarda sin pulsar (D-48).
 *
 * No llamo a la API: la pantalla me pasa guardar() y descartar(). Aquí
 * solo cambio la tarjeta según lo que pase.
 */
import { formatearCantidad } from '/compartido/formato.js';
import { mensajeDeError } from '../api.js';
import { conMarca, crearAviso, ponerCargando } from './ui/index.js';
import { crearVistaReceta } from './vistaReceta.js';
import { el } from '../dom.js';

/**
 * @typedef {Object} TarjetaChat
 * @property {string} id El del bloque tool_use.
 * @property {'receta' | 'huecos'} tipo
 * @property {'pendiente' | 'guardada' | 'descartada'} estado
 * @property {any} resultado Lo que se guardó ({ recetaId } o { guardados, saltados }).
 * @property {any} propuesta La receta, o { huecos }.
 */

/**
 * @typedef {Object} AccionesTarjeta
 * @property {(cuerpo?: object) => Promise<any>} guardar POST …/guardar. Devuelve el resultado.
 * @property {() => Promise<void>} descartar POST …/descartar.
 * @property {(mensaje: string) => void} alCambiar La tarjeta ya no está como
 *   la veo (otra pestaña la ha usado, o se ha borrado la conversación): la
 *   pantalla recarga la conversación y enseña el mensaje.
 */

/**
 * Lo que hago cuando falla Guardar o Descartar. Si es que la tarjeta ya
 * estaba usada (409) o ya no existe (404), la pantalla recarga; si no, el
 * error se queda en la tarjeta y se puede volver a intentar.
 * @param {import('../api.js').ErrorApi} error
 * @param {HTMLElement} zonaError
 * @param {(mensaje: string) => void} alCambiar
 * @param {string} general "No se ha guardado. Inténtalo de nuevo."
 */
export function falloEnTarjeta(error, zonaError, alCambiar, general) {
  if (error.codigo === 'TARJETA_USADA') {
    alCambiar('Esta propuesta ya se había guardado o descartado.');
  } else if (error.codigo === 'NO_EXISTE') {
    alCambiar('Esta propuesta ya no existe.');
  } else {
    zonaError.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, general) }));
  }
}

/**
 * La receta sin saber qué tengo (si no se ha podido cargar el inventario).
 * @param {import('/compartido/validacion.js').DatosReceta} receta
 * @param {string} sufijo
 * @returns {HTMLElement}
 */
function crearRecetaSola(receta, sufijo) {
  return el(
    'div',
    { class: 'receta' },
    el(
      'section',
      { class: 'receta__seccion', 'aria-labelledby': `titulo-ingredientes${sufijo}` },
      el('h4', { class: 'titulo-seccion', id: `titulo-ingredientes${sufijo}` }, 'Ingredientes'),
      el(
        'ul',
        { class: 'receta__ingredientes' },
        receta.ingredientes.map((ingrediente) =>
          el('li', {}, `${ingrediente.nombre} · ${formatearCantidad(ingrediente.cantidad, ingrediente.unidad)}`)
        )
      )
    ),
    el(
      'section',
      { class: 'receta__seccion', 'aria-labelledby': `titulo-pasos${sufijo}` },
      el('h4', { class: 'titulo-seccion', id: `titulo-pasos${sufijo}` }, 'Pasos'),
      el('ol', { class: 'receta__pasos' }, receta.pasos.map((paso) => el('li', {}, paso)))
    )
  );
}

/**
 * @param {{
 *   tarjeta: TarjetaChat,
 *   inventario: Promise<{ productos: any[], tuppers: any[] } | null>,
 * } & AccionesTarjeta} opciones inventario: TODO el de la casa (null si no
 *   se ha podido cargar). Es una promesa: la tarjeta sale ya y el "qué me
 *   falta" aparece cuando llega.
 * @returns {HTMLElement}
 */
export function crearTarjetaReceta({ tarjeta, inventario, guardar, descartar, alCambiar }) {
  const receta = tarjeta.propuesta;
  const sufijo = `-${tarjeta.id}`;
  const idTitulo = `tarjeta${sufijo}`;
  const resumen = el('p', { class: 'tono--tenue' }, 'Comprobando qué tienes…');
  const detalle = el('details', { class: 'tarjeta-chat__detalle' }, el('summary', {}, 'Ver ingredientes y pasos'));
  const zonaError = el('div');
  const pie = el('div', { class: 'tarjeta-chat__pie' });

  // Cuando llega el inventario: el resumen arriba (siempre a la vista) y el
  // resto dentro del <details>.
  inventario.then((datos) => {
    if (!datos) {
      resumen.textContent = 'No se ha podido comprobar qué tienes.';
      detalle.append(crearRecetaSola(receta, sufijo));
      return;
    }
    const vista = crearVistaReceta({ receta, productos: datos.productos, tuppers: datos.tuppers, nivel: 'h4', sufijo });
    // VistaReceta pone el resumen ("Para 2 personas · Te falta…") el primero:
    // lo saco de ahí y lo pongo en su sitio, fuera de lo plegado.
    const suyo = vista.querySelector('.receta__resumen');
    resumen.replaceWith(suyo);
    detalle.append(vista);
  });

  /** Cómo queda la tarjeta según su estado. */
  function pintarPie(estado, resultado, conFoco = false) {
    if (estado === 'guardada') {
      const texto = el('p', { class: 'tono--exito', tabindex: '-1' }, conMarca('✓ Guardada en Recetas'));
      pie.replaceChildren(
        texto,
        resultado?.recetaId && el('a', { class: 'boton boton--fantasma boton--ajustado', href: `/receta/${resultado.recetaId}` }, 'Ver receta')
      );
      if (conFoco) texto.focus();
      return;
    }
    if (estado === 'descartada') {
      const texto = el('p', { class: 'tono--tenue', tabindex: '-1' }, 'Descartada');
      pie.replaceChildren(texto);
      if (conFoco) texto.focus();
      return;
    }
    const botonGuardar = el(
      'button',
      { class: 'boton boton--primario boton--ajustado', type: 'button', 'data-escribe': true, onclick: alGuardar },
      'Guardar receta'
    );
    const botonDescartar = el(
      'button',
      { class: 'boton boton--fantasma boton--ajustado', type: 'button', 'data-escribe': true, onclick: alDescartar },
      'Descartar'
    );
    pie.replaceChildren(botonGuardar, botonDescartar);

    async function alGuardar() {
      zonaError.replaceChildren();
      ponerCargando(botonGuardar, true);
      botonDescartar.disabled = true;
      try {
        pintarPie('guardada', await guardar(), true);
      } catch (error) {
        ponerCargando(botonGuardar, false);
        botonDescartar.disabled = false;
        falloEnTarjeta(error, zonaError, alCambiar, 'No se ha guardado. Inténtalo de nuevo.');
      }
    }

    async function alDescartar() {
      zonaError.replaceChildren();
      ponerCargando(botonDescartar, true, 'Descartando…');
      botonGuardar.disabled = true;
      try {
        await descartar();
        pintarPie('descartada', null, true);
      } catch (error) {
        ponerCargando(botonDescartar, false);
        botonGuardar.disabled = false;
        falloEnTarjeta(error, zonaError, alCambiar, 'No se ha podido descartar. Inténtalo de nuevo.');
      }
    }
  }

  pintarPie(tarjeta.estado, tarjeta.resultado);
  return el(
    'article',
    { class: 'tarjeta tarjeta-chat', 'aria-labelledby': idTitulo },
    el('p', { class: 'tarjeta-chat__tipo' }, 'Receta propuesta'),
    el('h3', { class: 'tarjeta-chat__titulo', id: idTitulo }, receta.nombre),
    resumen,
    detalle,
    zonaError,
    pie
  );
}
