/**
 * @file El router: decide qué pantalla pintar según la URL, sin recargar.
 *
 * Las URLs son normales (/producto/2), sin # (DISENO_UI §5.2). Cuando pulso
 * un enlace de la app, en vez de dejar que el navegador cargue otra página,
 * cambio la URL con history.pushState y pinto la pantalla nueva. El botón
 * Atrás (y el gesto de iOS) lanzan el evento "popstate" y vuelvo a pintar.
 *
 * Una pantalla es una función que recibe { parametros, consulta } y devuelve
 * (o promete) lo que va en el esqueleto de index.html: una Vista.
 */
import { crearAvatarVivo } from './componentes/avatar.js';
import { crearIcono } from './componentes/iconos.js';
import { el } from './dom.js';
import { logError } from './log.js';
import { sinMovimiento } from './movimiento.js';
import { usarAvatarCabecera } from './reacciones.js';
import { olvidarUsuario, usuarioActual, usuarioSabido } from './yo.js';

/**
 * @typedef {Object} Vista
 * @property {string} titulo Va en la cabecera y en la pestaña del navegador.
 * @property {Node} contenido Lo que va dentro de <main>.
 * @property {Node[]} [pie] Botones del pie. Si no hay, el pie se oculta.
 * @property {Node} [accion] Botón de la cabecera, a la derecha del título.
 * @property {string} [atras] Pantalla a la que lleva "‹ Atrás" si no hay
 *  una anterior de la app ('/'). Sin ella, no hay botón Atrás (pestañas).
 */

/**
 * @typedef {Object} Ruta
 * @property {string} patron '/producto/:id': los trozos con ":" son parámetros.
 * @property {string} [pestana] href de la pestaña que se marca ('/', '/recetas'…).
 *   Sin pestaña es una página secundaria: en el móvil se oculta la barra.
 * @property {(entrada: { parametros: Record<string, string>, consulta: URLSearchParams }) => Vista | Promise<Vista>} pantalla
 * @property {(parametros: Record<string, string>) => boolean} [validar]
 *   Si devuelve false, la ruta no vale y sale "no existe" (SEC-06).
 * @property {boolean} [publica] Entrar, Crear cuenta…: sin pestañas (no hay
 *   sesión, así que no tiene sentido enseñar Inventario o Perfil).
 * @property {string} [redirigir] Una URL antigua que ahora es otra (/ajustes →
 *   /perfil, D-52): la cambio en el historial y pinto la nueva.
 */

/** @type {Ruta[]} */
let rutas = [];
/** @type {Ruta['pantalla']} */
let pantallaNoExiste;

// Cada vez que pinto sumo 1. Si mientras una pantalla espera sus datos ya
// se ha pedido otra, la vieja no pinta encima de la nueva.
let turno = 0;

const $ = (id) => document.getElementById(id);

/**
 * Compara un patrón con el camino de la URL, trozo a trozo.
 * coincide('/producto/:id', '/producto/7') → { id: '7' }
 * coincide('/producto/:id', '/recetas')    → null
 * @param {string} patron
 * @param {string} camino
 * @returns {Record<string, string> | null}
 */
function coincide(patron, camino) {
  const trozosPatron = patron.split('/');
  const trozosCamino = camino.split('/');
  if (trozosPatron.length !== trozosCamino.length) return null;

  const parametros = {};
  for (let i = 0; i < trozosPatron.length; i++) {
    if (trozosPatron[i].startsWith(':')) {
      try {
        parametros[trozosPatron[i].slice(1)] = decodeURIComponent(trozosCamino[i]);
      } catch {
        return null; // un % mal escrito en la URL
      }
    } else if (trozosPatron[i] !== trozosCamino[i]) {
      return null;
    }
  }
  return parametros;
}

/**
 * La primera ruta que encaja y pasa su validación. Si ninguna, "no existe".
 * @param {string} camino
 * @returns {{ ruta: Ruta, parametros: Record<string, string> }}
 */
function buscar(camino) {
  for (const ruta of rutas) {
    const parametros = coincide(ruta.patron, camino);
    if (parametros && (!ruta.validar || ruta.validar(parametros))) {
      return { ruta, parametros };
    }
  }
  return { ruta: { patron: '', pantalla: pantallaNoExiste }, parametros: {} };
}

/**
 * El enlace Atrás de la cabecera: solo la flecha (D-55), con "Atrás" en el
 * aria-label para el lector. Es un <a> con su href de verdad (se puede abrir
 * en otra pestaña), pero al pulsarlo uso volver().
 * @param {string} porDefecto
 * @returns {HTMLAnchorElement}
 */
function crearAtras(porDefecto) {
  return el(
    'a',
    {
      class: 'boton-icono cabecera__atras',
      href: porDefecto,
      'aria-label': 'Atrás',
      onclick: (evento) => {
        evento.preventDefault();
        volver(porDefecto);
      },
    },
    crearIcono('atras')
  );
}

/**
 * El botón de Perfil de la cabecera, con mi avatar (D-52). Sale en las
 * pantallas de pestaña. Si todavía no sé quién soy, dejo un hueco del mismo
 * tamaño (así la cabecera no salta) y pongo el avatar cuando llegue.
 * @returns {HTMLAnchorElement}
 */
function crearEnlacePerfil() {
  // Una píldora con fondo, el avatar vivo (parpadea) y una flecha ">": así se
  // ve que es un botón y que lleva a otra pantalla (2026-11-18).
  const enlace = el('a', { class: 'cabecera__perfil', href: '/perfil', 'aria-label': 'Perfil' });
  const flecha = crearIcono('adelante');
  flecha.classList.add('cabecera__flecha');
  const ponerAvatar = (usuario) => {
    const avatar = crearAvatarVivo({ semilla: usuario.avatarSemilla, tamano: 32 });
    enlace.replaceChildren(avatar, flecha);
    // Este es el que pone caras al guardar o mientras piensa el Ayudante (D-56).
    usarAvatarCabecera(avatar);
  };
  const sabido = usuarioSabido();
  if (sabido) {
    ponerAvatar(sabido);
  } else {
    enlace.append(el('span', { class: 'cabecera__hueco-avatar', 'aria-hidden': 'true' }), flecha);
    // Si falla (sin sesión, sin red), se queda el hueco: la pantalla ya enseña su error.
    usuarioActual().then(ponerAvatar, () => {});
  }
  return enlace;
}

/**
 * Hacia dónde se mueve la pantalla al cambiar (D-56): 'adelante' (entra por
 * la derecha), 'atras' (por la izquierda), 'pestana' (solo se funde) o null
 * (cambia sin animación).
 * @typedef {'adelante' | 'atras' | 'pestana' | null} Sentido
 */

/** La ruta que está pintada ahora (para saber si paso de pestaña a pestaña). */
let rutaPintada = null;
/** El camino pintado ahora: si no cambia (/?ubicacion=…), no animo. */
let caminoPintado = null;

/**
 * true justo antes de que la flecha Atrás llame a history.back(): así, en el
 * "popstate" que llega después, sé que he sido yo. Si no lo pongo yo, ha sido
 * el gesto de iOS o el Atrás del navegador, que ya animan solos (D-56).
 */
let atrasConFlecha = false;

/**
 * Decido el sentido final: entre dos pestañas, siempre fundido; si el camino
 * no cambia, sin animación.
 * @param {Sentido} pedido
 * @param {Ruta} ruta La que voy a pintar.
 * @returns {Sentido}
 */
function decidirSentido(pedido, ruta) {
  if (!pedido || location.pathname === caminoPintado) return null;
  if (ruta.pestana && rutaPintada?.pestana) return 'pestana';
  return pedido;
}

/**
 * Cambio la página dentro de una View Transition si se puede: el navegador
 * hace una foto de la pantalla vieja, cambio el DOM y anima de la una a la
 * otra (el CSS, según html[data-sentido]). Sin startViewTransition (Safari
 * de antes de la 18) o con "Reducir movimiento", cambio sin más.
 * @param {Sentido} sentido
 * @param {() => void} cambiar
 */
function conTransicion(sentido, cambiar) {
  if (!sentido || !document.startViewTransition || sinMovimiento()) {
    cambiar();
    return;
  }
  const raiz = document.documentElement;
  raiz.dataset.sentido = sentido;
  const transicion = document.startViewTransition(cambiar);
  // Si otra navegación la corta, también se cumple: quito el sentido igual.
  transicion.finished.finally(() => {
    if (raiz.dataset.sentido === sentido) delete raiz.dataset.sentido;
  });
}

/**
 * Pinta la pantalla de la URL actual en el esqueleto de index.html.
 * @param {{ esPrimera?: boolean, volviendo?: boolean, sentido?: Sentido }} [opciones]
 */
async function pintar({ esPrimera = false, volviendo = false, sentido = null } = {}) {
  const miTurno = ++turno;
  let { ruta, parametros } = buscar(location.pathname);
  if (ruta.redirigir) {
    history.replaceState(history.state, '', ruta.redirigir);
    ({ ruta, parametros } = buscar(location.pathname));
  }
  // En Entrar o Crear cuenta ya no hay sesión: quien entre puede ser otra persona.
  if (ruta.publica) olvidarUsuario();
  const consulta = new URLSearchParams(location.search);

  /** @type {Vista} */
  let vista;
  try {
    vista = await ruta.pantalla({ parametros, consulta });
  } catch (error) {
    logError('Error al pintar la pantalla', error);
    vista = {
      titulo: 'Algo ha fallado',
      contenido: el('p', {}, 'No se ha podido abrir esta pantalla. Recarga la página.'),
    };
  }
  if (miTurno !== turno) return;

  const sentidoFinal = decidirSentido(sentido, ruta);
  rutaPintada = ruta;
  caminoPintado = location.pathname;
  conTransicion(sentidoFinal, () => ponerVista(ruta, vista, { esPrimera, volviendo }));
}

/**
 * Pongo la vista en el esqueleto: cabecera, contenido, pie y pestañas.
 * @param {Ruta} ruta
 * @param {Vista} vista
 * @param {{ esPrimera: boolean, volviendo: boolean }} opciones
 */
function ponerVista(ruta, vista, { esPrimera, volviendo }) {
  $('titulo').textContent = vista.titulo;
  document.title = `${vista.titulo} · Vigía`;
  $('pantalla').replaceChildren(vista.contenido);
  $('accion-cabecera').replaceChildren(
    ...(vista.accion ? [vista.accion] : []),
    ...(ruta.pestana ? [crearEnlacePerfil()] : [])
  );
  $('atras-cabecera').replaceChildren(...(vista.atras ? [crearAtras(vista.atras)] : []));
  $('pie-interior').replaceChildren(...(vista.pie ?? []));
  $('pie').hidden = !vista.pie;

  document.querySelector('.app').classList.toggle('app--secundaria', !ruta.pestana);
  document.querySelector('.app').classList.toggle('app--publica', Boolean(ruta.publica));
  for (const enlace of document.querySelectorAll('.navegacion a')) {
    if (enlace.getAttribute('href') === ruta.pestana) {
      enlace.setAttribute('aria-current', 'page');
    } else {
      enlace.removeAttribute('aria-current');
    }
  }

  // Al volver atrás, el navegador ya recoloca el scroll donde estaba.
  if (!volviendo) window.scrollTo(0, 0);
  // Al cambiar de pantalla, el lector de pantallas empieza por el contenido nuevo.
  if (!esPrimera) $('contenido').focus({ preventScroll: true });
}

/**
 * Va a otra pantalla de la app sin recargar.
 * @param {string} url '/producto/7', '/?ubicacion=despensa'…
 * @param {{ reemplazar?: boolean, mensaje?: string | { texto: string, tipo: 'aviso' } }} [opciones]
 *   reemplazar: no deja la pantalla actual en el historial (tras guardar un
 *   formulario, para que "Atrás" no vuelva a él).
 *   mensaje: aviso de éxito que enseña la pantalla de destino.
 */
export function navegar(url, { reemplazar = false, mensaje } = {}) {
  // "dentro" marca las entradas del historial que creo yo: así "‹ Atrás"
  // sabe si puede usar history.back() sin salir de la app.
  const estado = { dentro: true, mensaje };
  if (reemplazar) {
    history.replaceState(estado, '', url);
  } else {
    history.pushState(estado, '', url);
  }
  // Reemplazar es casi siempre "he guardado, vuelvo a donde estaba": hacia atrás.
  pintar({ sentido: reemplazar ? 'atras' : 'adelante' });
}

/**
 * "‹ Atrás" (DISENO_UI §5.3). Si la pantalla anterior es de la app, vuelvo
 * como el botón del navegador. Si he llegado aquí directamente (un enlace,
 * un aviso, la URL escrita), no hay anterior: voy a la pantalla por defecto.
 * Así "Atrás" nunca saca de la app.
 * @param {string} porDefecto
 */
export function volver(porDefecto) {
  if (history.state?.dentro) {
    atrasConFlecha = true;
    history.back();
  } else {
    navegar(porDefecto, { reemplazar: true });
  }
}

/**
 * Vuelvo a pintar la pantalla actual (al recuperar la conexión). Como en la
 * primera vez, no muevo el foco; como al volver, no muevo el scroll.
 */
export function repintar() {
  pintar({ esPrimera: true, volviendo: true });
}

/**
 * Cambio el título de la cabecera y de la pestaña cuando la pantalla ya lo
 * sabe (una receta: hasta que llega no sé cómo se llama).
 * @param {string} titulo
 */
export function ponerTitulo(titulo) {
  $('titulo').textContent = titulo;
  document.title = `${titulo} · Vigía`;
}

/**
 * El mensaje de éxito que me ha dejado la pantalla anterior. Solo lo doy una
 * vez: lo borro del historial para que no salga otra vez al recargar.
 * @returns {string | { texto: string, tipo: 'aviso' } | undefined}
 */
export function tomarMensaje() {
  const mensaje = history.state?.mensaje;
  if (mensaje) {
    history.replaceState({ ...history.state, mensaje: undefined }, '');
  }
  return mensaje;
}

/**
 * Si el clic es en un enlace de la app, lo hago yo sin recargar.
 * @param {MouseEvent} evento
 */
function alPulsarEnlace(evento) {
  // Clic con Ctrl/Cmd (abrir en otra pestaña), botón central…: lo hace el navegador.
  if (evento.defaultPrevented || evento.button !== 0) return;
  if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;

  const enlace = evento.target.closest('a[href]');
  if (!enlace || enlace.target || enlace.hasAttribute('download')) return;

  const url = new URL(enlace.href);
  if (url.origin !== location.origin) return;
  // "#contenido" (Saltar al contenido) es un salto dentro de la misma página.
  if (url.hash && url.pathname === location.pathname) return;

  evento.preventDefault();
  navegar(url.pathname + url.search);
}

/**
 * Arranca el router: guarda las rutas, escucha clics y "Atrás", y pinta la primera pantalla.
 * @param {{ rutas: Ruta[], noExiste: Ruta['pantalla'] }} opciones
 */
export function iniciarRouter(opciones) {
  rutas = opciones.rutas;
  pantallaNoExiste = opciones.noExiste;
  document.addEventListener('click', alPulsarEnlace);
  window.addEventListener('popstate', () => {
    // Solo animo si ha sido mi flecha; el gesto de iOS ya desliza la pantalla.
    const sentido = atrasConFlecha ? 'atras' : null;
    atrasConFlecha = false;
    pintar({ volviendo: true, sentido });
  });
  pintar({ esPrimera: true });
}