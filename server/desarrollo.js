/**
 * @file Cosas provisionales SOLO para desarrollo (fase 1).
 *
 * Hasta la fase 2 no hay cuentas, así que la API trabaja con un hogar de
 * prueba fijo. Lo tengo todo aquí junto para que, cuando lleguen las cuentas,
 * baste con borrar este archivo (D-39).
 */

import { config } from './config.js';

/** Id del hogar de prueba que crea `npm run semilla`. */
export const ID_HOGAR_DESARROLLO = 1;

/**
 * Middleware provisional: hace como si hubiera una sesión del hogar de
 * prueba y pone req.hogarId, igual que hará el de sesiones en la fase 2.
 * En producción no puede funcionar NUNCA: si lo monto por error, la petición
 * falla en vez de dejar a cualquiera dentro del hogar 1.
 * @type {import('express').RequestHandler}
 */
export function usarHogarDesarrollo(req, res, next) {
  if (config.esProduccion) {
    return next(new Error('El hogar de desarrollo no se puede usar en producción.'));
  }
  req.hogarId = ID_HOGAR_DESARROLLO;
  next();
}