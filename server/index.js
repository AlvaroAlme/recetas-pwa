/**
 * @file Punto de arranque del servidor.
 *
 * Aquí solo arranco: leo la configuración, aplico las migraciones que falten
 * y pongo a escuchar la app que monta app.js. Lo tengo separado para poder
 * probar la app en las pruebas sin ocupar el puerto de verdad.
 *
 * Después de migrar, envío los avisos que se quedaron atrasados mientras el
 * servidor estaba parado y calculo el próximo (la agenda vive en memoria, §7.3).
 */
import { config } from './config.js';
import { app } from './app.js';
import * as agenda from './agenda.js';
import { enviarPendientes } from './servicios/avisos.js';
import { migrar } from './bd/migrar.js';
import { pool } from './bd/pool.js';

/**
 * Arranco en orden: primero el esquema de la base de datos y luego escucho.
 * Si una migración falla, no arranco: prefiero no responder a responder con
 * un esquema a medias (§4.3).
 */
async function arrancar() {
  try {
    const aplicadas = await migrar();
    if (aplicadas.length > 0) console.log(`Migraciones aplicadas: ${aplicadas.join(', ')}`);
  } catch (error) {
    console.error(`No se han podido aplicar las migraciones: ${error.message}`);
    process.exitCode = 1;
    await pool.end();
    return;
  }

  // Si falla el envío, arranco igual: la app sirve aunque no haya avisos, y
  // recalcular() deja la agenda lista para reintentar en el siguiente ping.
  try {
    const enviados = await enviarPendientes();
    if (enviados > 0) console.log(`Avisos atrasados enviados: ${enviados}`);
  } catch (error) {
    console.error('No se han podido enviar los avisos atrasados:', error.message);
  }
  await agenda.recalcular();

  const servidor = app.listen(config.puerto, config.host, async (error) => {
    // En Express 5, si el servidor no puede arrancar, el error llega aquí.
    if (error) {
      if (error.code === 'EADDRINUSE') {
        console.error(`El puerto ${config.puerto} ya está en uso. ¿Tienes otro servidor abierto?`);
      } else {
        console.error('No se ha podido arrancar el servidor:', error.message);
      }
      process.exitCode = 1;
      await pool.end();
      return;
    }
    console.log(`Servidor en http://${config.host}:${config.puerto} (${config.entorno})`);
  });

  // Solo la primera vez: si me mandan un segundo SIGTERM, Node me para del todo.
  process.once('SIGTERM', () => cerrar(servidor));
}

/**
 * Render me manda SIGTERM antes de pararme (en cada despliegue). Dejo de
 * aceptar conexiones nuevas, espero a que acaben las peticiones en curso y
 * cierro las conexiones con Neon. Así salgo yo solo, sin que me maten.
 * @param {import('node:http').Server} servidor
 */
function cerrar(servidor) {
  console.log('SIGTERM recibido: cerrando el servidor…');
  servidor.close(async () => {
    await pool.end();
    console.log('Servidor cerrado.');
  });
}

arrancar();