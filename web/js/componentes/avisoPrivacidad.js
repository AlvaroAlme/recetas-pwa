/**
 * @file El aviso de privacidad de la IA (SEC-04) como ventana flotante
 * (pedido por el autor el 2026-11-23): lo usan Ticket y el Ayudante, cada
 * uno con su texto. Antes era una tarjeta dentro de la pantalla.
 *
 * Tres salidas:
 * - "Aceptar": guarda que lo he aceptado (la llamada la pone quien me usa)
 *   y la ventana se cierra con true.
 * - "Leer la política de privacidad": se cierra y el router abre
 *   /privacidad (es un enlace normal). Con Atrás vuelvo y sale otra vez.
 * - "Ahora no" (o Escape): se cierra con false y me quedo en la pantalla,
 *   que enseña un botón para abrirla de nuevo.
 */
import { mensajeDeError } from '../api.js';
import { el } from '../dom.js';
import { crearAviso, ponerCargando } from './ui/index.js';

/**
 * @param {{
 *   titulo: string,
 *   parrafos: string[],
 *   aceptar: () => Promise<unknown>,
 * }} opciones `aceptar` hace el POST de "aviso aceptado".
 * @returns {Promise<boolean>} true si lo he aceptado.
 */
export function pedirAvisoPrivacidad({ titulo, parrafos, aceptar }) {
  const zonaError = el('div');
  const botonAceptar = el('button', { class: 'boton boton--primario', type: 'button', 'data-escribe': true }, 'Aceptar');
  const botonAhoraNo = el('button', { class: 'boton boton--secundario', type: 'button' }, 'Ahora no');
  const enlace = el('a', { href: '/privacidad' }, 'Leer la política de privacidad');
  const dialogo = el(
    'dialog',
    { class: 'dialogo aviso-privacidad', 'aria-labelledby': 'aviso-privacidad-titulo' },
    el('h2', { class: 'dialogo__titulo', id: 'aviso-privacidad-titulo' }, titulo),
    ...parrafos.map((texto) => el('p', {}, texto)),
    el('p', {}, enlace),
    zonaError,
    el('div', { class: 'dialogo__acciones' }, botonAhoraNo, botonAceptar)
  );

  const anterior = document.activeElement;
  let aceptado = false;
  document.body.append(dialogo);
  dialogo.showModal();
  // El foco en "Aceptar", no en el enlace (es lo primero que se puede pulsar).
  botonAceptar.focus();

  botonAhoraNo.addEventListener('click', () => dialogo.close());
  // El clic sigue hasta el router (document), que abre /privacidad. Yo solo
  // cierro la ventana, porque si no se quedaría encima de la pantalla nueva.
  enlace.addEventListener('click', () => dialogo.close());
  botonAceptar.addEventListener('click', async () => {
    zonaError.replaceChildren();
    ponerCargando(botonAceptar, true, 'Un momento…');
    try {
      await aceptar();
      aceptado = true;
      dialogo.close();
    } catch (error) {
      ponerCargando(botonAceptar, false);
      zonaError.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido guardar. Inténtalo de nuevo.') }));
    }
  });

  return new Promise((resolver) => {
    dialogo.addEventListener(
      'close',
      () => {
        dialogo.remove();
        // Si me voy a /privacidad, el foco ya no tiene dónde volver.
        if (anterior?.isConnected) anterior.focus();
        resolver(aceptado);
      },
      { once: true }
    );
  });
}
