/**
 * @file Rutas de /api/productos. Solo HTTP: leo la petición, la valido,
 * llamo al servicio y contesto. Aquí no hay ni una línea de SQL
 * (rutas → servicios → bd).
 *
 * El hogar SIEMPRE sale de req.hogarId, que lo pone el middleware. Nunca lo
 * leo del cuerpo ni de la URL (§9).
 *
 * Si algo lanza un error (una validación, el servicio…), Express 5 lo
 * recoge solo y se lo pasa a middlewares/errores.js: no hace falta try/catch.
 */
import { Router } from 'express';
import { ErrorApi } from '../errores.js';
import * as inventario from '../servicios/inventario.js';
import { leerId, leerLote, leerProducto, leerUbicacion } from '../validacion/productos.js';

export const rutasProductos = Router();

/**
 * Si el servicio no ha encontrado el producto (me da null o false), contesto
 * 404. Da igual que no exista o que sea de otro hogar: la respuesta es la misma.
 * @template T
 * @param {T} resultado
 * @returns {NonNullable<T>}
 */
function comprobarQueExiste(resultado) {
  if (!resultado) {
    throw new ErrorApi(404, 'NO_EXISTE', 'Este producto ya no existe.');
  }
  return resultado;
}

// GET /api/productos?ubicacion=nevera
rutasProductos.get('/', async (req, res) => {
  const ubicacion = leerUbicacion(req.query.ubicacion);
  const productos = await inventario.listarProductos(req.hogarId, ubicacion);
  res.json({ productos });
});

// POST /api/productos/lote: guardar el ticket. Va antes que las rutas con
// :id para que nadie lea "lote" como si fuera un id.
rutasProductos.post('/lote', async (req, res) => {
  const lista = leerLote(req.body);
  const creados = await inventario.crearProductos(req.hogarId, lista);
  res.status(201).json({ creados });
});

// GET /api/productos/2
rutasProductos.get('/:id', async (req, res) => {
  const id = leerId(req.params.id);
  const producto = await inventario.obtenerProducto(req.hogarId, id);
  res.json({ producto: comprobarQueExiste(producto) });
});

// POST /api/productos: añadir un producto
rutasProductos.post('/', async (req, res) => {
  const datos = leerProducto(req.body);
  const producto = await inventario.crearProducto(req.hogarId, datos);
  res.status(201).json({ producto });
});

// PUT /api/productos/2: editar (llegan los 5 campos)
rutasProductos.put('/:id', async (req, res) => {
  const id = leerId(req.params.id);
  const datos = leerProducto(req.body);
  const producto = await inventario.actualizarProducto(req.hogarId, id, datos);
  res.json({ producto: comprobarQueExiste(producto) });
});

// PATCH /api/productos/2: mover a otra ubicación
rutasProductos.patch('/:id', async (req, res) => {
  const id = leerId(req.params.id);
  const ubicacion = leerUbicacion(req.body?.ubicacion);
  const producto = await inventario.moverProducto(req.hogarId, id, ubicacion);
  res.json({ producto: comprobarQueExiste(producto) });
});

// DELETE /api/productos/2
rutasProductos.delete('/:id', async (req, res) => {
  const id = leerId(req.params.id);
  comprobarQueExiste(await inventario.borrarProducto(req.hogarId, id));
  res.status(204).end();
});