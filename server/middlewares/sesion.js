/**
 * @file Lee la cookie de sesión y, si es buena, pone req.usuario y
 * req.hogarId (ARQUITECTURA §6). No echa a nadie: si no hay sesión,
 * simplemente no los pone. Echar es cosa de exigirSesion.
 */
import { leerCookie, NOMBRE_COOKIE } from '../cookies.js';
import { buscarSesion } from '../servicios/sesiones.js';

/** @type {import('express').RequestHandler} */
export async function sesion(req, res, next) {
  const token = leerCookie(req, NOMBRE_COOKIE);
  if (token) {
    const encontrada = await buscarSesion(token);
    if (encontrada) {
      req.usuario = encontrada.usuario;
      req.hogarId = encontrada.hogarId;
    }
  }
  next();
}