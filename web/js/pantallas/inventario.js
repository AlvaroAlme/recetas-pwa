/** @file Pantalla Inventario (P-04). PROVISIONAL: la de verdad llega en el paso 8d-3. */
import { el } from '../dom.js';

/** @returns {import('../router.js').Vista} */
export function pantallaInventario() {
  return {
    titulo: 'Inventario',
    contenido: el('p', {}, 'Aquí irá la lista del inventario (paso 8d-3).'),
    pie: [el('a', { class: 'boton boton--primario', href: '/producto/nuevo' }, '+ Producto')],
  };
}