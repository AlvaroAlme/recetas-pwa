/**
 * @file Validación de lo que llega a /api/ia/ticket (§5): el tipo, el tamaño
 * y la FIRMA del archivo. La firma son sus primeros bytes: así sé qué es de
 * verdad, aunque el navegador diga otra cosa en mimeType.
 */
import { MAX_BYTES_IMAGEN_TICKET, MAX_BYTES_PDF_TICKET } from '../../compartido/constantes.js';
import { ErrorApi } from '../errores.js';

// Cómo empieza cada tipo de archivo que acepto ("números mágicos").
// Es un Map y no un objeto: con un objeto, mimeType = 'constructor' encontraría
// la función Object, que no es una firma, y se colaría.
const FIRMAS = new Map([
  ['application/pdf', (b) => b.toString('latin1', 0, 5) === '%PDF-'],
  ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/png', (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
  ['image/gif', (b) => ['GIF87a', 'GIF89a'].includes(b.toString('latin1', 0, 6))],
  ['image/webp', (b) => b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP'],
]);

// Solo los caracteres de base64, con el relleno "=" (como mucho dos) al final.
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Comprueba el archivo del ticket.
 * @param {unknown} cuerpo { archivo: { base64, mimeType } }
 * @returns {{ base64: string, mimeType: string }}
 * @throws {ErrorApi} 400 si no hay archivo, 413 si es grande, 415 si no es un tipo admitido.
 */
export function leerArchivoTicket(cuerpo) {
  const { base64, mimeType } = cuerpo?.archivo ?? {};
  if (typeof base64 !== 'string' || base64 === '' || base64.length % 4 !== 0 || !BASE64.test(base64)) {
    throw new ErrorApi(400, 'VALIDACION', 'No ha llegado ningún archivo válido.');
  }

  const tieneSuFirma = FIRMAS.get(mimeType);
  if (!tieneSuFirma) {
    throw new ErrorApi(415, 'TIPO_NO_ADMITIDO', 'Usa una foto (JPG, PNG, GIF o WebP) o un PDF del ticket.');
  }

  const bytes = Buffer.from(base64, 'base64');
  const maximo = mimeType === 'application/pdf' ? MAX_BYTES_PDF_TICKET : MAX_BYTES_IMAGEN_TICKET;
  if (bytes.length > maximo) {
    throw new ErrorApi(413, 'DEMASIADO_GRANDE', `El archivo es demasiado grande (máximo ${maximo / 1024 / 1024} MB).`);
  }

  if (!tieneSuFirma(bytes)) {
    throw new ErrorApi(415, 'TIPO_NO_ADMITIDO', 'El archivo no es una foto ni un PDF de verdad.');
  }
  return { base64, mimeType };
}