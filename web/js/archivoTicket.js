/**
 * @file Preparo el archivo del ticket antes de mandarlo a /api/ia/ticket:
 * las fotos las reduzco con <canvas> (lado mayor 2000 px, JPEG al 0,8) para
 * que pesen poco, y todo lo paso a base64, que es como viaja dentro del JSON.
 * No llamo a la API: eso lo hace la pantalla.
 */
import { MAX_BYTES_IMAGEN_TICKET, MAX_BYTES_PDF_TICKET } from '/compartido/constantes.js';

const LADO_MAXIMO = 2000;
const CALIDAD_JPEG = 0.8;

/** Un problema con el archivo, antes de llegar al servidor. El mensaje se enseña tal cual. */
export class ErrorArchivo extends Error {}

/**
 * Paso un archivo a base64, sin el "data:…;base64," del principio.
 * @param {Blob} archivo
 * @returns {Promise<string>}
 */
function aBase64(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result.slice(lector.result.indexOf(',') + 1));
    lector.onerror = () => rechazar(new ErrorArchivo('No se ha podido leer el archivo. Prueba otra vez.'));
    lector.readAsDataURL(archivo);
  });
}

/**
 * Reduzco la foto: el lado mayor a 2000 px como mucho, y en JPEG.
 * @param {Blob} foto
 * @returns {Promise<Blob>}
 */
async function reducirFoto(foto) {
  let imagen;
  try {
    imagen = await createImageBitmap(foto);
  } catch {
    throw new ErrorArchivo('No se ha podido abrir la foto. Prueba con otra o con un PDF.');
  }
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext('2d').drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close();

  const jpeg = await new Promise((resolver) => lienzo.toBlob(resolver, 'image/jpeg', CALIDAD_JPEG));
  if (!jpeg) throw new ErrorArchivo('No se ha podido preparar la foto. Prueba con otra.');
  return jpeg;
}

/**
 * Dejo el archivo listo para el cuerpo de POST /api/ia/ticket.
 * @param {File} archivo El que ha elegido la persona.
 * @returns {Promise<{ base64: string, mimeType: string }>}
 * @throws {ErrorArchivo} Si no es foto ni PDF, o si es demasiado grande.
 */
export async function prepararArchivoTicket(archivo) {
  if (archivo.type === 'application/pdf') {
    if (archivo.size > MAX_BYTES_PDF_TICKET) {
      throw new ErrorArchivo(`El PDF es demasiado grande (máximo ${MAX_BYTES_PDF_TICKET / 1024 / 1024} MB).`);
    }
    return { base64: await aBase64(archivo), mimeType: 'application/pdf' };
  }
  if (archivo.type.startsWith('image/')) {
    const jpeg = await reducirFoto(archivo);
    if (jpeg.size > MAX_BYTES_IMAGEN_TICKET) {
      throw new ErrorArchivo('La foto es demasiado grande. Prueba a recortarla.');
    }
    return { base64: await aBase64(jpeg), mimeType: 'image/jpeg' };
  }
  throw new ErrorArchivo('Usa una foto o un PDF del ticket.');
}