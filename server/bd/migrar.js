/**
 * @file Migraciones: el esquema de la base de datos crece sin borrar datos.
 *
 * Cada cambio del esquema es un archivo .sql numerado en server/migraciones/
 * (001_algo.sql, 002_otra_cosa.sql…). Aquí miro cuáles están ya aplicados en
 * la tabla schema_migrations y aplico los que faltan, en orden y cada uno en
 * su propia transacción. Una migración aplicada NO se edita nunca: cualquier
 * cambio va en un archivo nuevo.
 *
 * Todo va por UNA sola conexión porque el bloqueo consultivo es de la conexión:
 * si dos arranques del servidor migran a la vez, el segundo espera al primero.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pool } from './pool.js';

/** Carpeta con los archivos .sql. */
const CARPETA = path.join(import.meta.dirname, '..', 'migraciones');

/** Número del bloqueo consultivo. Da igual cuál, pero siempre el mismo. */
const BLOQUEO = 7_301_202;

/** Forma del nombre: 3 cifras, guion bajo, descripción y .sql. */
const PATRON = /^(\d{3})_([a-z0-9_]+)\.sql$/;

/**
 * Aplica las migraciones pendientes.
 *
 * @returns {Promise<string[]>} Los archivos que he aplicado ahora (vacío si no faltaba ninguno).
 * @throws {Error} Si un nombre de archivo no sigue el patrón o si una migración falla.
 *   La que falla no deja nada aplicado.
 */
export async function migrar() {
  const cliente = await pool.connect();
  try {
    // Si otro proceso está migrando, me quedo esperando aquí hasta que termine.
    await cliente.query('SELECT pg_advisory_lock($1)', [BLOQUEO]);

    await cliente.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     INTEGER PRIMARY KEY,
        nombre      TEXT NOT NULL,
        aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const { rows } = await cliente.query('SELECT version FROM schema_migrations');
    const yaAplicadas = new Set(rows.map((fila) => fila.version));

    const archivos = (await readdir(CARPETA)).filter((a) => a.endsWith('.sql')).sort();
    const aplicadasAhora = [];

    for (const archivo of archivos) {
      const partes = archivo.match(PATRON);
      if (!partes) {
        throw new Error(`Nombre de migración no válido: ${archivo} (usa 001_descripcion.sql).`);
      }
      const version = Number(partes[1]);
      if (yaAplicadas.has(version)) continue;

      const sql = await readFile(path.join(CARPETA, archivo), 'utf8');
      try {
        await cliente.query('BEGIN');
        await cliente.query(sql);
        await cliente.query(
          'INSERT INTO schema_migrations (version, nombre) VALUES ($1, $2)',
          [version, partes[2]]
        );
        await cliente.query('COMMIT');
      } catch (error) {
        await cliente.query('ROLLBACK');
        throw new Error(`La migración ${archivo} ha fallado y no se ha aplicado: ${error.message}`);
      }
      aplicadasAhora.push(archivo);
    }
    return aplicadasAhora;
  } finally {
    // Suelto el bloqueo aunque algo haya fallado. Si la conexión está rota,
    // da igual: al cerrarse, PostgreSQL suelta el bloqueo él solo.
    await cliente.query('SELECT pg_advisory_unlock($1)', [BLOQUEO]).catch(() => {});
    cliente.release();
  }
}