/**
 * @file Un id corto para cada petición (SEC-09). Va en el log de los errores
 * y en la cabecera X-Id-Peticion: si algo falla, lo veo en F12 › Network y lo
 * busco en los Logs de Render.
 */
import { randomUUID } from 'node:crypto';

/** @type {import('express').RequestHandler} */
export function idPeticion(req, res, next) {
  // 8 caracteres bastan para encontrar UNA petición entre las de un día.
  req.id = randomUUID().slice(0, 8);
  res.set('X-Id-Peticion', req.id);
  next();
}
