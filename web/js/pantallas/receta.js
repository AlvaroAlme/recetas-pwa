/**
 * @file Pantalla Receta (P-11): una receta con "qué me falta" calculado al
 * abrirla, con TODO el inventario de la casa recién pedido (si alguien acaba
 * de gastar algo, ya sale). Desde aquí: Editar, Borrar y "La he cocinado".
 */
import { UBICACIONES } from '/compartido/constantes.js';
import { api, mensajeDeError } from '../api.js';
import { confirmar, crearAviso, crearCarga, crearSinConexion, crearVacio, ponerCargando } from '../componentes/ui/index.js';
import { crearVistaReceta } from '../componentes/vistaReceta.js';
import { el } from '../dom.js';
import { navegar, ponerTitulo, tomarMensaje } from '../router.js';

/**
 * Todo lo que hay en casa: productos y tuppers de las tres ubicaciones. La
 * API los da por ubicación, así que pido las seis listas a la vez.
 * @returns {Promise<{ productos: any[], tuppers: any[] }>}
 */
export async function cargarInventarioCompleto() {
  const respuestas = await Promise.all(
    UBICACIONES.flatMap((ubicacion) => [api.get(`/productos?ubicacion=${ubicacion}`), api.get(`/tuppers?ubicacion=${ubicacion}`)])
  );
  return {
    productos: respuestas.flatMap((respuesta) => respuesta.productos ?? []),
    tuppers: respuestas.flatMap((respuesta) => respuesta.tuppers ?? []),
  };
}

/**
 * @param {{ parametros: Record<string, string> }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaReceta({ parametros }) {
  // El router ya ha comprobado que el id es un entero positivo.
  const id = Number(parametros.id);
  // "Receta guardada.", "Cambios guardados."… si vengo del formulario.
  const mensaje = tomarMensaje();
  const zona = el('div');
  // "La he cocinado" no sale hasta tener la receta: le guardo el sitio en el pie.
  const ranuraBoton = el('div', { class: 'pie__ranura' });
  // "Editar", en la cabecera, también espera a la receta (si no existe, no tiene sentido).
  const botonEditar = el('a', { class: 'boton boton--secundario boton--ajustado', href: `/receta/${id}/editar`, hidden: true }, 'Editar');

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando…'));
    let receta;
    let inventario;
    try {
      // La receta y el inventario a la vez: no espero a una para pedir lo otro.
      [{ receta }, inventario] = await Promise.all([api.get(`/recetas/${id}`), cargarInventarioCompleto()]);
    } catch (error) {
      zona.replaceChildren(error.codigo === 'NO_EXISTE' ? crearNoExiste() : crearError(error));
      return;
    }

    ponerTitulo(receta.nombre);
    botonEditar.hidden = false;
    // replaceChildren es del navegador: un undefined lo pintaría como texto. Por eso el "...[]".
    zona.replaceChildren(
      ...(mensaje ? [crearAviso({ tipo: 'exito', mensaje: `✓ ${mensaje}` })] : []),
      crearVistaReceta({ receta, productos: inventario.productos, tuppers: inventario.tuppers }),
      ...crearBorrar(receta)
    );
    ranuraBoton.replaceChildren(
      el('a', { class: 'boton boton--primario', href: `/cocinar?receta=${id}` }, 'La he cocinado')
    );
  }

  /**
   * "Borrar receta", con confirmación, al final de la pantalla.
   * @param {{ nombre: string }} receta
   * @returns {HTMLElement[]}
   */
  function crearBorrar(receta) {
    const aviso = el('div');
    const boton = el(
      'button',
      { class: 'boton boton--fantasma receta__borrar', type: 'button', 'data-escribe': true, onclick: borrar },
      'Borrar receta'
    );

    async function borrar() {
      const seguro = await confirmar({
        titulo: 'Borrar receta',
        texto: `Se borrará «${receta.nombre}». No se puede deshacer.`,
        textoConfirmar: 'Borrar',
        peligroso: true,
      });
      if (!seguro) return;
      ponerCargando(boton, true, 'Borrando…');
      try {
        await api.borrar(`/recetas/${id}`);
        navegar('/recetas', { reemplazar: true, mensaje: `«${receta.nombre}» borrada.` });
      } catch (error) {
        ponerCargando(boton, false);
        aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido borrar la receta.') }));
      }
    }

    return [aviso, boton];
  }

  function crearNoExiste() {
    return crearVacio({
      titulo: 'Esta receta ya no existe',
      descripcion: 'Puede que alguien de tu casa la haya borrado.',
      accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/recetas' }, 'Volver a las recetas'),
    });
  }

  /** @param {import('../api.js').ErrorApi} error */
  function crearError(error) {
    if (error.codigo === 'SIN_CONEXION') return crearSinConexion(cargar);
    return crearAviso({
      mensaje: mensajeDeError(error, 'No se ha podido abrir la receta.'),
      accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
    });
  }

  cargar();
  return { titulo: 'Receta', contenido: zona, pie: [ranuraBoton], accion: botonEditar, atras: '/recetas' };
}
