/**
 * @file Datos personales (P-22, D-52): mi avatar con "Otro avatar", mi
 * nombre y mi email, que se cambia confirmándolo por correo (D-53).
 */
import { validarCambioEmail, validarNombrePersona } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { crearAvatarVivo, mirarAlToque, nacerAvatar } from '../componentes/avatar.js';
import { barajarFlotante } from '../componentes/ruleta.js';
import { crearAviso, crearCampo, leerCampo, ponerCargando, ponerErrorCampo } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { ponerUsuario } from '../yo.js';
import { pantallaDePerfil } from './comunPerfil.js';

/**
 * @returns {import('../router.js').Vista}
 */
export function pantallaPerfilDatos() {
  return pantallaDePerfil({
    titulo: 'Datos personales',
    atras: '/perfil',
    mensajeError: 'No se han podido cargar tus datos.',
    pintar({ usuario }) {
      return [crearSeccionAvatar(usuario), crearSeccionNombre(usuario), crearSeccionEmail(usuario)];
    },
  });
}

/**
 * El avatar vivo y "Otro avatar". Sin confirmar: si no gusta, se pulsa otra vez.
 * @param {{ avatarSemilla: string }} usuario
 */
function crearSeccionAvatar(usuario) {
  const marco = el('div', { class: 'perfil__avatar' });
  // role="status": el lector anuncia "Avatar nuevo" sin mover el foco del botón.
  const estado = el('p', { class: 'solo-lector', role: 'status' });
  const aviso = el('div');
  let dejarDeMirar = () => {};

  function ponerAvatar(semilla) {
    dejarDeMirar();
    const avatar = crearAvatarVivo({ semilla, tamano: 96 });
    marco.replaceChildren(avatar);
    dejarDeMirar = mirarAlToque(avatar, seccion);
  }

  /**
   * "Otro avatar": la ruleta sale flotando encima de la pantalla (D-56) y,
   * al irse, el nuevo aparece aquí con un "pop" y contento.
   * @param {string} semilla
   */
  async function barajar(semilla) {
    await barajarFlotante(semilla);
    dejarDeMirar();
    const avatar = await nacerAvatar(marco, semilla, { tamano: 96, vueltas: 0 });
    dejarDeMirar = mirarAlToque(avatar, seccion);
  }

  const otro = el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', 'data-escribe': true }, 'Otro avatar');
  otro.addEventListener('click', async () => {
    if (otro.disabled) return;
    aviso.replaceChildren();
    ponerCargando(otro, true, 'Cambiando…');
    try {
      const { usuario: nuevo } = await api.post('/yo/avatar');
      ponerUsuario(nuevo);
      // Mientras gira, el botón sigue sin poder pulsarse. Cambio solo el
      // texto: otro ponerCargando() se guardaría "Cambiando…" como original.
      otro.textContent = 'Barajando…';
      await barajar(nuevo.avatarSemilla);
      estado.textContent = 'Avatar nuevo.';
    } catch (error) {
      aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido cambiar el avatar.') }));
    } finally {
      ponerCargando(otro, false);
    }
  });

  const seccion = el('section', { class: 'seccion perfil__cabecera', 'aria-label': 'Tu avatar' }, marco, otro, estado, aviso);
  ponerAvatar(usuario.avatarSemilla);
  return seccion;
}

/**
 * Mi nombre: el que ven las demás personas de mi casa.
 * @param {{ nombre: string }} usuario
 */
function crearSeccionNombre(usuario) {
  const aviso = el('div');
  const campo = crearCampo({
    etiqueta: 'Nombre',
    nombre: 'nombre',
    valor: usuario.nombre,
    ayuda: 'Es el que ven las personas de tu casa.',
    atributos: { maxlength: 80, autocomplete: 'name', autocapitalize: 'words', required: true },
  });
  const guardar = el('button', { class: 'boton boton--primario boton--ajustado', type: 'submit', 'data-escribe': true }, 'Guardar nombre');

  /** @param {SubmitEvent} evento */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (guardar.disabled) return;
    aviso.replaceChildren();
    const resultado = validarNombrePersona(leerCampo(campo));
    ponerErrorCampo(campo, resultado.ok ? null : resultado.errores.nombre);
    if (!resultado.ok) {
      campo.querySelector('input').focus();
      return;
    }
    ponerCargando(guardar, true);
    try {
      const { usuario: nuevo } = await api.patch('/yo', { nombre: resultado.datos });
      ponerUsuario(nuevo);
      usuario.nombre = nuevo.nombre;
      aviso.replaceChildren(crearAviso({ tipo: 'exito', mensaje: '✓ Nombre guardado.' }));
    } catch (error) {
      if (error.campos?.nombre) ponerErrorCampo(campo, error.campos.nombre);
      else aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido guardar el nombre.') }));
    } finally {
      ponerCargando(guardar, false);
    }
  }

  return el(
    'section',
    { class: 'seccion', 'aria-labelledby': 'titulo-nombre' },
    el('h2', { class: 'titulo-seccion', id: 'titulo-nombre' }, 'Tu nombre'),
    el('form', { class: 'formulario', novalidate: true, onsubmit: alEnviar }, aviso, campo, el('div', { class: 'seccion__acciones' }, guardar))
  );
}

/**
 * Mi email, con "Cambiar email" (D-53). Al pulsarlo sale el formulario: el
 * email nuevo y mi contraseña. Envío un enlace al nuevo y un aviso al
 * actual; el email NO cambia hasta que abra ese enlace.
 * @param {{ email: string }} usuario
 */
function crearSeccionEmail(usuario) {
  const caja = el('div', { class: 'formulario' });

  /** @param {string} [mensaje] Lo que enseño encima (tras enviar el enlace). */
  function verEmail(mensaje) {
    const cambiar = el('button', { class: 'boton boton--fantasma boton--ajustado', type: 'button', 'data-escribe': true, onclick: editar }, 'Cambiar email');
    caja.replaceChildren(
      ...(mensaje ? [el('div', { role: 'status' }, crearAviso({ tipo: 'exito', mensaje }))] : []),
      el('p', { class: 'texto--fuerte perfil__email' }, usuario.email),
      el('div', { class: 'seccion__acciones' }, cambiar)
    );
    return cambiar;
  }

  function editar() {
    const aviso = el('div');
    const nuevo = crearCampo({
      etiqueta: 'Email nuevo',
      nombre: 'email-nuevo',
      atributos: { type: 'email', autocomplete: 'email', inputmode: 'email', autocapitalize: 'none', spellcheck: 'false', required: true },
    });
    const contrasena = crearCampo({
      etiqueta: 'Tu contraseña',
      nombre: 'contrasena-email',
      ayuda: 'Para confirmar que eres tú.',
      atributos: { type: 'password', autocomplete: 'current-password', required: true },
    });
    const enviar = el('button', { class: 'boton boton--primario boton--ajustado', type: 'submit', 'data-escribe': true }, 'Enviar enlace');
    const cancelar = el('button', { class: 'boton boton--fantasma boton--ajustado', type: 'button' }, 'Cancelar');
    // Al cancelar, el foco vuelve al botón que abrió el formulario.
    cancelar.addEventListener('click', () => verEmail().focus());

    /** @param {SubmitEvent} evento */
    async function alEnviar(evento) {
      evento.preventDefault();
      if (enviar.disabled) return;
      aviso.replaceChildren();
      const resultado = validarCambioEmail({ emailNuevo: leerCampo(nuevo), contrasena: leerCampo(contrasena) }, usuario.email);
      const errores = resultado.ok ? {} : resultado.errores;
      ponerErrorCampo(nuevo, errores.emailNuevo ?? null);
      ponerErrorCampo(contrasena, errores.contrasena ?? null);
      if (!resultado.ok) {
        (errores.emailNuevo ? nuevo : contrasena).querySelector('.campo__entrada').focus();
        return;
      }
      ponerCargando(enviar, true, 'Enviando…');
      try {
        await api.post('/yo/email', resultado.datos);
        verEmail(
          `✓ Te hemos enviado un enlace a ${resultado.datos.emailNuevo}: ábrelo para confirmar. Hasta entonces sigues entrando con ${usuario.email}.`
        ).focus();
      } catch (error) {
        ponerCargando(enviar, false);
        if (error.campos?.emailNuevo || error.campos?.contrasena) {
          ponerErrorCampo(nuevo, error.campos.emailNuevo ?? null);
          ponerErrorCampo(contrasena, error.campos.contrasena ?? null);
          (error.campos.emailNuevo ? nuevo : contrasena).querySelector('.campo__entrada').focus();
        } else {
          aviso.replaceChildren(
            crearAviso({ mensaje: error.estado === 429 ? error.message : mensajeDeError(error, 'No se ha podido enviar el enlace.') })
          );
        }
      }
    }

    caja.replaceChildren(
      el(
        'form',
        { class: 'formulario', novalidate: true, onsubmit: alEnviar },
        el('p', { class: 'tono--tenue' }, `Ahora es ${usuario.email}. Te enviaremos un enlace al nuevo para confirmarlo.`),
        aviso,
        nuevo,
        contrasena,
        el('div', { class: 'seccion__acciones' }, enviar, cancelar)
      )
    );
    nuevo.querySelector('.campo__entrada').focus();
  }

  verEmail();
  return el(
    'section',
    { class: 'seccion', 'aria-labelledby': 'titulo-email' },
    el('h2', { class: 'titulo-seccion', id: 'titulo-email' }, 'Email'),
    caja
  );
}
