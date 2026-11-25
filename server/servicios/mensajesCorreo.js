/**
 * @file Los textos de los correos (D-53): en español, en texto plano y en un
 * HTML sencillo, sin imágenes ni seguimiento. Sin red ni base de datos: así
 * los pruebo.
 *
 * En el HTML escapo TODO lo que no he escrito yo (el nombre de la persona,
 * su email): si alguien se llamara "<a href=…>", saldría como texto y no
 * como un enlace a otra web.
 */
import { MINUTOS_ENLACE } from './enlaces.js';

/**
 * @typedef {Object} Correo
 * @property {string} para
 * @property {string} asunto
 * @property {string} texto La versión en texto plano (la que leen algunos clientes).
 * @property {string} html
 */

/** Lo que cambia el HTML: & < > " y '. */
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * @param {string} texto
 * @returns {string}
 */
export function escaparHtml(texto) {
  return String(texto).replace(/[&<>"']/g, (caracter) => ESCAPES[caracter]);
}

/**
 * El HTML de un correo: párrafos y, si hay, un botón con el enlace (y el
 * enlace escrito debajo, por si el botón no se ve).
 * @param {string[]} parrafos En texto (los escapo yo).
 * @param {{ url: string, texto: string } | null} enlace
 * @param {string[]} despues Párrafos que van detrás del enlace.
 * @returns {string}
 */
function crearHtml(parrafos, enlace, despues = []) {
  const p = (texto) => `<p style="margin:0 0 16px">${escaparHtml(texto)}</p>`;
  const boton = enlace
    ? `<p style="margin:0 0 16px"><a href="${escaparHtml(enlace.url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#0f2f45;color:#ffffff;text-decoration:none;font-weight:600">${escaparHtml(enlace.texto)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:13px;color:#555555">Si el botón no funciona, copia este enlace en el navegador:<br>${escaparHtml(enlace.url)}</p>`
    : '';
  return (
    '<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f6ead2;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1b2630;font-size:16px;line-height:1.5">' +
    '<div style="max-width:480px;margin:0 auto;background:#fffbf3;border-radius:14px;padding:24px">' +
    parrafos.map(p).join('') +
    boton +
    despues.map(p).join('') +
    '<p style="margin:24px 0 0;color:#555555">Stockpot</p></div></body></html>'
  );
}

/**
 * "¿Has olvidado la contraseña?": el enlace para poner una nueva.
 * @param {{ nombre: string, email: string, url: string }} datos
 * @returns {Correo}
 */
export function correoRecuperar({ nombre, email, url }) {
  const minutos = MINUTOS_ENLACE.recuperar;
  const intro = [`Hola, ${nombre}:`, 'Has pedido cambiar la contraseña de tu cuenta de Stockpot.'];
  const aviso = `El enlace caduca en ${minutos} minutos y solo sirve una vez. Si no has sido tú, no hagas nada: tu contraseña no cambia.`;
  return {
    para: email,
    asunto: 'Cambia tu contraseña de Stockpot',
    texto: [...intro, `Para poner una nueva, abre este enlace:\n${url}`, aviso, 'Stockpot'].join('\n\n'),
    html: crearHtml(intro, { url, texto: 'Poner una contraseña nueva' }, [aviso]),
  };
}

/**
 * "Cambiar email": el enlace para confirmar, al email NUEVO.
 * @param {{ nombre: string, emailNuevo: string, url: string }} datos
 * @returns {Correo}
 */
export function correoConfirmarEmail({ nombre, emailNuevo, url }) {
  const intro = [`Hola, ${nombre}:`, `Para que ${emailNuevo} sea el email de tu cuenta de Stockpot, confírmalo.`];
  const aviso = 'El enlace caduca en 24 horas y solo sirve una vez. Si no has sido tú, no hagas nada: no cambiará.';
  return {
    para: emailNuevo,
    asunto: 'Confirma tu nuevo email de Stockpot',
    texto: [...intro, `Abre este enlace:\n${url}`, aviso, 'Stockpot'].join('\n\n'),
    html: crearHtml(intro, { url, texto: 'Confirmar mi email' }, [aviso]),
  };
}

/**
 * "Cambiar email": el aviso al email ACTUAL. Sin enlaces: si alguien te ha
 * quitado la sesión, lo que tienes que hacer es entrar tú en la app.
 * @param {{ nombre: string, email: string, emailNuevo: string }} datos
 * @returns {Correo}
 */
export function correoAvisoCambioEmail({ nombre, email, emailNuevo }) {
  const parrafos = [
    `Hola, ${nombre}:`,
    `Se ha pedido cambiar el email de tu cuenta de Stockpot a ${emailNuevo}. No cambiará hasta que se confirme desde ese email.`,
    'Si no has sido tú, entra en Stockpot y cambia tu contraseña en Perfil › Seguridad.',
  ];
  return {
    para: email,
    asunto: 'Han pedido cambiar el email de tu cuenta de Stockpot',
    texto: [...parrafos, 'Stockpot'].join('\n\n'),
    html: crearHtml(parrafos, null),
  };
}
