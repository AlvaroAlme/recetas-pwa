/**
 * @file Rutas de /api/recetas (con sesión): el recetario del hogar.
 * Solo HTTP: valido, llamo al servicio y contesto (rutas → servicios → bd).
 */
import { Router } from 'express';
import { ErrorApi } from '../errores.js';
import * as recetas from '../servicios/recetas.js';
import { leerId } from '../validacion/productos.js';
import * as agenda from '../agenda.js';
import { leerCocinar, leerReceta } from '../validacion/recetas.js';

export const rutasRecetas = Router();

const NO_EXISTE = 'Esta receta ya no existe.';

/**
 * Si el servicio no la encuentra, 404: da igual que no exista o que sea de otro hogar.
 * @template T
 * @param {T} resultado
 * @returns {NonNullable<T>}
 */
function comprobarQueExiste(resultado) {
  if (!resultado) throw new ErrorApi(404, 'NO_EXISTE', NO_EXISTE);
  return resultado;
}

// GET /api/recetas
rutasRecetas.get('/', async (req, res) => {
  res.json({ recetas: await recetas.listarRecetas(req.hogarId) });
});

// GET /api/recetas/3
rutasRecetas.get('/:id', async (req, res) => {
  const id = leerId(req.params.id, NO_EXISTE);
  res.json({ receta: comprobarQueExiste(await recetas.obtenerReceta(req.hogarId, id)) });
});

// POST /api/recetas: { nombre, raciones?, ingredientes, pasos }
rutasRecetas.post('/', async (req, res) => {
  const datos = leerReceta(req.body);
  const id = await recetas.crearReceta(req.hogarId, datos);
  res.status(201).json({ id });
});

// POST /api/cocinar (montada en app.js): "La he cocinado". Idempotente por `clave`.
export async function cocinar(req, res) {
  const { clave, descuentos, tuppersConsumidos } = leerCocinar(req.body);
  const respuesta = await recetas.cocinar(req.hogarId, req.usuario.id, clave, descuentos, tuppersConsumidos);
  // Un tupper consumido ya no tiene que avisar.
  if (tuppersConsumidos.length > 0) await agenda.recalcular();
  res.json(respuesta);
}

// PUT /api/recetas/3: la receta entera (D-49)
rutasRecetas.put('/:id', async (req, res) => {
  const id = leerId(req.params.id, NO_EXISTE);
  const datos = leerReceta(req.body);
  comprobarQueExiste(await recetas.actualizarReceta(req.hogarId, id, datos));
  res.status(204).end();
});

// DELETE /api/recetas/3
rutasRecetas.delete('/:id', async (req, res) => {
  const id = leerId(req.params.id, NO_EXISTE);
  comprobarQueExiste(await recetas.borrarReceta(req.hogarId, id));
  res.status(204).end();
});