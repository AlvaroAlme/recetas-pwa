/**
 * @file Contraseña nueva (P-28, D-53). Pública: la abre el enlace del correo,
 * /restablecer#t=TOKEN. El token va detrás de "#" a propósito: esa parte no
 * llega nunca al servidor (ni a sus logs). La leo aquí, la quito de la barra
 * de direcciones y la mando por POST junto con la contraseña nueva.
 */
import { validarContrasenaNueva } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { estaInstalada, esIos } from '../avisos.js';
import { crearAviso, crearCampo, leerCampo, ponerCargando, ponerErrorCampo } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';
import { recordarEmail } from './recuperar.js';

/** Un token: 43 caracteres base64url (32 bytes), como en el servidor. */
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/;

/**
 * El token del enlace, en memoria: lo quito de la barra de direcciones al
 * llegar, y si la pantalla se vuelve a pintar (al volver la conexión) lo
 * necesito otra vez.
 * @type {string | null}
 */
let tokenGuardado = null;

/**
 * Saco el token de "#t=…" y lo borro de la barra de direcciones (y del
 * historial): si alguien mira la pantalla o el historial, ya no lo ve.
 * @returns {string | null}
 */
function tomarToken() {
  if (location.hash) {
    const token = new URLSearchParams(location.hash.slice(1)).get('t');
    tokenGuardado = token && FORMATO_TOKEN.test(token) ? token : null;
    history.replaceState(history.state, '', location.pathname);
  }
  return tokenGuardado;
}

/**
 * @returns {import('../router.js').Vista}
 */
export function pantallaRestablecer() {
  const token = tomarToken();
  const zona = el('div');

  /** El enlace no sirve (usado, caducado o mal copiado): a pedir otro. */
  function verNoSirve() {
    zona.replaceChildren(
      crearAviso({ mensaje: 'Este enlace ya no sirve: puede que ya lo hayas usado o que hayan pasado más de 30 minutos.' }),
      el('a', { class: 'boton boton--primario', href: '/recuperar' }, 'Pedir otro enlace'),
      el('p', { class: 'acceso__pie' }, el('a', { href: '/entrar' }, 'Volver a Entrar'))
    );
  }

  function verFormulario() {
    const aviso = el('div');
    const contrasena = crearCampo({
      etiqueta: 'Contraseña nueva',
      nombre: 'contrasena',
      ayuda: 'De 10 a 128 caracteres.',
      atributos: { type: 'password', autocomplete: 'new-password', minlength: 10, maxlength: 128, required: true },
    });
    const boton = el('button', { class: 'boton boton--primario', type: 'submit', 'data-escribe': true }, 'Guardar contraseña');

    /** @param {SubmitEvent} evento */
    async function alEnviar(evento) {
      evento.preventDefault();
      if (boton.disabled) return;
      aviso.replaceChildren();
      const resultado = validarContrasenaNueva(leerCampo(contrasena));
      ponerErrorCampo(contrasena, resultado.ok ? null : resultado.errores.contrasena);
      if (!resultado.ok) {
        contrasena.querySelector('.campo__entrada').focus();
        return;
      }
      ponerCargando(boton, true, 'Guardando…');
      try {
        // Se cierran TODAS las sesiones, también esta: a Entrar, con tu
        // email puesto, para entrar con la contraseña nueva (D-53).
        const { email } = await api.post('/auth/restablecer', { token, contrasena: resultado.datos });
        tokenGuardado = null;
        recordarEmail(email);
        navegar('/entrar', {
          reemplazar: true,
          mensaje: 'Contraseña cambiada. Entra con tu contraseña nueva. Hemos cerrado la sesión en todos tus dispositivos.',
        });
      } catch (error) {
        ponerCargando(boton, false);
        if (error.codigo === 'ENLACE_NO_VALIDO') verNoSirve();
        else if (error.campos?.contrasena) ponerErrorCampo(contrasena, error.campos.contrasena);
        else aviso.replaceChildren(crearAviso({ mensaje: error.estado === 429 ? error.message : mensajeDeError(error, 'No se ha podido guardar la contraseña.') }));
      }
    }

    zona.replaceChildren(
      el('p', {}, 'Escribe tu contraseña nueva. Después entrarás con ella.'),
      // En el iPhone, el enlace del correo se abre en Safari y no en la app
      // instalada (iOS no deja abrir una app web desde un enlace): son dos
      // sesiones distintas, así que en la app hay que volver a entrar.
      ...(esIos() && !estaInstalada()
        ? [el('p', { class: 'tono--tenue' }, 'Si usas Stockpot instalada en la pantalla de inicio, entra también en ella con tu contraseña nueva.')]
        : []),
      el('form', { class: 'formulario', novalidate: true, onsubmit: alEnviar }, aviso, contrasena, boton)
    );
  }

  if (token) verFormulario();
  else verNoSirve();

  return {
    titulo: 'Contraseña nueva',
    contenido: el('div', { class: 'acceso' }, zona),
  };
}
