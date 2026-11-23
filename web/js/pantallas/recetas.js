/**
 * @file Pantalla Recetas (P-09, sin IA, D-48): el recetario de mi casa, las
 * más recientes primero. Desde aquí se abre cada receta o se escribe una
 * nueva. "Qué me falta" no va aquí: está en el detalle (P-11).
 */
import { api, mensajeDeError } from '../api.js';
import { conMarca, crearAviso, crearCarga, crearFila, crearSinConexion, crearVacio } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { tomarMensaje } from '../router.js';

/**
 * "Para 4 personas", "Para 1 persona", o nada si no lo sé.
 * @param {number | null} raciones
 * @returns {string | undefined}
 */
function textoRaciones(raciones) {
  if (raciones === null) return undefined;
  return raciones === 1 ? 'Para 1 persona' : `Para ${raciones} personas`;
}

/** @returns {import('../router.js').Vista} */
export function pantallaRecetas() {
  // "«Tortilla» borrada." si vengo de borrar una receta.
  const mensaje = tomarMensaje();
  const zona = el('div');
  const botonNueva = el('a', { class: 'boton boton--primario', href: '/receta/nueva' }, conMarca('+ Receta'));

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando…'));
    try {
      const { recetas } = await api.get('/recetas');
      zona.replaceChildren(recetas.length === 0 ? crearEstadoVacio() : crearLista(recetas));
    } catch (error) {
      zona.replaceChildren(
        error.codigo === 'SIN_CONEXION'
          ? crearSinConexion(cargar)
          : crearAviso({
              mensaje: mensajeDeError(error, 'No se han podido cargar las recetas.'),
              accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
            })
      );
    }
  }

  function crearEstadoVacio() {
    return crearVacio({
      titulo: 'Aún no tienes recetas',
      descripcion: 'Escribe las que cocinas a menudo y Vigía te dirá qué te falta antes de ponerte.',
      accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/receta/nueva' }, conMarca('+ Receta')),
    });
  }

  /** @param {{ id: number, nombre: string, raciones: number | null }[]} recetas */
  function crearLista(recetas) {
    return el(
      'ul',
      { class: 'lista' },
      recetas.map((receta) =>
        crearFila({ href: `/receta/${receta.id}`, titulo: receta.nombre, subtitulo: textoRaciones(receta.raciones) })
      )
    );
  }

  cargar();

  return {
    titulo: 'Recetas',
    contenido: el('div', {}, mensaje && crearAviso({ tipo: 'exito', mensaje: `✓ ${mensaje}` }), zona),
    pie: [botonNueva],
  };
}