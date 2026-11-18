/**
 * @file Enviar correos (D-53).
 *
 * Paso 3 de la fase 10: de momento solo existe el "buzón de desarrollo": el
 * correo se escribe en la terminal de npm run dev (con su enlace), así puedo
 * probar todo sin enviar nada. En el paso 4 añado el envío de verdad con la
 * API de Resend.
 */
import { config } from '../config.js';

/**
 * Envía un correo.
 * @param {import('./mensajesCorreo.js').Correo} correo
 * @returns {Promise<void>}
 * @throws {Error} Si no se ha podido enviar.
 */
export async function enviarCorreo(correo) {
  if (config.esProduccion) {
    // Hasta el paso 4 no hay envío de verdad: mejor un error claro que un
    // correo que nunca llega.
    throw new Error('El envío de correos todavía no está configurado.');
  }
  escribirEnBuzon(correo);
}

/**
 * El buzón de desarrollo: el correo, en texto, en la terminal. SOLO en mi PC
 * (en producción nunca escribo un enlace en los logs: es como una contraseña).
 * @param {import('./mensajesCorreo.js').Correo} correo
 */
function escribirEnBuzon({ para, asunto, texto }) {
  console.info(['', '══════ Buzón de desarrollo (no se ha enviado) ══════', `Para: ${para}`, `Asunto: ${asunto}`, '', texto, '═══════════════════════════════════════════════════', ''].join('\n'));
}
