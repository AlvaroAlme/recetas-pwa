/**
 * @file Pantalla Inventario (P-04): lo que hay en la nevera, la despensa o el
 * congelador, ordenado por caducidad (index.tsx de la app Expo).
 *
 * La ubicación va en la URL (/?ubicacion=despensa): así, al volver de un
 * producto con "Atrás", sigues en la misma. Los tuppers llegan en su fase.
 */
import { UBICACIONES } from '/compartido/constantes.js';
import { avisoCaducidad, formatearCantidad } from '/compartido/formato.js';
import { ETIQUETAS_UBICACION } from '/compartido/ubicaciones.js';
import { api } from '../api.js';
import { crearAviso, crearCarga, crearFila, crearSelector, crearVacio } from '../componentes/ui/index.js';
import { el } from '../dom.js';

/**
 * @param {{ consulta: URLSearchParams }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaInventario({ consulta }) {
  // Si la URL trae una ubicación que no existe, uso la nevera (DISENO_UI §5.2).
  const pedida = consulta.get('ubicacion');
  let ubicacion = UBICACIONES.includes(pedida) ? pedida : 'nevera';

  const zona = el('div', { class: 'inventario__zona' });
  const botonNuevo = el('a', { class: 'boton boton--primario' }, '+ Producto');
  // Igual que en el router: si cambio de ubicación mientras carga, la
  // respuesta vieja no pinta encima de la nueva.
  let turno = 0;

  /** Enlace a "Nuevo producto" con la ubicación ya elegida. */
  const enlaceNuevo = () => `/producto/nuevo?ubicacion=${ubicacion}`;

  async function cargar() {
    const miTurno = ++turno;
    botonNuevo.setAttribute('href', enlaceNuevo());
    zona.replaceChildren(crearCarga('Cargando inventario…'));
    try {
      const { productos } = await api.get(`/productos?ubicacion=${ubicacion}`);
      if (miTurno !== turno) return;
      zona.replaceChildren(productos.length === 0 ? crearEstadoVacio() : crearLista(productos));
    } catch (error) {
      if (miTurno !== turno) return;
      zona.replaceChildren(
        crearAviso({
          mensaje: error.codigo === 'SIN_CONEXION' ? error.message : 'No se ha podido cargar el inventario.',
          accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
        })
      );
    }
  }

  function crearEstadoVacio() {
    return crearVacio({
      titulo: `${ETIQUETAS_UBICACION[ubicacion]} vacía`,
      descripcion: 'Añade lo que tienes a mano con el botón «+ Producto».',
      accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: enlaceNuevo() }, 'Añadir producto'),
    });
  }

  function crearLista(productos) {
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
    ubicacion = valor;
    history.replaceState(null, '', `/?ubicacion=${valor}`);
    cargar();
  }

  cargar();

  return {
    titulo: 'Inventario',
    contenido: el(
      'div',
      { class: 'inventario' },
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
    pie: [botonNuevo],
  };
}