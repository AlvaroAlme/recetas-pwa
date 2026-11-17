/**
 * @file POST /api/tareas/avisos: el ping de cron-job.org, cada 5 minutos
 * (§7.3). No lleva sesión ni Origin (no es un navegador): lo protege el
 * secreto CRON_SECRETO. Envía los avisos que toquen y, una vez al día,
 * hace la limpieza (D-51).
 */
import { Router } from 'express';
import * as agenda from '../agenda.js';
import { config } from '../config.js';
import { ErrorApi } from '../errores.js';
import { enviarPendientes } from '../servicios/avisos.js';
import { limpiar } from '../servicios/limpieza.js';
import { coincideSecreto } from '../validacion/tareas.js';

export const rutasTareas = Router();

rutasTareas.post('/avisos', async (req, res) => {
  if (!coincideSecreto(req.headers.authorization, config.cronSecreto)) {
    throw new ErrorApi(401, 'NO_AUTORIZADO', 'Falta el secreto o no es correcto.');
  }
  const tocaAvisar = agenda.tocaRevisar();
  const tocaLimpiar = agenda.tocaLimpiar();
  // Lo normal: aún no toca nada y contesto sin despertar a Neon.
  if (!tocaAvisar && !tocaLimpiar) {
    res.json({ revisado: false, enviados: 0 });
    return;
  }
  let enviados = 0;
  if (tocaAvisar) {
    enviados = await enviarPendientes();
    await agenda.recalcular();
  }
  if (tocaLimpiar) {
    await limpiar();
    agenda.limpiezaHecha();
  }
  res.json({ revisado: true, enviados, ...(tocaLimpiar ? { limpieza: true } : {}) });
});
