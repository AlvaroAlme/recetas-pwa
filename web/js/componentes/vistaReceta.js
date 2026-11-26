/**
 * @file VistaReceta (DISENO_UI §3.3, P-11): los ingredientes de una receta
 * con cómo estoy de cada uno ("✓ Tienes 500 g", "Solo tienes…", "✗ Te
 * falta"…), el resumen ("Tienes todo" / "Te faltan 2 ingredientes") y los
 * pasos numerados. El cálculo es estadoIngrediente() (compartido/cocina.js);
 * aquí solo lo pinto. No llamo a la API: me pasan la receta y el inventario.
 *
 * Desde la fase 14 (D-61): las raciones se pueden cambiar ("− 2 raciones +"),
 * sale la caducidad de lo que caduca pronto y los básicos de despensa que no
 * tengo (sal, aceite…) van aparte y no cuentan como "te falta".
 */
import { buscarProductos, convertir, esBasico, escalarIngredientes, esPronto, estadoIngrediente } from '/compartido/cocina.js';
import { MAX_RACIONES, MIN_RACIONES } from '/compartido/constantes.js';
import { avisoCaducidad, formatearCantidad } from '/compartido/formato.js';
import { el } from '../dom.js';
import { crearIcono } from './iconos.js';
import { conMarca } from './ui/index.js';

/** "aceite de oliva, sal y pimienta": une una lista como se dice en español. */
const listaEnEspanol = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' });

/**
 * Lo que tengo, en la unidad grande si llega a 1000: "4000 ml" se lee
 * mejor como "4 l". Solo para enseñarlo; los cálculos no cambian.
 * @param {number} cantidad
 * @param {string} unidad
 * @returns {string}
 */
function cantidadLegible(cantidad, unidad) {
  if (unidad === 'g' && cantidad >= 1000) return formatearCantidad(convertir(cantidad, 'g', 'kg'), 'kg');
  if (unidad === 'ml' && cantidad >= 1000) return formatearCantidad(convertir(cantidad, 'ml', 'l'), 'l');
  return formatearCantidad(cantidad, unidad);
}

/**
 * El texto y el tono de cómo estoy de un ingrediente. Siempre con texto,
 * nunca solo el color (DISENO_UI §1, principio 4).
 * @param {import('/compartido/validacion.js').DatosIngrediente} ingrediente
 * @param {import('/compartido/cocina.js').EstadoIngrediente} estado
 * @returns {{ texto: string, tono: 'exito' | 'aviso' | 'tenue' | 'peligro' }}
 */
export function describirEstado(ingrediente, estado) {
  switch (estado.tipo) {
    case 'tienes':
      return { texto: `✓ Tienes ${cantidadLegible(estado.disponible, ingrediente.unidad)}`, tono: 'exito' };
    case 'poco':
      return { texto: `Solo tienes ${cantidadLegible(estado.disponible, ingrediente.unidad)}`, tono: 'aviso' };
    case 'otra_unidad':
      return { texto: `Tienes «${estado.productos[0].nombre}» en otra unidad: revísalo.`, tono: 'tenue' };
    case 'tupper':
      return { texto: `Tienes el tupper «${estado.tupper.nombre}»`, tono: 'exito' };
    default:
      return { texto: '✗ Te falta', tono: 'peligro' };
  }
}

/**
 * "Para 4 personas", "Para 1 persona", o null si no lo sé.
 * @param {number | null} raciones
 * @returns {string | null}
 */
function textoRaciones(raciones) {
  if (raciones === null) return null;
  return raciones === 1 ? 'Para 1 persona' : `Para ${raciones} personas`;
}

/**
 * @param {{
 *   receta: import('/compartido/validacion.js').DatosReceta,
 *   productos: import('/compartido/cocina.js').Producto[],
 *   tuppers: import('/compartido/cocina.js').TupperConFecha[],
 *   conPasos?: boolean,
 *   nivel?: 'h2' | 'h3' | 'h4',
 *   sufijo?: string,
 *   conRaciones?: boolean,
 *   alCambiarRaciones?: (raciones: number) => void
 * }} opciones productos y tuppers: TODO el inventario de la casa, recién pedido.
 *   En el Plan del día (P-15) puede haber dos recetas: sin pasos (solo
 *   miro qué me falta), con títulos h3 (van dentro de "Comida"/"Cena") y
 *   un sufijo para que los id no se repitan. En el Ayudante (P-21), cada
 *   tarjeta de receta lleva la suya, con títulos h4. conRaciones: "− 2
 *   raciones +" (solo en Receta, y si la receta dice para cuántos es); me
 *   avisan con alCambiarRaciones para que "La he cocinado" las lleve.
 * @returns {HTMLElement}
 */
export function crearVistaReceta({
  receta,
  productos,
  tuppers,
  conPasos = true,
  nivel = 'h2',
  sufijo = '',
  conRaciones = false,
  alCambiarRaciones,
}) {
  const idIngredientes = `titulo-ingredientes${sufijo}`;
  const idPasos = `titulo-pasos${sufijo}`;
  // Las raciones que estoy viendo: al principio, las de la receta. No se guardan.
  let elegidas = receta.raciones;
  const selector = conRaciones && receta.raciones !== null ? crearSelectorRaciones() : null;

  const resumen = el('p', { class: 'receta__resumen' });
  const ingredientes = el('ul', { class: 'receta__ingredientes' });
  const despensa = el('p', { class: 'receta__despensa tono--tenue' });

  /** Pinto el resumen y los ingredientes con las raciones elegidas. */
  function pintar() {
    const escalados = escalarIngredientes(receta.ingredientes, receta.raciones, elegidas);
    const filas = escalados.map((ingrediente) => ({ ingrediente, estado: estadoIngrediente(ingrediente, productos, tuppers) }));
    // Los básicos que no tengo (D-61) van aparte: no cuentan como "te falta".
    const basicos = filas.filter(({ ingrediente, estado }) => estado.tipo === 'falta' && esBasico(ingrediente.nombre));
    const resto = filas.filter((fila) => !basicos.includes(fila));

    // "Te faltan" cuenta lo que no tengo y lo que no me llega. "Otra unidad"
    // no: sí lo tengo, y "La he cocinado" preguntará cuánto he gastado.
    const faltan = resto.filter(({ estado }) => estado.tipo === 'falta' || estado.tipo === 'poco').length;
    let textoFaltan = 'Tienes todo';
    if (faltan === 1) textoFaltan = 'Te falta 1 ingrediente';
    else if (faltan > 1) textoFaltan = `Te faltan ${faltan} ingredientes`;
    // Con el selector, "Para 4 personas" sobra: ya lo dice él.
    const raciones = selector ? null : textoRaciones(receta.raciones);
    resumen.replaceChildren(
      ...(raciones ? [`${raciones} · `] : []),
      el('span', { class: faltan === 0 ? 'tono--exito' : 'tono--aviso' }, textoFaltan)
    );

    ingredientes.replaceChildren(...resto.map(({ ingrediente, estado }) => crearIngrediente(ingrediente, estado)));

    despensa.hidden = basicos.length === 0;
    const nombres = basicos.map(({ ingrediente }) => ingrediente.nombre.toLocaleLowerCase('es'));
    despensa.textContent = `Despensa: ${listaEnEspanol.format(nombres)}`;
  }

  /**
   * Una línea de ingrediente: su nombre y cantidad, cómo estoy de él y, si lo
   * que usaría caduca pronto, su caducidad ("✓ Tienes 200 g · Caduca hoy").
   * @param {import('/compartido/validacion.js').DatosIngrediente} ingrediente
   * @param {import('/compartido/cocina.js').EstadoIngrediente} estado
   */
  function crearIngrediente(ingrediente, estado) {
    const { texto, tono } = describirEstado(ingrediente, estado);
    const caducidad = caducidadDe(ingrediente, estado);
    return el(
      'li',
      {},
      el('span', { class: 'receta__ingrediente' }, `${ingrediente.nombre} · ${formatearCantidad(ingrediente.cantidad, ingrediente.unidad)}`),
      el(
        'span',
        { class: `tono--${tono}` },
        conMarca(texto),
        caducidad && [' · ', el('span', { class: `tono--${caducidad.tono}` }, caducidad.texto)]
      )
    );
  }

  /**
   * La caducidad de lo que usaría para este ingrediente (el producto que
   * antes caduca, o el tupper), solo si caduca pronto. Si no, null.
   * @param {import('/compartido/validacion.js').DatosIngrediente} ingrediente
   * @param {import('/compartido/cocina.js').EstadoIngrediente} estado
   */
  function caducidadDe(ingrediente, estado) {
    let fecha = null;
    if (estado.tipo === 'tupper') fecha = estado.tupper.fechaLimite ?? null;
    // buscarProductos() ya los da con el que antes caduca primero.
    else if (estado.tipo !== 'falta') fecha = buscarProductos(ingrediente, productos)[0]?.fechaCaducidad ?? null;
    return fecha && esPronto(fecha) ? avisoCaducidad(fecha) : null;
  }

  /**
   * "− 2 raciones +". Los botones no se desactivan en el límite (con
   * disabled, el foco se perdería): llevan aria-disabled y no hacen nada.
   * El número está en un <output> con aria-live: el lector dice "4 raciones".
   */
  function crearSelectorRaciones() {
    const numero = el('output', { class: 'raciones__numero', 'aria-live': 'polite' });
    const menos = el(
      'button',
      { class: 'boton-icono', type: 'button', 'aria-label': 'Menos raciones', title: 'Menos raciones', onclick: () => cambiar(-1) },
      crearIcono('menos')
    );
    const mas = el(
      'button',
      { class: 'boton-icono', type: 'button', 'aria-label': 'Más raciones', title: 'Más raciones', onclick: () => cambiar(1) },
      crearIcono('mas')
    );

    /** @param {number} paso -1 o +1 */
    function cambiar(paso) {
      const nuevas = elegidas + paso;
      if (nuevas < MIN_RACIONES || nuevas > MAX_RACIONES) return;
      elegidas = nuevas;
      actualizar();
      pintar();
      alCambiarRaciones?.(elegidas);
    }

    function actualizar() {
      numero.textContent = elegidas === 1 ? '1 ración' : `${elegidas} raciones`;
      menos.setAttribute('aria-disabled', String(elegidas <= MIN_RACIONES));
      mas.setAttribute('aria-disabled', String(elegidas >= MAX_RACIONES));
    }

    actualizar();
    return el('div', { class: 'raciones', role: 'group', 'aria-label': 'Raciones' }, menos, numero, mas);
  }

  pintar();

  return el(
    'div',
    { class: 'receta' },
    resumen,
    selector,
    el(
      'section',
      { class: 'receta__seccion', 'aria-labelledby': idIngredientes },
      el(nivel, { class: 'titulo-seccion', id: idIngredientes }, 'Ingredientes'),
      ingredientes,
      despensa
    ),
    conPasos &&
      el(
        'section',
        { class: 'receta__seccion', 'aria-labelledby': idPasos },
        el(nivel, { class: 'titulo-seccion', id: idPasos }, 'Pasos'),
        el('ol', { class: 'receta__pasos' }, receta.pasos.map((paso) => el('li', {}, paso)))
      )
  );
}
