/**
 * @file El bloque "Avisos en este dispositivo" (P-16 y paso 3 de la
 * Bienvenida, §7.6). Enseña el estado de los avisos de ESTE dispositivo y
 * los botones que tocan en cada caso. La lógica está en avisos.js.
 */
import { mensajeDeError } from '../api.js';
import { activarAvisos, desactivarAvisos, enviarPrueba, estadoAvisos } from '../avisos.js';
import { el } from '../dom.js';
import { crearAviso, crearCarga, ponerCargando } from './ui/index.js';

/** Lo que explico antes del botón de activar (§7.6). La parte del plan llega en la fase 7. */
const PARA_QUE = 'Te avisaremos el día antes de que caduque un tupper, a las 10:00.';

/**
 * @returns {HTMLDivElement} Se rellena solo cuando sabe el estado.
 */
export function crearPanelAvisos() {
  const panel = el('div', { class: 'panel-avisos' }, crearCarga('Comprobando los avisos…'));
  // Los mensajes de resultado ("Aviso enviado…") van aparte: sobreviven al repintar.
  const resultado = el('div');

  /** @param {string} texto @param {'exito' | 'aviso' | 'error'} [tipo] */
  const decir = (texto, tipo = 'exito') => resultado.replaceChildren(crearAviso({ tipo, mensaje: texto }));

  /** Botón que ejecuta una acción con su "…ando" y muestra el error si falla. */
  function crearBoton(texto, clase, textoCargando, accion, fallo) {
    const boton = el('button', { class: `boton ${clase} boton--ajustado`, type: 'button', 'data-escribe': true }, texto);
    boton.addEventListener('click', async () => {
      resultado.replaceChildren();
      ponerCargando(boton, true, textoCargando);
      try {
        await accion();
      } catch (error) {
        ponerCargando(boton, false);
        decir(mensajeDeError(error, fallo), 'error');
      }
    });
    return boton;
  }

  async function pintar() {
    const estado = await estadoAvisos();
    if (estado === 'no-compatible') {
      panel.replaceChildren(el('p', {}, 'Este navegador no puede recibir avisos.'));
    } else if (estado === 'instalar') {
      panel.replaceChildren(
        el('p', {}, 'Para recibir avisos en el iPhone, añade Vigía a la pantalla de inicio:'),
        el(
          'ol',
          { class: 'pasos' },
          el('li', {}, 'Pulsa el botón Compartir de Safari.'),
          el('li', {}, 'Elige «Añadir a pantalla de inicio».'),
          el('li', {}, 'Abre Vigía desde el icono nuevo y vuelve aquí.')
        )
      );
    } else if (estado === 'bloqueados') {
      panel.replaceChildren(
        el('p', {}, 'Has bloqueado los avisos de Vigía en este dispositivo.'),
        el('p', { class: 'tono--tenue' }, 'En el iPhone, actívalos en Ajustes › Notificaciones › Vigía. En el ordenador, en los permisos del sitio de tu navegador.')
      );
    } else if (estado === 'desactivados') {
      panel.replaceChildren(
        el('p', {}, PARA_QUE),
        crearBoton('Activar avisos', 'boton--primario', 'Activando…', activar, 'No se han podido activar los avisos.')
      );
    } else {
      panel.replaceChildren(
        el('p', { class: 'panel-avisos__activados' }, '✓ Activados en este dispositivo'),
        el(
          'div',
          { class: 'seccion__acciones' },
          crearBoton('Enviar un aviso de prueba', 'boton--secundario', 'Enviando…', probar, 'No se ha podido enviar el aviso de prueba.'),
          crearBoton('Desactivar', 'boton--fantasma', 'Desactivando…', desactivar, 'No se han podido desactivar los avisos.')
        )
      );
    }
  }

  async function activar() {
    const estado = await activarAvisos();
    await pintar();
    if (estado === 'activados') decir('✓ Avisos activados.');
    else decir('No pasa nada: puedes activarlos más tarde desde aquí.', 'aviso');
  }

  async function probar() {
    const enviados = await enviarPrueba();
    await pintar();
    if (enviados > 0) decir('Aviso enviado. Debería llegarte en unos segundos.');
    else decir('No se ha podido entregar el aviso. Desactiva los avisos y vuelve a activarlos.', 'aviso');
  }

  async function desactivar() {
    await desactivarAvisos();
    await pintar();
    decir('Avisos desactivados en este dispositivo.');
  }

  pintar().catch(() => panel.replaceChildren(el('p', {}, 'No se ha podido comprobar el estado de los avisos.')));
  return el('div', {}, panel, resultado);
}
