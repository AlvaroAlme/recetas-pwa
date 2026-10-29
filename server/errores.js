/**
 * @file El error de la API: lo lanzo desde las rutas y los servicios cuando
 * quiero contestar con un error concreto (404, 400…). El middleware de
 * middlewares/errores.js lo convierte en el JSON de ARQUITECTURA §5.1.
 */

/**
 * Error que se convierte en una respuesta de la API.
 *
 * Ejemplo:
 *   throw new ErrorApi(404, 'NO_EXISTE', 'Este producto ya no existe.');
 */
export class ErrorApi extends Error {
  /**
   * @param {number} estado Código HTTP (400, 404, 409…).
   * @param {string} codigo Código para el frontend, en MAYÚSCULAS (NO_EXISTE…).
   * @param {string} mensaje Texto en español para enseñar al usuario.
   * @param {{ campos?: Record<string, string>, reintentable?: boolean }} [extra]
   *   Errores por campo (validación) y si tiene sentido volver a intentarlo.
   */
  constructor(estado, codigo, mensaje, { campos, reintentable = false } = {}) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = codigo;
    this.campos = campos;
    this.reintentable = reintentable;
  }
}