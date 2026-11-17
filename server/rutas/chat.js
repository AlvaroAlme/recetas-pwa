/**
 * @file Rutas de /api/chat (con sesión): el chat ayudante (D-48, D-51).
 *
 * POST /mensajes contesta por STREAMING: una línea JSON por evento
 * (application/x-ndjson), según llega la respuesta de Claude. Todo lo que
 * puede fallar ANTES de llamar a Claude (validación, aviso, conversación
 * llena, cuota) se contesta con un error JSON normal; lo que falle después,
 * con una línea { tipo: 'error' }.
 */
import { Router } from 'express';
import { CUOTA_CHAT_DIARIA } from '../../compartido/constantes.js';
import * as agenda from '../agenda.js';
import { config } from '../config.js';
import { ErrorApi } from '../errores.js';
import { logError } from '../log.js';
import * as chat from '../servicios/chat.js';
import * as conversaciones from '../servicios/conversaciones.js';
import * as cuotaIa from '../servicios/cuotaIa.js';
import * as usuarios from '../servicios/usuarios.js';
import { leerIdTarjeta, leerMensaje } from '../validacion/chat.js';

export const rutasChat = Router();

/**
 * Sin el aviso del chat aceptado no se habla con Claude (D-51, SEC-04).
 * @type {import('express').RequestHandler}
 */
async function exigirAvisoChat(req, res, next) {
  if (!(await usuarios.haAceptadoAvisoChat(req.usuario.id))) {
    throw new ErrorApi(403, 'AVISO_CHAT_PENDIENTE', 'Antes de usar el ayudante tienes que aceptar su aviso de privacidad.');
  }
  next();
}

// POST /api/chat/aviso-aceptado
rutasChat.post('/aviso-aceptado', async (req, res) => {
  await usuarios.aceptarAvisoChat(req.usuario.id);
  res.status(204).end();
});

// GET /api/chat: mi conversación, lista para pintar (nunca los bloques en bruto).
rutasChat.get('/', async (req, res) => {
  const [avisoAceptado, uso, { mensajes, preguntas }] = await Promise.all([
    usuarios.haAceptadoAvisoChat(req.usuario.id),
    cuotaIa.usoDeHoy(req.usuario.id, req.hogarId),
    chat.verConversacion(req.usuario.id, req.hogarId),
  ]);
  res.json({ avisoAceptado, mensajes, preguntas, quedanHoy: Math.max(0, CUOTA_CHAT_DIARIA - uso.mensajesChat) });
});

// POST /api/chat/mensajes: { texto } -> líneas NDJSON hasta { tipo: 'fin' } o { tipo: 'error' }.
rutasChat.post('/mensajes', exigirAvisoChat, async (req, res) => {
  const texto = leerMensaje(req.body);
  if (config.anthropicApiKey === null) {
    throw new ErrorApi(503, 'IA_NO_CONFIGURADA', 'El ayudante no está disponible en este servidor.');
  }
  // Antes de la cuota: si la conversación está llena, no gasto un mensaje.
  const conversacion = await conversaciones.obtenerConversacion(req.usuario.id, req.hogarId);
  conversaciones.comprobarHueco(conversacion);

  let empezado = false;
  /**
   * Mando las cabeceras (200 y NDJSON) YA, sin esperar al primer trozo de
   * Claude: así el navegador sabe que la respuesta está en camino y no dice
   * "Despertando el servidor…" mientras el modelo piensa.
   */
  const empezar = () => {
    if (empezado || res.destroyed || res.writableEnded) return;
    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    // Que nadie (el SW, un proxy) la guarde ni la retenga: tiene que llegar según sale.
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    empezado = true;
  };
  /** Escribo una línea. Si el navegador se ha ido, no escribo nada. */
  const enviar = (evento) => {
    if (res.destroyed || res.writableEnded) return;
    empezar();
    res.write(`${JSON.stringify(evento)}\n`);
  };

  try {
    let usadas = 0;
    const { preguntas } = await cuotaIa.conCuotaChat(req.usuario.id, req.hogarId, (cuantas) => {
      usadas = cuantas;
      // La cuota ya está reservada: desde aquí, los errores van como línea.
      empezar();
      return chat.responder({
        apiKey: config.anthropicApiKey,
        usuarioId: req.usuario.id,
        hogarId: req.hogarId,
        conversacion,
        texto,
        enviar,
      });
    });
    enviar({ tipo: 'fin', quedanHoy: Math.max(0, CUOTA_CHAT_DIARIA - usadas), preguntas });
  } catch (error) {
    // Si aún no había escrito nada, es un error normal (la cuota, por ejemplo).
    if (!empezado) throw error;
    if (!(error instanceof ErrorApi)) logError('Error inesperado en el chat', error, req.id);
    const conocido = error instanceof ErrorApi;
    enviar({
      tipo: 'error',
      codigo: conocido ? error.codigo : 'INTERNO',
      mensaje: conocido ? error.message : 'Algo ha fallado en el servidor.',
      reintentable: conocido ? error.reintentable : true,
    });
  } finally {
    if (empezado && !res.writableEnded) res.end();
  }
});

// POST /api/chat/tarjetas/:id/guardar: receta {} o huecos { elegidos: [0, 2] }.
rutasChat.post('/tarjetas/:id/guardar', async (req, res) => {
  const id = leerIdTarjeta(req.params.id);
  const { tipo, resultado } = await chat.guardarTarjeta(req.usuario.id, req.hogarId, id, req.body);
  // Huecos nuevos en el plan: puede cambiar el próximo aviso (§7.3).
  if (tipo === 'huecos' && resultado.guardados > 0) await agenda.recalcular();
  res.json(resultado);
});

// POST /api/chat/tarjetas/:id/descartar
rutasChat.post('/tarjetas/:id/descartar', async (req, res) => {
  await chat.descartarTarjeta(req.usuario.id, req.hogarId, leerIdTarjeta(req.params.id));
  res.status(204).end();
});

// DELETE /api/chat: "Nueva conversación". La cuota del día no se devuelve.
rutasChat.delete('/', async (req, res) => {
  await conversaciones.borrarConversacion(req.usuario.id);
  res.status(204).end();
});
