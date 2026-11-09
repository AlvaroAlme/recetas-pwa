/**
 * @file Cliente mínimo de la API de Claude (Messages API) con fetch, sin SDK
 * (lib/claude.ts de la app Expo). Lo uso para leer tickets (fase 5) y para
 * generar recetas (fase 6).
 *
 * La API key me la pasa quien llama (sale de config): así este archivo no
 * importa config.js y las pruebas pueden cargarlo sin el .env.
 */
import { ErrorApi } from '../errores.js';

/** Modelo de Claude que usa la app. Lo cambio aquí si quiero probar otro. */
export const MODELO_CLAUDE = 'claude-sonnet-5-5';

const URL_API = 'https://api.anthropic.com/v1/messages';

/**
 * Lo que espero a Claude. Menos que los 75 s del navegador (api.js): así
 * contesto yo con un 504 claro antes de que el navegador se canse.
 */
const TIEMPO_MAXIMO_MS = 60_000;

/**
 * Error de Claude ya preparado para la API: el middleware de errores lo
 * convierte en JSON como cualquier ErrorApi.
 */
export class ErrorClaude extends ErrorApi {
  /**
   * @param {number} estado 422 si el archivo no sirve, 502 si Claude falla, 504 si tarda.
   * @param {string} codigo Código para el frontend (NO_ES_TICKET, IA_SATURADA…).
   * @param {string} mensaje Texto en español para enseñar al usuario.
   * @param {boolean} reintentable true si tiene sentido volver a intentarlo.
   */
  constructor(estado, codigo, mensaje, reintentable) {
    super(estado, codigo, mensaje, { reintentable });
    this.name = 'ErrorClaude';
  }
}

/**
 * Traduzco el código HTTP de un error de Anthropic. Si es suyo (429 o 5xx),
 * se puede reintentar. Si no (key, saldo, modelo), es cosa de mi
 * configuración: la persona no puede hacer nada, así que no le doy detalles
 * y lo apunto en el log para mí.
 * @param {number} estado
 * @returns {ErrorClaude}
 */
function errorDesdeRespuesta(estado) {
  if (estado === 429 || estado >= 500) {
    return new ErrorClaude(502, 'IA_SATURADA', 'El servicio de IA está saturado. Inténtalo en unos segundos.', true);
  }
  console.error(`Claude ha respondido ${estado}: revisa la key, el saldo o el modelo.`);
  return new ErrorClaude(502, 'IA_NO_DISPONIBLE', 'La lectura con IA no está disponible ahora. Inténtalo más tarde.', false);
}

/**
 * Envío una petición a Claude y devuelvo su respuesta ya convertida de JSON
 * a objeto. La API garantiza que el JSON sigue `esquema`, pero quien llama
 * lo valida igualmente antes de usarlo (nunca guardo datos a medias).
 * @param {{ apiKey: string, system: string, contenido: object[], esquema: object }} peticion
 * @returns {Promise<unknown>}
 */
export async function pedirJsonAClaude({ apiKey, system, contenido, esquema }) {
  let respuesta;
  try {
    respuesta = await fetch(URL_API, {
      method: 'POST',
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Si Claude rechaza la petición por seguridad, la API la repite sola
        // con otro modelo (ver `fallbacks` más abajo).
        'anthropic-beta': 'server-side-fallback-2026-07-01',
      },
      body: JSON.stringify({
        model: MODELO_CLAUDE,
        max_tokens: 16000,
        system,
        messages: [{ role: 'user', content: contenido }],
        // Salidas estructuradas: la respuesta tiene que ser JSON con este esquema.
        output_config: { format: { type: 'json_schema', schema: esquema } },
        fallbacks: 'default',
      }),
    });
  } catch (error) {
    // AbortSignal.timeout() falla con un TimeoutError; cualquier otro es la red.
    if (error.name === 'TimeoutError') {
      throw new ErrorClaude(504, 'IA_TIEMPO_AGOTADO', 'La IA está tardando demasiado. Inténtalo de nuevo.', true);
    }
    throw new ErrorClaude(502, 'IA_SIN_CONEXION', 'No se ha podido conectar con la IA. Inténtalo de nuevo.', true);
  }

  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw errorDesdeRespuesta(respuesta.status);

  // Antes de leer el contenido miro por qué paró el modelo.
  if (cuerpo?.stop_reason === 'refusal') {
    throw new ErrorClaude(502, 'IA_RECHAZADA', 'La IA no ha querido procesar este archivo.', false);
  }
  if (cuerpo?.stop_reason === 'max_tokens') {
    throw new ErrorClaude(502, 'IA_CORTADA', 'La respuesta de la IA se ha cortado. Inténtalo de nuevo.', true);
  }

  // La respuesta es una lista de bloques; el JSON viene en los de tipo "text"
  // (los de "thinking" y "fallback" no me interesan).
  const texto = (cuerpo?.content ?? [])
    .filter((bloque) => bloque.type === 'text')
    .map((bloque) => bloque.text)
    .join('');

  try {
    return JSON.parse(texto);
  } catch {
    throw new ErrorClaude(502, 'IA_FORMATO', 'La IA ha devuelto una respuesta con un formato inesperado. Inténtalo de nuevo.', true);
  }
}