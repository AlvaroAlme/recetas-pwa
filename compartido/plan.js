/**
 * @file Cuadrante por fechas (D-48, D-50), compartido por el navegador y el
 * servidor: semanas de lunes a domingo, su texto ("Semana del 23 al 29 de
 * noviembre"), el margen de un año, los nombres de los grupos y los huecos,
 * y el equilibrio de la semana frente a AESAN (sin IA).
 *
 * Todas las fechas van en ISO (AAAA-MM-DD). Las funciones no miran el reloj:
 * si necesitan "hoy", me lo pasan, porque el hoy del navegador y el de la
 * casa (en el servidor, con su zona horaria) no tienen por qué coincidir.
 */
import { DIAS_MARGEN_PLAN, GRUPOS_ALIMENTOS } from './constantes.js';
import { esFechaIso, sumarDias } from './fechas.js';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const MESES = Object.freeze([
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]);

/** Cómo se lee cada grupo de alimentos (D-50). */
export const ETIQUETAS_GRUPO = Object.freeze({
  legumbres: 'Legumbres',
  pescado: 'Pescado',
  huevos: 'Huevos',
  carne_blanca: 'Carne blanca',
  carne_roja: 'Carne roja',
  verduras: 'Verduras',
  pasta_arroz: 'Pasta o arroz',
  otro: 'Otro',
});

/** Cómo se lee cada hueco del día. */
export const ETIQUETAS_TIPO = Object.freeze({
  comida: 'Comida',
  cena: 'Cena',
});

/**
 * Parto una fecha ISO en números: '2026-11-23' → [2026, 11, 23].
 * @param {string} iso
 * @returns {number[]}
 */
function partes(iso) {
  return iso.slice(0, 10).split('-').map(Number);
}

/**
 * Días de una fecha a otra (negativo si la segunda es anterior). Con
 * Date.UTC no hay cambio de hora: todos los días miden 24 h justas.
 * @param {string} desde
 * @param {string} hasta
 * @returns {number}
 */
function diasEntre(desde, hasta) {
  const [a1, m1, d1] = partes(desde);
  const [a2, m2, d2] = partes(hasta);
  return (Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / MS_POR_DIA;
}

/**
 * El lunes de la semana de una fecha. Un domingo es el ÚLTIMO día de su
 * semana (en España la semana empieza en lunes), no el primero.
 * @param {string} iso
 * @returns {string}
 */
export function lunesDe(iso) {
  const [anio, mes, dia] = partes(iso);
  // getUTCDay(): 0 = domingo, 1 = lunes… Lo paso a 0 = lunes … 6 = domingo.
  const diaSemana = (new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay() + 6) % 7;
  return sumarDias(iso, -diaSemana);
}

/**
 * ¿Es una fecha ISO que existe y cae en lunes? Lo que pido en /semana/:lunes.
 * @param {unknown} texto
 * @returns {boolean}
 */
export function esLunes(texto) {
  return esFechaIso(texto) && lunesDe(texto) === texto;
}

/**
 * ¿Está la fecha dentro del margen del cuadrante, un año atrás y uno
 * adelante de hoy (D-50)? Los dos extremos valen.
 * @param {string} fecha
 * @param {string} hoy El hoy de quien pregunta (en el servidor, el de la casa).
 * @returns {boolean}
 */
export function dentroDelMargen(fecha, hoy) {
  return Math.abs(diasEntre(hoy, fecha)) <= DIAS_MARGEN_PLAN;
}

/**
 * "Semana del 23 al 29 de noviembre". Si cambia de mes, los dos meses ("del
 * 30 de noviembre al 6 de diciembre"); si cambia de año, también los años.
 * @param {string} lunes
 * @returns {string}
 */
export function textoSemana(lunes) {
  const domingo = sumarDias(lunes, 6);
  const [anio1, mes1, dia1] = partes(lunes);
  const [anio2, mes2, dia2] = partes(domingo);
  const fin = `${dia2} de ${MESES[mes2 - 1]}`;

  if (anio1 !== anio2) {
    return `Semana del ${dia1} de ${MESES[mes1 - 1]} de ${anio1} al ${fin} de ${anio2}`;
  }
  if (mes1 !== mes2) {
    return `Semana del ${dia1} de ${MESES[mes1 - 1]} al ${fin}`;
  }
  return `Semana del ${dia1} al ${fin}`;
}

/**
 * Lo que recomienda AESAN por semana (informe de recomendaciones dietéticas
 * sostenibles de 2022, comprobado en aesan.gob.es el 2026-11-16, D-50). Solo
 * los grupos con cifra SEMANAL: lo diario (hortalizas, fruta, cereales) no se
 * puede contar con un plato por comida. La carne blanca y la roja suman juntas.
 * @typedef {Object} ObjetivoAesan
 * @property {string} clave
 * @property {string} etiqueta
 * @property {readonly import('./constantes.js').GrupoAlimentos[]} grupos Los que cuentan.
 * @property {number} [minimo] Al menos tantas veces.
 * @property {number} [maximo] Como mucho tantas veces.
 */

/** @type {readonly ObjetivoAesan[]} */
export const OBJETIVOS_AESAN = Object.freeze([
  { clave: 'legumbres', etiqueta: 'Legumbres', grupos: ['legumbres'], minimo: 4 },
  { clave: 'pescado', etiqueta: 'Pescado', grupos: ['pescado'], minimo: 3 },
  { clave: 'huevos', etiqueta: 'Huevos', grupos: ['huevos'], maximo: 4 },
  { clave: 'carne', etiqueta: 'Carne', grupos: ['carne_blanca', 'carne_roja'], maximo: 3 },
]);

/** De dónde salen las cifras, para enlazarlo junto al equilibrio. */
export const FUENTE_AESAN = 'https://www.aesan.gob.es/actualidad/actualidad-noticias/recomendaciones_dieteticas';

/**
 * @typedef {Object} LineaEquilibrio
 * @property {string} clave
 * @property {string} etiqueta
 * @property {number} veces
 * @property {'bien' | 'faltan' | 'demasiado'} estado
 * @property {string} texto "1 de 4 o más", "4 de 3 como mucho"…
 * @property {string | null} consejo Por ahora, solo "Mejor aves y conejo." en la carne.
 */

/**
 * El equilibrio de una semana: cuántas veces sale cada grupo frente a AESAN.
 * Cuento HUECOS con grupo, no raciones: es orientativo. Los huecos sin grupo
 * y los de "fuera de casa" no cuentan.
 * @param {{ grupo: import('./constantes.js').GrupoAlimentos | null, fueraDeCasa?: boolean }[]} huecos
 * @returns {{ objetivos: LineaEquilibrio[], otros: { grupo: string, etiqueta: string, veces: number }[], conGrupo: number }}
 */
export function equilibrioSemana(huecos) {
  /** @type {Record<string, number>} */
  const veces = Object.fromEntries(GRUPOS_ALIMENTOS.map((grupo) => [grupo, 0]));
  let conGrupo = 0;
  for (const hueco of huecos) {
    if (hueco.fueraDeCasa || !hueco.grupo || !(hueco.grupo in veces)) continue;
    veces[hueco.grupo] += 1;
    conGrupo += 1;
  }

  const objetivos = OBJETIVOS_AESAN.map(({ clave, etiqueta, grupos, minimo, maximo }) => {
    const total = grupos.reduce((suma, grupo) => suma + veces[grupo], 0);
    /** @type {LineaEquilibrio['estado']} */
    let estado = 'bien';
    let texto;
    if (minimo !== undefined) {
      if (total < minimo) estado = 'faltan';
      texto = `${total} de ${minimo} o más`;
    } else {
      if (total > maximo) estado = 'demasiado';
      texto = `${total} de ${maximo} como mucho`;
    }
    // AESAN pide priorizar aves y conejo: lo digo si gana la carne roja.
    const consejo = clave === 'carne' && veces.carne_roja > veces.carne_blanca ? 'Mejor aves y conejo.' : null;
    return { clave, etiqueta, veces: total, estado, texto, consejo };
  });

  // Los grupos sin cifra de AESAN, solo si han salido.
  const conObjetivo = new Set(OBJETIVOS_AESAN.flatMap((objetivo) => objetivo.grupos));
  const otros = GRUPOS_ALIMENTOS.filter((grupo) => !conObjetivo.has(grupo) && veces[grupo] > 0).map((grupo) => ({
    grupo,
    etiqueta: ETIQUETAS_GRUPO[grupo],
    veces: veces[grupo],
  }));

  return { objetivos, otros, conGrupo };
}
