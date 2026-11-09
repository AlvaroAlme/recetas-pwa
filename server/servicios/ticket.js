/**
 * @file Lectura de tickets de la compra con la visión de Claude
 * (lib/ticket.ts de la app Expo). El prompt y el esquema van TAL CUAL.
 *
 * El tipo, el tamaño y la firma del archivo ya los ha comprobado la ruta
 * (validacion/ia.js): aquí solo construyo la petición y valido la respuesta.
 */
import { MAX_CANTIDAD, MAX_LONGITUD_NOMBRE, MAX_PRODUCTOS_TICKET, UBICACIONES, UNIDADES } from '../../compartido/constantes.js';
import { ErrorClaude, pedirJsonAClaude } from './claude.js';

/**
 * Producto tal y como lo devuelvo, ya validado.
 * @typedef {{ nombre: string, cantidad: number, unidad: string, ubicacionesPosibles: string[] }} ProductoTicket
 */

// JSON Schema que la respuesta de Claude está obligada a cumplir.
const ESQUEMA_TICKET = {
  type: 'object',
  properties: {
    es_ticket: {
      type: 'boolean',
      description: 'false si la imagen o el PDF no es un ticket de compra',
    },
    productos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          cantidad: { type: 'number' },
          unidad: { type: 'string', enum: [...UNIDADES] },
          ubicaciones_posibles: {
            type: 'array',
            items: { type: 'string', enum: [...UBICACIONES] },
          },
        },
        required: ['nombre', 'cantidad', 'unidad', 'ubicaciones_posibles'],
        additionalProperties: false,
      },
    },
  },
  required: ['es_ticket', 'productos'],
  additionalProperties: false,
};

const INSTRUCCIONES = `Eres un asistente que lee tickets de supermercados españoles para una app de inventario de comida de casa.

Extrae SOLO los alimentos y bebidas comprados. Ignora productos que no son comida (bolsas, limpieza, higiene), descuentos, totales, IVA y datos de la tienda.

Para cada alimento:
- nombre: nombre genérico, corto y claro en español, como lo diría una persona ("Pechuga de pollo", "Leche entera", "Arroz"), no la abreviatura del ticket ("PECH.POLLO BDJ").
- cantidad y unidad: la cantidad TOTAL comprada. Usa peso o volumen (g, kg, ml, l) si aparece en el ticket o en el nombre del producto (ej. "ARROZ 1KG" x2 -> 2 kg; "LECHE 1L" x6 -> 6 l). Si no se puede saber, usa "unidades" con el número de unidades compradas. Si hay producto a granel con peso, usa ese peso.
- ubicaciones_posibles: dónde se suele guardar en una casa española: "nevera", "despensa" y/o "congelador". Pon varias si es habitual guardarlo en más de un sitio (ej. carne fresca: nevera y congelador). Los congelados van en "congelador".

Si el documento no es un ticket de compra, devuelve es_ticket = false y productos vacío.`;

/**
 * Construyo el bloque de imagen o PDF que envío a Claude.
 * @param {{ base64: string, mimeType: string }} archivo
 */
function bloqueArchivo({ base64, mimeType }) {
  if (mimeType === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
  }
  return { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } };
}

/**
 * Compruebo a mano que la respuesta tiene exactamente la forma esperada.
 * Si algo no cuadra, la rechazo ENTERA: nunca paso una lista a medias.
 * @param {unknown} datos Lo que ha devuelto Claude.
 * @returns {ProductoTicket[]}
 */
export function validarRespuestaTicket(datos) {
  const formatoIncorrecto = new ErrorClaude(
    502,
    'IA_FORMATO',
    'La respuesta de la IA no tiene el formato esperado. Inténtalo de nuevo.',
    true
  );

  if (typeof datos !== 'object' || datos === null) throw formatoIncorrecto;
  const { es_ticket, productos } = datos;
  if (typeof es_ticket !== 'boolean' || !Array.isArray(productos)) throw formatoIncorrecto;

  if (!es_ticket) {
    throw new ErrorClaude(422, 'NO_ES_TICKET', 'Eso no parece un ticket de compra. Prueba con otra foto.', false);
  }
  if (productos.length > MAX_PRODUCTOS_TICKET) {
    throw new ErrorClaude(
      422,
      'DEMASIADOS_PRODUCTOS',
      `El ticket tiene demasiados productos (máximo ${MAX_PRODUCTOS_TICKET}). Prueba a fotografiarlo por partes.`,
      false
    );
  }

  const validados = productos.map((p) => {
    if (typeof p !== 'object' || p === null) throw formatoIncorrecto;
    const { nombre, cantidad, unidad, ubicaciones_posibles } = p;
    if (
      typeof nombre !== 'string' ||
      nombre.trim() === '' ||
      nombre.trim().length > MAX_LONGITUD_NOMBRE ||
      typeof cantidad !== 'number' ||
      !Number.isFinite(cantidad) ||
      cantidad <= 0 ||
      cantidad > MAX_CANTIDAD ||
      !UNIDADES.includes(unidad) ||
      !Array.isArray(ubicaciones_posibles) ||
      !ubicaciones_posibles.every((u) => UBICACIONES.includes(u))
    ) {
      throw formatoIncorrecto;
    }
    return {
      nombre: nombre.trim(),
      cantidad,
      unidad,
      // Sin duplicados, por si el modelo repite alguna.
      ubicacionesPosibles: [...new Set(ubicaciones_posibles)],
    };
  });

  if (validados.length === 0) {
    throw new ErrorClaude(422, 'SIN_ALIMENTOS', 'No se ha encontrado ningún alimento en el ticket.', false);
  }
  return validados;
}

/**
 * Envío el ticket a Claude y devuelvo la lista de productos validada.
 * @param {string} apiKey
 * @param {{ base64: string, mimeType: string }} archivo
 * @returns {Promise<ProductoTicket[]>}
 */
export async function leerTicket(apiKey, archivo) {
  const respuesta = await pedirJsonAClaude({
    apiKey,
    system: INSTRUCCIONES,
    contenido: [bloqueArchivo(archivo), { type: 'text', text: 'Extrae los alimentos de este ticket.' }],
    esquema: ESQUEMA_TICKET,
  });
  return validarRespuestaTicket(respuesta);
}