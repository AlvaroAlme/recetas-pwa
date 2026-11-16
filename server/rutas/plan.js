/**
 * @file Rutas de /api/plan (con sesión): el cuadrante por fechas (D-50).
 * Solo HTTP: valido, llamo al servicio y contesto (rutas → servicios → bd).
 * Las fechas se comprueban contra el hoy DE LA CASA, que pido a la base de datos.
 */
import { Router } from 'express';
import * as agenda from '../agenda.js';
import * as plan from '../servicios/plan.js';
import { leerFechaPlan, leerHueco, leerLunes, leerTipo } from '../validacion/plan.js';

export const rutasPlan = Router();

// GET /api/plan?desde=2026-11-23: la semana que empieza ese lunes
rutasPlan.get('/', async (req, res) => {
  const desde = leerLunes(req.query.desde, await plan.hoyDelHogar(req.hogarId));
  res.json({ desde, huecos: await plan.listarSemana(req.hogarId, desde) });
});

// GET /api/plan/2026-11-24: el día, con las recetas completas (lo abre el aviso)
rutasPlan.get('/:fecha', async (req, res) => {
  const fecha = leerFechaPlan(req.params.fecha, await plan.hoyDelHogar(req.hogarId));
  res.json({ fecha, huecos: await plan.obtenerDia(req.hogarId, fecha) });
});

// PUT /api/plan/2026-11-24/cena: { recetaId, grupo? } | { texto, grupo? } | { fueraDeCasa: true }
rutasPlan.put('/:fecha/:tipo', async (req, res) => {
  // Primero lo que no necesita la base de datos: si está mal, no la despierto.
  const tipo = leerTipo(req.params.tipo);
  const datos = leerHueco(req.body);
  const fecha = leerFechaPlan(req.params.fecha, await plan.hoyDelHogar(req.hogarId));
  const hueco = await plan.guardarHueco(req.hogarId, fecha, tipo, datos);
  // Puede cambiar cuándo toca el próximo aviso del plan (§7.4).
  await agenda.recalcular();
  res.json({ hueco });
});

// DELETE /api/plan/2026-11-24/cena
rutasPlan.delete('/:fecha/:tipo', async (req, res) => {
  const tipo = leerTipo(req.params.tipo);
  const fecha = leerFechaPlan(req.params.fecha, await plan.hoyDelHogar(req.hogarId));
  await plan.vaciarHueco(req.hogarId, fecha, tipo);
  await agenda.recalcular();
  res.status(204).end();
});
