/**
 * @file Seguridad (P-23, D-52): cambiar la contraseña, cerrar las demás
 * sesiones, cerrar esta y borrar la cuenta.
 */
import { validarCambioContrasena } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { desactivarAvisos } from '../avisos.js';
import { confirmar, crearAviso, crearCampo, leerCampo, ponerCargando, ponerErrorCampo } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';
import { pantallaDePerfil } from './comunPerfil.js';

/**
 * @returns {import('../router.js').Vista}
 */
export function pantallaPerfilSeguridad() {
  return pantallaDePerfil({
    titulo: 'Seguridad',
    atras: '/perfil',
    mensajeError: 'No se ha podido cargar tu cuenta.',
    pintar({ usuario }) {
      return [crearSeccionContrasena(usuario), crearSeccionSesiones()];
    },
  });
}

/**
 * Cambiar la contraseña: la actual y la nueva. Al cambiarla, el servidor
 * cierra mis otras sesiones; esta sigue abierta.
 * @param {{ email: string }} usuario
 */
function crearSeccionContrasena(usuario) {
  const aviso = el('div');
  const actual = crearCampo({
    etiqueta: 'Contraseña actual',
    nombre: 'actual',
    atributos: { type: 'password', autocomplete: 'current-password', required: true },
  });
  const nueva = crearCampo({
    etiqueta: 'Contraseña nueva',
    nombre: 'nueva',
    ayuda: 'De 10 a 128 caracteres.',
    atributos: { type: 'password', autocomplete: 'new-password', minlength: 10, maxlength: 128, required: true },
  });
  // El llavero del iPhone guarda la contraseña nueva con esta cuenta: para
  // saber de qué cuenta es, busca un campo "username" en el formulario.
  const cuenta = el('input', {
    type: 'email',
    name: 'username',
    autocomplete: 'username',
    value: usuario.email,
    class: 'solo-lector',
    tabindex: '-1',
    'aria-hidden': 'true',
    readonly: true,
  });
  const cambiar = el('button', { class: 'boton boton--primario boton--ajustado', type: 'submit', 'data-escribe': true }, 'Cambiar contraseña');

  /** @param {SubmitEvent} evento */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (cambiar.disabled) return;
    aviso.replaceChildren();
    const resultado = validarCambioContrasena({ actual: leerCampo(actual), nueva: leerCampo(nueva) });
    const errores = resultado.ok ? {} : resultado.errores;
    ponerErrorCampo(actual, errores.actual ?? null);
    ponerErrorCampo(nueva, errores.nueva ?? null);
    if (!resultado.ok) {
      (errores.actual ? actual : nueva).querySelector('input').focus();
      return;
    }
    ponerCargando(cambiar, true, 'Cambiando…');
    try {
      await api.put('/yo/contrasena', resultado.datos);
      actual.querySelector('input').value = '';
      nueva.querySelector('input').value = '';
      aviso.replaceChildren(
        crearAviso({ tipo: 'exito', mensaje: '✓ Contraseña cambiada. Hemos cerrado la sesión en tus otros dispositivos.' })
      );
    } catch (error) {
      if (error.campos?.actual || error.campos?.nueva) {
        ponerErrorCampo(actual, error.campos.actual ?? null);
        ponerErrorCampo(nueva, error.campos.nueva ?? null);
        (error.campos.actual ? actual : nueva).querySelector('input').focus();
      } else {
        // 429 (demasiados intentos) y los errores de red traen su mensaje.
        aviso.replaceChildren(
          crearAviso({ mensaje: error.estado === 429 ? error.message : mensajeDeError(error, 'No se ha podido cambiar la contraseña.') })
        );
      }
    } finally {
      ponerCargando(cambiar, false);
    }
  }

  return el(
    'section',
    { class: 'seccion', 'aria-labelledby': 'titulo-contrasena' },
    el('h2', { class: 'titulo-seccion', id: 'titulo-contrasena' }, 'Cambiar la contraseña'),
    el(
      'form',
      { class: 'formulario', novalidate: true, onsubmit: alEnviar },
      aviso,
      cuenta,
      actual,
      nueva,
      el('div', { class: 'seccion__acciones' }, cambiar)
    )
  );
}

/** Sesiones: cerrar las demás, cerrar esta y borrar la cuenta. */
function crearSeccionSesiones() {
  const aviso = el('div');
  const otras = el(
    'button',
    { class: 'boton boton--secundario', type: 'button', 'data-escribe': true },
    'Cerrar las demás sesiones'
  );
  const cerrar = el('button', { class: 'boton boton--secundario', type: 'button', 'data-escribe': true }, 'Cerrar sesión');

  otras.addEventListener('click', async () => {
    const seguro = await confirmar({
      titulo: 'Cerrar las demás sesiones',
      texto: 'Tendrás que volver a entrar en tus otros dispositivos. En este sigues dentro.',
      textoConfirmar: 'Cerrar sesiones',
    });
    if (!seguro) return;
    aviso.replaceChildren();
    ponerCargando(otras, true, 'Cerrando…');
    try {
      const { cerradas } = await api.borrar('/yo/sesiones');
      const texto =
        cerradas === 0
          ? 'No había otras sesiones abiertas.'
          : `✓ Hemos cerrado ${cerradas === 1 ? '1 sesión' : `${cerradas} sesiones`}.`;
      aviso.replaceChildren(crearAviso({ tipo: 'exito', mensaje: texto }));
    } catch (error) {
      aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se han podido cerrar las sesiones.') }));
    } finally {
      ponerCargando(otras, false);
    }
  });

  cerrar.addEventListener('click', async () => {
    ponerCargando(cerrar, true, 'Cerrando sesión…');
    try {
      // Primero los avisos (necesita la sesión): este dispositivo deja de
      // recibir los de esta cuenta (§7.1, paso 6).
      await desactivarAvisos();
      await api.post('/auth/logout');
      navegar('/entrar', { reemplazar: true });
    } catch (error) {
      ponerCargando(cerrar, false);
      aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido cerrar la sesión.') }));
    }
  });

  return el(
    'section',
    { class: 'seccion', 'aria-labelledby': 'titulo-sesiones' },
    el('h2', { class: 'titulo-seccion', id: 'titulo-sesiones' }, 'Sesiones'),
    el('p', { class: 'tono--tenue' }, 'Si has perdido un móvil o entraste en un ordenador que no es tuyo, cierra allí la sesión desde aquí.'),
    aviso,
    el(
      'div',
      { class: 'seccion__acciones' },
      otras,
      cerrar,
      el('a', { class: 'boton boton--fantasma', href: '/cuenta/borrar' }, 'Borrar cuenta')
    )
  );
}
