/**
 * @file Rutas de /api/hogar: invitar, unirse y salir. Todas con sesión
 * (exigirSesion va delante en app.js), así que req.usuario y req.hogarId existen.
 */
import { Router } from 'express';
import { limiteInvitaciones } from '../middlewares/limite.js';
import { ErrorApi } from '../errores.js';
import { leerUnirse } from '../validacion/hogar.js';
import * as hogares from '../servicios/hogares.js';

export const rutasHogar = Router();

// POST /api/hogar/invitaciones: un código para que alguien se una a mi hogar.
rutasHogar.post('/invitaciones', limiteInvitaciones, async (req, res) => {
  const invitacion = await hogares.crearInvitacion(req.hogarId, req.usuario.id);
  res.status(201).json(invitacion);
});

/** Qué contesto en cada motivo por el que no se ha podido unir. */
const ERRORES_UNIRSE = {
  NO_VALIDO: [404, 'NO_EXISTE', 'Ese código no es válido o ha caducado. Pide uno nuevo.'],
  USADO: [409, 'CONFLICTO', 'Ese código ya se ha usado. Pide uno nuevo.'],
  MISMO_HOGAR: [409, 'CONFLICTO', 'Ya estás en ese hogar.'],
  CONFIRMAR_BORRADO: [
    409,
    'CONFIRMAR_BORRADO',
    'Si te unes, se borrará tu hogar actual con todo lo que tiene. ¿Quieres seguir?',
  ],
};

// POST /api/hogar/unirse: { codigo, confirmarBorrado? }.
rutasHogar.post('/unirse', async (req, res) => {
  const { codigo, confirmarBorrado } = leerUnirse(req.body);
  const resultado = await hogares.unirse(req.usuario.id, req.hogarId, codigo, confirmarBorrado);
  if (!resultado.ok) {
    const [estado, codigoError, mensaje] = ERRORES_UNIRSE[resultado.motivo];
    throw new ErrorApi(estado, codigoError, mensaje);
  }
  res.json({ hogar: resultado.hogar });
});