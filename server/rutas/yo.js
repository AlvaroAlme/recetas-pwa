/**
 * @file Rutas de /api/yo: quién soy y borrar mi cuenta (con sesión).
 */
import { Router } from 'express';
import { borrarCookieSesion } from '../cookies.js';
import { ErrorApi } from '../errores.js';
import * as hogares from '../servicios/hogares.js';
import * as usuarios from '../servicios/usuarios.js';
import { leerBorrarCuenta } from '../validacion/auth.js';

export const rutasYo = Router();

// GET /api/yo: quién soy, mi hogar y quién vive en él.
rutasYo.get('/', async (req, res) => {
  const hogar = await hogares.obtenerHogar(req.hogarId);
  res.json({ usuario: req.usuario, hogar });
});

// DELETE /api/yo: { contrasena }. Borra la cuenta y la cookie.
rutasYo.delete('/', async (req, res) => {
  const contrasena = leerBorrarCuenta(req.body);
  const borrada = await usuarios.borrarCuenta(req.usuario.id, req.hogarId, contrasena);
  if (!borrada) throw new ErrorApi(401, 'CREDENCIALES', 'La contraseña no es correcta.');
  borrarCookieSesion(res);
  res.status(204).end();
});