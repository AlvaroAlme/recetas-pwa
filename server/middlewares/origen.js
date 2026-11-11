/**
 * @file Defensa contra CSRF (ARQUITECTURA §9.4), además de SameSite=Lax.
 * En las peticiones que CAMBIAN algo (POST, PUT, PATCH, DELETE):
 * - la cabecera Origin tiene que ser la de mi app (APP_ORIGEN). Ninguna web
 *   puede falsificarla: el navegador la pone solo. Si no coincide, 403.
 * - si llevan cuerpo, tiene que ser JSON. Un formulario HTML de otra web no
 *   puede enviar JSON, así que con esto le cierro la puerta. Si no, 415.
 */
import { config } from '../config.js';
import { ErrorApi } from '../errores.js';

const METODOS_QUE_CAMBIAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** @type {import('express').RequestHandler} */
export function comprobarOrigen(req, res, next) {
  // GET y HEAD solo leen: no hay nada que proteger.
  if (!METODOS_QUE_CAMBIAN.has(req.method)) return next();

  if (req.get('Origin') !== config.appOrigen) {
    throw new ErrorApi(403, 'PROHIBIDO', 'Esta petición no viene de la app.');
  }

  // ¿Lleva cuerpo DE VERDAD? Un POST vacío (el logout) llega con
  // Content-Length: 0, y eso no es "mandar datos". Transfer-Encoding es
  // cuando el cuerpo llega por trozos, sin decir antes cuánto mide.
  const tieneCuerpo = Number(req.get('Content-Length') ?? 0) > 0 || req.get('Transfer-Encoding') !== undefined;
  if (tieneCuerpo && !req.is('application/json')) {
    throw new ErrorApi(415, 'TIPO_NO_ADMITIDO', 'Solo acepto datos en formato JSON.');
  }

  next();
}