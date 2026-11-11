/**
 * @file Arranque del navegador: aquí digo qué pantalla va en cada URL.
 * También registro el Service Worker (sw.js), que guarda la app para abrirla sin red.
 */
import { escucharInstalacion } from './avisos.js';
import { iniciarConexion } from './conexion.js';
import { logError } from './log.js';
import { iniciarRouter } from './router.js';
import { pantallaAjustes } from './pantallas/ajustes.js';
import { pantallaBienvenida } from './pantallas/bienvenida.js';
import { pantallaBorrarCuenta } from './pantallas/borrarCuenta.js';
import { pantallaEntrar } from './pantallas/entrar.js';
import { pantallaInventario } from './pantallas/inventario.js';
import { pantallaInvitar } from './pantallas/invitar.js';
import { pantallaNoExiste } from './pantallas/noExiste.js';
import { pantallaPrivacidad } from './pantallas/privacidad.js';
import { pantallaProducto } from './pantallas/producto.js';
import { pantallaRegistro } from './pantallas/registro.js';
import { pantallaTicket } from './pantallas/ticket.js';
import { pantallaTupper } from './pantallas/tupper.js';
import { pantallaUnirse } from './pantallas/unirse.js';

/** Un id de la URL tiene que ser un entero positivo, como en el servidor. */
const ES_ID = /^[1-9]\d*$/;

iniciarConexion();
// Antes que el router: "beforeinstallprompt" puede llegar nada más cargar.
escucharInstalacion();
iniciarRouter({
  rutas: [
    // Públicas: no hace falta sesión.
    { patron: '/entrar', publica: true, pantalla: pantallaEntrar },
    { patron: '/registro', publica: true, pantalla: pantallaRegistro },
    { patron: '/privacidad', publica: true, pantalla: pantallaPrivacidad },
    // Privadas: si no hay sesión, la API da 401 y api.js lleva a /entrar.
    { patron: '/', pestana: '/', pantalla: pantallaInventario },
    { patron: '/ajustes', pestana: '/ajustes', pantalla: pantallaAjustes },
    { patron: '/bienvenida', pantalla: pantallaBienvenida },
    { patron: '/hogar/invitar', pantalla: pantallaInvitar },
    { patron: '/hogar/unirse', pantalla: pantallaUnirse },
    { patron: '/cuenta/borrar', pantalla: pantallaBorrarCuenta },
    // "nuevo" va antes que ":id": si no, "nuevo" se tomaría por un id.
    { patron: '/producto/nuevo', pantalla: pantallaProducto },
    { patron: '/producto/:id', pantalla: pantallaProducto, validar: ({ id }) => ES_ID.test(id) },
    { patron: '/tupper/nuevo', pantalla: pantallaTupper },
    { patron: '/tupper/:id', pantalla: pantallaTupper, validar: ({ id }) => ES_ID.test(id) },
    { patron: '/ticket', pantalla: pantallaTicket },
  ],
  noExiste: pantallaNoExiste,
});


// Los navegadores antiguos no tienen Service Worker: la app funciona igual, pero sin red no abre.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error) => {
    logError('No se ha podido registrar el Service Worker', error);
  });
}
