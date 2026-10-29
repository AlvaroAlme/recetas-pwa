/**
 * @file Monta la aplicación Express, sin arrancarla (eso lo hace index.js).
 *
 * El orden importa: primero las rutas de la API, luego el 404 de la API,
 * luego los archivos de web/ y, al final del todo, el manejador de errores.
 * Quito la cabecera X-Powered-By para no decirle a nadie que uso Express.
 */

import path from 'node:path';
import express from 'express';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores.js';
import { usarHogarDesarrollo } from './desarrollo.js';
import { rutasProductos } from './rutas/productos.js';

const app = express();
app.disable('x-powered-by');

app.use(express.json({ limit: '100kb' }));

app.get('/api/salud', (req, res) => {
  res.json({ ok: true });
});

// Inventario. De momento con el hogar de prueba; en la fase 2 aquí irá la sesión.
app.use('/api/productos', usarHogarDesarrollo, rutasProductos);

// Cualquier otra /api/... que no exista: 404 en JSON. Va DESPUÉS de todas
// las rutas de la API y ANTES de los archivos estáticos.
app.use('/api', rutaNoEncontrada);

app.use(express.static(path.join(import.meta.dirname, '..', 'web')));

// El manejador de errores va el ÚLTIMO de todos.
app.use(manejarErrores);

export { app };
