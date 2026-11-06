/**
 * @file Pantalla Crear cuenta (P-02). Pública. Crea la cuenta, su casa
 * ("Casa de Ana") y la sesión de una vez (POST /api/auth/registro).
 */
import { validarRegistro } from '/compartido/validacion.js';
import { MIN_LONGITUD_CONTRASENA } from '/compartido/constantes.js';
import { api, mensajeDeError } from '../api.js';
import { crearAviso, crearCampo, leerCampo, ponerCargando, ponerErrorCampo } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';
import { destinoSeguro } from './entrar.js';

/**
 * @param {{ consulta: URLSearchParams }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaRegistro({ consulta }) {
  const volver = destinoSeguro(consulta.get('volver'));
  const aviso = el('div');
  const nombre = crearCampo({
    etiqueta: 'Tu nombre',
    nombre: 'nombre',
    atributos: { autocomplete: 'given-name', autocapitalize: 'words', maxlength: 80 },
  });
  const email = crearCampo({
    etiqueta: 'Email',
    nombre: 'email',
    atributos: { type: 'email', autocomplete: 'email', inputmode: 'email', autocapitalize: 'none', spellcheck: 'false', placeholder: 'nombre@correo.com' },
  });
  const contrasena = crearCampo({
    etiqueta: 'Contraseña',
    nombre: 'contrasena',
    ayuda: `Mínimo ${MIN_LONGITUD_CONTRASENA} caracteres.`,
    // new-password: el llavero de iCloud (o Bitwarden) ofrece una contraseña segura.
    atributos: { type: 'password', autocomplete: 'new-password' },
  });
  const boton = el('button', { class: 'boton boton--primario', type: 'submit', 'data-escribe': true }, 'Crear cuenta');
  const CAMPOS = [
    ['nombre', nombre],
    ['email', email],
    ['contrasena', contrasena],
  ];
  let enviando = false;

  /**
   * Enseña el error de cada campo y lleva el foco al primero que falla.
   * @param {Record<string, string>} errores
   */
  function mostrarErrores(errores) {
    let primero = null;
    for (const [clave, campo] of CAMPOS) {
      ponerErrorCampo(campo, errores[clave]);
      if (errores[clave] && !primero) primero = campo;
    }
    primero?.querySelector('.campo__entrada').focus();
  }

  /** @param {SubmitEvent} evento */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    aviso.replaceChildren();

    const resultado = validarRegistro({
      nombre: leerCampo(nombre),
      email: leerCampo(email),
      contrasena: leerCampo(contrasena),
    });
    mostrarErrores(resultado.ok ? {} : resultado.errores);
    if (!resultado.ok) return;

    enviando = true;
    ponerCargando(boton, true, 'Creando cuenta…');
    try {
      const { hogar } = await api.post('/auth/registro', resultado.datos);
      navegar(volver, { reemplazar: true, mensaje: `Ya tienes cuenta. Tu casa, «${hogar.nombre}», está lista.` });
    } catch (error) {
      enviando = false;
      ponerCargando(boton, false);
      if (error.campos) {
        // 409 "Ya existe una cuenta con ese email." llega en campos.email.
        mostrarErrores(error.campos);
      } else {
        const mensaje =
          error.estado === 429 ? error.message : mensajeDeError(error, 'No se ha podido conectar. Inténtalo de nuevo.');
        aviso.replaceChildren(crearAviso({ mensaje }));
      }
    }
  }

  return {
    titulo: 'Crear cuenta',
    atras: `/entrar?volver=${encodeURIComponent(volver)}`,
    contenido: el(
      'div',
      { class: 'acceso' },
      el('form', { class: 'formulario', novalidate: true, onsubmit: alEnviar }, aviso, nombre, email, contrasena, boton),
      el(
        'p',
        { class: 'acceso__pie' },
        '¿Ya tienes cuenta? ',
        el('a', { href: `/entrar?volver=${encodeURIComponent(volver)}` }, 'Entra')
      )
    ),
  };
}