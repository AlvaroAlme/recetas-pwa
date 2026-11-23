/**
 * @file VistaReceta (DISENO_UI §3.3, P-11): los ingredientes de una receta
 * con cómo estoy de cada uno ("✓ Tienes 500 g", "Solo tienes…", "✗ Te
 * falta"…), el resumen ("Tienes todo" / "Te faltan 2 ingredientes") y los
 * pasos numerados. El cálculo es estadoIngrediente() (compartido/cocina.js);
 * aquí solo lo pinto. No llamo a la API: me pasan la receta y el inventario.
 */
import { convertir, estadoIngrediente } from '/compartido/cocina.js';
import { formatearCantidad } from '/compartido/formato.js';
import { el } from '../dom.js';
import { conMarca } from './ui/index.js';

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
 *   tuppers: import('/compartido/cocina.js').Tupper[],
 *   conPasos?: boolean,
 *   nivel?: 'h2' | 'h3' | 'h4',
 *   sufijo?: string
 * }} opciones productos y tuppers: TODO el inventario de la casa, recién pedido.
 *   En el Plan del día (P-15) puede haber dos recetas: sin pasos (solo
 *   miro qué me falta), con títulos h3 (van dentro de "Comida"/"Cena") y
 *   un sufijo para que los id no se repitan. En el Ayudante (P-21), cada
 *   tarjeta de receta lleva la suya, con títulos h4.
 * @returns {HTMLElement}
 */
export function crearVistaReceta({ receta, productos, tuppers, conPasos = true, nivel = 'h2', sufijo = '' }) {
  const idIngredientes = `titulo-ingredientes${sufijo}`;
  const idPasos = `titulo-pasos${sufijo}`;
  const estados = receta.ingredientes.map((ingrediente) => estadoIngrediente(ingrediente, productos, tuppers));
  // "Te faltan" cuenta lo que no tengo y lo que no me llega. "Otra unidad"
  // no: sí lo tengo, y "La he cocinado" preguntará cuánto he gastado.
  const faltan = estados.filter((estado) => estado.tipo === 'falta' || estado.tipo === 'poco').length;
  let textoFaltan = 'Tienes todo';
  if (faltan === 1) textoFaltan = 'Te falta 1 ingrediente';
  else if (faltan > 1) textoFaltan = `Te faltan ${faltan} ingredientes`;

  const raciones = textoRaciones(receta.raciones);
  const resumen = el(
    'p',
    { class: 'receta__resumen' },
    raciones && `${raciones} · `,
    el('span', { class: faltan === 0 ? 'tono--exito' : 'tono--aviso' }, textoFaltan)
  );

  const ingredientes = el(
    'ul',
    { class: 'receta__ingredientes' },
    receta.ingredientes.map((ingrediente, i) => {
      const { texto, tono } = describirEstado(ingrediente, estados[i]);
      return el(
        'li',
        {},
        el('span', { class: 'receta__ingrediente' }, `${ingrediente.nombre} · ${formatearCantidad(ingrediente.cantidad, ingrediente.unidad)}`),
        el('span', { class: `tono--${tono}` }, conMarca(texto))
      );
    })
  );

  return el(
    'div',
    { class: 'receta' },
    resumen,
    el(
      'section',
      { class: 'receta__seccion', 'aria-labelledby': idIngredientes },
      el(nivel, { class: 'titulo-seccion', id: idIngredientes }, 'Ingredientes'),
      ingredientes
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
