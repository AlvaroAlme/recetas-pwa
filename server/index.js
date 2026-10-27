/**
 * @file Punto de arranque del servidor.
 *
 * Aquí solo arranco: leo la configuración y pongo a escuchar la app que
 * monta app.js. Lo tengo separado para poder probar la app en las pruebas
 * sin ocupar el puerto de verdad.
 *
 * Más adelante, antes de escuchar, aquí irán las migraciones de la base de
 * datos y la agenda de avisos.
 */
import { config } from './config.js';
import { app } from './app.js';

app.listen(config.puerto, config.host, (error) => {
  // En Express 5, si el servidor no puede arrancar, el error llega aquí.
  if (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`El puerto ${config.puerto} ya está en uso. ¿Tienes otro servidor abierto?`);
    } else {
      console.error('No se ha podido arrancar el servidor:', error.message);
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Servidor en http://${config.host}:${config.puerto} (${config.entorno})`);
});