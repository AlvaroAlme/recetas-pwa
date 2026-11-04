/**
 * @file Pantalla Invitar (P-17). El código se crea al pulsar el botón, no
 * al abrir la pantalla: si no, cada recarga gastaría uno de los 3 por hora.
 */
import { api, mensajeDeError } from '../api.js';
import { crearAviso, ponerCargando } from '../componentes/ui/index.js';
import { el } from '../dom.js';

/** "6S4AJMRB" → "6S4A-JMRB": con el guion se dicta y se copia mejor. */
const conGuion = (codigo) => `${codigo.slice(0, 4)}-${codigo.slice(4)}`;

/** @returns {import('../router.js').Vista} */
export function pantallaInvitar() {
  const zona = el('div', { class: 'invitar' });
  const boton = el('button', { class: 'boton boton--primario', type: 'button', onclick: crearCodigo }, 'Crear código');

  async function crearCodigo() {
    ponerCargando(boton, true, 'Creando…');
    try {
      const { codigo } = await api.post('/hogar/invitaciones');
      ponerCargando(boton, false);
      boton.textContent = 'Crear otro código';
      zona.replaceChildren(crearTarjetaCodigo(conGuion(codigo)));
    } catch (error) {
      ponerCargando(boton, false);
      // 429: "Demasiados intentos…" (3 códigos por hora) ya trae su mensaje.
      const mensaje = error.estado === 429 ? error.message : mensajeDeError(error, 'No se ha podido crear el código.');
      zona.replaceChildren(crearAviso({ mensaje }));
    }
  }

  /**
   * El código en grande, con Copiar y (si el navegador puede) Compartir.
   * @param {string} codigo
   */
  function crearTarjetaCodigo(codigo) {
    const estado = el('p', { class: 'invitar__estado', role: 'status' });
    const copiar = el(
      'button',
      {
        class: 'boton boton--secundario',
        type: 'button',
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(codigo);
            estado.textContent = '✓ Código copiado.';
          } catch {
            estado.textContent = 'No se ha podido copiar: apúntalo a mano.';
          }
        },
      },
      'Copiar código'
    );
    // navigator.share abre el menú de compartir del iPhone (WhatsApp, Mensajes…).
    const compartir =
      'share' in navigator &&
      el(
        'button',
        {
          class: 'boton boton--fantasma',
          type: 'button',
          onclick: () =>
            navigator.share({ text: `Únete a mi casa en Recetas Nevera con este código: ${codigo}` }).catch(() => {}),
        },
        'Compartir…'
      );

    return el(
      'div',
      { class: 'invitar__tarjeta' },
      el('p', { class: 'invitar__codigo', 'aria-label': `Código: ${[...codigo].join(' ')}` }, codigo),
      el('div', { class: 'seccion__acciones' }, copiar, compartir),
      estado
    );
  }

  return {
    titulo: 'Invitar',
    atras: '/ajustes',
    contenido: el(
      'div',
      { class: 'formulario' },
      el('p', {}, 'Dale este código a quien viva contigo. Caduca en 48 horas y solo sirve una vez.'),
      zona,
      boton
    ),
  };
}