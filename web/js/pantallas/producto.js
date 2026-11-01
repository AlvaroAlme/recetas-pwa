/**
 * @file Pantalla Nuevo / editar producto (P-05).
 * /producto/nuevo?ubicacion=… da de alta; /producto/7 carga el 7 y lo edita.
 * Al editar, también se mueve y se borra.
 */
import { UBICACIONES } from '/compartido/constantes.js';
import { api, mensajeDeError } from '../api.js';
import { crearFormularioProducto } from '../componentes/formularioProducto.js';
import { confirmar, crearAviso, crearCarga, crearVacio, ponerCargando } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';
import { ETIQUETAS_UBICACION } from '/compartido/ubicaciones.js';

/**
 * Cómo pide el formulario el historial de nombres: él no llama a la API.
 * @param {string} texto
 */
async function buscarHistorial(texto) {
  const { nombres } = await api.get(`/productos/nombres?q=${encodeURIComponent(texto.trim())}`);
  return nombres;
}

/**
 * @param {{ parametros: Record<string, string>, consulta: URLSearchParams }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaProducto({ parametros, consulta }) {
  // El router ya ha comprobado que el id es un entero positivo.
  return parametros.id ? pantallaEditar(Number(parametros.id)) : pantallaNuevo(consulta);
}

/**
 * Alta de un producto.
 * @param {URLSearchParams} consulta
 * @returns {import('../router.js').Vista}
 */
function pantallaNuevo(consulta) {
  // La pestaña desde la que se pulsó "+ Producto". Viene de la URL: la valido.
  const pedida = consulta.get('ubicacion');
  const { formulario, boton } = crearFormularioProducto({
    ubicacionSugerida: UBICACIONES.includes(pedida) ? pedida : undefined,
    textoBoton: 'Añadir al inventario',
    buscarHistorial,
    alGuardar: async (datos) => {
      await api.post('/productos', datos);
      // Reemplazar: así "Atrás" desde el inventario no vuelve al formulario ya guardado.
      navegar(`/?ubicacion=${datos.ubicacion}`, {
        reemplazar: true,
        mensaje: `«${datos.nombre}» añadido al inventario.`,
      });
    },
  });
  return { titulo: 'Nuevo producto', contenido: formulario, pie: [boton], atras: '/' };
}

/**
 * Edición de un producto. Devuelvo la vista enseguida, con "Cargando…", y
 * la relleno cuando llega el producto (como el Inventario).
 * @param {number} id
 * @returns {import('../router.js').Vista}
 */
function pantallaEditar(id) {
  const zona = el('div');
  // El botón "Guardar cambios" no existe hasta tener el producto: le guardo
  // el sitio en el pie. Mientras está vacío, el pie no se ve (CSS :has).
  const ranuraBoton = el('div', { class: 'pie__ranura' });

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando…'));
    let producto;
    try {
      ({ producto } = await api.get(`/productos/${id}`));
    } catch (error) {
      zona.replaceChildren(error.codigo === 'NO_EXISTE' ? crearNoExiste() : crearError(error));
      return;
    }
    // Un producto agotado ya no está en el inventario: para el usuario, no existe.
    if (producto.agotado) {
      zona.replaceChildren(crearNoExiste());
      return;
    }

    const { formulario, boton } = crearFormularioProducto({
      inicial: producto,
      textoBoton: 'Guardar cambios',
      buscarHistorial,
      alGuardar: async (datos) => {
        await api.put(`/productos/${id}`, datos);
        navegar(`/?ubicacion=${datos.ubicacion}`, { reemplazar: true, mensaje: 'Cambios guardados.' });
      },
    });
    zona.replaceChildren(formulario, ...crearAcciones(producto));
    ranuraBoton.replaceChildren(boton);
  }

    /**
   * La parte de abajo al editar: "Mover" a las otras ubicaciones y "Borrar".
   * @param {any} producto El que he cargado.
   * @returns {HTMLElement[]}
   */
  function crearAcciones(producto) {
    const aviso = el('div');
    const destinos = UBICACIONES.filter((destino) => destino !== producto.ubicacion);
    const botonesMover = destinos.map((destino) =>
      el(
        'button',
        { class: 'boton boton--secundario', type: 'button', onclick: (evento) => mover(destino, evento.currentTarget) },
        `A ${ETIQUETAS_UBICACION[destino]}`
      )
    );
    const botonBorrar = el('button', { class: 'boton boton--peligro', type: 'button', onclick: borrar }, 'Borrar producto');

    async function mover(destino, boton) {
      // Mientras se mueve, no dejo pulsar el otro destino (no moverlo dos veces).
      for (const otro of botonesMover) otro.disabled = true;
      ponerCargando(boton, true, 'Moviendo…');
      try {
        await api.patch(`/productos/${id}`, { ubicacion: destino });
        navegar(`/?ubicacion=${destino}`, {
          reemplazar: true,
          mensaje: `«${producto.nombre}» movido a ${ETIQUETAS_UBICACION[destino]}.`,
        });
      } catch (error) {
        ponerCargando(boton, false);
        for (const otro of botonesMover) otro.disabled = false;
        aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido mover el producto.') }));
      }
    }

    async function borrar() {
      const seguro = await confirmar({
        titulo: 'Borrar producto',
        texto: `¿Seguro que quieres borrar «${producto.nombre}»?`,
        textoConfirmar: 'Borrar',
        peligroso: true,
      });
      if (!seguro) return;
      ponerCargando(botonBorrar, true, 'Borrando…');
      try {
        await api.borrar(`/productos/${id}`);
        navegar(`/?ubicacion=${producto.ubicacion}`, {
          reemplazar: true,
          mensaje: `«${producto.nombre}» borrado del inventario.`,
        });
      } catch (error) {
        ponerCargando(botonBorrar, false);
        aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido borrar.') }));
      }
    }

    return [
      aviso,
      el(
        'section',
        { class: 'seccion', 'aria-labelledby': 'titulo-mover' },
        el('h2', { class: 'titulo-seccion', id: 'titulo-mover' }, 'Mover'),
        el('div', { class: 'seccion__acciones' }, botonesMover)
      ),
      botonBorrar,
    ];
  }

  function crearNoExiste() {
    return crearVacio({
      titulo: 'Este producto ya no existe',
      descripcion: 'Puede que se haya borrado o agotado.',
      accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/' }, 'Volver al inventario'),
    });
  }

  /** @param {import('../api.js').ErrorApi} error */
  function crearError(error) {
    return crearAviso({
      mensaje: error.codigo === 'SIN_CONEXION' ? error.message : 'No se ha podido cargar el producto.',
      accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
    });
  }

  cargar();
  return { titulo: 'Editar producto', contenido: zona, pie: [ranuraBoton], atras: '/' };
}