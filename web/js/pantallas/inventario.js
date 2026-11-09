/**
 * @file Pantalla Inventario (P-04): lo que hay en la nevera, la despensa o el
 * congelador, ordenado por caducidad (index.tsx de la app Expo). Arriba, los
 * tuppers de esa ubicación; debajo, los productos.
 *
 * La ubicación va en la URL (/?ubicacion=despensa): así, al volver de un
 * producto con "Atrás", sigues en la misma.
 */
import { UBICACIONES } from '/compartido/constantes.js';
import { avisoCaducidad, formatearCantidad } from '/compartido/formato.js';
import { ETIQUETAS_UBICACION } from '/compartido/ubicaciones.js';
import { api, mensajeDeError } from '../api.js';
import { crearAviso, crearCarga, crearFila, crearSelector, crearSinConexion, crearVacio } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { tomarMensaje } from '../router.js';

/**
 * @param {{ consulta: URLSearchParams }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaInventario({ consulta }) {
  // "Producto añadido.", "Cambios guardados."… si vengo de guardar algo.
  const mensaje = tomarMensaje();
  // Lo guardo en una constante para poder quitarlo al cambiar de ubicación.
  // Si llega como { texto, tipo: 'aviso' } (tupper guardado sin aviso), va en amarillo y sin ✓.
  const avisoMensaje =
    mensaje &&
    (typeof mensaje === 'string'
      ? crearAviso({ tipo: 'exito', mensaje: `✓ ${mensaje}` })
      : crearAviso({ tipo: mensaje.tipo, mensaje: mensaje.texto }));
  // Si la URL trae una ubicación que no existe, uso la nevera (DISENO_UI §5.2).
  const pedida = consulta.get('ubicacion');
  let ubicacion = UBICACIONES.includes(pedida) ? pedida : 'nevera';

  const zona = el('div', { class: 'inventario__zona' });
  const botonNuevo = el('a', { class: 'boton boton--primario' }, '+ Producto');
  const botonTupper = el('a', { class: 'boton boton--secundario' }, '+ Tupper');
  // Igual que en el router: si cambio de ubicación mientras carga, la
  // respuesta vieja no pinta encima de la nueva.
  let turno = 0;

  /** Enlace a "Nuevo producto" con la ubicación ya elegida. */
  const enlaceNuevo = () => `/producto/nuevo?ubicacion=${ubicacion}`;

  async function cargar() {
    const miTurno = ++turno;
    botonNuevo.setAttribute('href', enlaceNuevo());
    botonTupper.setAttribute('href', `/tupper/nuevo?ubicacion=${ubicacion}`);
    zona.replaceChildren(crearCarga('Cargando inventario…'));
    try {
      // Las dos peticiones a la vez: no espero a una para lanzar la otra.
      const [{ productos }, { tuppers }] = await Promise.all([
        api.get(`/productos?ubicacion=${ubicacion}`),
        api.get(`/tuppers?ubicacion=${ubicacion}`),
      ]);
      if (miTurno !== turno) return;
      if (productos.length === 0 && tuppers.length === 0) {
        zona.replaceChildren(crearEstadoVacio());
      } else if (tuppers.length === 0) {
        // Sin tuppers, la lista de siempre, sin títulos de sección.
        zona.replaceChildren(crearListaProductos(productos));
      } else {
        zona.replaceChildren(
          crearSeccion('Tuppers', crearListaTuppers(tuppers)),
          crearSeccion('Productos', productos.length > 0 ? crearListaProductos(productos) : crearSinProductos())
        );
      }
    } catch (error) {
      if (miTurno !== turno) return;
      zona.replaceChildren(
        error.codigo === 'SIN_CONEXION'
          ? crearSinConexion(cargar)
          : crearAviso({
              mensaje: mensajeDeError(error, 'No se ha podido cargar el inventario.'),
              accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
            })
      );
    }
  }

  function crearEstadoVacio() {
    return crearVacio({
      // "Congelador" es masculino: no vale añadir "vacía" a cualquier ubicación.
      titulo: ubicacion === 'congelador' ? 'Congelador vacío' : `${ETIQUETAS_UBICACION[ubicacion]} vacía`,
      descripcion: 'Añade lo que tienes a mano con «+ Producto», o lo que te ha sobrado con «+ Tupper».',
      accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: enlaceNuevo() }, 'Añadir producto'),
    });
  }

  /**
   * Una sección con su título (h2), enlazado con aria-labelledby para que el
   * lector diga "Tuppers, región".
   * @param {string} titulo
   * @param {Node} contenido
   */
  function crearSeccion(titulo, contenido) {
    const id = `titulo-${titulo.toLowerCase()}`;
    return el(
      'section',
      { class: 'seccion', 'aria-labelledby': id },
      el('h2', { class: 'titulo-seccion', id }, titulo),
      contenido
    );
  }

  function crearSinProductos() {
    return el('p', { class: 'tono--tenue' }, 'No hay productos en esta ubicación.');
  }

  function crearListaTuppers(tuppers) {
    return el(
      'ul',
      { class: 'lista' },
      tuppers.map((tupper) => {
        const aviso = avisoCaducidad(tupper.fechaLimite);
        return crearFila({
          href: `/tupper/${tupper.id}`,
          titulo: tupper.nombre,
          subtitulo: aviso.texto,
          tono: aviso.tono,
          detalle: 'Tupper',
        });
      })
    );
  }

  function crearListaProductos(productos) {
    return el(
      'ul',
      { class: 'lista' },
      productos.map((producto) => {
        const aviso = producto.fechaCaducidad ? avisoCaducidad(producto.fechaCaducidad) : null;
        return crearFila({
          href: `/producto/${producto.id}`,
          titulo: producto.nombre,
          subtitulo: aviso?.texto,
          tono: aviso?.tono,
          detalle: formatearCantidad(producto.cantidad, producto.unidad),
        });
      })
    );
  }

  // Cambiar de ubicación NO repinta la pantalla entera: cambio la URL sin
  // añadir historial y recargo solo la lista. Así el foco se queda en el chip.
  function cambiarUbicacion(valor) {
    // El mensaje ("«Leche» borrado…") era de la ubicación anterior: lo quito.
    if (avisoMensaje) avisoMensaje.remove();
    ubicacion = valor;
    history.replaceState(history.state, '', `/?ubicacion=${valor}`);
    cargar();
  }

  cargar();

  return {
    titulo: 'Inventario',
    contenido: el(
      'div',
      { class: 'inventario' },
      avisoMensaje,
      crearSelector({
        leyenda: 'Ubicación',
        nombre: 'ubicacion',
        leyendaVisible: false,
        opciones: UBICACIONES.map((valor) => ({ valor, etiqueta: ETIQUETAS_UBICACION[valor] })),
        seleccionado: ubicacion,
        alCambiar: cambiarUbicacion,
      }),
      zona
    ),
    pie: [botonTupper, botonNuevo],
  };
}
