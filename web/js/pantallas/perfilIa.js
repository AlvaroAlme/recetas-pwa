/**
 * @file Inteligencia artificial (P-26, D-52): lo que me queda hoy de cada
 * cuota (D-15, D-51). Son de cada persona, no de la casa.
 */
import { el } from '../dom.js';
import { pantallaDePerfil, quedan } from './comunPerfil.js';

/**
 * @returns {import('../router.js').Vista}
 */
export function pantallaPerfilIa() {
  return pantallaDePerfil({
    titulo: 'Inteligencia artificial',
    atras: '/perfil',
    mensajeError: 'No se ha podido cargar lo que te queda de IA.',
    pintar({ cuotaIa, cuotaChat }) {
      return [
        el(
          'section',
          { class: 'seccion', 'aria-labelledby': 'titulo-ia' },
          el('h2', { class: 'titulo-seccion', id: 'titulo-ia' }, 'Lo que te queda hoy'),
          el('p', {}, `Tickets: te quedan ${quedan(cuotaIa)} de ${cuotaIa.limite} hoy.`),
          el('p', {}, `Ayudante: te quedan ${quedan(cuotaChat)} de ${cuotaChat.limite} mensajes hoy.`),
          el('p', { class: 'tono--tenue' }, 'Las fotos de los tickets y los mensajes del Ayudante se envían a Anthropic para leerlos.'),
          el('div', { class: 'seccion__acciones' }, el('a', { class: 'boton boton--fantasma', href: '/privacidad' }, 'Privacidad'))
        ),
      ];
    },
  });
}
