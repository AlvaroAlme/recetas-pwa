/**
 * @file Pantalla Ajustes (P-16): los avisos de este dispositivo (fase 4),
 * tu casa y tu cuenta. La IA y la hora del planificador llegan en sus fases.
 */
import { api, mensajeDeError } from '../api.js';
import { desactivarAvisos } from '../avisos.js';
import { crearPanelAvisos } from '../componentes/panelAvisos.js';
import { confirmar, crearAviso, crearCarga, crearSinConexion, ponerCargando } from '../componentes/ui/index.js';
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
      el('p', { class: 'texto--fuerte' }, hogar.nombre),
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
        el('a', { class: 'boton boton--fantasma', href: '/cuenta/borrar' }, 'Borrar cuenta')
      )
    );
  }

  cargar();
  return {
    titulo: 'Ajustes',
    contenido: el('div', {}, mensaje && crearAviso({ tipo: 'exito', mensaje: `✓ ${mensaje}` }), zona),
  };
}
