/**
 * @file Los iconos de la cabecera (D-55): SVG propios en línea, como el de
 * información de los campos (D-30). Toman el color del texto (currentColor).
 * En la cabecera van SOLOS, sin texto: por eso el botón que los lleva tiene
 * un aria-label, que es lo que lee VoiceOver ("Atrás, enlace").
 */
import { elSvg } from './ui/index.js';

/** Los trazos de cada icono, en una cuadrícula de 24 × 24. */
const TRAZOS = {
  // Una flecha "<", como la de iOS.
  atras: ['M15 5l-7 7 7 7'],
  // La flecha al revés, ">": lleva a otra pantalla (la del botón de Perfil).
  adelante: ['M9 5l7 7-7 7'],
  // Un bocadillo con un "+": empezar otra conversación.
  nuevaConversacion: ['M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z', 'M12 9v6M9 12h6'],
  // Un lápiz.
  editar: ['M4 20h4L19 9l-4-4L4 16v4z', 'M13.5 6.5l4 4'],
  // Un embudo: filtrar una lista (el Inventario por ubicación, D-61).
  filtrar: ['M4 5h16l-6 7.5V18l-4 2v-7.5z'],
  // Menos y más: cambiar las raciones de una receta (D-61).
  menos: ['M5 12h14'],
  mas: ['M12 5v14M5 12h14'],
};

/**
 * Dibujo un icono. El lector de pantallas lo salta (aria-hidden): el nombre
 * lo pone el botón o el enlace que lo lleva.
 * @param {keyof typeof TRAZOS} nombre
 * @returns {SVGElement}
 */
export function crearIcono(nombre) {
  return elSvg(
    'svg',
    {
      class: 'icono',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    ...TRAZOS[nombre].map((d) => elSvg('path', { d }))
  );
}
