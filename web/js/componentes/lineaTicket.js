/**
 * @file Una línea del ticket (LineaTicket, DISENO_UI §3.3): corregirla,
 * eliminarla o confirmarla. Confirmada, se ve en una línea:
 * "✓ Leche · 6 l · Despensa — Toca para editar". No llamo a la API: cambio
 * la línea y aviso a la pantalla con alCambiar y alEliminar.
 */
import { UBICACIONES, UNIDADES } from '/compartido/constantes.js';
import { formatearCantidad } from '/compartido/formato.js';
import { ETIQUETAS_UBICACION, listarUbicaciones, ubicacionesPosibles } from '/compartido/ubicaciones.js';
import { validarProducto } from '/compartido/validacion.js';
import { el } from '../dom.js';
import { crearCampo, crearSelector, elegirEnSelector, ponerErrorCampo, recomendarEnSelector } from './ui/index.js';

/**
 * Una línea del ticket mientras la reviso.
 * @typedef {Object} Linea
 * @property {string} nombre
 * @property {string} cantidad Tal cual está en el campo ("0,5").
 * @property {string} unidad
 * @property {string | null} ubicacion null = aún sin elegir.
 * @property {readonly string[]} posibles Dónde puede ir (para preguntar).
 * @property {boolean} confirmada
 */

/**
 * Paso un producto de Claude a una línea. La ubicación sale de mi
 * diccionario si conoce el alimento y, si no, de lo que diga Claude. Solo la
 * propongo si hay UNA; con varias, la línea pregunta (§7.2).
 * @param {{ nombre: string, cantidad: number, unidad: string, ubicacionesPosibles: string[] }} producto
 * @returns {Linea}
 */
export function crearLinea(producto) {
  const delDiccionario = ubicacionesPosibles(producto.nombre);
  const posibles = delDiccionario.length > 0 ? delDiccionario : producto.ubicacionesPosibles;
  return {
    nombre: producto.nombre,
    cantidad: String(producto.cantidad).replace('.', ','),
    unidad: producto.unidad,
    ubicacion: posibles.length === 1 ? posibles[0] : null,
    posibles,
    confirmada: false,
  };
}

/**
 * Compruebo la línea con el MISMO validarProducto() que el servidor (D-40).
 * @param {Linea} linea
 * @returns {import('/compartido/validacion.js').ResultadoProducto}
 */
export function problemaLinea(linea) {
  return validarProducto({
    nombre: linea.nombre,
    cantidad: Number(linea.cantidad.replace(',', '.')),
    unidad: linea.unidad,
    ubicacion: linea.ubicacion,
    fechaCaducidad: null,
  });
}

/**
 * @param {{ linea: Linea, numero: number, alCambiar: () => void, alEliminar: () => void }} opciones
 *   numero: para que los radios de cada línea tengan su propio name.
 * @returns {HTMLElement}
 */
export function crearLineaTicket({ linea, numero, alCambiar, alEliminar }) {
  const articulo = el('article', { class: 'tarjeta linea-ticket' });

  /** Confirmada, en una línea; si no, con sus campos. */
  function pintar() {
    articulo.replaceChildren(...(linea.confirmada ? vistaCompacta() : vistaEdicion()));
  }

  function vistaCompacta() {
    const cantidad = formatearCantidad(Number(linea.cantidad.replace(',', '.')), linea.unidad);
    return [
      el(
        'button',
        { class: 'linea-ticket__resumen', type: 'button', onclick: editar },
        el('span', {}, `✓ ${linea.nombre} · ${cantidad} · ${ETIQUETAS_UBICACION[linea.ubicacion]}`),
        el('span', { class: 'tono--tenue' }, 'Toca para editar')
      ),
    ];
  }

  /** Al tocar una línea confirmada: vuelve a editarse y deja de contar como confirmada. */
  function editar() {
    linea.confirmada = false;
    pintar();
    articulo.querySelector('input').focus();
    alCambiar();
  }

  function vistaEdicion() {
    const nombre = crearCampo({
      etiqueta: 'Producto',
      nombre: `nombre-${numero}`,
      valor: linea.nombre,
      atributos: { maxlength: 80, autocomplete: 'off', autocapitalize: 'sentences', oninput: alEscribirNombre },
    });
    const cantidad = crearCampo({
      etiqueta: 'Cantidad',
      nombre: `cantidad-${numero}`,
      valor: linea.cantidad,
      atributos: {
        inputmode: 'decimal',
        autocomplete: 'off',
        oninput: (evento) => {
          linea.cantidad = evento.target.value;
          alCambiar();
        },
      },
    });
    const unidad = crearSelector({
      leyenda: 'Unidad',
      nombre: `unidad-${numero}`,
      opciones: UNIDADES.map((valor) => ({ valor, etiqueta: valor })),
      seleccionado: linea.unidad,
      alCambiar: (valor) => {
        linea.unidad = valor;
        alCambiar();
      },
    });
    const pregunta = el('div', { class: 'pregunta', role: 'status' });
    const ubicacion = crearSelector({
      leyenda: 'Ubicación',
      nombre: `ubicacion-${numero}`,
      opciones: UBICACIONES.map((valor) => ({ valor, etiqueta: ETIQUETAS_UBICACION[valor] })),
      seleccionado: linea.ubicacion,
      alCambiar: (valor) => {
        linea.ubicacion = valor;
        ponerErrorCampo(ubicacion, null);
        actualizarPregunta();
        alCambiar();
      },
    });
    const CAMPOS = [
      ['nombre', nombre],
      ['cantidad', cantidad],
      ['unidad', unidad],
      ['ubicacion', ubicacion],
    ];

    /** "¿Dónde lo guardas?" si aún no hay ubicación y puede ir en varias. */
    function actualizarPregunta() {
      const hayQuePreguntar = linea.ubicacion === null && linea.posibles.length > 1;
      recomendarEnSelector(ubicacion, hayQuePreguntar ? linea.posibles : []);
      const texto = hayQuePreguntar ? `«${linea.nombre}» puede ir en ${listarUbicaciones(linea.posibles)}.` : '';
      // Solo cambio el recuadro si cambia la pregunta: el lector la anuncia una vez.
      if (pregunta.dataset.texto !== texto) {
        pregunta.dataset.texto = texto;
        pregunta.replaceChildren(...(texto ? [el('strong', {}, '¿Dónde lo guardas?'), el('p', {}, texto)] : []));
      }
    }

    /** Con cada letra recalculo dónde puede ir; si solo hay un sitio y no había elegido, lo marco. */
    function alEscribirNombre(evento) {
      linea.nombre = evento.target.value;
      const delDiccionario = ubicacionesPosibles(linea.nombre);
      if (delDiccionario.length > 0) linea.posibles = delDiccionario;
      if (linea.ubicacion === null && linea.posibles.length === 1) {
        linea.ubicacion = linea.posibles[0];
        elegirEnSelector(ubicacion, linea.ubicacion);
      }
      actualizarPregunta();
      alCambiar();
    }

    function confirmar() {
      const resultado = problemaLinea(linea);
      const errores = resultado.ok ? {} : resultado.errores;
      let primero = null;
      for (const [clave, campo] of CAMPOS) {
        ponerErrorCampo(campo, errores[clave]);
        if (errores[clave] && !primero) primero = campo;
      }
      if (primero) {
        // En la ubicación, el foco va al primer chip recomendado (§7.2).
        (primero.querySelector('.chip--recomendado')?.control ?? primero.querySelector('input')).focus();
        return;
      }
      linea.nombre = resultado.datos.nombre;
      linea.confirmada = true;
      pintar();
      articulo.querySelector('button').focus();
      alCambiar();
    }

    const acciones = el(
      'div',
      { class: 'linea-ticket__acciones' },
      el('button', { class: 'boton boton--fantasma boton--ajustado', type: 'button', onclick: alEliminar }, 'Eliminar'),
      el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: confirmar }, '✓ Confirmar')
    );
    actualizarPregunta();
    return [nombre, cantidad, unidad, el('div', {}, pregunta, ubicacion), acciones];
  }

  pintar();
  return articulo;
}