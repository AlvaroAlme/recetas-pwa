/**
 * @file Rutas de /api/yo: quién soy y borrar mi cuenta (con sesión).
 */
import { Router } from 'express';
import { borrarCookieSesion } from '../cookies.js';
import { ErrorApi } from '../errores.js';
import * as hogares from '../servicios/hogares.js';
import * as usuarios from '../servicios/usuarios.js';
import { leerBorrarCuenta } from '../validacion/auth.js';
import { CUOTA_IA_DIARIA } from '../../compartido/constantes.js';
import * as cuotaIa from '../servicios/cuotaIa.js';

export const rutasYo = Router();


// GET /api/yo: quién soy, mi hogar, cuánta IA me queda hoy y si he aceptado el aviso.
rutasYo.get('/', async (req, res) => {
  const [hogar, usadas, avisoIaAceptado] = await Promise.all([
    hogares.obtenerHogar(req.hogarId),
    cuotaIa.llamadasDeHoy(req.usuario.id, req.hogarId),
    usuarios.haAceptadoAvisoIa(req.usuario.id),
  ]);
  res.json({ usuario: req.usuario, hogar, cuotaIa: { usadas, limite: CUOTA_IA_DIARIA }, avisoIaAceptado });
});

// DELETE /api/yo: { contrasena }. Borra la cuenta y la cookie.
rutasYo.delete('/', async (req, res) => {
  const contrasena = leerBorrarCuenta(req.body);
  const borrada = await usuarios.borrarCuenta(req.usuario.id, req.hogarId, contrasena);
  if (!borrada) throw new ErrorApi(401, 'CREDENCIALES', 'La contraseña no es correcta.');
  borrarCookieSesion(res);
  res.status(204).end();
});