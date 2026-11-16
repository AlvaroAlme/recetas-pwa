/**
 * @file Horas del día (HH:MM), compartidas por el navegador y el servidor:
 * la hora del aviso del plan (fase 7). Como validarHora() de lib/ajustes.ts
 * en la app Expo.
 */

/** "21:00", "9:30" no (siempre dos cifras, como da el <input type="time">). */
const FORMATO_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Comprueba una hora HH:MM. El <input type="time"> ya la da así, pero una
 * petición se puede fabricar sin pasar por él.
 * @param {unknown} texto
 * @returns {{ ok: true, datos: string } | { ok: false, errores: { horaAvisoPlan: string } }}
 */
export function validarHora(texto) {
  if (typeof texto === 'string' && FORMATO_HORA.test(texto)) return { ok: true, datos: texto };
  return { ok: false, errores: { horaAvisoPlan: 'Escribe la hora como HH:MM, por ejemplo 21:00.' } };
}
