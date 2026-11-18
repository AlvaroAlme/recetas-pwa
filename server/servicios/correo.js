/**
 * @file Enviar correos (D-53). Con key de Resend, los envío de verdad
 * (resend.js); sin key (solo puede pasar en desarrollo: en Render es
 * obligatoria), van al "buzón de desarrollo": se escriben en la terminal
 * de npm run dev, con su enlace, y así pruebo todo sin enviar nada.
 *
 * Las direcciones .test (las cuentas de prueba) van SIEMPRE al buzón: no
 * existen, y un rebote empeora la reputación del dominio.
 */
import { config } from '../config.js';
import { enviarConResend, esDireccionDePrueba } from './resend.js';

/**
 * Envía un correo.
 * @param {import('./mensajesCorreo.js').Correo} correo
 * @returns {Promise<void>}
 * @throws {Error} Si no se ha podido enviar.
 */
export async function enviarCorreo(correo) {
  if (config.resendApiKey && !esDireccionDePrueba(correo.para)) {
    await enviarConResend(correo, { apiKey: config.resendApiKey, remitente: config.correoRemitente });
    return;
  }
  escribirEnBuzon(correo);
}

/**
 * El buzón de desarrollo: el correo, en texto, en la terminal. En producción
 * NUNCA escribo el texto (lleva el enlace, que vale como una contraseña): solo
 * que no lo he enviado porque la dirección es de prueba.
 * @param {import('./mensajesCorreo.js').Correo} correo
 */
function escribirEnBuzon({ para, asunto, texto }) {
  if (config.esProduccion) {
    console.info('Correo no enviado: la dirección es de prueba (.test).');
    return;
  }
  console.info(['', '══════ Buzón de desarrollo (no se ha enviado) ══════', `Para: ${para}`, `Asunto: ${asunto}`, '', texto, '═══════════════════════════════════════════════════', ''].join('\n'));
}
