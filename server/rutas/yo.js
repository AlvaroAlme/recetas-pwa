/**
 * @file Rutas de /api/yo: quién soy, mi perfil (nombre, avatar, contraseña y
 * sesiones, D-52) y borrar mi cuenta. Todas con sesión.
 */
import { Router } from 'express';
import { borrarCookieSesion, leerCookie, NOMBRE_COOKIE } from '../cookies.js';
import { ErrorApi } from '../errores.js';
import * as hogares from '../servicios/hogares.js';
import * as usuarios from '../servicios/usuarios.js';
import { leerBorrarCuenta, leerCambioContrasena, leerCambioEmail, leerCambioNombre } from '../validacion/auth.js';
import { limiteCambioEmail, limiteContrasena } from '../middlewares/limite.js';
import * as recuperacion from '../servicios/recuperacion.js';
import { CUOTA_CHAT_DIARIA, CUOTA_IA_DIARIA } from '../../compartido/constantes.js';
import * as cuotaIa from '../servicios/cuotaIa.js';

export const rutasYo = Router();


// GET /api/yo: quién soy, mi hogar, cuánta IA me queda hoy (ticket y chat)
// y si he aceptado el aviso del ticket.
rutasYo.get('/', async (req, res) => {
  const [hogar, uso, avisoIaAceptado] = await Promise.all([
    hogares.obtenerHogar(req.hogarId),
    cuotaIa.usoDeHoy(req.usuario.id, req.hogarId),
    usuarios.haAceptadoAvisoIa(req.usuario.id),
  ]);
  res.json({
    usuario: req.usuario,
    hogar,
    cuotaIa: { usadas: uso.llamadas, limite: CUOTA_IA_DIARIA },
    cuotaChat: { usadas: uso.mensajesChat, limite: CUOTA_CHAT_DIARIA },
    avisoIaAceptado,
  });
});

// DELETE /api/yo: { contrasena }. Borra la cuenta y la cookie.
rutasYo.delete('/', async (req, res) => {
  const contrasena = leerBorrarCuenta(req.body);
  const borrada = await usuarios.borrarCuenta(req.usuario.id, req.hogarId, contrasena);
  if (!borrada) throw new ErrorApi(401, 'CREDENCIALES', 'La contraseña no es correcta.');
  borrarCookieSesion(res);
  res.status(204).end();
});

// PATCH /api/yo: { nombre }. Cambio mi nombre (Datos personales).
rutasYo.patch('/', async (req, res) => {
  const nombre = await usuarios.cambiarNombre(req.usuario.id, leerCambioNombre(req.body));
  res.json({ usuario: { ...req.usuario, nombre } });
});

// POST /api/yo/avatar: "Otro avatar", con una semilla nueva.
rutasYo.post('/avatar', async (req, res) => {
  const avatarSemilla = await usuarios.nuevoAvatar(req.usuario.id);
  res.json({ usuario: { ...req.usuario, avatarSemilla } });
});

// PUT /api/yo/contrasena: { actual, nueva }. Cierra mis otras sesiones;
// la de esta cookie sigue abierta.
rutasYo.put('/contrasena', limiteContrasena, async (req, res) => {
  const datos = leerCambioContrasena(req.body);
  const cerradas = await usuarios.cambiarContrasena(req.usuario.id, datos, leerCookie(req, NOMBRE_COOKIE));
  if (cerradas === null) {
    throw new ErrorApi(401, 'CONTRASENA_INCORRECTA', 'La contraseña actual no es correcta.', {
      campos: { actual: 'La contraseña actual no es correcta.' },
    });
  }
  res.status(204).end();
});

// DELETE /api/yo/sesiones: "Cerrar las demás sesiones". La mía se queda.
rutasYo.delete('/sesiones', async (req, res) => {
  const cerradas = await usuarios.cerrarMisOtrasSesiones(req.usuario.id, leerCookie(req, NOMBRE_COOKIE));
  res.json({ cerradas });
});

// POST /api/yo/email: { emailNuevo, contrasena }. Envía el enlace al email
// nuevo y un aviso al actual (D-53). El email no cambia hasta confirmar.
rutasYo.post('/email', limiteCambioEmail, async (req, res) => {
  const datos = leerCambioEmail(req.body, req.usuario.email);
  const resultado = await recuperacion.pedirCambioEmail(req.usuario, datos);
  if (resultado === 'contrasena') {
    throw new ErrorApi(401, 'CONTRASENA_INCORRECTA', 'La contraseña no es correcta.', {
      campos: { contrasena: 'La contraseña no es correcta.' },
    });
  }
  if (resultado === 'en uso') {
    throw new ErrorApi(409, 'EMAIL_EN_USO', 'Ese email ya lo usa otra cuenta.', {
      campos: { emailNuevo: 'Ese email ya lo usa otra cuenta.' },
    });
  }
  res.status(202).json({ enviado: true });
});
