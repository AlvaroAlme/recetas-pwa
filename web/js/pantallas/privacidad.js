/**
 * @file Pantalla Privacidad (P-18, SEC-04): qué datos guardo, dónde y para
 * qué, que las fotos de los tickets van a Anthropic, la cuota de IA y cómo
 * borrarlo todo. Es pública (se abre sin sesión) y no llama a la API.
 */
import { CUOTA_IA_DIARIA } from '/compartido/constantes.js';
import { el } from '../dom.js';

// Donde me pueden escribir (P-18).
const CONTACTO = 'https://github.com/AlvaroAlme';

/**
 * Un apartado: su título y sus párrafos o listas.
 * @param {string} titulo
 * @param {...Node} contenido
 * @returns {HTMLElement}
 */
function apartado(titulo, ...contenido) {
  return el('section', { class: 'privacidad__apartado' }, el('h2', {}, titulo), ...contenido);
}

/** @returns {import('../router.js').Vista} */
export function pantallaPrivacidad() {
  return {
    titulo: 'Privacidad',
    atras: '/',
    contenido: el(
      'article',
      { class: 'privacidad' },
      el('p', {}, 'Vigía es un proyecto personal. Aquí te cuento qué datos guarda, dónde y para qué.'),
      el('p', { class: 'tono--tenue' }, 'Última actualización: 11 de noviembre de 2026.'),

      apartado(
        'Qué datos guardo',
        el(
          'ul',
          {},
          el('li', {}, 'Tu cuenta: tu nombre, tu email y tu contraseña cifrada (nadie puede leerla, tampoco yo).'),
          el('li', {}, 'Tu casa: su nombre, su zona horaria, quién vive en ella y sus productos y tuppers. Lo ve todo el que viva en tu casa.'),
          el('li', {}, 'Si activas los avisos, la dirección que da tu navegador para mandártelos.'),
          el('li', {}, 'Cuántas veces usas la IA cada día y cuándo aceptaste el aviso de privacidad.')
        ),
        el('p', {}, 'Uso una sola cookie, «sesion», para saber que eres tú durante 30 días. No hay cookies de publicidad ni de seguimiento, ni estadísticas de uso.'),
        el('p', {}, 'Para que la app funcione sin conexión, tu móvil guarda una copia de lo último que has visto. Se borra al cerrar sesión.')
      ),

      apartado(
        'Dónde están',
        el(
          'ul',
          {},
          el('li', {}, 'La base de datos (Neon) y el servidor (Render), en Frankfurt, dentro de la Unión Europea.'),
          el('li', {}, 'Los avisos los entrega el servicio de tu navegador (Apple, Google o Mozilla).')
        )
      ),

      apartado(
        'Las fotos de los tickets',
        el('p', {}, 'Cuando escaneas un ticket, la foto o el PDF se envía a Anthropic (Claude) para leer los productos. Mi servidor no la guarda ni la apunta en ningún registro: solo existe mientras dura la lectura.'),
        el(
          'p',
          {},
          'Anthropic la trata según su ',
          el('a', { href: 'https://www.anthropic.com/legal/privacy', target: '_blank', rel: 'noopener' }, 'política de privacidad'),
          '. Te recomiendo recortar la foto para que solo salga la lista de productos.'
        ),
        el('p', {}, `Cada persona puede usar la IA ${CUOTA_IA_DIARIA} veces al día: así controlo lo que cuesta.`)
      ),

      apartado(
        'Borrar tus datos',
        el('p', {}, 'En Ajustes › Borrar cuenta se borra al momento tu cuenta, tus sesiones y tus avisos. Si eras la única persona de tu casa, también la casa con sus productos y tuppers; si no, la casa sigue para los demás.')
      ),

      apartado(
        'Contacto',
        el(
          'p',
          {},
          'Si tienes dudas o quieres pedirme algo sobre tus datos, escríbeme a través de ',
          el('a', { href: CONTACTO, target: '_blank', rel: 'noopener' }, 'mi perfil de GitHub'),
          '.'
        )
      )
    ),
  };
}
