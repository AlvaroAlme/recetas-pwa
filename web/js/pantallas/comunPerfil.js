/**
 * @file Lo que comparten Perfil (P-16) y sus apartados (P-22 a P-26, D-52):
 * piden /api/yo, enseñan "Cargando…" y los errores igual, y el mensaje de
 * éxito que les deje la pantalla anterior ("Tu casa ahora se llama…").
 * Antes todo esto estaba en una sola pantalla, Ajustes.
 */
import { api, mensajeDeError } from '../api.js';
import { crearAviso, crearCarga, crearSinConexion } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { tomarMensaje } from '../router.js';
import { ponerUsuario } from '../yo.js';

/**
 * @typedef {Object} DatosYo Lo que devuelve GET /api/yo.
 * @property {{ id: number, nombre: string, email: string, rol: string, avatarSemilla: string }} usuario
 * @property {{ id: number, nombre: string, horaAvisoPlan: string, miembros: { id: number, nombre: string, rol: string, avatarSemilla: string }[] }} hogar
 * @property {{ usadas: number, limite: number }} cuotaIa
 * @property {{ usadas: number, limite: number }} cuotaChat
 */

/**
 * Monta una pantalla de Perfil.
 * @param {{
 *   titulo: string,
 *   atras: string,
 *   mensajeError: string,
 *   pintar: (datos: DatosYo, recargar: () => void) => Node[] | Promise<Node[]>
 * }} opciones pintar: lo que va en la pantalla cuando ya tengo los datos.
 * @returns {import('../router.js').Vista}
 */
export function pantallaDePerfil({ titulo, atras, mensajeError, pintar }) {
  const mensaje = tomarMensaje();
  const zona = el('div');

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando…'));
    try {
      const datos = await api.get('/yo');
      // De paso, la cabecera se entera si algo ha cambiado.
      ponerUsuario(datos.usuario);
      zona.replaceChildren(...(await pintar(datos, cargar)));
    } catch (error) {
      zona.replaceChildren(
        error.codigo === 'SIN_CONEXION'
          ? crearSinConexion(cargar)
          : crearAviso({
              mensaje: mensajeDeError(error, mensajeError),
              accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
            })
      );
    }
  }

  cargar();
  return {
    titulo,
    atras,
    contenido: el('div', {}, mensaje && crearAviso({ tipo: 'exito', mensaje: `✓ ${mensaje}` }), zona),
  };
}

/**
 * Lo que me queda hoy de una cuota.
 * @param {{ usadas: number, limite: number }} cuota
 */
export const quedan = ({ usadas, limite }) => Math.max(0, limite - usadas);
