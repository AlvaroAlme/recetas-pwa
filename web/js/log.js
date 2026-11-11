/**
 * @file Errores del navegador (SEC-09). Solo los enseño en la consola
 * mientras programo (localhost): en producción no registro nada, porque la
 * consola de un móvil no la lee nadie y un error podría llevar datos de la
 * pantalla. Mismo nombre que server/log.js, pero sin id ni modos.
 */

// En mi PC abro la app en http://localhost:3000; en Render va en su dominio.
const EN_DESARROLLO = location.hostname === 'localhost';

/**
 * @param {string} que Qué estaba haciendo: "Error al pintar la pantalla"…
 * @param {unknown} error
 */
export function logError(que, error) {
  if (EN_DESARROLLO) console.error(`${que}:`, error);
}
