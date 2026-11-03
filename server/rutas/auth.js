/**
 * @file Rutas de /api/auth: crear cuenta, entrar y salir.
 * El token de la sesión va SOLO en la cookie HttpOnly, nunca en el JSON:
 * así el JavaScript de la página no lo ve nunca.
 */
import { Router } from 'express';
import { borrarCookieSesion, leerCookie, NOMBRE_COOKIE, ponerCookieSesion } from '../cookies.js';
import { ErrorApi } from '../errores.js';
import { borrarSesion } from '../servicios/sesiones.js';
import * as usuarios from '../servicios/usuarios.js';
import { leerLogin, leerRegistro } from '../validacion/auth.js';
import { emailDelLogin, limiteLoginEmail, limiteLoginIp, limiteRegistro } from '../middlewares/limite.js';

export const rutasAuth = Router();

// POST /api/auth/registro: cuenta + hogar "Casa de …" + sesión, todo de una vez.
rutasAuth.post('/registro', limiteRegistro, async (req, res) => {
  const datos = leerRegistro(req.body);
  const entrada = await usuarios.registrar(datos);
  if (!entrada) {
    throw new ErrorApi(409, 'CONFLICTO', 'Ya existe una cuenta con ese email.', {
      campos: { email: 'Ya existe una cuenta con ese email.' },
    });
  }
  ponerCookieSesion(res, entrada.sesion);
  res.status(201).json({ usuario: entrada.usuario, hogar: entrada.hogar });
});

// POST /api/auth/login: el mismo error si falla el email o la contraseña.
rutasAuth.post('/login', limiteLoginIp, limiteLoginEmail, async (req, res) => {
  const datos = leerLogin(req.body);
  const entrada = await usuarios.iniciarSesion(datos);
  if (!entrada) {
    throw new ErrorApi(401, 'CREDENCIALES', 'Email o contraseña incorrectos.');
  }
  // Ha acertado: los intentos fallidos de este email ya no cuentan.
  limiteLoginEmail.olvidar(emailDelLogin(req));
  ponerCookieSesion(res, entrada.sesion);
  res.json({ usuario: entrada.usuario, hogar: entrada.hogar });
});

// POST /api/auth/logout: borro la sesión de la base de datos y la cookie.
rutasAuth.post('/logout', async (req, res) => {
  const token = leerCookie(req, NOMBRE_COOKIE);
  if (token) await borrarSesion(token);
  borrarCookieSesion(res);
  res.status(204).end();
});