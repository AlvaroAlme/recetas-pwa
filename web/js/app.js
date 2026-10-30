/**
 * @file Arranque del navegador: aquí digo qué pantalla va en cada URL.
 * (En la fase 3 también registrará el Service Worker; en la 2, la sesión.)
 */
import { iniciarRouter } from './router.js';
import { pantallaInventario } from './pantallas/inventario.js';
import { pantallaNoExiste } from './pantallas/noExiste.js';
import { pantallaProducto } from './pantallas/producto.js';

/** Un id de la URL tiene que ser un entero positivo, como en el servidor. */
const ES_ID = /^[1-9]\d*$/;

iniciarRouter({
  rutas: [
    { patron: '/', pestana: '/', pantalla: pantallaInventario },
    // "nuevo" va antes que ":id": si no, "nuevo" se tomaría por un id.
    { patron: '/producto/nuevo', pantalla: pantallaProducto },
    { patron: '/producto/:id', pantalla: pantallaProducto, validar: ({ id }) => ES_ID.test(id) },
  ],
  noExiste: pantallaNoExiste,
});