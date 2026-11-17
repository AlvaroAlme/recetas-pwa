/**
 * @file La conversación del chat tal como la ve la persona (D-51), y otras
 * piezas del chat sin base de datos ni red (así las pruebo sin Neon).
 *
 * En `mensajes_chat` guardo los bloques TAL CUAL de la API (texto,
 * razonamiento, tool_use, tool_result). Al navegador NUNCA le mando eso: le
 * mando una "vista" con tus mensajes, el texto del ayudante y sus tarjetas.
 * El razonamiento del modelo no sale del servidor.
 */
import { TIPOS_COMIDA } from '../../compartido/constantes.js';
import { nombrePlato, textoDiaLargo } from '../../compartido/plan.js';
import { validarPropuestaReceta } from './herramientasChat.js';

/** Vueltas de herramientas por mensaje como mucho (D-51). */
export const MAX_VUELTAS_HERRAMIENTAS = 5;

/** Lo que enseño mientras se ejecuta cada herramienta. */
export const ESTADOS_HERRAMIENTA = Object.freeze({
  leer_inventario: 'Mirando tu inventario…',
  leer_recetas: 'Mirando tus recetas…',
  leer_semana: 'Mirando tu semana…',
  proponer_receta: 'Preparando la receta…',
  proponer_huecos: 'Preparando el cuadrante…',
});

/** Las herramientas que acaban en tarjeta, y el tipo de tarjeta. */
const TARJETAS = Object.freeze({ proponer_receta: 'receta', proponer_huecos: 'huecos' });

/** Así empieza el bloque con la fecha que añado a cada mensaje tuyo. */
const MARCA_FECHA = '<hoy>';

/**
 * El bloque con la fecha de hoy que va delante de cada mensaje tuyo. La
 * fecha va aquí y NO en las instrucciones: así estas no cambian nunca y no
 * pierdo la caché ni el razonamiento guardado (D-51).
 * @param {string} hoy AAAA-MM-DD, el de la casa.
 * @returns {{ type: 'text', text: string }}
 */
export function bloqueFecha(hoy) {
  const dia = textoDiaLargo(hoy).toLocaleLowerCase('es');
  return { type: 'text', text: `${MARCA_FECHA}Hoy es ${dia} de ${hoy.slice(0, 4)} (${hoy}).</hoy>` };
}

/**
 * @typedef {Object} TarjetaVista
 * @property {string} id El del bloque tool_use.
 * @property {'receta' | 'huecos'} tipo
 * @property {unknown} entrada Lo que propuso el modelo (la pantalla no la usa: la uso yo para la propuesta).
 * @property {'pendiente' | 'guardada' | 'descartada'} estado
 * @property {object | null} resultado
 */

/**
 * @typedef {Object} MensajeVista
 * @property {'tu' | 'ayudante'} rol
 * @property {string} texto
 * @property {TarjetaVista[]} tarjetas
 */

/**
 * De las filas guardadas a lo que ve la persona. Un turno del ayudante
 * puede ocupar varias filas (texto → herramienta → resultado → texto): las
 * junto en UN mensaje. Una tarjeta solo sale si su propuesta fue válida
 * (su tool_result no es un error).
 * @param {{ rol: 'user' | 'assistant', contenido: any[] }[]} filas En orden.
 * @param {Map<string, { estado: 'guardada' | 'descartada', resultado: object | null }>} estados De tarjetas_chat.
 * @returns {MensajeVista[]}
 */
export function vistaMensajes(filas, estados) {
  // Primero, qué tool_use tuvieron un resultado bueno.
  const validos = new Set();
  for (const { rol, contenido } of filas) {
    if (rol !== 'user') continue;
    for (const bloque of contenido) {
      if (bloque.type === 'tool_result' && !bloque.is_error) validos.add(bloque.tool_use_id);
    }
  }

  /** @type {MensajeVista[]} */
  const mensajes = [];
  for (const { rol, contenido } of filas) {
    if (rol === 'user') {
      // Las filas de tool_result también son "user" para la API, pero no las escribiste tú.
      const textos = contenido.filter((bloque) => bloque.type === 'text' && !bloque.text.startsWith(MARCA_FECHA));
      if (textos.length > 0) mensajes.push({ rol: 'tu', texto: textos.map((bloque) => bloque.text).join('\n'), tarjetas: [] });
      continue;
    }

    let actual = mensajes.at(-1);
    if (actual?.rol !== 'ayudante') {
      actual = { rol: 'ayudante', texto: '', tarjetas: [] };
      mensajes.push(actual);
    }
    for (const bloque of contenido) {
      if (bloque.type === 'text' && bloque.text.trim() !== '') {
        actual.texto += (actual.texto ? '\n\n' : '') + bloque.text.trim();
      } else if (bloque.type === 'tool_use' && bloque.name in TARJETAS && validos.has(bloque.id)) {
        const estado = estados.get(bloque.id);
        actual.tarjetas.push({
          id: bloque.id,
          tipo: TARJETAS[bloque.name],
          entrada: bloque.input,
          estado: estado?.estado ?? 'pendiente',
          resultado: estado?.resultado ?? null,
        });
      }
    }
  }
  return mensajes;
}

/**
 * Las recetas y las fechas que nombran las tarjetas de huecos: lo que tengo
 * que leer de la base de datos para pintarlas como están AHORA.
 * @param {MensajeVista[]} mensajes
 * @returns {{ fechas: string[], recetaIds: number[] }}
 */
export function loQueNombranLasTarjetas(mensajes) {
  const fechas = new Set();
  const recetaIds = new Set();
  for (const tarjeta of mensajes.flatMap((mensaje) => mensaje.tarjetas)) {
    if (tarjeta.tipo !== 'huecos') continue;
    for (const hueco of huecosDeEntrada(tarjeta.entrada)) {
      if (typeof hueco.fecha === 'string') fechas.add(hueco.fecha);
      if (Number.isSafeInteger(hueco.recetaId)) recetaIds.add(hueco.recetaId);
    }
  }
  return { fechas: [...fechas], recetaIds: [...recetaIds] };
}

/** Los huecos de una propuesta, o [] si no tiene forma de propuesta. */
const huecosDeEntrada = (entrada) =>
  (Array.isArray(entrada?.huecos) ? entrada.huecos : []).filter((hueco) => typeof hueco === 'object' && hueco !== null);

/**
 * @typedef {Object} HuecoTarjeta
 * @property {number} indice Su posición en la propuesta (lo que se manda al guardar).
 * @property {string} fecha
 * @property {string} tipo
 * @property {number | null} recetaId
 * @property {string | null} texto
 * @property {string | null} grupo
 * @property {string} nombre
 * @property {string | null} sustituyeA
 * @property {'pasado' | 'fuera de casa' | 'receta borrada' | null} noSePuede
 */

/**
 * Una tarjeta de huecos tal como está AHORA: lo que hay en cada hueco y si
 * ya no se puede (el día ha pasado, alguien lo ha marcado "fuera de casa" o
 * han borrado la receta). La propuesta ya se validó al hacerla; aquí no
 * descarto la tarjeta entera, marco cada hueco.
 * @param {unknown} entrada El input del tool_use.
 * @param {{ hoy: string, recetas: Map<number, string>, actuales: any[] }} contexto
 * @returns {HuecoTarjeta[]} Por fecha y la comida antes que la cena.
 */
export function huecosAhora(entrada, { hoy, recetas, actuales }) {
  return huecosDeEntrada(entrada)
    .map((hueco, indice) => {
      const recetaId = Number.isSafeInteger(hueco.recetaId) ? hueco.recetaId : null;
      const actual = actuales.find((otro) => otro.fecha === hueco.fecha && otro.tipo === hueco.tipo);
      /** @type {HuecoTarjeta['noSePuede']} */
      let noSePuede = null;
      if (hueco.fecha < hoy) noSePuede = 'pasado';
      else if (actual?.fueraDeCasa) noSePuede = 'fuera de casa';
      else if (recetaId !== null && !recetas.has(recetaId)) noSePuede = 'receta borrada';
      const texto = typeof hueco.plato === 'string' ? hueco.plato.trim() : null;
      return {
        indice,
        fecha: hueco.fecha,
        tipo: hueco.tipo,
        recetaId,
        texto: recetaId === null ? texto : null,
        grupo: hueco.grupo ?? null,
        nombre: recetaId !== null ? recetas.get(recetaId) ?? 'Receta borrada' : texto ?? '',
        sustituyeA: actual && !actual.fueraDeCasa ? nombrePlato(actual) : null,
        noSePuede,
      };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || TIPOS_COMIDA.indexOf(a.tipo) - TIPOS_COMIDA.indexOf(b.tipo));
}

/**
 * La tarjeta para el navegador: sin la entrada en bruto, con la propuesta
 * lista para pintar.
 * @param {TarjetaVista} tarjeta
 * @param {{ hoy: string, recetas: Map<number, string>, actuales: any[] }} contexto
 */
export function tarjetaParaPantalla(tarjeta, contexto) {
  const { entrada, ...resto } = tarjeta;
  if (tarjeta.tipo === 'receta') {
    const resultado = validarPropuestaReceta(entrada);
    return { ...resto, propuesta: resultado.ok ? resultado.datos : null };
  }
  return { ...resto, propuesta: { huecos: huecosAhora(entrada, contexto) } };
}

/**
 * Qué huecos ha elegido la persona al guardar: posiciones de la propuesta,
 * sin repetir y que existan.
 * @param {unknown} cuerpo { elegidos: [0, 2] }
 * @param {number} cuantos Los huecos de la propuesta.
 * @returns {number[] | null} null si no es válido.
 */
export function leerElegidos(cuerpo, cuantos) {
  const elegidos = typeof cuerpo === 'object' && cuerpo !== null ? cuerpo.elegidos : undefined;
  if (!Array.isArray(elegidos) || elegidos.length === 0 || elegidos.length > cuantos) return null;
  if (!elegidos.every((i) => Number.isInteger(i) && i >= 0 && i < cuantos)) return null;
  if (new Set(elegidos).size !== elegidos.length) return null;
  return elegidos;
}
