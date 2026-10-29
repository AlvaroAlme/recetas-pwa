/**
 * @file Fechas, compartidas por el navegador y el servidor.
 *
 * En la base de datos y en la API las fechas van en ISO (AAAA-MM-DD), que se
 * ordena bien como texto. En pantalla se ven en formato español (DD/MM/AAAA).
 * Igual que lib/fechas.ts de la app Expo, salvo textoAIso(): aquí la fecha
 * llega del <input type="date">, que ya la da en ISO (D-32).
 *
 * Ojo: hoyIso() y diasHasta() usan el reloj y la zona horaria del equipo donde
 * se ejecutan. En el navegador es la del usuario; en el servidor (Render, UTC)
 * NO sirven para saber qué día es "hoy" en casa del usuario.
 */

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Fecha de un Date como AAAA-MM-DD, con la hora LOCAL (sin pasar por UTC, que
 * de madrugada me cambiaría el día).
 * @param {Date} fecha
 * @returns {string}
 */
function aIsoLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/**
 * Fecha de hoy como AAAA-MM-DD.
 * @returns {string}
 */
export function hoyIso() {
  return aIsoLocal(new Date());
}

/**
 * ¿Es un texto AAAA-MM-DD con una fecha que existe? '2026-02-31' no existe.
 * @param {unknown} texto Lo que me llega, que puede no ser ni un texto.
 * @returns {boolean}
 */
export function esFechaIso(texto) {
  if (typeof texto !== 'string') return false;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) return false;

  const [, anio, mes, dia] = partes.map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  // Si el día no existe, Date lo "desborda" al mes siguiente: así lo detecto.
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

/**
 * AAAA-MM-DD -> DD/MM/AAAA, para mostrarla.
 * @param {string} iso
 * @returns {string}
 */
export function isoATexto(iso) {
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

/**
 * Suma (o resta, con números negativos) días a una fecha AAAA-MM-DD.
 * @param {string} iso
 * @param {number} dias
 * @returns {string}
 */
export function sumarDias(iso, dias) {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return aIsoLocal(new Date(anio, mes - 1, dia + dias));
}

/**
 * Días que faltan desde hoy hasta la fecha (negativo si ya pasó).
 * @param {string} iso
 * @returns {number}
 */
export function diasHasta(iso) {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  const objetivo = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  // Redondeo porque el día del cambio de hora no dura 24 h, sino 23 o 25.
  return Math.round((objetivo.getTime() - hoy.getTime()) / MS_POR_DIA);
}