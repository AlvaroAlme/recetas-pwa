/**
 * @file Quién soy, guardado en memoria para la cabecera (el avatar de cada
 * pestaña, D-52). Así no pido /api/yo en cada cambio de pantalla: lo pido la
 * primera vez y me lo guardo.
 *
 * Cuándo deja de valer:
 * - si cambio mi nombre o mi avatar, la pantalla me pasa el usuario nuevo
 *   con ponerUsuario();
 * - si cierro sesión (o entro con otra cuenta), el router lo olvida al pintar
 *   una pantalla pública (Entrar, Crear cuenta).
 */
import { api } from './api.js';

/** @type {{ id: number, nombre: string, email: string, avatarSemilla: string } | null} */
let usuario = null;
/** @type {Promise<typeof usuario> | null} */
let pidiendo = null;

/**
 * El usuario de la sesión. La primera vez lo pido a la API; luego, el guardado.
 * @returns {Promise<{ id: number, nombre: string, email: string, avatarSemilla: string }>}
 * @throws {import('./api.js').ErrorApi} Sin sesión o sin conexión (y sin copia).
 */
export function usuarioActual() {
  if (usuario) return Promise.resolve(usuario);
  pidiendo ??= api
    .get('/yo')
    .then((datos) => (usuario = datos.usuario))
    .finally(() => {
      pidiendo = null;
    });
  return pidiendo;
}

/** El usuario si ya lo sé, sin esperar a nada (o null). */
export const usuarioSabido = () => usuario;

/**
 * Lo que me ha devuelto la API al cambiar mi nombre o mi avatar.
 * @param {{ id: number, nombre: string, email: string, avatarSemilla: string }} nuevo
 */
export function ponerUsuario(nuevo) {
  usuario = nuevo;
}

/** Al cerrar sesión: el siguiente que entre puede ser otra persona. */
export function olvidarUsuario() {
  usuario = null;
}
