/**
 * @file Hueco (DISENO_UI §3.3, P-13): la comida o la cena de un día en la
 * Semana. Es UN enlace a Planificar hueco (P-14), así que el lector lo lee
 * entero: "Cena, Tortilla de patatas, Huevos". No llamo a la API.
 */
import { ETIQUETAS_GRUPO, ETIQUETAS_TIPO, nombrePlato } from '/compartido/plan.js';
import { el } from '../dom.js';
import { conMarca } from './ui/index.js';

/**
 * @param {{
 *   fecha: string,
 *   tipo: import('/compartido/constantes.js').TipoComida,
 *   hueco: { receta: { nombre: string } | null, texto: string | null, fueraDeCasa: boolean, grupo: string | null } | null
 * }} opciones hueco: null si está vacío.
 * @returns {HTMLLIElement}
 */
export function crearHueco({ fecha, tipo, hueco }) {
  const plato = nombrePlato(hueco);
  // Debajo del plato, en texto tenue (sin la pastilla de caducidad, que se
  // confundiría con ella): el grupo, o la nota de "fuera de casa"
  // ("Comida aniversario"), que nunca lleva grupo.
  const debajo = hueco?.fueraDeCasa ? hueco.texto : hueco?.grupo && ETIQUETAS_GRUPO[hueco.grupo];
  const grupo = debajo ? el('span', { class: 'fila__subtitulo hueco__grupo' }, debajo) : null;

  return el(
    'li',
    {},
    el(
      'a',
      { class: 'fila hueco', href: `/plan/${fecha}/${tipo}` },
      el('span', { class: 'hueco__tipo' }, ETIQUETAS_TIPO[tipo]),
      el(
        'span',
        { class: 'fila__textos' },
        plato
          ? el('span', { class: hueco.fueraDeCasa ? 'fila__titulo tono--tenue' : 'fila__titulo' }, plato)
          : el('span', { class: 'fila__titulo hueco__anadir' }, conMarca('+ Añadir')),
        grupo
      )
    )
  );
}
