/**
 * @file Pantalla Ayudante (P-21, D-48, D-51): el chat con la IA. Una sola
 * conversación por persona. La respuesta llega a trozos (api.flujo) y las
 * propuestas salen como tarjetas que se guardan solo si las confirmo.
 *
 * Estados: la primera vez, el aviso de privacidad; vacía, con ejemplos; con
 * mensajes; respondiendo; llena (40 preguntas); sin mensajes hoy (cuota).
 */
import {
  CUOTA_CHAT_DIARIA,
  DIAS_CONVERSACION,
  MAX_CARACTERES_MENSAJE,
  MAX_PREGUNTAS_CONVERSACION,
} from '/compartido/constantes.js';
import { api, mensajeDeError } from '../api.js';
import { crearIcono } from '../componentes/iconos.js';
import { crearMensajeChat } from '../componentes/mensajeChat.js';
import { crearTarjetaHuecos } from '../componentes/tarjetaHuecos.js';
import { crearTarjetaReceta } from '../componentes/tarjetaReceta.js';
import {
  confirmar,
  crearAviso,
  crearCampo,
  crearCarga,
  crearSinConexion,
  crearVacio,
  elSvg,
  ponerCargando,
} from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { entrar } from '../movimiento.js';
import { cargarInventarioCompleto } from './receta.js';

/** Los ejemplos del estado vacío: al pulsarlos se ESCRIBEN, no se envían. */
const EJEMPLOS = Object.freeze([
  '¿Qué ceno hoy con lo que tengo?',
  'Rellena las cenas de esta semana',
  '¿Cuánto dura el arroz cocido en la nevera?',
]);

/** El contador "1980 / 2000" sale a partir de aquí. */
const AVISAR_DESDE = 1800;

/** Si estoy a menos de esto del final, cuenta como "abajo" (la página me sigue). */
const MARGEN_ABAJO_PX = 120;

/** La flecha del botón Enviar (SVG propio, D-30). */
function crearIconoEnviar() {
  return elSvg(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '24',
      height: '24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    elSvg('path', { d: 'M12 19V5M5 12l7-7 7 7' })
  );
}

/** ¿Estoy viendo el final de la página? */
function estaAbajo() {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - MARGEN_ABAJO_PX;
}

/** Bajo al final de la página (al último mensaje). */
function bajar() {
  window.scrollTo(0, document.documentElement.scrollHeight);
}

/**
 * "Te quedan 27 mensajes hoy."
 * @param {number} quedan
 * @returns {string}
 */
function textoCuota(quedan) {
  if (quedan === 0) return `Has usado los ${CUOTA_CHAT_DIARIA} mensajes de hoy. Mañana podrás seguir.`;
  if (quedan === 1) return 'Te queda 1 mensaje hoy.';
  return `Te quedan ${quedan} mensajes hoy.`;
}

/** @returns {import('../router.js').Vista} */
export function pantallaAyudante() {
  /** @type {{ avisoAceptado: boolean, mensajes: any[], preguntas: number, quedanHoy: number } | null} */
  let datos = null;
  let respondiendo = false;
  /** El inventario para las tarjetas de receta: lo pido la primera vez que hace falta. */
  let inventario = null;

  const zona = el('div', { class: 'chat' });
  const lista = el('div', { class: 'chat__mensajes' });
  const zonaAviso = el('div');
  // "Respuesta lista" para el lector. El texto que llega a trozos NO se
  // anuncia: lo leería palabra a palabra.
  const anuncio = el('p', { class: 'solo-lector', role: 'status' });
  const vacio = crearVacio({
    titulo: 'Pregúntame lo que quieras de cocina',
    descripcion:
      'Puedo ver tu inventario, tus recetas y tu semana, y proponerte recetas y platos. Nada se guarda sin que lo confirmes.',
    accion: el(
      'div',
      { class: 'chat__ejemplos' },
      EJEMPLOS.map((ejemplo) =>
        el('button', { class: 'boton boton--secundario', type: 'button', onclick: () => escribirEjemplo(ejemplo) }, ejemplo)
      )
    ),
  });

  // La cabecera: "Nueva conversación", solo si hay algo que borrar. Solo el
  // icono (D-55); el nombre va en aria-label y en title (al pasar el ratón).
  const botonNueva = el(
    'button',
    {
      class: 'boton-icono',
      type: 'button',
      'aria-label': 'Nueva conversación',
      title: 'Nueva conversación',
      hidden: true,
      'data-escribe': true,
      onclick: nuevaConversacion,
    },
    crearIcono('nuevaConversacion')
  );

  // El pie: el área de texto, Enviar y lo que me queda hoy.
  const ranura = el('div', { class: 'pie__ranura' });
  const campo = crearCampo({
    etiqueta: 'Escribe tu pregunta',
    nombre: 'pregunta',
    elemento: 'textarea',
    // Intro hace un salto de línea (en el iPhone no hay Mayús + Intro cómodo):
    // se envía con el botón.
    atributos: { rows: 1, maxlength: MAX_CARACTERES_MENSAJE, oninput: alEscribir },
  });
  const area = campo.querySelector('textarea');
  const botonEnviar = el(
    'button',
    { class: 'boton boton--primario chat__enviar', type: 'submit', 'aria-label': 'Enviar', 'data-escribe': true },
    crearIconoEnviar()
  );
  const cuota = el('p', { class: 'tono--tenue texto--pequeno' });
  const contador = el('p', { class: 'tono--tenue texto--pequeno', hidden: true });
  const pieChat = el(
    'div',
    { class: 'chat__pie' },
    el('form', { class: 'chat__formulario', novalidate: true, onsubmit: alEnviar }, campo, botonEnviar),
    el('div', { class: 'chat__bajo' }, cuota, contador)
  );
  const botonEmpezar = el('button', { class: 'boton boton--primario', type: 'button', 'data-escribe': true, onclick: aceptarAviso }, 'Empezar');

  /**
   * Pido la conversación y la pinto entera.
   * @param {string} [mensaje] Un aviso que enseñar al terminar (tras recargar por una tarjeta usada).
   */
  async function cargar(mensaje) {
    if (!datos) zona.replaceChildren(crearCarga('Cargando la conversación…'));
    try {
      datos = await api.get('/chat');
    } catch (error) {
      ranura.replaceChildren();
      botonNueva.hidden = true;
      zona.replaceChildren(
        error.codigo === 'SIN_CONEXION'
          ? crearSinConexion(() => cargar())
          : crearAviso({
              mensaje: mensajeDeError(error, 'No se ha podido cargar la conversación.'),
              accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: () => cargar() }, 'Reintentar'),
            })
      );
      return;
    }
    pintar();
    if (mensaje) zonaAviso.replaceChildren(crearAviso({ tipo: 'aviso', mensaje }));
    bajar();
  }

  /** Pinto la conversación de `datos` (o el aviso de privacidad). */
  function pintar() {
    if (!datos.avisoAceptado) {
      zona.replaceChildren(crearAvisoPrivacidad());
      ranura.replaceChildren(botonEmpezar);
      botonNueva.hidden = true;
      return;
    }
    lista.replaceChildren(
      ...datos.mensajes.map(
        (mensaje) =>
          crearMensajeChat({
            rol: mensaje.rol,
            texto: mensaje.texto,
            tarjetas: mensaje.tarjetas.map(crearTarjeta).filter(Boolean),
          }).elemento
      )
    );
    zonaAviso.replaceChildren();
    zona.replaceChildren(vacio, lista, zonaAviso, anuncio);
    actualizar();
  }

  /** Lo que cambia con el estado: el vacío, "Nueva conversación" y el pie. */
  function actualizar() {
    const hayMensajes = lista.childElementCount > 0;
    vacio.hidden = hayMensajes;
    botonNueva.hidden = !hayMensajes;
    botonNueva.disabled = respondiendo;

    if (datos.preguntas >= MAX_PREGUNTAS_CONVERSACION) {
      ranura.replaceChildren(
        el(
          'div',
          { class: 'chat__llena' },
          el('p', {}, 'Esta conversación ha llegado al máximo.'),
          el('button', { class: 'boton boton--primario', type: 'button', 'data-escribe': true, onclick: nuevaConversacion }, 'Nueva conversación')
        )
      );
      return;
    }
    if (ranura.firstChild !== pieChat) ranura.replaceChildren(pieChat);
    area.disabled = respondiendo;
    botonEnviar.disabled = respondiendo || datos.quedanHoy === 0;
    botonEnviar.setAttribute('aria-label', respondiendo ? 'Respondiendo…' : 'Enviar');
    cuota.textContent = respondiendo ? 'Respondiendo…' : textoCuota(datos.quedanHoy);
  }

  /**
   * La tarjeta de una propuesta, con lo que hace al guardar y descartar.
   * @param {import('../componentes/tarjetaReceta.js').TarjetaChat} tarjeta
   * @returns {HTMLElement | null}
   */
  function crearTarjeta(tarjeta) {
    const ruta = `/chat/tarjetas/${encodeURIComponent(tarjeta.id)}`;
    const acciones = {
      guardar: (cuerpo = {}) => api.post(`${ruta}/guardar`, cuerpo),
      descartar: () => api.post(`${ruta}/descartar`),
      alCambiar: (mensaje) => cargar(mensaje),
    };
    if (tarjeta.tipo === 'huecos') return crearTarjetaHuecos({ tarjeta, ...acciones });
    if (!tarjeta.propuesta) return null;
    inventario ??= cargarInventarioCompleto().catch(() => null);
    return crearTarjetaReceta({ tarjeta, inventario, ...acciones });
  }

  /** La primera vez (SEC-04): qué se envía a Anthropic y cuánto se guarda. */
  function crearAvisoPrivacidad() {
    return el(
      'section',
      { class: 'tarjeta', 'aria-labelledby': 'titulo-aviso-chat' },
      el('h2', { id: 'titulo-aviso-chat' }, 'Antes de empezar'),
      el(
        'p',
        {},
        'Tus mensajes, y lo que el ayudante lea de tu inventario, tus recetas y tu plan, se envían a Anthropic (la empresa de Claude) para responderte. ',
        `La conversación se guarda ${DIAS_CONVERSACION} días y solo la ves tú.`
      ),
      el('a', { href: '/privacidad' }, 'Más información')
    );
  }

  async function aceptarAviso() {
    ponerCargando(botonEmpezar, true, 'Un momento…');
    try {
      await api.post('/chat/aviso-aceptado');
      datos.avisoAceptado = true;
      pintar();
      area.focus();
    } catch (error) {
      zona.append(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido guardar. Inténtalo de nuevo.') }));
    } finally {
      ponerCargando(botonEmpezar, false);
    }
  }

  /** El área crece con el texto (hasta 4 líneas, lo limita el CSS) y el contador. */
  function alEscribir() {
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight + 2}px`;
    const largo = area.value.length;
    contador.hidden = largo < AVISAR_DESDE;
    contador.textContent = `${largo} / ${MAX_CARACTERES_MENSAJE}`;
  }

  /** @param {string} ejemplo */
  function escribirEjemplo(ejemplo) {
    area.value = ejemplo;
    alEscribir();
    area.focus();
  }

  /** @param {SubmitEvent} evento */
  function alEnviar(evento) {
    evento.preventDefault();
    const texto = area.value.trim();
    if (texto === '') {
      area.focus();
      return;
    }
    enviar(texto);
  }

  /**
   * Envío la pregunta y pinto la respuesta según llega.
   * @param {string} texto
   */
  async function enviar(texto) {
    if (respondiendo) return;
    respondiendo = true;
    zonaAviso.replaceChildren();
    anuncio.textContent = '';

    const mio = crearMensajeChat({ rol: 'tu', texto });
    const suyo = crearMensajeChat({ rol: 'ayudante', esperando: true });
    suyo.ponerEstado('Pensando…');
    // Tu pregunta y el "Pensando…" entran con su animación (D-56).
    lista.append(entrar(mio.elemento), entrar(suyo.elemento));
    area.value = '';
    alEscribir();
    actualizar();
    bajar();

    // ¿Ha llegado ya algo? Si la conexión se corta DESPUÉS, puede que el
    // servidor sí haya guardado la respuesta.
    let empezado = false;
    try {
      await api.flujo('/chat/mensajes', { texto }, (evento) => {
        empezado = true;
        // Solo bajo si ya estaba abajo: si he subido a leer, no me muevo.
        const abajo = estaAbajo();
        if (evento.tipo === 'texto') {
          suyo.agregarTexto(evento.texto);
        } else if (evento.tipo === 'herramienta') {
          suyo.ponerEstado(evento.texto);
        } else if (evento.tipo === 'tarjeta') {
          const tarjeta = crearTarjeta(evento.tarjeta);
          if (tarjeta) suyo.agregarTarjeta(tarjeta);
        } else if (evento.tipo === 'fin') {
          datos.quedanHoy = evento.quedanHoy;
          datos.preguntas = evento.preguntas;
        }
        if (abajo) bajar();
      });
      suyo.terminar();
      anuncio.textContent = 'Respuesta lista';
    } catch (error) {
      suyo.terminar();
      respondiendo = false;
      falloAlEnviar(error, texto, mio, suyo, empezado);
    } finally {
      respondiendo = false;
      if (datos) actualizar();
    }
  }

  /**
   * Ha fallado el envío. Salvo si se ha cortado la red a medias, el servidor
   * NO ha guardado nada: quito los dos mensajes y te devuelvo el texto.
   * @param {import('../api.js').ErrorApi} error
   * @param {string} texto
   * @param {import('../componentes/mensajeChat.js').MensajeChat} mio
   * @param {import('../componentes/mensajeChat.js').MensajeChat} suyo
   * @param {boolean} empezado
   */
  function falloAlEnviar(error, texto, mio, suyo, empezado) {
    // Te devuelvo lo que habías escrito (si no has empezado a escribir otra cosa).
    if (area.value === '') area.value = texto;
    alEscribir();
    // Cortado por el camino: no sé si se ha guardado. Recargo y lo digo.
    if (error.estado === 0 && empezado) {
      cargar('Se ha cortado la conexión mientras respondía. Si no ves la respuesta, vuelve a preguntar.');
      return;
    }
    if (error.codigo === 'AVISO_CHAT_PENDIENTE') {
      cargar();
      return;
    }
    mio.elemento.remove();
    suyo.elemento.remove();

    if (error.codigo === 'CUOTA_IA') datos.quedanHoy = 0;
    if (error.codigo === 'CONVERSACION_LLENA') datos.preguntas = MAX_PREGUNTAS_CONVERSACION;
    // Un error del ayudante que no se puede reintentar (rechazo, no ha
    // podido terminar) sí gasta el mensaje.
    if (error.estado === 200 && !error.reintentable) datos.quedanHoy = Math.max(0, datos.quedanHoy - 1);

    // Los del servidor que se pueden reintentar devuelven el mensaje (D-47).
    const devuelto = error.reintentable && error.estado !== 0 ? ' No se ha gastado el mensaje.' : '';
    zonaAviso.replaceChildren(
      crearAviso({
        mensaje: `${error.message}${devuelto}`,
        accion:
          error.reintentable &&
          el(
            'button',
            {
              class: 'boton boton--secundario boton--ajustado',
              type: 'button',
              'data-escribe': true,
              onclick: () => {
                area.value = '';
                enviar(texto);
              },
            },
            'Reintentar'
          ),
      })
    );
  }

  async function nuevaConversacion() {
    const empezar = await confirmar({
      titulo: 'Nueva conversación',
      texto: '¿Empezar una conversación nueva? La de ahora se borrará y no se puede recuperar.',
      textoConfirmar: 'Empezar de nuevo',
      peligroso: true,
    });
    if (!empezar) return;
    try {
      await api.borrar('/chat');
    } catch (error) {
      zonaAviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido borrar la conversación.') }));
      return;
    }
    datos.mensajes = [];
    datos.preguntas = 0;
    pintar();
    area.focus();
  }

  cargar();
  return { titulo: 'Ayudante', contenido: zona, accion: botonNueva, pie: [ranura] };
}
