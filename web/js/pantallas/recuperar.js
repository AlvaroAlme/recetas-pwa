/**
 * @file Recuperar contraseña (P-27, D-53). Pública. Escribes tu email y te
 * llega un enlace para poner una contraseña nueva. Si no hay ninguna cuenta
 * con ese email, te lo digo (decisión del autor, D-53).
 */
import { validarEmail } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { crearAviso, crearCampo, leerCampo, ponerCargando, ponerErrorCampo } from '../componentes/ui/index.js';
import { el } from '../dom.js';

/**
 * El email que vas escribiendo entre Entrar, Recuperar y Contraseña nueva,
 * para no tener que escribirlo otra vez. Lo guardo en memoria y no en la
 * URL (?email=…): un email en la URL acaba en el historial y en los logs.
 */
let emailRecordado = '';

/**
 * Entrar me lo pasa al pulsar "¿Has olvidado la contraseña?", y Contraseña
 * nueva al terminar (para que Entrar lo tenga puesto).
 * @param {string} email
 */
export function recordarEmail(email) {
  emailRecordado = email.trim();
}

/** El email recordado (o ''). */
export const emailRecordadoActual = () => emailRecordado;

/**
 * @returns {import('../router.js').Vista}
 */
export function pantallaRecuperar() {
  const zona = el('div');
  const aviso = el('div');
  const email = crearCampo({
    etiqueta: 'Email',
    nombre: 'email',
    valor: emailRecordado,
    atributos: { type: 'email', autocomplete: 'email', inputmode: 'email', autocapitalize: 'none', spellcheck: 'false', placeholder: 'nombre@correo.com' },
  });
  const boton = el('button', { class: 'boton boton--primario', type: 'submit', 'data-escribe': true }, 'Enviar enlace');

  /** @param {SubmitEvent} evento */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (boton.disabled) return;
    aviso.replaceChildren();
    const resultado = validarEmail(leerCampo(email));
    ponerErrorCampo(email, resultado.ok ? null : resultado.errores.email);
    if (!resultado.ok) {
      email.querySelector('.campo__entrada').focus();
      return;
    }
    ponerCargando(boton, true, 'Enviando…');
    try {
      await api.post('/auth/olvide', { email: resultado.datos });
      emailRecordado = resultado.datos;
      verEnviado(resultado.datos);
    } catch (error) {
      ponerCargando(boton, false);
      if (error.codigo === 'EMAIL_NO_REGISTRADO') {
        ponerErrorCampo(email, error.campos.email);
        aviso.replaceChildren(
          crearAviso({
            mensaje: 'No hay ninguna cuenta con ese email. Revisa que esté bien escrito o crea una cuenta.',
            accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/registro' }, 'Crear cuenta'),
          })
        );
        email.querySelector('.campo__entrada').focus();
        return;
      }
      // 429 ("Has pedido demasiados enlaces…") y 502 (no se ha podido enviar) traen su mensaje.
      aviso.replaceChildren(
        crearAviso({
          mensaje: [429, 502].includes(error.estado) ? error.message : mensajeDeError(error, 'No se ha podido enviar el enlace. Inténtalo de nuevo.'),
        })
      );
    }
  }

  /**
   * Enviado. role="status": el lector lo anuncia.
   * @param {string} direccion
   */
  function verEnviado(direccion) {
    zona.replaceChildren(
      el(
        'div',
        { role: 'status' },
        crearAviso({
          tipo: 'exito',
          mensaje: `✓ Te hemos enviado un enlace a ${direccion}. Caduca en 30 minutos.`,
        }),
        el('p', { class: 'tono--tenue' }, 'Si no lo ves en unos minutos, mira en la carpeta de spam o de promociones.')
      ),
      el('p', { class: 'acceso__pie' }, el('a', { href: '/entrar' }, 'Volver a Entrar'))
    );
  }

  zona.replaceChildren(
    el('p', {}, 'Escribe el email de tu cuenta y te enviaremos un enlace para poner una contraseña nueva.'),
    el('form', { class: 'formulario', novalidate: true, onsubmit: alEnviar }, aviso, email, boton)
  );

  return {
    titulo: 'Recuperar contraseña',
    atras: '/entrar',
    contenido: el('div', { class: 'acceso' }, zona),
  };
}
