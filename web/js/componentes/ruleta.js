/**
 * @file La ruleta flotante de "Otro avatar" y de Bienvenida (D-56, cambiada el 2026-11-18
 * tras probarla en el iPhone: dentro de la tarjeta apenas se notaba). Sale
 * una ventana encima de la pantalla, con el avatar grande: pasan unos
 * cuantos al azar, cada vez más despacio, se para en el nuevo, se pone
 * contento y la ventana se va sola.
 *
 * Es un <dialog> con showModal(), como confirmar(): el resto de la pantalla
 * queda tapada por el velo y no se puede tocar mientras gira.
 */
import { el } from '../dom.js';
import { nacerAvatar } from './avatar.js';

/** Tamaño del avatar dentro de la ventana, en px. */
const TAMANO = 160;

/** 12 vueltas de 70 a 380 ms: unos 2 s girando (antes, 4 vueltas en menos de 1 s). */
const VUELTAS = 12;
const PAUSAS_MS = { primera: 70, ultima: 380 };

/** Cuánto se queda la ventana abierta con el avatar nuevo (contento). */
const PAUSA_FINAL_MS = 1400;

/** Lo que tarda la ventana en irse (la animación de salida, --duracion-media). */
const SALIDA_MS = 250;

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

/**
 * Enseña la ruleta flotante y termina en el avatar de `semilla`.
 * @param {string} semilla La semilla nueva (ya guardada en el servidor).
 * @param {{ textoFinal?: string }} [opciones] Lo que pone al pararse: en
 *   Bienvenida, "Este es tu avatar" (no es "nuevo": es el primero).
 * @returns {Promise<void>} Cuando la ventana ya se ha ido.
 */
export async function barajarFlotante(semilla, { textoFinal = 'Este es tu avatar nuevo' } = {}) {
  const marco = el('div', { class: 'ruleta__avatar', 'aria-hidden': 'true' });
  // role="status": el lector anuncia "Barajando…" y luego "Este es tu avatar nuevo".
  const texto = el('p', { class: 'ruleta__texto', role: 'status' }, 'Barajando…');
  const dialogo = el('dialog', { class: 'dialogo ruleta', 'aria-label': 'Otro avatar' }, marco, texto);

  const anterior = document.activeElement;
  // Mientras gira no se puede cerrar con Escape: se cierra sola al acabar.
  dialogo.addEventListener('cancel', (evento) => evento.preventDefault());
  document.body.append(dialogo);
  dialogo.showModal();

  await nacerAvatar(marco, semilla, { tamano: TAMANO, vueltas: VUELTAS, pausas: PAUSAS_MS });
  texto.textContent = textoFinal;
  await esperar(PAUSA_FINAL_MS);

  dialogo.classList.add('ruleta--saliendo');
  await esperar(SALIDA_MS);
  dialogo.close();
  dialogo.remove();
  if (anterior instanceof HTMLElement) anterior.focus();
}
