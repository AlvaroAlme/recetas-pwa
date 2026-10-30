/** @file Pantalla "No existe" (P-19): cualquier URL que no sea de la app. */
import { el } from '../dom.js';

/** @returns {import('../router.js').Vista} */
export function pantallaNoExiste() {
  return {
    titulo: 'No existe',
    contenido: el(
      'section',
      { class: 'vacio' },
      el('h2', {}, 'Esta pantalla no existe'),
      el('p', {}, 'Puede que el enlace esté mal escrito o que lo que buscas ya no exista.'),
      el('a', { class: 'boton boton--secundario boton--ajustado', href: '/' }, 'Ir al inventario')
    ),
  };
}