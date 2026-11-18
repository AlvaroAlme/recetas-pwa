/**
 * @file Hogar (P-24, D-52): lo que era "Tu casa" en Ajustes. El nombre de
 * la casa (con "Cambiar nombre"), quién vive en ella con su avatar, invitar,
 * unirse a otra y salir.
 */
import { validarNombreCasa } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { crearAvatar } from '../componentes/avatar.js';
import { confirmar, crearAviso, crearCampo, leerCampo, ponerCargando, ponerErrorCampo } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';
import { pantallaDePerfil } from './comunPerfil.js';

/**
 * @returns {import('../router.js').Vista}
 */
export function pantallaPerfilHogar() {
  return pantallaDePerfil({
    titulo: 'Hogar',
    atras: '/perfil',
    mensajeError: 'No se ha podido cargar tu casa.',
    pintar({ usuario, hogar }) {
      return [crearSeccionCasa(usuario, hogar)];
    },
  });
}

/**
 * El nombre de la casa con "Cambiar nombre". Al pulsarlo, en su sitio sale
 * un campo con Guardar y Cancelar.
 * @param {{ nombre: string }} hogar
 * @returns {HTMLDivElement}
 */
function crearNombreCasa(hogar) {
  const caja = el('div', { class: 'nombre-casa' });

  function verNombre() {
    const cambiar = el(
      'button',
      { class: 'boton boton--fantasma boton--ajustado', type: 'button', 'data-escribe': true, onclick: editar },
      'Cambiar nombre'
    );
    caja.replaceChildren(el('p', { class: 'texto--fuerte' }, hogar.nombre), cambiar);
    return cambiar;
  }

  function editar() {
    const aviso = el('div');
    const campo = crearCampo({
      etiqueta: 'Nombre de tu casa',
      nombre: 'nombre-casa',
      valor: hogar.nombre,
      atributos: { maxlength: 80, autocapitalize: 'sentences', autocomplete: 'off' },
    });
    const guardar = el('button', { class: 'boton boton--primario boton--ajustado', type: 'submit', 'data-escribe': true }, 'Guardar');
    const cancelar = el('button', { class: 'boton boton--fantasma boton--ajustado', type: 'button' }, 'Cancelar');
    // Al cancelar, el foco vuelve al botón que abrió el campo.
    cancelar.addEventListener('click', () => verNombre().focus());

    /** @param {SubmitEvent} evento */
    async function alEnviar(evento) {
      evento.preventDefault();
      if (guardar.disabled) return;
      aviso.replaceChildren();
      const resultado = validarNombreCasa(leerCampo(campo));
      ponerErrorCampo(campo, resultado.ok ? null : resultado.errores.nombre);
      if (!resultado.ok) {
        campo.querySelector('input').focus();
        return;
      }
      if (resultado.datos === hogar.nombre) {
        verNombre().focus();
        return;
      }
      ponerCargando(guardar, true);
      try {
        const { hogar: nuevo } = await api.patch('/hogar', { nombre: resultado.datos });
        navegar('/perfil/hogar', { reemplazar: true, mensaje: `Tu casa ahora se llama «${nuevo.nombre}».` });
      } catch (error) {
        ponerCargando(guardar, false);
        if (error.campos?.nombre) ponerErrorCampo(campo, error.campos.nombre);
        else aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido cambiar el nombre.') }));
      }
    }

    caja.replaceChildren(
      el('form', { class: 'formulario', novalidate: true, onsubmit: alEnviar }, aviso, campo, el('div', { class: 'seccion__acciones' }, guardar, cancelar))
    );
    campo.querySelector('input').focus();
  }

  verNombre();
  return caja;
}

/**
 * "Tu casa": su nombre, quién vive en ella (con su avatar), invitar, unirse y salir.
 * @param {{ id: number }} usuario
 * @param {{ nombre: string, miembros: { id: number, nombre: string, rol: string, avatarSemilla: string }[] }} hogar
 */
function crearSeccionCasa(usuario, hogar) {
  const aviso = el('div');
  const lista = el(
    'ul',
    { class: 'lista' },
    hogar.miembros.map((miembro) =>
      el(
        'li',
        { class: 'fila fila--estatica' },
        crearAvatar({ semilla: miembro.avatarSemilla, tamano: 24 }),
        el(
          'span',
          { class: 'fila__textos' },
          el('span', { class: 'fila__titulo' }, miembro.id === usuario.id ? `${miembro.nombre} (tú)` : miembro.nombre)
        ),
        miembro.rol === 'propietario' && el('span', { class: 'fila__detalle' }, 'Responsable')
      )
    )
  );

  // Salir solo tiene sentido si hay más gente: si no, la API da 409.
  const botonSalir =
    hogar.miembros.length > 1 &&
    el('button', { class: 'boton boton--secundario', type: 'button', 'data-escribe': true, onclick: salirDeLaCasa }, 'Salir de esta casa');

  async function salirDeLaCasa() {
    const seguro = await confirmar({
      titulo: 'Salir de esta casa',
      texto: `Dejarás de ver el inventario de «${hogar.nombre}» y empezarás con una casa vacía. Las demás personas siguen en ella.`,
      textoConfirmar: 'Salir',
      peligroso: true,
    });
    if (!seguro) return;
    ponerCargando(botonSalir, true, 'Saliendo…');
    try {
      const { hogar: nuevo } = await api.post('/hogar/salir');
      navegar('/perfil/hogar', { reemplazar: true, mensaje: `Ahora estás en «${nuevo.nombre}».` });
    } catch (error) {
      ponerCargando(botonSalir, false);
      aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido salir de la casa.') }));
    }
  }

  return el(
    'section',
    { class: 'seccion', 'aria-labelledby': 'titulo-casa' },
    el('h2', { class: 'titulo-seccion', id: 'titulo-casa' }, 'Tu casa'),
    crearNombreCasa(hogar),
    lista,
    el(
      'div',
      { class: 'seccion__acciones' },
      el('a', { class: 'boton boton--secundario', href: '/hogar/invitar' }, 'Invitar a alguien'),
      el('a', { class: 'boton boton--fantasma', href: '/hogar/unirse' }, 'Tengo un código')
    ),
    aviso,
    botonSalir
  );
}
