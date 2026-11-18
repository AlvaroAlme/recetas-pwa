/**
 * @file Datos personales (P-22, D-52): mi avatar con "Otro avatar", mi
 * nombre y mi email (el email todavía no se cambia: fase 11, con el correo).
 */
import { validarNombrePersona } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { crearAvatarVivo, mirarAlToque } from '../componentes/avatar.js';
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

  const otro = el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', 'data-escribe': true }, 'Otro avatar');
  otro.addEventListener('click', async () => {
    if (otro.disabled) return;
    aviso.replaceChildren();
    ponerCargando(otro, true, 'Cambiando…');
    try {
      const { usuario: nuevo } = await api.post('/yo/avatar');
      ponerUsuario(nuevo);
      ponerAvatar(nuevo.avatarSemilla);
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
 * Mi email: solo se ve. Cambiarlo exige confirmarlo por correo (fase 11, D-52).
 * @param {{ email: string }} usuario
 */
function crearSeccionEmail(usuario) {
  return el(
    'section',
    { class: 'seccion', 'aria-labelledby': 'titulo-email' },
    el('h2', { class: 'titulo-seccion', id: 'titulo-email' }, 'Email'),
    el('p', { class: 'texto--fuerte' }, usuario.email),
    el('p', { class: 'tono--tenue' }, 'Pronto podrás cambiarlo: tendremos que confirmarlo con un correo.')
  );
}
