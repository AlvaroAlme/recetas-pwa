/**
 * @file Registro de errores del servidor (SEC-09). En producción solo apunto
 * qué estaba haciendo, el mensaje del error y el id de la petición; nunca
 * cuerpos, cabeceras, cookies, archivos ni la key. En desarrollo, también la
 * traza, para encontrar el fallo.
 *
 * No importo config.js (así claude.js y las pruebas me pueden cargar sin el
 * .env): index.js me dice al arrancar si estoy en producción.
 */

let esProduccion = false;

/**
 * Lo llama index.js al arrancar.
 * @param {{ esProduccion: boolean }} opciones
 */
export function configurarLog(opciones) {
  esProduccion = opciones.esProduccion;
}

/**
 * Apunto un error en la consola (en Render, sale en sus Logs).
 * @param {string} que Qué estaba haciendo: "Error inesperado", "No se ha podido enviar un aviso"…
 * @param {unknown} error Un Error, o un dato suelto (un código HTTP).
 * @param {string} [idPeticion] El de req.id, si el error es de una petición.
 */
export function logError(que, error, idPeticion) {
  const id = idPeticion ? ` [${idPeticion}]` : '';
  if (esProduccion) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error(`${que}${id}: ${mensaje}`);
  } else {
    console.error(`${que}${id}:`, error);
  }
}
