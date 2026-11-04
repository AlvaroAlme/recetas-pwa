/**
 * @file Pantalla Entrar (P-01). Es pública: no hace falta sesión.
 * Si vengo de una pantalla privada, ?volver=/producto/7 me lleva de vuelta
 * allí al entrar (DISENO_UI §5.3).
 */
import { validarLogin } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { crearAviso, crearCampo, leerCampo, ponerCargando, ponerErrorCampo } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar, tomarMensaje } from '../router.js';

/**
 * A dónde vuelvo al entrar: SOLO a rutas de mi app. Tiene que empezar por
 * "/" y no por "//" ni "/\", que el navegador leería como otra web
 * ("//web-maliciosa.example"). Así nadie puede mandarte un enlace a mi
 * Entrar que, al entrar, te lleve a su web (redirección abierta, §5.2).
 * @param {string | null} volver
 * @returns {string}
 */
export function destinoSeguro(volver) {
  return typeof volver === 'string' && volver.startsWith('/') && !/^\/[/\\]/.test(volver) ? volver : '/';
}

/**
 * @param {{ consulta: URLSearchParams }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaEntrar({ consulta }) {
  const mensaje = tomarMensaje();
  const volver = destinoSeguro(consulta.get('volver'));
  const aviso = el('div');
  const email = crearCampo({
    etiqueta: 'Email',
    nombre: 'email',
    atributos: { type: 'email', autocomplete: 'email', inputmode: 'email', autocapitalize: 'none', spellcheck: 'false', placeholder: 'nombre@correo.com' },
  });
  const contrasena = crearCampo({
    etiqueta: 'Contraseña',
    nombre: 'contrasena',
    atributos: { type: 'password', autocomplete: 'current-password' },
  });
  const boton = el('button', { class: 'boton boton--primario', type: 'submit' }, 'Entrar');
  let enviando = false;

  /** @param {SubmitEvent} evento */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    aviso.replaceChildren();

    const resultado = validarLogin({ email: leerCampo(email), contrasena: leerCampo(contrasena) });
    const errores = resultado.ok ? {} : resultado.errores;
    ponerErrorCampo(email, errores.email);
    ponerErrorCampo(contrasena, errores.contrasena);
    if (!resultado.ok) {
      (errores.email ? email : contrasena).querySelector('.campo__entrada').focus();
      return;
    }

    enviando = true;
    ponerCargando(boton, true, 'Entrando…');
    try {
      await api.post('/auth/login', resultado.datos);
      navegar(volver, { reemplazar: true });
    } catch (error) {
      enviando = false;
      ponerCargando(boton, false);
      // 401 ("Email o contraseña incorrectos.") y 429 ("Demasiados intentos…")
      // traen ya el mensaje para la persona.
      const mensaje =
        error.estado === 401 || error.estado === 429
          ? error.message
          : mensajeDeError(error, 'No se ha podido conectar. Inténtalo de nuevo.');
      aviso.replaceChildren(crearAviso({ mensaje }));
    }
  }

  return {
    titulo: 'Entrar',
    contenido: el(
      'div',
      { class: 'acceso' },
      mensaje && crearAviso({ tipo: 'exito', mensaje: `✓ ${mensaje}` }),
      el('p', { class: 'acceso__lema' }, 'Recetas con lo que tengas en la nevera.'),
      el('form', { class: 'formulario', novalidate: true, onsubmit: alEnviar }, aviso, email, contrasena, boton),
      el(
        'p',
        { class: 'acceso__pie' },
        '¿No tienes cuenta? ',
        el('a', { href: `/registro?volver=${encodeURIComponent(volver)}` }, 'Créala')
      )
    ),
  };
}