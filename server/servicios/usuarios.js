/**
 * @file Cuentas: crear una (registro) y entrar (login). Las rutas deciden
 * los códigos HTTP; aquí, si algo no cuadra, devuelvo null.
 */
import { randomBytes } from 'node:crypto';
import { pool } from '../bd/pool.js';
import { conTransaccion } from '../bd/transaccion.js';
import { comprobarContrasena, hashearContrasena } from './contrasenas.js';
import { crearSesion } from './sesiones.js';
import { dejarHogar, nombreDeCasa } from './hogares.js';

/**
 * Lo que devuelven el registro y el login: quién eres, tu hogar y la
 * sesión nueva (con el token para la cookie).
 * @typedef {Object} Entrada
 * @property {{ id: number, email: string, nombre: string, rol: string }} usuario
 * @property {{ id: number, nombre: string }} hogar
 * @property {{ token: string, caducaEn: Date }} sesion
 */

// El hash de una contraseña que nadie conoce. Si alguien intenta entrar con
// un email que no existe, compruebo contra este: así la respuesta tarda lo
// mismo y no se puede averiguar qué emails están registrados midiendo
// tiempos (§9.2). Empieza a calcularse al cargar el archivo.
const HASH_FALSO = hashearContrasena(randomBytes(16).toString('hex'));

/**
 * Crea la cuenta, su hogar ("Casa de Ana"), la deja como propietaria y abre
 * la sesión. Todo en UNA transacción: o se crea todo, o nada.
 * @param {import('../../compartido/validacion.js').DatosRegistro} datos Ya validados.
 * @returns {Promise<Entrada | null>} null si ya hay una cuenta con ese email.
 */
export async function registrar({ email, nombre, contrasena }) {
  // El hash va FUERA de la transacción: tarda unos 300 ms y no quiero tener
  // una conexión de la base de datos parada esperándolo.
  const hash = await hashearContrasena(contrasena);
  // El nombre puede tener 80 caracteres y el del hogar también: "Casa de " + 80 no cabría.
   const nombreHogar = nombreDeCasa(nombre);

  try {
    return await conTransaccion(async (cliente) => {
      const {
        rows: [usuario],
      } = await cliente.query(
        'INSERT INTO usuarios (email, nombre, hash_contrasena) VALUES ($1, $2, $3) RETURNING id, email, nombre',
        [email, nombre, hash]
      );
      const {
        rows: [hogar],
      } = await cliente.query('INSERT INTO hogares (nombre) VALUES ($1) RETURNING id, nombre', [nombreHogar]);
      await cliente.query('INSERT INTO miembros (usuario_id, hogar_id, rol) VALUES ($1, $2, $3)', [
        usuario.id,
        hogar.id,
        'propietario',
      ]);
      const sesion = await crearSesion(cliente, usuario.id);

      return {
        usuario: { id: Number(usuario.id), email: usuario.email, nombre: usuario.nombre, rol: 'propietario' },
        hogar: { id: Number(hogar.id), nombre: hogar.nombre },
        sesion,
      };
    });
  } catch (error) {
    // 23505 = se ha saltado un UNIQUE: ya existe una cuenta con ese email
    // (aunque dos personas se registren a la vez, solo entra una).
    if (error.code === '23505') return null;
    throw error;
  }
}

/**
 * Comprueba el email y la contraseña y, si están bien, abre una sesión nueva.
 * @param {{ email: string, contrasena: string }} datos Ya validados (email en minúsculas).
 * @returns {Promise<Entrada | null>} null si el email no existe o la contraseña no coincide (sin decir cuál de las dos).
 */
export async function iniciarSesion({ email, contrasena }) {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.nombre, u.hash_contrasena, m.rol, h.id AS hogar_id, h.nombre AS hogar_nombre
       FROM usuarios u
       JOIN miembros m ON m.usuario_id = u.id
       JOIN hogares h ON h.id = m.hogar_id
      WHERE u.email = $1`,
    [email]
  );
  const fila = rows[0];

  // Compruebo SIEMPRE, exista el email o no, para tardar lo mismo.
  const correcta = await comprobarContrasena(contrasena, fila?.hash_contrasena ?? (await HASH_FALSO));
  if (!fila || !correcta) return null;

  const sesion = await crearSesion(pool, Number(fila.id));
  return {
    usuario: { id: Number(fila.id), email: fila.email, nombre: fila.nombre, rol: fila.rol },
    hogar: { id: Number(fila.hogar_id), nombre: fila.hogar_nombre },
    sesion,
  };
}

/**
 * Borra mi cuenta, pidiendo la contraseña (que nadie la borre con mi móvil
 * desbloqueado). Si era la única del hogar, el hogar se va con sus datos;
 * si no, la propiedad pasa a quien lleve más tiempo (dejarHogar). Al borrar
 * el usuario, el CASCADE cierra todas sus sesiones.
 * @param {number} usuarioId
 * @param {number} hogarId
 * @param {string} contrasena
 * @returns {Promise<boolean>} false si la contraseña no es la suya.
 */
export async function borrarCuenta(usuarioId, hogarId, contrasena) {
  const {
    rows: [fila],
  } = await pool.query('SELECT hash_contrasena FROM usuarios WHERE id = $1', [usuarioId]);
  if (!fila || !(await comprobarContrasena(contrasena, fila.hash_contrasena))) return false;

  await conTransaccion(async (cliente) => {
    // true: borrar la cuenta YA es la confirmación de que el hogar se va.
    await dejarHogar(cliente, usuarioId, hogarId, true);
    await cliente.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);
  });
  return true;
}

/**
 * Marco que la persona ha aceptado el aviso de privacidad de la IA (SEC-04).
 * Si ya lo había aceptado, dejo la fecha de la primera vez.
 * @param {number} usuarioId
 */
export async function aceptarAvisoIa(usuarioId) {
  await pool.query(
    'UPDATE usuarios SET aviso_ia_aceptado_en = COALESCE(aviso_ia_aceptado_en, now()) WHERE id = $1',
    [usuarioId]
  );
}

/**
 * ¿Ha aceptado ya el aviso de privacidad de la IA?
 * @param {number} usuarioId
 * @returns {Promise<boolean>}
 */
export async function haAceptadoAvisoIa(usuarioId) {
  const { rows } = await pool.query(
    'SELECT aviso_ia_aceptado_en IS NOT NULL AS aceptado FROM usuarios WHERE id = $1',
    [usuarioId]
  );
  return rows[0]?.aceptado === true;
}