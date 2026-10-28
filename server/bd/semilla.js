/**
 * @file Datos de prueba para desarrollo: `npm run semilla` (D-39).
 *
 * Crea el hogar de desarrollo con el id fijo de desarrollo.js. Se puede
 * ejecutar todas las veces que quiera: si ya existe, no hace nada. En
 * producción se niega, para no meter datos falsos en la base de datos real.
 */
import { config } from '../config.js';
import { ID_HOGAR_DESARROLLO } from '../desarrollo.js';
import { pool } from './pool.js';
import { conTransaccion } from './transaccion.js';

if (config.esProduccion) {
  console.error('La semilla solo se ejecuta en desarrollo (NODE_ENV=development).');
  process.exitCode = 1;
} else {
  try {
    const creado = await conTransaccion(async (cliente) => {
      // El id lo pone siempre PostgreSQL (GENERATED ALWAYS). Para elegirlo yo
      // tengo que decirlo a propósito con OVERRIDING SYSTEM VALUE.
      const { rowCount } = await cliente.query(
        `INSERT INTO hogares (id, nombre) OVERRIDING SYSTEM VALUE
         VALUES ($1, 'Hogar de desarrollo')
         ON CONFLICT (id) DO NOTHING`,
        [ID_HOGAR_DESARROLLO]
      );
      // Como he puesto el id a mano, aviso al contador de ids para que el
      // próximo hogar no intente usar también el 1.
      await cliente.query(
        `SELECT setval(pg_get_serial_sequence('hogares', 'id'), (SELECT max(id) FROM hogares))`
      );
      return rowCount === 1;
    });
    console.log(
      creado
        ? `Hogar de desarrollo creado (id ${ID_HOGAR_DESARROLLO}).`
        : `El hogar de desarrollo ya existía (id ${ID_HOGAR_DESARROLLO}).`
    );
  } catch (error) {
    console.error('No se ha podido crear la semilla:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}