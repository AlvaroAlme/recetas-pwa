/**
 * @file Confirmar email (P-29, D-53). Pública: la abre el enlace del correo,
 * /confirmar-email#t=TOKEN, quizá en otro dispositivo o sin sesión. Al
 * cargar, mando el token y el email nuevo pasa a ser el de la cuenta.
 * Como en Contraseña nueva, el token va detrás de "#" (no llega a los logs)
 * y lo quito de la barra de direcciones nada más leerlo.
 */
import { api, mensajeDeError } from '../api.js';
import { crearAviso, crearCarga } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { recordarEmail } from './recuperar.js';

/** Un token: 43 caracteres base64url (32 bytes), como en el servidor. */
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/;

/**
 * El token, en memoria por si la pantalla se vuelve a pintar; y el
 * resultado, para no confirmar dos veces (la segunda diría "ya no sirve").
 * @type {{ token: string | null, resultado: Promise<{ email: string }> | null }}
 */
const estado = { token: null, resultado: null };

/** Saco el token de "#t=…" y lo borro de la barra de direcciones. */
function tomarToken() {
  if (location.hash) {
    const token = new URLSearchParams(location.hash.slice(1)).get('t');
    estado.token = token && FORMATO_TOKEN.test(token) ? token : null;
    estado.resultado = null;
    history.replaceState(history.state, '', location.pathname);
  }
  return estado.token;
}

/**
 * @returns {import('../router.js').Vista}
 */
export function pantallaConfirmarEmail() {
  const token = tomarToken();
  const zona = el('div', { role: 'status' });

  function verNoSirve(mensaje) {
    zona.replaceChildren(
      crearAviso({ mensaje }),
      el('a', { class: 'boton boton--secundario', href: '/perfil/datos' }, 'Ir a Datos personales')
    );
  }

  async function confirmar() {
    zona.replaceChildren(crearCarga('Confirmando tu email…'));
    try {
      estado.resultado ??= api.post('/auth/confirmar-email', { token });
      const { email } = await estado.resultado;
      // Si después tienes que entrar, el email nuevo ya está puesto.
      recordarEmail(email);
      zona.replaceChildren(
        crearAviso({ tipo: 'exito', mensaje: `✓ Tu email ahora es ${email}. Desde ahora entras con él.` }),
        el('a', { class: 'boton boton--primario', href: '/' }, 'Ir a Stockpot')
      );
    } catch (error) {
      estado.resultado = null;
      if (error.codigo === 'ENLACE_NO_VALIDO') {
        verNoSirve('Este enlace ya no sirve: puede que ya lo hayas usado o que hayan pasado más de 24 horas. Vuelve a pedir el cambio desde Perfil › Datos personales.');
      } else if (error.codigo === 'EMAIL_EN_USO') {
        verNoSirve('Ese email ya lo usa otra cuenta, así que no lo hemos cambiado.');
      } else {
        zona.replaceChildren(
          crearAviso({
            mensaje: mensajeDeError(error, 'No se ha podido confirmar tu email.'),
            accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: confirmar }, 'Reintentar'),
          })
        );
      }
    }
  }

  if (token) confirmar();
  else verNoSirve('Este enlace no está completo. Ábrelo otra vez desde el correo, o vuelve a pedir el cambio desde Perfil › Datos personales.');

  return {
    titulo: 'Confirmar email',
    contenido: el('div', { class: 'acceso' }, zona),
  };
}
