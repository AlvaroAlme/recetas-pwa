/**
 * @file Para las rutas que necesitan cuenta (🔑 en ARQUITECTURA §5): si no
 * hay sesión, 401. Va DESPUÉS del middleware sesion, que es quien la busca.
 */
import { ErrorApi } from '../errores.js';

/** @type {import('express').RequestHandler} */
export function exigirSesion(req, res, next) {
  if (!req.usuario) {
    throw new ErrorApi(401, 'SIN_SESION', 'Tienes que entrar en tu cuenta.');
  }
  next();
}