/**
 * @file Lanza las migraciones a mano: `npm run migrar`.
 *
 * migrar.js solo exporta la función; este archivo la ejecuta, me dice qué ha
 * aplicado y cierra las conexiones para que el comando termine.
 */
import { migrar } from './migrar.js';
import { pool } from './pool.js';

try {
  const aplicadas = await migrar();
  console.log(
    aplicadas.length > 0
      ? `Migraciones aplicadas: ${aplicadas.join(', ')}`
      : 'No hay migraciones pendientes.'
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
