/**
 * @file Pantalla Ajustes (P-16): los avisos de este dispositivo (fase 4),
 * tu casa y tu cuenta. La IA y la hora del planificador llegan en sus fases.
 */
import { validarNombreCasa } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { desactivarAvisos } from '../avisos.js';
import { crearPanelAvisos } from '../componentes/panelAvisos.js';
import {
  confirmar,
  crearAviso,
  crearCampo,
  crearCarga,
  crearSinConexion,
  leerCampo,
  ponerCargando,
  ponerErrorCampo,
} from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar, tomarMensaje } from '../router.js';

/**
 * @returns {import('../router.js').Vista}
 */
export function pantallaAjustes() {
  const mensaje = tomarMensaje();
  const zona = el('div');

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando…'));
    try {
      const { usuario, hogar } = await api.get('/yo');
      zona.replaceChildren(crearSeccionAvisos(), crearSeccionCasa(usuario, hogar), crearSeccionCuenta(usuario));
    } catch (error) {
      zona.replaceChildren(
        error.codigo === 'SIN_CONEXION'
          ? crearSinConexion(cargar)
          : crearAviso({
              mensaje: mensajeDeError(error, 'No se han podido cargar tus ajustes.'),
              accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
            })
      );
    }
  }

  /** "Avisos en este dispositivo": cada dispositivo los activa por su cuenta (§7.6). */
  function crearSeccionAvisos() {
    return el(
      'section',
      { class: 'seccion', 'aria-labelledby': 'titulo-avisos' },
      el('h2', { class: 'titulo-seccion', id: 'titulo-avisos' }, 'Avisos en este dispositivo'),
      crearPanelAvisos()
    );
  }

  /**
   * El nombre de la casa con "Cambiar nombre" (P-16). Al pulsarlo, en su
   * sitio sale un campo con Guardar y Cancelar.
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
          navegar('/ajustes', { reemplazar: true, mensaje: `Tu casa ahora se llama «${nuevo.nombre}».` });
        } catch (error) {
          ponerCargando(guardar, false);
          if (error.campos?.nombre) ponerErrorCampo(campo, error.campos.nombre);
          else aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido cambiar el nombre.') }));
        }
      }

      caja.replaceChildren(
        el(
          'form',
          { class: 'formulario', novalidate: true, onsubmit: alEnviar },
          aviso,
          campo,
          el('div', { class: 'seccion__acciones' }, guardar, cancelar)
        )
      );
      campo.querySelector('input').focus();
    }

    verNombre();
    return caja;
  }

  /**
   * "Tu casa": su nombre, quién vive en ella, invitar, unirse y salir.
   * @param {{ id: number }} usuario
   * @param {{ nombre: string, miembros: { id: number, nombre: string, rol: string }[] }} hogar
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
        navegar('/ajustes', { reemplazar: true, mensaje: `Ahora estás en «${nuevo.nombre}».` });
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

  /**
   * "Cuenta": tu email, cerrar sesión y borrar la cuenta.
   * @param {{ email: string }} usuario
   */
  function crearSeccionCuenta(usuario) {
    const aviso = el('div');
    const botonCerrar = el(
      'button',
      { class: 'boton boton--secundario', type: 'button', 'data-escribe': true, onclick: cerrarSesion },
      'Cerrar sesión'
    );

    async function cerrarSesion() {
      ponerCargando(botonCerrar, true, 'Cerrando sesión…');
      try {
        // Primero los avisos (necesita la sesión): este dispositivo deja de
        // recibir los de esta cuenta (§7.1, paso 6).
        await desactivarAvisos();
        await api.post('/auth/logout');
        navegar('/entrar', { reemplazar: true });
      } catch (error) {
        ponerCargando(botonCerrar, false);
        aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido cerrar la sesión.') }));
      }
    }

    return el(
      'section',
      { class: 'seccion', 'aria-labelledby': 'titulo-cuenta' },
      el('h2', { class: 'titulo-seccion', id: 'titulo-cuenta' }, 'Cuenta'),
      el('p', {}, usuario.email),
      aviso,
      el(
        'div',
        { class: 'seccion__acciones' },
        botonCerrar,
        el('a', { class: 'boton boton--fantasma', href: '/cuenta/borrar' }, 'Borrar cuenta'),
        el('a', { class: 'boton boton--fantasma', href: '/privacidad' }, 'Privacidad')
      )
    );
  }

  cargar();
  return {
    titulo: 'Ajustes',
    contenido: el('div', {}, mensaje && crearAviso({ tipo: 'exito', mensaje: `✓ ${mensaje}` }), zona),
  };
}
