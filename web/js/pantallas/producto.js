/** @file Pantalla Nuevo / editar producto (P-05). PROVISIONAL: la de verdad llega en el paso 8e. */
import { el } from '../dom.js';

/**
 * @param {{ parametros: Record<string, string> }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaProducto({ parametros }) {
  return {
    titulo: parametros.id ? 'Editar producto' : 'Nuevo producto',
    contenido: el('p', {}, 'Aquí irá el formulario (paso 8e).'),
    accion: el('a', { class: 'boton boton--fantasma boton--ajustado', href: '/' }, '‹ Inventario'),
  };
}