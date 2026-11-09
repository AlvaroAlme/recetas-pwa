/**
 * @file Pantalla Borrar cuenta (/cuenta/borrar). Pide la contraseña: que
 * nadie pueda borrarla con tu móvil desbloqueado. No se puede deshacer.
 */
import { api, mensajeDeError } from '../api.js';
import { desactivarAvisos } from '../avisos.js';
import { crearAviso, crearCampo, leerCampo, ponerCargando, ponerErrorCampo } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';

/** @returns {import('../router.js').Vista} */
export function pantallaBorrarCuenta() {
  const aviso = el('div');
  const contrasena = crearCampo({
    etiqueta: 'Tu contraseña',
    nombre: 'contrasena',
    atributos: { type: 'password', autocomplete: 'current-password' },
  });
  const boton = el('button', { class: 'boton boton--peligro', type: 'submit', 'data-escribe': true }, 'Borrar mi cuenta');
  let enviando = false;

  /** @param {SubmitEvent} evento */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    aviso.replaceChildren();

    const valor = leerCampo(contrasena);
    ponerErrorCampo(contrasena, valor === '' ? 'Escribe tu contraseña para confirmar.' : null);
    if (valor === '') {
      contrasena.querySelector('.campo__entrada').focus();
      return;
    }

    enviando = true;
    ponerCargando(boton, true, 'Borrando…');
    try {
      await api.borrar('/yo', { contrasena: valor });
      // El servidor ya ha borrado sus suscripciones; quito la de este
      // navegador para que la próxima cuenta no la vea "activada".
      await desactivarAvisos({ avisarAlServidor: false }).catch(() => {});
      navegar('/entrar', { reemplazar: true, mensaje: 'Tu cuenta se ha borrado.' });
    } catch (error) {
      enviando = false;
      ponerCargando(boton, false);
      if (error.estado === 401) {
        ponerErrorCampo(contrasena, error.message);
        contrasena.querySelector('.campo__entrada').focus();
      } else {
        aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido borrar la cuenta.') }));
      }
    }
  }

  return {
    titulo: 'Borrar cuenta',
    atras: '/ajustes',
    contenido: el(
      'form',
      { class: 'formulario', novalidate: true, onsubmit: alEnviar },
      crearAviso({
        tipo: 'aviso',
        mensaje:
          'Se borrará tu cuenta. Si eres la única persona de tu casa, también se borrará la casa con todo su inventario. No se puede deshacer.',
      }),
      aviso,
      contrasena,
      boton
    ),
  };
}