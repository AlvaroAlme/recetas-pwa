/**
 * @file Grupo de conexiones (pool) a PostgreSQL.
 *
 * Abrir una conexión es caro (cifrado, contraseña y, en Neon, despertar la
 * base de datos si estaba dormida). Por eso tengo un único grupo para todo el
 * servidor: guarda unas pocas conexiones abiertas y las presta a cada
 * consulta. Todo el que necesite la base de datos importa `pool` de aquí.
 */
import pg from 'pg';
import { config } from '../config.js';

/**
 * El grupo de conexiones del servidor.
 * @type {pg.Pool}
 */
export const pool = new pg.Pool({
  connectionString: config.baseDatos,
  // Como mucho 10 conexiones a la vez: de sobra para un servidor y muy lejos
  // de las 97 que me deja Neon (D-38).
  max: 10,
  // Cierro las conexiones que llevan 30 s sin usarse. Así Neon se puede dormir
  // a los 5 minutos y no gasto horas de cómputo (D-14).
  idleTimeoutMillis: 30_000,
  // Si en 10 s no consigo conexión, error. Despertar Neon tarda menos de un segundo.
  connectionTimeoutMillis: 10_000,
});

// Si se cae una conexión que estaba libre en el grupo (por ejemplo, porque
// Neon se ha dormido), pg lanza este evento. Si no lo escucho, Node para el
// servidor entero. Solo lo apunto: la próxima consulta abrirá otra conexión.
pool.on('error', (error) => {
  console.error('Se ha caído una conexión libre de la base de datos:', error.message);
});