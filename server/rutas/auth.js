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

// POST /api/auth/olvide: { email }. Contesto SIEMPRE lo mismo y en el acto,
// exista la cuenta o no: así nadie puede averiguar qué emails están
// registrados, ni por el mensaje ni por lo que tarda. Por eso el correo se
// envía sin esperarlo, y si falla solo queda en el log.
rutasAuth.post('/olvide', limiteOlvideIp, limiteOlvideEmail, (req, res) => {
  const email = leerOlvide(req.body);
  recuperacion.pedirRecuperacion(email).catch((error) => logError('No se ha podido enviar el correo de recuperación', error, req.id));
  res.status(202).json({ enviado: true });
});

// POST /api/auth/restablecer: { token, contrasena }. Si el enlace vale, la
// contraseña nueva, todas las sesiones cerradas y una nueva para entrar ya.
rutasAuth.post('/restablecer', limiteEnlaces, async (req, res) => {
  const { token, contrasena } = leerRestablecer(req.body);
  const entrada = await recuperacion.restablecer(token, contrasena);
  if (!entrada) throw ENLACE_NO_VALIDO();
  ponerCookieSesion(res, entrada.sesion);
  res.json({ usuario: entrada.usuario, hogar: entrada.hogar });
});

// POST /api/auth/confirmar-email: { token }. Sin sesión: el enlace puede
// abrirse en otro dispositivo.
rutasAuth.post('/confirmar-email', limiteEnlaces, async (req, res) => {
  const resultado = await recuperacion.confirmarEmail(leerToken(req.body));
  if (resultado === null) throw ENLACE_NO_VALIDO();
  if (resultado === 'en uso') throw new ErrorApi(409, 'EMAIL_EN_USO', 'Ese email ya lo usa otra cuenta.');
  res.json(resultado);
});
