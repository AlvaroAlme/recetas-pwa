/**
 * @file FilaCocinar (DISENO_UI §3.3, P-12): un ingrediente en "La he
 * cocinado". Propone de qué producto descontar (el que antes caduca) y
 * cuánto, ya en la unidad del producto (cantidadPropuesta()). Si las
 * unidades no cuadran, PREGUNTA cuánto he gastado en vez de inventárselo.
 * Un tupper sale como casilla; lo que no está en casa, como aviso.
 *
 * El estado de la fila es un objeto que comparto con la pantalla: lo cambio
 * aquí mismo y aviso con alCambiar() (como LineaTicket). No llamo a la API.
 */
import { buscarProductos, buscarTupper, cantidadPropuesta, redondear } from '/compartido/cocina.js';
import { formatearCantidad } from '/compartido/formato.js';
import { ETIQUETAS_UBICACION } from '/compartido/ubicaciones.js';
import { el } from '../dom.js';
import { crearCampo, crearSelector, ponerErrorCampo } from './ui/index.js';

/**
 * @typedef {import('/compartido/cocina.js').Producto & { ubicacion: string }} ProductoCasa
 * @typedef {Object} FilaCocinar
 * @property {import('/compartido/validacion.js').DatosIngrediente} ingrediente
 * @property {ProductoCasa[]} candidatos Los productos que pueden ser este ingrediente.
 * @property {import('/compartido/cocina.js').Tupper | null} tupper Solo si no hay productos.
 * @property {number | null} productoId De cuál descuento.
 * @property {string} cantidad Lo escrito en el campo ("0,3"), en la unidad del producto.
 * @property {boolean} noDescontar
 * @property {boolean} consumirTupper
 */

/** 0.3 → "0,3", como lo escribimos aquí. */
const numeroATexto = (numero) => String(numero).replace('.', ',');

/** Termino la frase con punto, pero sin repetirlo: "2 ud." ya lo trae. */
const conPunto = (texto) => (texto.endsWith('.') ? texto : `${texto}.`);

/**
 * La propuesta para un producto, ya como texto ('' si las unidades no cuadran).
 * @param {import('/compartido/validacion.js').DatosIngrediente} ingrediente
 * @param {ProductoCasa} producto
 */
function textoPropuesta(ingrediente, producto) {
  const propuesta = cantidadPropuesta(ingrediente, producto);
  return propuesta === null ? '' : numeroATexto(propuesta);
}

/**
 * Preparo la fila de un ingrediente con lo que hay en casa. De los productos
 * que encajan, el primero cuyas unidades cuadren (ya vienen ordenados por
 * caducidad); si ninguno cuadra, el primero, y pregunto.
 * @param {import('/compartido/validacion.js').DatosIngrediente} ingrediente
 * @param {ProductoCasa[]} productos Todo el inventario de la casa.
 * @param {import('/compartido/cocina.js').Tupper[]} tuppers
 * @returns {FilaCocinar}
 */
export function crearEstadoFila(ingrediente, productos, tuppers) {
  const candidatos = buscarProductos(ingrediente, productos);
  const tupper = candidatos.length === 0 ? buscarTupper(ingrediente, tuppers) : null;
  const producto = candidatos.find((candidato) => cantidadPropuesta(ingrediente, candidato) !== null) ?? candidatos[0] ?? null;
  return {
    ingrediente,
    candidatos,
    tupper,
    productoId: producto?.id ?? null,
    cantidad: producto ? textoPropuesta(ingrediente, producto) : '',
    noDescontar: false,
    consumirTupper: tupper !== null,
  };
}

/**
 * El producto elegido en la fila, o null.
 * @param {FilaCocinar} fila
 * @returns {ProductoCasa | null}
 */
function productoElegido(fila) {
  return fila.candidatos.find((producto) => producto.id === fila.productoId) ?? null;
}

/**
 * Lo que impide descontar esta fila, o null si está bien (o no hay nada que descontar).
 * @param {FilaCocinar} fila
 * @returns {string | null}
 */
export function problemaFila(fila) {
  const producto = productoElegido(fila);
  if (fila.noDescontar || !producto) return null;
  if (fila.cantidad.trim() === '') return 'Indica cuánto has gastado.';
  const cantidad = Number(fila.cantidad.replace(',', '.'));
  if (!Number.isFinite(cantidad) || redondear(cantidad) <= 0) return 'Debe ser un número mayor que 0.';
  if (redondear(cantidad) > producto.cantidad) return conPunto(`Solo tienes ${formatearCantidad(producto.cantidad, producto.unidad)}`);
  return null;
}

/**
 * Lo que mando a /api/cocinar por esta fila (en la unidad del producto), o null.
 * @param {FilaCocinar} fila
 * @returns {{ productoId: number, cantidad: number } | null}
 */
export function descuentoDeFila(fila) {
  if (fila.noDescontar || !productoElegido(fila) || problemaFila(fila)) return null;
  return { productoId: fila.productoId, cantidad: redondear(Number(fila.cantidad.replace(',', '.'))) };
}

/**
 * @param {{ fila: FilaCocinar, numero: number, alCambiar: () => void }} opciones
 *   numero: para que los campos y los radios de cada fila no se repitan.
 * @returns {HTMLElement}
 */
export function crearFilaCocinar({ fila, numero, alCambiar }) {
  const { ingrediente } = fila;
  const idTitulo = `titulo-cocinar-${numero}`;
  const articulo = el(
    'article',
    { class: 'tarjeta fila-cocinar', 'aria-labelledby': idTitulo },
    el('h2', { class: 'fila-cocinar__titulo', id: idTitulo }, `${ingrediente.nombre} · ${formatearCantidad(ingrediente.cantidad, ingrediente.unidad)}`)
  );

  // Un tupper: una casilla, marcada (si cocino con él, lo normal es que se acabe).
  if (fila.tupper) {
    articulo.append(
      el(
        'label',
        { class: 'casilla' },
        el('input', {
          class: 'casilla__entrada',
          type: 'checkbox',
          checked: fila.consumirTupper,
          onchange: (evento) => {
            fila.consumirTupper = evento.target.checked;
            alCambiar();
          },
        }),
        el('span', {}, `Marcar el tupper «${fila.tupper.nombre}» como consumido`)
      )
    );
    return articulo;
  }

  // No está en casa: no hay nada que descontar.
  if (fila.candidatos.length === 0) {
    articulo.append(el('p', { class: 'tono--tenue' }, 'No está en tu inventario: no se descuenta nada.'));
    return articulo;
  }

  const pregunta = el('p', { class: 'fila-cocinar__pregunta' });
  const campo = crearCampo({
    etiqueta: '',
    nombre: `descontar-${numero}`,
    valor: fila.cantidad,
    atributos: {
      inputmode: 'decimal',
      autocomplete: 'off',
      oninput: (evento) => {
        fila.cantidad = evento.target.value;
        actualizar();
        alCambiar();
      },
    },
  });
  const etiqueta = campo.querySelector('.campo__etiqueta');
  const quedaran = el('p', { class: 'fila-cocinar__quedaran', role: 'status' });
  const botonNoDescontar = el('button', { class: 'boton boton--fantasma boton--ajustado', type: 'button', onclick: alternarNoDescontar });

  // ¿De cuál? Solo pregunto si hay más de uno; si no, digo de dónde sale.
  const origen =
    fila.candidatos.length > 1
      ? crearSelector({
          leyenda: '¿De cuál lo has usado?',
          nombre: `producto-${numero}`,
          opciones: fila.candidatos.map((producto) => ({
            valor: String(producto.id),
            etiqueta: `${producto.nombre} · ${ETIQUETAS_UBICACION[producto.ubicacion]} ${formatearCantidad(producto.cantidad, producto.unidad)}`,
          })),
          seleccionado: String(fila.productoId),
          alCambiar: (valor) => {
            fila.productoId = Number(valor);
            // Otro producto puede ir en otra unidad: vuelvo a proponer.
            fila.cantidad = textoPropuesta(ingrediente, productoElegido(fila));
            campo.querySelector('input').value = fila.cantidad;
            actualizar();
            alCambiar();
          },
        })
      : el('p', { class: 'tono--tenue' }, `De «${fila.candidatos[0].nombre}» (${ETIQUETAS_UBICACION[fila.candidatos[0].ubicacion]}, ${formatearCantidad(fila.candidatos[0].cantidad, fila.candidatos[0].unidad)}).`);

  articulo.append(origen, pregunta, campo, quedaran, el('div', { class: 'fila-cocinar__acciones' }, botonNoDescontar));

  /** Pongo al día todo lo que depende de lo elegido y lo escrito. */
  function actualizar() {
    const producto = productoElegido(fila);
    const problema = problemaFila(fila);

    etiqueta.textContent = `Descontar (${producto.unidad})`;
    // Si las unidades no cuadran, lo digo con palabras y pregunto.
    const cuadran = cantidadPropuesta(ingrediente, producto) !== null;
    pregunta.hidden = cuadran;
    pregunta.textContent = cuadran
      ? ''
      : `La receta pide ${formatearCantidad(ingrediente.cantidad, ingrediente.unidad)}, pero tienes «${producto.nombre}» en ${producto.unidad}. ¿Cuánto has gastado?`;

    ponerErrorCampo(campo, fila.noDescontar ? null : problema);
    articulo.classList.toggle('fila-cocinar--revisar', Boolean(problema));
    articulo.classList.toggle('fila-cocinar--descartada', fila.noDescontar);
    campo.querySelector('input').disabled = fila.noDescontar;
    origen.querySelectorAll('input').forEach((radio) => {
      radio.disabled = fila.noDescontar;
    });
    botonNoDescontar.textContent = fila.noDescontar ? 'Descontar' : 'No descontar';
    botonNoDescontar.setAttribute('aria-pressed', String(fila.noDescontar));

    // "Quedarán 200 g." o "«Leche» quedará agotado.", solo si lo escrito vale.
    const descuento = descuentoDeFila(fila);
    if (!descuento) {
      quedaran.textContent = fila.noDescontar ? 'No se descuenta nada de este ingrediente.' : '';
    } else {
      const restante = redondear(producto.cantidad - descuento.cantidad);
      quedaran.textContent =
        restante === 0 ? `«${producto.nombre}» quedará agotado.` : conPunto(`Quedarán ${formatearCantidad(restante, producto.unidad)}`);
    }
  }

  function alternarNoDescontar() {
    fila.noDescontar = !fila.noDescontar;
    actualizar();
    alCambiar();
  }

  actualizar();
  return articulo;
}
