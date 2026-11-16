/**
 * @file Pantalla Plan del día (P-15, §7.4): /plan/2026-11-24. Es la que abre
 * el aviso de la noche anterior. Por cada plato, qué tengo y qué me falta,
 * calculado aquí con TODO el inventario recién pedido (como la receta, P-11).
 */
import { formatearCantidad } from '/compartido/formato.js';
import { buscarProductos } from '/compartido/cocina.js';
import { TIPOS_COMIDA } from '/compartido/constantes.js';
import { esFechaIso, hoyIso, sumarDias } from '/compartido/fechas.js';
import { ETIQUETAS_TIPO, dentroDelMargen, lunesDe, textoDia, textoDiaLargo } from '/compartido/plan.js';
import { api, mensajeDeError } from '../api.js';
import { crearAviso, crearCarga, crearSinConexion, crearVacio } from '../componentes/ui/index.js';
import { crearVistaReceta } from '../componentes/vistaReceta.js';
import { el } from '../dom.js';
import { cargarInventarioCompleto } from './receta.js';

/**
 * "Mañana (martes 24)", "Hoy (martes 24)" o "Martes 24 de noviembre".
 * @param {string} fecha
 */
function tituloDia(fecha) {
  const hoy = hoyIso();
  const dia = textoDia(fecha).toLocaleLowerCase('es');
  if (fecha === hoy) return `Hoy (${dia})`;
  if (fecha === sumarDias(hoy, 1)) return `Mañana (${dia})`;
  return textoDiaLargo(fecha);
}

/**
 * @param {{ parametros: Record<string, string> }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaPlanDia({ parametros }) {
  const { fecha } = parametros;
  if (!esFechaIso(fecha) || !dentroDelMargen(fecha, hoyIso())) {
    return {
      titulo: 'Plan del día',
      contenido: crearVacio({
        titulo: 'Día no válido',
        descripcion: 'Solo se puede ver el plan desde un año atrás hasta un año adelante.',
        accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/semana' }, 'Ir a esta semana'),
      }),
      atras: '/semana',
    };
  }

  const zona = el('div');

  async function cargar() {
    zona.replaceChildren(crearCarga('Comprobando ingredientes…'));
    let huecos;
    let inventario;
    try {
      [{ huecos }, inventario] = await Promise.all([api.get(`/plan/${fecha}`), cargarInventarioCompleto()]);
    } catch (error) {
      zona.replaceChildren(crearError(error));
      return;
    }

    if (huecos.length === 0) {
      zona.replaceChildren(
        crearVacio({
          titulo: 'Nada planificado',
          descripcion: `No hay comida ni cena para el ${textoDia(fecha).toLocaleLowerCase('es')}.`,
          accion: el('a', { class: 'boton boton--primario boton--ajustado', href: `/plan/${fecha}/comida` }, 'Planificar comida'),
        })
      );
      return;
    }
    zona.replaceChildren(
      el(
        'div',
        { class: 'plan-dia' },
        TIPOS_COMIDA.map((tipo) => crearPlato(tipo, huecos.find((hueco) => hueco.tipo === tipo) ?? null, inventario))
      )
    );
  }

  /**
   * La comida o la cena: qué es y, si se cocina en casa, qué me falta.
   * @param {import('/compartido/constantes.js').TipoComida} tipo
   * @param {any | null} hueco
   * @param {{ productos: any[], tuppers: any[] }} inventario
   */
  function crearPlato(tipo, hueco, { productos, tuppers }) {
    const idTitulo = `plato-${tipo}`;
    const cambiar = el(
      'a',
      { class: 'boton boton--fantasma boton--ajustado', href: `/plan/${fecha}/${tipo}`, 'aria-label': `Cambiar la ${tipo}` },
      hueco ? 'Cambiar' : 'Planificar'
    );
    const cabecera = el('div', { class: 'plan-dia__cabecera' }, el('h2', { class: 'titulo-seccion', id: idTitulo }, ETIQUETAS_TIPO[tipo]), cambiar);

    let cuerpo;
    if (!hueco) {
      cuerpo = [el('p', { class: 'tono--tenue' }, 'Sin planificar.')];
    } else if (hueco.fueraDeCasa) {
      cuerpo = [el('p', { class: 'texto--fuerte' }, 'Fuera de casa'), hueco.texto && el('p', { class: 'tono--tenue' }, hueco.texto)];
    } else if (hueco.receta) {
      cuerpo = [
        el(
          'div',
          { class: 'plan-dia__plato' },
          el('p', { class: 'texto--fuerte' }, hueco.receta.nombre),
          el('a', { class: 'boton boton--fantasma boton--ajustado', href: `/receta/${hueco.receta.id}` }, 'Ver receta')
        ),
        crearVistaReceta({ receta: hueco.receta, productos, tuppers, conPasos: false, nivel: 'h3', sufijo: `-${tipo}` }),
      ];
    } else {
      cuerpo = [el('p', { class: 'texto--fuerte' }, hueco.texto), ...crearLoQueHay(hueco.texto, productos)];
    }

    return el('section', { class: 'seccion', 'aria-labelledby': idTitulo }, cabecera, cuerpo);
  }

  /** @param {import('../api.js').ErrorApi} error */
  function crearError(error) {
    if (error.codigo === 'SIN_CONEXION') return crearSinConexion(cargar);
    return crearAviso({
      mensaje: mensajeDeError(error, 'No se ha podido cargar el plan del día.'),
      accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
    });
  }

  cargar();
  return { titulo: tituloDia(fecha), contenido: zona, atras: `/semana/${lunesDe(fecha)}` };
}

/**
 * Un plato escrito a mano no tiene ingredientes: enseño lo que hay en casa
 * con ese nombre (como plan/[dia].tsx de la app Expo), con buscarProductos().
 * @param {string} plato
 * @param {any[]} productos
 * @returns {HTMLElement[]}
 */
function crearLoQueHay(plato, productos) {
  const encontrados = buscarProductos({ nombre: plato }, productos);
  if (encontrados.length === 0) {
    return [
      el('p', { class: 'tono--tenue' }, 'Plato escrito a mano: no tiene lista de ingredientes.'),
      el('p', { class: 'tono--peligro' }, '✗ No hay nada con ese nombre en el inventario.'),
    ];
  }
  return [
    el('p', { class: 'tono--tenue' }, 'Plato escrito a mano: no tiene lista de ingredientes. Esto es lo que hay en casa con ese nombre:'),
    el(
      'ul',
      { class: 'receta__ingredientes' },
      encontrados.map((producto) =>
        el('li', {}, el('span', { class: 'tono--exito' }, `✓ ${producto.nombre}: ${formatearCantidad(producto.cantidad, producto.unidad)}`))
      )
    ),
  ];
}
