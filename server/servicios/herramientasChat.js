/**
 * @file Las 5 herramientas del chat ayudante (D-51): lo que le cuento a
 * Claude que existe (DEFINICIONES), cómo compruebo lo que me pide y cómo le
 * resumo los datos de la casa.
 *
 * Aquí no hay SQL ni red: los datos me los pasa usarHerramienta.js, que es
 * quien consulta la base de datos. Así pruebo todo esto sin Neon.
 *
 * Las de leer devuelven datos; las de proponer NO guardan nada: si la
 * propuesta es válida, sale como tarjeta y la persona decide.
 */
import { GRUPOS_ALIMENTOS, TIPOS_COMIDA, UNIDADES } from '../../compartido/constantes.js';
import { esFechaIso, sumarDias } from '../../compartido/fechas.js';
import {
  avisosDia,
  dentroDelMargen,
  diasEntre,
  equilibrioSemana,
  esLunes,
  lunesDe,
  nombrePlato,
  textoDia,
  textoSemana,
} from '../../compartido/plan.js';
import { validarHueco, validarReceta } from '../../compartido/validacion.js';

/** Recetas que lee leer_recetas como mucho: las más recientes (fase 8, paso 3). */
export const MAX_RECETAS_CHAT = 100;

/** Huecos de una propuesta: los 14 de una semana. */
export const MAX_HUECOS_PROPUESTA = 14;

/** Lo que le contesto cuando una propuesta sale como tarjeta. */
export const RESULTADO_TARJETA = 'Tarjeta enseñada. La persona decide si la guarda: no digas que ya está guardada.';

/**
 * "Esto, o null". Con strict, Claude rellena SIEMPRE todos los campos: los
 * opcionales los pido así y él pone null cuando no hay nada.
 * @param {object} esquema
 */
const oNulo = (esquema) => ({ anyOf: [esquema, { type: 'null' }] });

/** Un objeto sin campos de más (strict lo exige) y con todos obligatorios. */
const objeto = (propiedades) => ({
  type: 'object',
  properties: propiedades,
  required: Object.keys(propiedades),
  additionalProperties: false,
});

/**
 * Lo que mando en `tools`. SIEMPRE las mismas y en el mismo orden: si
 * cambian, se pierden la caché y el razonamiento guardado (D-51). Los
 * límites (1 a 30, 80 caracteres…) no caben en un esquema strict: van en la
 * descripción y los compruebo yo al recibirlos.
 */
export const DEFINICIONES = Object.freeze(
  [
    {
      name: 'leer_inventario',
      description:
        'Lee lo que hay ahora en casa: los productos de la nevera, la despensa y el congelador (con su cantidad y su fecha de caducidad) y los tuppers sin consumir (con su fecha límite). Lo que caduca antes va primero; diasParaCaducar negativo es que ya ha caducado. Úsala antes de proponer algo "con lo que tengo" o de decir si falta un ingrediente.',
      input_schema: objeto({}),
    },
    {
      name: 'leer_recetas',
      description: `Lee las recetas guardadas en el recetario de la casa (las ${MAX_RECETAS_CHAT} más recientes) con su id, sus raciones y sus ingredientes, sin los pasos. Úsala para proponer en el cuadrante una receta que ya tienen (con su id) o para no proponer una receta que ya existe.`,
      input_schema: objeto({}),
    },
    {
      name: 'leer_semana',
      description:
        'Lee el cuadrante de una semana, de lunes a domingo: qué hay en cada comida y cena, qué huecos están libres y cuáles son "fuera de casa" (esos no se tocan nunca), el equilibrio frente a las recomendaciones de AESAN 2022 (legumbres 4 o más, pescado 3 o más, huevos 4 como mucho, carne 3 como mucho) y los avisos de cada día. Con lunes null, la semana de hoy.',
      input_schema: objeto({
        lunes: oNulo({ type: 'string', format: 'date', description: 'El lunes de la semana (AAAA-MM-DD), o null para la de hoy.' }),
      }),
    },
    {
      name: 'proponer_receta',
      description:
        'Enseña a la persona una tarjeta con una receta para que decida si la guarda en su recetario. NO la guarda. Nombre de 80 caracteres como mucho; de 1 a 30 ingredientes con su cantidad en g, kg, ml, l o unidades; de 1 a 30 pasos, una frase por paso (sin numerar, sin saltos de línea, 500 caracteres como mucho); raciones de 1 a 20, o null.',
      input_schema: objeto({
        nombre: { type: 'string' },
        raciones: oNulo({ type: 'integer' }),
        ingredientes: {
          type: 'array',
          items: objeto({
            nombre: { type: 'string' },
            cantidad: { type: 'number' },
            unidad: { type: 'string', enum: [...UNIDADES] },
          }),
        },
        pasos: { type: 'array', items: { type: 'string' } },
      }),
    },
    {
      name: 'proponer_huecos',
      description: `Enseña a la persona una tarjeta con platos para huecos del cuadrante; ella elige cuáles añade. NO guarda nada. De 1 a ${MAX_HUECOS_PROPUESTA} huecos, de hoy en adelante, sin repetir día y comida. En cada uno, recetaId (una receta guardada, de leer_recetas) o plato (un texto de 80 caracteres como mucho, por ejemplo "Lentejas con chorizo"), nunca los dos. grupo: el grupo de alimentos principal del plato, o null. Nunca propongas un hueco "fuera de casa". Si el hueco ya tiene algo, la tarjeta avisa de que lo sustituye: hazlo solo si la persona lo ha pedido.`,
      input_schema: objeto({
        huecos: {
          type: 'array',
          items: objeto({
            fecha: { type: 'string', format: 'date' },
            tipo: { type: 'string', enum: [...TIPOS_COMIDA] },
            recetaId: oNulo({ type: 'integer' }),
            plato: oNulo({ type: 'string' }),
            grupo: oNulo({ type: 'string', enum: [...GRUPOS_ALIMENTOS] }),
          }),
        },
      }),
    },
  ].map((definicion) => Object.freeze({ ...definicion, strict: true, eager_input_streaming: true }))
);

/** ¿Es un objeto normal (no null, no una lista)? */
const esObjeto = (valor) => typeof valor === 'object' && valor !== null && !Array.isArray(valor);

/**
 * Los errores por campo de validarReceta() o validarHueco(), en una línea
 * para el modelo: "nombre: Escribe el nombre de la receta. pasos: …".
 * @param {Record<string, string>} errores
 */
const enUnaLinea = (errores) =>
  Object.entries(errores)
    .map(([campo, mensaje]) => (campo === 'general' ? mensaje : `${campo}: ${mensaje}`))
    .join(' ');

/**
 * Productos y tuppers para leer_inventario: solo lo que le sirve al modelo
 * (sin ids ni fechas de alta), con los días que faltan contados desde el hoy
 * DE LA CASA. Lo que caduca antes, primero; lo que no caduca, al final.
 * @param {{ productos: any[], tuppers: any[] }} inventario
 * @param {string} hoy
 */
export function resumirInventario({ productos, tuppers }, hoy) {
  const porFecha = (a, b) => (a ?? '9999-12-31').localeCompare(b ?? '9999-12-31');
  return {
    hoy,
    productos: [...productos]
      .sort((a, b) => porFecha(a.fechaCaducidad, b.fechaCaducidad))
      .map((producto) => ({
        nombre: producto.nombre,
        cantidad: producto.cantidad,
        unidad: producto.unidad,
        ubicacion: producto.ubicacion,
        caducidad: producto.fechaCaducidad,
        diasParaCaducar: producto.fechaCaducidad ? diasEntre(hoy, producto.fechaCaducidad) : null,
      })),
    tuppers: [...tuppers]
      .sort((a, b) => porFecha(a.fechaLimite, b.fechaLimite))
      .map((tupper) => ({
        nombre: tupper.nombre,
        ubicacion: tupper.ubicacion,
        fechaLimite: tupper.fechaLimite,
        diasParaCaducar: diasEntre(hoy, tupper.fechaLimite),
      })),
  };
}

/**
 * Recetas para leer_recetas. Si hay más de las que leo, se lo digo, para
 * que no crea que no existen.
 * @param {{ id: number, nombre: string, raciones: number | null, ingredientes: any[] }[]} recetas Ya recortadas.
 * @param {number} total Las que tiene la casa en total.
 */
export function resumirRecetas(recetas, total) {
  const resumen = {
    recetas: recetas.map(({ id, nombre, raciones, ingredientes }) => ({
      id,
      nombre,
      raciones,
      ingredientes: ingredientes.map(({ nombre: ingrediente, cantidad, unidad }) => ({ nombre: ingrediente, cantidad, unidad })),
    })),
  };
  if (total > recetas.length) {
    resumen.aviso = `La casa tiene ${total} recetas; solo ves las ${recetas.length} más recientes.`;
  }
  return resumen;
}

/**
 * El lunes que pide leer_semana: null es la semana de hoy.
 * @param {unknown} entrada
 * @param {string} hoy
 * @returns {{ ok: true, lunes: string } | { ok: false, error: string }}
 */
export function leerLunesPedido(entrada, hoy) {
  const lunes = esObjeto(entrada) ? entrada.lunes ?? null : null;
  if (lunes === null) return { ok: true, lunes: lunesDe(hoy) };
  if (!esLunes(lunes)) return { ok: false, error: 'lunes tiene que ser un lunes (AAAA-MM-DD) o null.' };
  if (!dentroDelMargen(lunes, hoy)) return { ok: false, error: 'Solo hay cuadrante desde un año atrás hasta un año adelante.' };
  return { ok: true, lunes };
}

/**
 * Un hueco para el modelo: "libre", "fuera de casa" (con su nota) o lo que
 * hay, con su grupo.
 * @param {any | undefined} hueco
 */
function describirHueco(hueco) {
  if (!hueco) return 'libre';
  if (hueco.fueraDeCasa) return { fueraDeCasa: true, nota: hueco.texto };
  if (hueco.receta) return { receta: hueco.receta, grupo: hueco.grupo };
  return { plato: hueco.texto, grupo: hueco.grupo };
}

/**
 * La semana para leer_semana: los 7 días con su comida y su cena, el
 * equilibrio de AESAN y los avisos de cada día (los mismos que ve la persona).
 * @param {string} lunes
 * @param {any[]} huecos Los de esa semana, de listarSemana().
 * @param {string} hoy
 */
export function resumirSemana(lunes, huecos, hoy) {
  const { objetivos, otros } = equilibrioSemana(huecos);
  const avisos = avisosDia(huecos);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(lunes, i);
    const delDia = (tipo) => huecos.find((hueco) => hueco.fecha === fecha && hueco.tipo === tipo);
    return {
      fecha,
      dia: textoDia(fecha),
      ...(fecha < hoy ? { pasado: true } : {}),
      comida: describirHueco(delDia('comida')),
      cena: describirHueco(delDia('cena')),
      ...(avisos[fecha] ? { avisos: avisos[fecha] } : {}),
    };
  });
  return {
    hoy,
    semana: textoSemana(lunes),
    dias,
    equilibrio: objetivos.map(({ etiqueta, texto, estado, consejo }) => ({ grupo: etiqueta, veces: texto, estado, ...(consejo ? { consejo } : {}) })),
    otrosGrupos: otros.map(({ etiqueta, veces }) => ({ grupo: etiqueta, veces })),
  };
}

/**
 * Compruebo la receta que propone el modelo con la MISMA función que el
 * formulario (P-20).
 * @param {unknown} entrada
 * @returns {{ ok: true, datos: import('../../compartido/validacion.js').DatosReceta } | { ok: false, error: string }}
 */
export function validarPropuestaReceta(entrada) {
  const resultado = validarReceta(entrada);
  if (!resultado.ok) return { ok: false, error: `La receta no es válida. ${enUnaLinea(resultado.errores)}` };
  return resultado;
}

/**
 * Las fechas válidas de una propuesta de huecos, sin repetir: las que tengo
 * que mirar en el cuadrante antes de validarla.
 * @param {unknown} entrada
 * @returns {string[]}
 */
export function fechasDePropuesta(entrada) {
  const huecos = esObjeto(entrada) && Array.isArray(entrada.huecos) ? entrada.huecos : [];
  return [...new Set(huecos.filter(esObjeto).map((hueco) => hueco.fecha).filter(esFechaIso))];
}

/**
 * @typedef {Object} HuecoPropuesto
 * @property {string} fecha
 * @property {import('../../compartido/constantes.js').TipoComida} tipo
 * @property {number | null} recetaId
 * @property {string | null} texto El plato escrito.
 * @property {import('../../compartido/constantes.js').GrupoAlimentos | null} grupo
 * @property {string} nombre Lo que enseña la tarjeta: la receta o el plato.
 * @property {string | null} sustituyeA Lo que hay ahora en ese hueco, si hay algo.
 */

/**
 * Compruebo una propuesta de huecos (D-51). Le devuelvo al modelo TODOS los
 * errores a la vez, uno por línea y diciendo qué hueco es, para que los
 * corrija de una vez.
 * @param {unknown} entrada
 * @param {{ hoy: string, recetas: Map<number, string>, actuales: any[] }} contexto
 *   recetas: las de la casa que nombra la propuesta (id → nombre);
 *   actuales: lo que hay ahora en el cuadrante en esas fechas.
 * @returns {{ ok: true, huecos: HuecoPropuesto[] } | { ok: false, error: string }}
 */
export function validarPropuestaHuecos(entrada, { hoy, recetas, actuales }) {
  const huecos = esObjeto(entrada) ? entrada.huecos : undefined;
  if (!Array.isArray(huecos) || huecos.length === 0) {
    return { ok: false, error: 'Propón al menos un hueco.' };
  }
  if (huecos.length > MAX_HUECOS_PROPUESTA) {
    return { ok: false, error: `Propón como mucho ${MAX_HUECOS_PROPUESTA} huecos a la vez.` };
  }

  /** @type {string[]} */
  const errores = [];
  /** @type {HuecoPropuesto[]} */
  const validos = [];
  const vistos = new Set();

  huecos.forEach((propuesto, i) => {
    const hueco = esObjeto(propuesto) ? propuesto : {};
    const { fecha, tipo, recetaId = null, plato = null, grupo = null } = hueco;
    const quien = `Hueco ${i + 1} (${String(fecha)}, ${String(tipo)})`;

    if (!esFechaIso(fecha)) {
      errores.push(`${quien}: la fecha tiene que ser AAAA-MM-DD.`);
      return;
    }
    if (fecha < hoy) {
      errores.push(`${quien}: es un día pasado; propón de hoy (${hoy}) en adelante.`);
      return;
    }
    if (!dentroDelMargen(fecha, hoy)) {
      errores.push(`${quien}: solo se puede planificar hasta un año adelante.`);
      return;
    }
    if (!TIPOS_COMIDA.includes(tipo)) {
      errores.push(`${quien}: tipo tiene que ser "comida" o "cena".`);
      return;
    }
    const clave = `${fecha}|${tipo}`;
    if (vistos.has(clave)) {
      errores.push(`${quien}: está repetido.`);
      return;
    }
    vistos.add(clave);

    const actual = actuales.find((hueco) => hueco.fecha === fecha && hueco.tipo === tipo);
    if (actual?.fueraDeCasa) {
      errores.push(`${quien}: es "fuera de casa"; no se toca.`);
      return;
    }

    // La MISMA validación que el formulario de Planificar hueco (P-14).
    const resultado = validarHueco({ recetaId, texto: plato, grupo });
    if (!resultado.ok) {
      errores.push(`${quien}: ${enUnaLinea(resultado.errores)}`);
      return;
    }
    const { datos } = resultado;
    if (datos.recetaId !== null && !recetas.has(datos.recetaId)) {
      errores.push(`${quien}: no hay ninguna receta con id ${datos.recetaId}; usa leer_recetas o escribe el plato.`);
      return;
    }

    validos.push({
      fecha,
      tipo,
      recetaId: datos.recetaId,
      texto: datos.texto,
      grupo: datos.grupo,
      nombre: datos.recetaId !== null ? recetas.get(datos.recetaId) : datos.texto,
      sustituyeA: nombrePlato(actual),
    });
  });

  if (errores.length > 0) return { ok: false, error: errores.join('\n') };
  // En la tarjeta, por fecha y la comida antes que la cena.
  validos.sort((a, b) => a.fecha.localeCompare(b.fecha) || TIPOS_COMIDA.indexOf(a.tipo) - TIPOS_COMIDA.indexOf(b.tipo));
  return { ok: true, huecos: validos };
}
