/**
 * @file Arranque del navegador: aquí digo qué pantalla va en cada URL.
 * (En la fase 3 también registrará el Service Worker.)
 */
import { iniciarRouter } from './router.js';
import { pantallaAjustes } from './pantallas/ajustes.js';
import { pantallaBorrarCuenta } from './pantallas/borrarCuenta.js';
import { pantallaEntrar } from './pantallas/entrar.js';
import { pantallaInventario } from './pantallas/inventario.js';
import { pantallaInvitar } from './pantallas/invitar.js';
import { pantallaNoExiste } from './pantallas/noExiste.js';
import { pantallaProducto } from './pantallas/producto.js';
import { pantallaRegistro } from './pantallas/registro.js';
import { pantallaUnirse } from './pantallas/unirse.js';

/** Un id de la URL tiene que ser un entero positivo, como en el servidor. */
const ES_ID = /^[1-9]\d*$/;

iniciarRouter({
  rutas: [
    // Públicas: no hace falta sesión.
    { patron: '/entrar', publica: true, pantalla: pantallaEntrar },
    { patron: '/registro', publica: true, pantalla: pantallaRegistro },
    // Privadas: si no hay sesión, la API da 401 y api.js lleva a /entrar.
    { patron: '/', pestana: '/', pantalla: pantallaInventario },
    { patron: '/ajustes', pestana: '/ajustes', pantalla: pantallaAjustes },
    { patron: '/hogar/invitar', pantalla: pantallaInvitar },
    { patron: '/hogar/unirse', pantalla: pantallaUnirse },
    { patron: '/cuenta/borrar', pantalla: pantallaBorrarCuenta },
    // "nuevo" va antes que ":id": si no, "nuevo" se tomaría por un id.
    { patron: '/producto/nuevo', pantalla: pantallaProducto },
    { patron: '/producto/:id', pantalla: pantallaProducto, validar: ({ id }) => ES_ID.test(id) },
  ],
  noExiste: pantallaNoExiste,
});