/**
 * @file Ejecuto una herramienta que pide Claude en el chat (D-51): leo de la
 * base de datos lo que necesita y uso herramientasChat.js para comprobar y
 * resumir.
 *
 * El hogar sale SIEMPRE de la sesión, nunca de lo que diga el modelo: así,
 * aunque un nombre de producto intente colarle instrucciones, solo puede
 * leer esta casa (ARQUITECTURA §9.7 bis). Y nada de aquí guarda: las
 * propuestas salen como tarjeta.
 */
import { UBICACIONES } from '../../compartido/constantes.js';
import {
  MAX_HUECOS_PROPUESTA,
  MAX_RECETAS_CHAT,
  RESULTADO_TARJETA,
  fechasDePropuesta,
  leerLunesPedido,
  resumirInventario,
  resumirRecetas,
  resumirSemana,
  validarPropuestaHuecos,
  validarPropuestaReceta,
} from './herramientasChat.js';
import { listarProductos } from './inventario.js';
import { hoyDelHogar, huecosDeFechas, listarSemana } from './plan.js';
import { listarRecetasConIngredientes, nombresDeRecetas } from './recetas.js';
import { listarTuppers } from './tuppers.js';

/**
 * @typedef {Object} ResultadoHerramienta
 * @property {string} contenido Lo que va en el tool_result (JSON o un texto).
 * @property {boolean} esError Si es true, va con is_error y el modelo lo corrige.
 * @property {{ tipo: 'receta' | 'huecos', propuesta: object } | null} tarjeta
 */

/** @returns {ResultadoHerramienta} */
const datos = (objeto) => ({ contenido: JSON.stringify(objeto), esError: false, tarjeta: null });

/** @returns {ResultadoHerramienta} */
const error = (texto) => ({ contenido: texto, esError: true, tarjeta: null });

/** @returns {ResultadoHerramienta} */
const tarjeta = (tipo, propuesta) => ({ contenido: RESULTADO_TARJETA, esError: false, tarjeta: { tipo, propuesta } });

/**
 * @param {string} nombre El de la herramienta (un bloque tool_use).
 * @param {unknown} entrada Lo que manda el modelo: NO me fío, lo compruebo.
 * @param {number} hogarId El de la sesión.
 * @returns {Promise<ResultadoHerramienta>}
 */
export async function usarHerramienta(nombre, entrada, hogarId) {
  const hoy = await hoyDelHogar(hogarId);

  switch (nombre) {
    case 'leer_inventario': {
      // Una consulta por ubicación: reutilizo las de la pantalla Inventario.
      const [productos, tuppers] = await Promise.all([
        Promise.all(UBICACIONES.map((ubicacion) => listarProductos(hogarId, ubicacion))),
        Promise.all(UBICACIONES.map((ubicacion) => listarTuppers(hogarId, ubicacion))),
      ]);
      return datos(resumirInventario({ productos: productos.flat(), tuppers: tuppers.flat() }, hoy));
    }

    case 'leer_recetas': {
      const { recetas, total } = await listarRecetasConIngredientes(hogarId, MAX_RECETAS_CHAT);
      return datos(resumirRecetas(recetas, total));
    }

    case 'leer_semana': {
      const pedido = leerLunesPedido(entrada, hoy);
      if (!pedido.ok) return error(pedido.error);
      return datos(resumirSemana(pedido.lunes, await listarSemana(hogarId, pedido.lunes), hoy));
    }

    case 'proponer_receta': {
      const resultado = validarPropuestaReceta(entrada);
      if (!resultado.ok) return error(resultado.error);
      return tarjeta('receta', resultado.datos);
    }

    case 'proponer_huecos': {
      // Antes de validar, miro en la base de datos lo que hace falta: qué
      // hay ahora en esas fechas y si las recetas que nombra son de la casa.
      const huecos = typeof entrada === 'object' && entrada !== null && Array.isArray(entrada.huecos) ? entrada.huecos : [];
      // Con demasiados, ni consulto: validarPropuestaHuecos() ya da el error.
      if (huecos.length > MAX_HUECOS_PROPUESTA) {
        return error(validarPropuestaHuecos(entrada, { hoy, recetas: new Map(), actuales: [] }).error);
      }
      const ids = [...new Set(huecos.map((hueco) => hueco?.recetaId).filter((id) => Number.isSafeInteger(id) && id > 0))];
      const [actuales, recetas] = await Promise.all([
        huecosDeFechas(hogarId, fechasDePropuesta(entrada)),
        nombresDeRecetas(hogarId, ids),
      ]);
      const resultado = validarPropuestaHuecos(entrada, { hoy, recetas, actuales });
      if (!resultado.ok) return error(resultado.error);
      return tarjeta('huecos', { huecos: resultado.huecos });
    }

    default:
      return error(`No existe la herramienta «${nombre}».`);
  }
}
