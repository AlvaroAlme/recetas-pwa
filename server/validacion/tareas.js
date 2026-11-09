/**
 * @file Comprobar el secreto del ping de cron-job.org.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * ¿La cabecera Authorization es "Bearer <secreto>"?
 *
 * Comparo con timingSafeEqual, que tarda lo mismo acierte o falle: con ===
 * se podría adivinar el secreto letra a letra midiendo cuánto tarda en
 * contestar. timingSafeEqual exige dos textos del mismo tamaño, así que
 * comparo sus SHA-256 (siempre 32 bytes): así tampoco revelo la longitud.
 * @param {unknown} cabecera req.headers.authorization
 * @param {string} secreto
 * @returns {boolean}
 */
export function coincideSecreto(cabecera, secreto) {
  if (typeof cabecera !== 'string' || !cabecera.startsWith('Bearer ')) return false;
  const resumen = (texto) => createHash('sha256').update(texto).digest();
  return timingSafeEqual(resumen(cabecera.slice('Bearer '.length)), resumen(secreto));
}
