/**
 * @file EquilibrioSemana (DISENO_UI §3.3, P-13, D-50): cuántas veces sale
 * cada grupo en la semana frente a AESAN. El cálculo es equilibrioSemana()
 * (compartido/plan.js); aquí solo lo pinto, siempre con texto y no solo con
 * color (DISENO_UI §1, principio 4). No llamo a la API.
 */
import { FUENTE_AESAN, equilibrioSemana } from '/compartido/plan.js';
import { el } from '../dom.js';

/** El tono de cada estado: bien en verde; lo demás, en naranja (no es un error). */
const TONOS = { bien: 'exito', faltan: 'aviso', demasiado: 'aviso' };

/**
 * @param {{ huecos: { grupo: string | null, fueraDeCasa: boolean }[] }} opciones Los huecos de la semana.
 * @returns {HTMLElement}
 */
export function crearEquilibrio({ huecos }) {
  const { objetivos, otros, conGrupo } = equilibrioSemana(huecos);
  const titulo = el('h2', { class: 'titulo-seccion', id: 'titulo-equilibrio' }, 'Equilibrio de la semana');

  // Sin ningún plato con grupo, unas cifras a cero solo asustarían: lo explico.
  const cuerpo =
    conGrupo === 0
      ? el('p', { class: 'tono--tenue' }, 'Añade el grupo de alimentos a tus platos para ver cómo va la semana.')
      : el(
          'ul',
          { class: 'equilibrio' },
          objetivos.map((objetivo) =>
            el(
              'li',
              { class: 'equilibrio__linea' },
              el('span', { class: 'equilibrio__grupo' }, objetivo.etiqueta),
              el('span', { class: `tono--${TONOS[objetivo.estado]}` }, objetivo.estado === 'bien' ? `✓ ${objetivo.texto}` : objetivo.texto),
              // El consejo, en su línea y en naranja: aunque la cifra esté bien, es para mejorar.
              objetivo.consejo && el('span', { class: 'equilibrio__consejo tono--aviso' }, objetivo.consejo)
            )
          )
        );

  const tambien =
    conGrupo > 0 && otros.length > 0
      ? el('p', {}, `También: ${otros.map((otro) => `${otro.etiqueta.toLowerCase()} ${otro.veces}`).join(', ')}.`)
      : null;

  return el(
    'section',
    { class: 'seccion', 'aria-labelledby': 'titulo-equilibrio' },
    titulo,
    cuerpo,
    tambien,
    el(
      'p',
      { class: 'tono--tenue texto--pequeno' },
      'Orientativo, no sustituye el consejo de un profesional. Cuenta los platos con grupo, no las raciones. Fuente: ',
      el('a', { href: FUENTE_AESAN, target: '_blank', rel: 'noopener' }, 'AESAN 2022'),
      '.'
    )
  );
}
