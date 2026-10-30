/**
 * @file Monta la aplicación Express, sin arrancarla (eso lo hace index.js).
 *
 * El orden importa: primero las rutas de la API, luego el 404 de la API,
 * luego los archivos (compartido/ y web/), luego index.html para las rutas
 * de la app y, al final del todo, el manejador de errores.
 */

import path from 'node:path';
import express from 'express';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores.js';
import { usarHogarDesarrollo } from './desarrollo.js';
import { rutasProductos } from './rutas/productos.js';

const app = express();

// La carpeta del frontend. La uso para los archivos estáticos y para el index.html de las rutas de la app.
const CARPETA_WEB = path.join(import.meta.dirname, '..', 'web');

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

// compartido/ lo ejecutan Node y el navegador: es el mismo archivo en los dos sitios (P-04).
app.use('/compartido', express.static(path.join(import.meta.dirname, '..', 'compartido')));
app.use(express.static(CARPETA_WEB));

// Rutas de la app (/producto/2, /recetas…): no son archivos, las pinta el
// JavaScript. Devuelvo index.html y el router del navegador elige la pantalla.
// Si lo que piden tiene extensión (/css/nada.css), es un archivo que no
// existe: lo dejo pasar para que dé 404 y no un HTML que no pinta nada.
app.get('/{*ruta}', (req, res, next) => {
  if (path.extname(req.path) !== '') return next();
  res.sendFile(path.join(CARPETA_WEB, 'index.html'));
});

// El manejador de errores va el ÚLTIMO de todos.
app.use(manejarErrores);

export { app };
