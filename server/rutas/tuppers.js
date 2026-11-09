/**
 * @file Rutas de /api/tuppers. Solo HTTP, como en productos.js: leo, valido,
 * llamo al servicio y contesto. El hogar sale SIEMPRE de req.hogarId.
 */
import { Router } from 'express';
import * as agenda from '../agenda.js';
import { ErrorApi } from '../errores.js';
import * as tuppers from '../servicios/tuppers.js';
import { leerId, leerUbicacion } from '../validacion/productos.js';
import { leerTupper } from '../validacion/tuppers.js';

export const rutasTuppers = Router();

const NO_EXISTE = 'Este tupper ya no existe.';

/**
 * Si el servicio no ha encontrado el tupper (null), contesto 404. Da igual
 * que no exista o que sea de otro hogar: la respuesta es la misma.
 * @template T
 * @param {T} resultado
 * @returns {NonNullable<T>}
 */
function comprobarQueExiste(resultado) {
  if (!resultado) {
    throw new ErrorApi(404, 'NO_EXISTE', NO_EXISTE);
  }
  return resultado;
}

// GET /api/tuppers?ubicacion=nevera
rutasTuppers.get('/', async (req, res) => {
  const ubicacion = leerUbicacion(req.query.ubicacion);
  res.json({ tuppers: await tuppers.listarTuppers(req.hogarId, ubicacion) });
});

// GET /api/tuppers/12: la ficha (la abre el aviso)
rutasTuppers.get('/:id', async (req, res) => {
  const id = leerId(req.params.id, NO_EXISTE);
  const tupper = await tuppers.obtenerTupper(req.hogarId, id);
  res.json({ tupper: comprobarQueExiste(tupper) });
});

// POST /api/tuppers: guardar un tupper. `avisoActivo` dice si alguien de la
// casa recibirá el aviso.
rutasTuppers.post('/', async (req, res) => {
  const datos = leerTupper(req.body);
  const tupper = await tuppers.crearTupper(req.hogarId, datos);
  // Puede que este aviso sea antes que el que tenía apuntado.
  await agenda.recalcular();
  const avisoActivo = await tuppers.hayAvisoEnHogar(req.hogarId);
  res.status(201).json({ tupper, avisoActivo });
});

// POST /api/tuppers/12/consumir: idempotente (dos veces → 200 las dos).
rutasTuppers.post('/:id/consumir', async (req, res) => {
  const id = leerId(req.params.id, NO_EXISTE);
  const tupper = comprobarQueExiste(await tuppers.consumirTupper(req.hogarId, id));
  // Si era el próximo aviso, ya no hay que enviarlo.
  await agenda.recalcular();
  res.json({ tupper });
});
