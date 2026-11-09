/**
 * @file Rutas de /api/push: la clave pública, guardar y borrar la
 * suscripción de este dispositivo y el aviso de prueba (§5.2, §7.1).
 */
import { Router } from 'express';
import { config } from '../config.js';
import { limitePruebaPush } from '../middlewares/limite.js';
import * as push from '../servicios/push.js';
import { leerEndpoint, leerSuscripcion } from '../validacion/push.js';

export const rutasPush = Router();

// GET /api/push/clave-publica: la pública no es secreta; el navegador la
// necesita para suscribirse.
rutasPush.get('/clave-publica', (req, res) => {
  res.json({ clave: config.vapid.publica });
});

// POST /api/push/suscripciones: { endpoint, keys: { p256dh, auth } }
rutasPush.post('/suscripciones', async (req, res) => {
  const suscripcion = leerSuscripcion(req.body);
  await push.guardarSuscripcion(req.usuario.id, suscripcion);
  res.status(201).end();
});

// DELETE /api/push/suscripciones: { endpoint }. Al desactivar los avisos o
// cerrar sesión en este dispositivo.
rutasPush.delete('/suscripciones', async (req, res) => {
  await push.borrarSuscripcion(req.usuario.id, leerEndpoint(req.body));
  res.status(204).end();
});

// POST /api/push/prueba: como mucho 3 por hora (§9.5).
rutasPush.post('/prueba', limitePruebaPush, async (req, res) => {
  res.json({ enviados: await push.enviarPrueba(req.usuario.id) });
});
