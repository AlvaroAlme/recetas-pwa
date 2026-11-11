/**
 * @file Rutas de /api/ia (con sesión): aceptar el aviso de privacidad y leer
 * un ticket con Claude (fase 5).
 */
import express, { Router } from 'express';
import { MAX_BYTES_PDF_TICKET } from '../../compartido/constantes.js';
import { config } from '../config.js';
import { ErrorApi } from '../errores.js';
import * as cuotaIa from '../servicios/cuotaIa.js';
import { leerTicket } from '../servicios/ticket.js';
import * as usuarios from '../servicios/usuarios.js';
import { leerArchivoTicket } from '../validacion/ia.js';

export const rutasIa = Router();

// El cuerpo más grande que acepto: el PDF más grande en base64 (4 caracteres
// por cada 3 bytes) y 1 KB más para el resto del JSON.
const LIMITE_CUERPO_TICKET = Math.ceil(MAX_BYTES_PDF_TICKET / 3) * 4 + 1024;

// POST /api/ia/aviso-aceptado: la persona ha aceptado el aviso de privacidad (SEC-04).
rutasIa.post('/aviso-aceptado', async (req, res) => {
  await usuarios.aceptarAvisoIa(req.usuario.id);
  res.status(204).end();
});

/**
 * Sin el aviso aceptado no leo ningún ticket (SEC-04). Va ANTES de leer el
 * cuerpo: no cargo 28 MB en memoria para luego decir que no.
 * @type {import('express').RequestHandler}
 */
async function exigirAvisoIa(req, res, next) {
  if (!(await usuarios.haAceptadoAvisoIa(req.usuario.id))) {
    throw new ErrorApi(403, 'AVISO_IA_PENDIENTE', 'Antes de leer un ticket tienes que aceptar el aviso de privacidad.');
  }
  next();
}

// POST /api/ia/ticket: { archivo: { base64, mimeType } } -> { productos }.
// El archivo solo vive en memoria mientras dura la petición: ni lo guardo ni lo apunto.
rutasIa.post('/ticket', exigirAvisoIa, express.json({ limit: LIMITE_CUERPO_TICKET }), async (req, res) => {
  const archivo = leerArchivoTicket(req.body);
  // Después de validar el archivo (así en mi PC, sin key, también veo el 400, el
  // 413 y el 415) y antes de la cuota (así no gasto ninguna llamada).
  if (config.anthropicApiKey === null) {
    throw new ErrorApi(503, 'IA_NO_CONFIGURADA', 'La lectura con IA no está disponible en este servidor.');
  }
  const productos = await cuotaIa.conCuotaIa(req.usuario.id, req.hogarId, () => leerTicket(config.anthropicApiKey, archivo));
  res.json({ productos });
});