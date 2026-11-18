/**
 * @file Recuperar la contraseña y cambiar el email (D-53): los enlaces de
 * enlaces_correo en la base de datos y los correos que los llevan. Las rutas
 * deciden los códigos HTTP; aquí, si algo no cuadra, devuelvo null o un
 * motivo.
 */
import { pool } from '../bd/pool.js';
import { conTransaccion } from '../bd/transaccion.js';
import { config } from '../config.js';
import { comprobarContrasena, hashearContrasena } from './contrasenas.js';
import { enviarCorreo } from './correo.js';
import { crearToken, esFormatoToken, hashDeToken, MINUTOS_ENLACE, urlDeEnlace } from './enlaces.js';
import { correoAvisoCambioEmail, correoConfirmarEmail, correoRecuperar } from './mensajesCorreo.js';

/**
 * Guardo un enlace nuevo y borro los pendientes del mismo tipo de esa
 * persona: así solo vale el ÚLTIMO correo que ha pedido.
 * @param {number} usuarioId
 * @param {'recuperar' | 'email'} tipo
 * @param {string | null} emailNuevo Solo en los de tipo 'email'.
 * @returns {Promise<string>} El token (va al correo; aquí no se guarda).
 */
async function guardarEnlace(usuarioId, tipo, emailNuevo) {
  const { token, hash } = crearToken();
  await conTransaccion(async (cliente) => {
    await cliente.query('DELETE FROM enlaces_correo WHERE usuario_id = $1 AND tipo = $2 AND usada_en IS NULL', [usuarioId, tipo]);
    await cliente.query(
      `INSERT INTO enlaces_correo (token_hash, usuario_id, tipo, email_nuevo, caduca_en)
       VALUES ($1, $2, $3, $4, now() + make_interval(mins => $5))`,
      [hash, usuarioId, tipo, emailNuevo, MINUTOS_ENLACE[tipo]]
    );
  });
  return token;
}

/**
 * Busco un enlace que siga valiendo (de ese tipo, sin usar y sin caducar) y
 * lo bloqueo hasta el final de la transacción (FOR UPDATE): si llegan dos
 * peticiones con el mismo enlace a la vez, la segunda espera y ya lo ve usado.
 * @param {import('pg').PoolClient} cliente
 * @param {string} token
 * @param {'recuperar' | 'email'} tipo
 * @returns {Promise<{ usuarioId: number, emailNuevo: string | null } | null>}
 */
async function reclamarEnlace(cliente, token, tipo) {
  const hash = hashDeToken(token);
  const { rows } = await cliente.query(
    `SELECT usuario_id, email_nuevo FROM enlaces_correo
      WHERE token_hash = $1 AND tipo = $2 AND usada_en IS NULL AND caduca_en > now()
      FOR UPDATE`,
    [hash, tipo]
  );
  if (rows.length === 0) return null;
  await cliente.query('UPDATE enlaces_correo SET usada_en = now() WHERE token_hash = $1', [hash]);
  return { usuarioId: Number(rows[0].usuario_id), emailNuevo: rows[0].email_nuevo };
}

// ============ Recuperar la contraseña ============

/**
 * "¿Has olvidado la contraseña?". Si hay una cuenta con ese email, le envío
 * el enlace. Si no, lo digo (decisión del autor, D-53: Crear cuenta ya lo
 * revelaba, y el límite de intentos impide probar emails en masa).
 * @param {string} email Ya validado y en minúsculas.
 * @returns {Promise<boolean>} false si no hay ninguna cuenta con ese email.
 * @throws {Error} Si no se ha podido enviar el correo.
 */
export async function pedirRecuperacion(email) {
  const { rows } = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email = $1', [email]);
  if (rows.length === 0) return false;
  const usuario = rows[0];
  const token = await guardarEnlace(Number(usuario.id), 'recuperar', null);
  await enviarCorreo(
    correoRecuperar({ nombre: usuario.nombre, email: usuario.email, url: urlDeEnlace(config.appOrigen, '/restablecer', token) })
  );
  return true;
}

/**
 * "Contraseña nueva": si el enlace vale, cambio la contraseña y cierro TODAS
 * las sesiones (si alguien me había quitado la cuenta, lo echo). NO abro una
 * nueva: hay que volver a entrar con la contraseña nueva (decisión del
 * autor, D-53: así se comprueba que la recuerdas).
 * @param {string} token
 * @param {string} contrasena Ya validada (de 10 a 128).
 * @returns {Promise<{ email: string } | null>} El email de la cuenta (para
 *   ponerlo en Entrar), o null si el enlace no vale.
 */
export async function restablecer(token, contrasena) {
  if (!esFormatoToken(token)) return null;
  // El hash, FUERA de la transacción (tarda unos 300 ms), como en el registro.
  const hash = await hashearContrasena(contrasena);
  return conTransaccion(async (cliente) => {
    const enlace = await reclamarEnlace(cliente, token, 'recuperar');
    if (!enlace) return null;
    const { usuarioId } = enlace;
    await cliente.query('UPDATE usuarios SET hash_contrasena = $2 WHERE id = $1', [usuarioId, hash]);
    await cliente.query('DELETE FROM sesiones WHERE usuario_id = $1', [usuarioId]);
    await cliente.query("DELETE FROM enlaces_correo WHERE usuario_id = $1 AND tipo = 'recuperar' AND usada_en IS NULL", [usuarioId]);
    const { rows } = await cliente.query('SELECT email FROM usuarios WHERE id = $1', [usuarioId]);
    return { email: rows[0].email };
  });
}

// ============ Cambiar el email ============

/**
 * "Cambiar email" (Datos personales): pido la contraseña, compruebo que el
 * email nuevo está libre, guardo el enlace y envío dos correos: el enlace al
 * nuevo y un aviso al actual. El email NO cambia hasta confirmar.
 * Aquí sí espero a los correos: la persona ha entrado, y si fallan se lo digo.
 * @param {{ id: number, nombre: string, email: string }} usuario
 * @param {{ emailNuevo: string, contrasena: string }} datos Ya validados.
 * @returns {Promise<'ok' | 'contrasena' | 'en uso'>}
 */
export async function pedirCambioEmail(usuario, { emailNuevo, contrasena }) {
  const {
    rows: [fila],
  } = await pool.query('SELECT hash_contrasena FROM usuarios WHERE id = $1', [usuario.id]);
  if (!fila || !(await comprobarContrasena(contrasena, fila.hash_contrasena))) return 'contrasena';

  const { rows: ocupado } = await pool.query('SELECT 1 FROM usuarios WHERE email = $1', [emailNuevo]);
  if (ocupado.length > 0) return 'en uso';

  const token = await guardarEnlace(usuario.id, 'email', emailNuevo);
  await enviarCorreo(
    correoConfirmarEmail({ nombre: usuario.nombre, emailNuevo, url: urlDeEnlace(config.appOrigen, '/confirmar-email', token) })
  );
  await enviarCorreo(correoAvisoCambioEmail({ nombre: usuario.nombre, email: usuario.email, emailNuevo }));
  return 'ok';
}

/**
 * "Confirmar email": si el enlace vale, el email nuevo pasa a ser el de la
 * cuenta. No hace falta sesión: el enlace puede abrirse en otro dispositivo.
 * @param {string} token
 * @returns {Promise<{ email: string } | null | 'en uso'>} null si el enlace no vale;
 *   'en uso' si, mientras tanto, otra cuenta se ha quedado con ese email.
 */
export async function confirmarEmail(token) {
  if (!esFormatoToken(token)) return null;
  try {
    return await conTransaccion(async (cliente) => {
      const enlace = await reclamarEnlace(cliente, token, 'email');
      if (!enlace) return null;
      await cliente.query('UPDATE usuarios SET email = $2 WHERE id = $1', [enlace.usuarioId, enlace.emailNuevo]);
      await cliente.query("DELETE FROM enlaces_correo WHERE usuario_id = $1 AND tipo = 'email' AND usada_en IS NULL", [enlace.usuarioId]);
      return { email: enlace.emailNuevo };
    });
  } catch (error) {
    // 23505: se ha saltado el UNIQUE de usuarios.email. El ROLLBACK deja el
    // enlace sin usar, pero ese email ya no podrá ser suyo.
    if (error.code === '23505') return 'en uso';
    throw error;
  }
}

// ============ Limpieza diaria ============

/** Borro los enlaces caducados hace más de 7 días (usados o no). */
export async function borrarAntiguos() {
  await pool.query("DELETE FROM enlaces_correo WHERE caduca_en < now() - interval '7 days'");
}
