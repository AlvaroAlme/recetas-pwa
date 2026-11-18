/**
 * @file Rutas de /api/auth: crear cuenta, entrar y salir, y lo que llega
 * por correo sin sesión (D-53): recuperar la contraseña y confirmar el email.
 * El token de la sesión va SOLO en la cookie HttpOnly, nunca en el JSON:
 * así el JavaScript de la página no lo ve nunca.
 */
import { Router } from 'express';
import { borrarCookieSesion, leerCookie, NOMBRE_COOKIE, ponerCookieSesion } from '../cookies.js';
import { ErrorApi } from '../errores.js';
import { logError } from '../log.js';
import * as recuperacion from '../servicios/recuperacion.js';
import { borrarSesion } from '../servicios/sesiones.js';
import * as usuarios from '../servicios/usuarios.js';
import { ENLACE_NO_VALIDO, leerLogin, leerOlvide, leerRegistro, leerRestablecer, leerToken } from '../validacion/auth.js';
import {
  emailDelLogin,
  limiteEnlaces,
  limiteLoginEmail,
  limiteLoginIp,
  limiteOlvideEmail,
  limiteOlvideIp,
  limiteRegistro,
} from '../middlewares/limite.js';

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

// POST /api/auth/olvide: { email }. Si hay cuenta, envío el enlace (202);
// si no, lo digo (404). Decisión del autor (D-53): Crear cuenta ya revelaba
// qué emails existen, y los límites (5 por hora por IP, 3 por email)
// impiden ir probando emails en masa.
rutasAuth.post('/olvide', limiteOlvideIp, limiteOlvideEmail, async (req, res) => {
  const email = leerOlvide(req.body);
  let existe;
  try {
    existe = await recuperacion.pedirRecuperacion(email);
  } catch (error) {
    logError('No se ha podido enviar el correo de recuperación', error, req.id);
    throw new ErrorApi(502, 'CORREO_NO_ENVIADO', 'No se ha podido enviar el correo. Inténtalo dentro de un rato.', { reintentable: true });
  }
  if (!existe) {
    throw new ErrorApi(404, 'EMAIL_NO_REGISTRADO', 'No hay ninguna cuenta con ese email.', {
      campos: { email: 'No hay ninguna cuenta con ese email.' },
    });
  }
  res.status(202).json({ enviado: true });
});

// POST /api/auth/restablecer: { token, contrasena }. Si el enlace vale, la
// contraseña nueva y TODAS las sesiones cerradas, también la de este
// navegador si la tenía: hay que volver a entrar (D-53). Devuelvo el email
// para ponerlo en Entrar.
rutasAuth.post('/restablecer', limiteEnlaces, async (req, res) => {
  const { token, contrasena } = leerRestablecer(req.body);
  const resultado = await recuperacion.restablecer(token, contrasena);
  if (!resultado) throw ENLACE_NO_VALIDO();
  borrarCookieSesion(res);
  res.json(resultado);
});

// POST /api/auth/confirmar-email: { token }. Sin sesión: el enlace puede
// abrirse en otro dispositivo.
rutasAuth.post('/confirmar-email', limiteEnlaces, async (req, res) => {
  const resultado = await recuperacion.confirmarEmail(leerToken(req.body));
  if (resultado === null) throw ENLACE_NO_VALIDO();
  if (resultado === 'en uso') throw new ErrorApi(409, 'EMAIL_EN_USO', 'Ese email ya lo usa otra cuenta.');
  res.json(resultado);
});
