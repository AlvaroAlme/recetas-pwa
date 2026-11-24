/**
 * @file Rutas de /api/lista (fase 12, D-54). Solo HTTP, como en tuppers.js:
 * leo, valido, llamo al servicio y contesto. El hogar sale SIEMPRE de
 * req.hogarId: la lista es de la casa.
 */
import { Router } from 'express';
import { ErrorApi } from '../errores.js';
import * as lista from '../servicios/lista.js';
import { leerId } from '../validacion/productos.js';
import { leerComprada, leerLineaLista } from '../validacion/lista.js';

export const rutasLista = Router();

const NO_EXISTE = 'Esto ya no está en la lista.';

/**
 * Si el servicio no ha encontrado la línea, contesto 404. Da igual que no
 * exista o que sea de otro hogar: la respuesta es la misma.
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

// GET /api/lista: toda la lista, primero lo que falta y luego lo comprado.
rutasLista.get('/', async (req, res) => {
  res.json({ lineas: await lista.listarLista(req.hogarId) });
});

// POST /api/lista: apuntar algo. 201 si es nueva; 200 con yaEstaba si ya
// estaba sin tachar (P-30 lo dice con un aviso suave, no es un error).
rutasLista.post('/', async (req, res) => {
  const datos = leerLineaLista(req.body);
  const { linea, yaEstaba } = await lista.anadirLinea(req.hogarId, req.usuario.id, datos);
  res.status(yaEstaba ? 200 : 201).json({ linea, yaEstaba });
});

// DELETE /api/lista/comprados: "Borrar comprados". Va ANTES de /:id: si no,
// "comprados" llegaría a /:id como si fuera un id.
rutasLista.delete('/comprados', async (req, res) => {
  res.json({ borradas: await lista.borrarComprados(req.hogarId) });
});

// PATCH /api/lista/7 { comprada: true }: tachar o destachar.
rutasLista.patch('/:id', async (req, res) => {
  const id = leerId(req.params.id, NO_EXISTE);
  const comprada = leerComprada(req.body);
  res.json({ linea: comprobarQueExiste(await lista.marcarComprada(req.hogarId, id, comprada)) });
});

// DELETE /api/lista/7: quitar una línea (sin preguntar: se puede volver a apuntar).
rutasLista.delete('/:id', async (req, res) => {
  const id = leerId(req.params.id, NO_EXISTE);
  comprobarQueExiste(await lista.borrarLinea(req.hogarId, id));
  res.status(204).end();
});
