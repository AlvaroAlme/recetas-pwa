/**
 * @file Monta la aplicación Express, sin arrancarla (eso lo hace index.js).
 *
 * El orden importa: primero las rutas de la API, luego el 404 de la API,
 * luego los archivos (compartido/ y web/), luego index.html para las rutas
 * de la app y, al final del todo, el manejador de errores.
 */

import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { comprobarOrigen } from './middlewares/origen.js';
import { config } from './config.js';
import { exigirSesion } from './middlewares/exigirSesion.js';
import { limiteGeneral } from './middlewares/limite.js';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores.js';
import { sesion } from './middlewares/sesion.js';
import { rutasAuth } from './rutas/auth.js';
import { rutasHogar } from './rutas/hogar.js';
import { rutasProductos } from './rutas/productos.js';
import { rutasPush } from './rutas/push.js';
import { rutasTareas } from './rutas/tareas.js';
import { rutasTuppers } from './rutas/tuppers.js';
import { rutasYo } from './rutas/yo.js';

const app = express();

// La carpeta del frontend. La uso para los archivos estáticos y para el index.html de las rutas de la app.
const CARPETA_WEB = path.join(import.meta.dirname, '..', 'web');

app.disable('x-powered-by');

// En Render hay un proxy delante: sin esto, req.ip sería siempre la del
// proxy y el límite contaría a todo el mundo como una sola IP (§9.5). En mi
// PC no hay proxy: si lo activara, cualquiera podría inventarse su IP con
// la cabecera X-Forwarded-For y saltarse el límite.
if (config.esProduccion) app.set('trust proxy', 1);

// Texto de la CSP con comillas simples DENTRO ('self', 'none'): aquí uso
// comillas dobles. Es la única excepción a D-35, para no escapar.
const SOLO_MIO = "'self'";
const NINGUNO = "'none'";

// Cabeceras de seguridad (§9.7). La CSP le dice al navegador qué puede
// cargar la página: solo cosas de mi propio origen y nada en línea. Si se
// colara un <script> en un nombre de producto, el navegador no lo ejecutaría.
app.use(
  helmet({
    contentSecurityPolicy: {
      // Solo mis directivas: las de por defecto traen upgrade-insecure-requests,
      // que en mi PC (http://localhost) impediría cargar el CSS y el JS.
      useDefaults: false,
      directives: {
        defaultSrc: [SOLO_MIO],
        scriptSrc: [SOLO_MIO],
        styleSrc: [SOLO_MIO],
        imgSrc: [SOLO_MIO, 'data:', 'blob:'],
        connectSrc: [SOLO_MIO],
        objectSrc: [NINGUNO],
        baseUri: [SOLO_MIO],
        frameAncestors: [NINGUNO],
      },
    },
  })
);

app.use(express.json({ limit: '100kb' }));

app.get('/api/salud', (req, res) => {
  res.json({ ok: true });
});

// Como mucho 300 peticiones cada 15 minutos por IP en toda la API (§9.5).
app.use('/api', limiteGeneral);

// El ping de cron-job.org va ANTES de la sesión y del control de Origin: no
// es un navegador. Lo protege CRON_SECRETO.
app.use('/api/tareas', rutasTareas);

// En todas las rutas de la API: si hay una sesión buena, sé quién eres.
app.use('/api', sesion);

// En las peticiones que cambian algo: solo desde mi app y solo JSON (CSRF, §9.4).
app.use('/api', comprobarOrigen);

// Cuentas: registro, login y logout (fase 2).
app.use('/api/auth', rutasAuth);

// Inventario: solo con sesión, y siempre el de TU hogar (req.hogarId).
app.use('/api/productos', exigirSesion, rutasProductos);

// Tuppers (fase 4): igual, solo los de TU hogar.
app.use('/api/tuppers', exigirSesion, rutasTuppers);

// Avisos Web Push de este dispositivo (fase 4).
app.use('/api/push', exigirSesion, rutasPush);

// El hogar compartido: invitar, unirse y salir (D-03, D-16).
app.use('/api/hogar', exigirSesion, rutasHogar);

// Quién soy y borrar mi cuenta.
app.use('/api/yo', exigirSesion, rutasYo);

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
