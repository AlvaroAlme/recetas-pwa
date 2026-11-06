/**
 * @file Pantalla Unirse a una casa (P-17). Si tu casa actual tiene datos y
 * te quedarías fuera, la API pide confirmación (409 CONFIRMAR_BORRADO) y yo
 * te pregunto con el diálogo antes de volver a intentarlo.
 */
import { validarCodigoInvitacion } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { confirmar, crearAviso, crearCampo, leerCampo, ponerCargando, ponerErrorCampo } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';

/** @returns {import('../router.js').Vista} */
export function pantallaUnirse() {
  const aviso = el('div');
  const codigo = crearCampo({
    etiqueta: 'Código de invitación',
    nombre: 'codigo',
    ayuda: 'Te lo da alguien que vive en esa casa.',
    atributos: {
      placeholder: 'ABCD-EFGH',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      maxlength: 9,
    },
  });
  const boton = el('button', { class: 'boton boton--primario', type: 'submit', 'data-escribe': true }, 'Unirme');
  let enviando = false;

  /**
   * @param {string} limpio El código ya validado.
   * @param {boolean} confirmarBorrado
   */
  async function unirme(limpio, confirmarBorrado) {
    const { hogar } = await api.post('/hogar/unirse', { codigo: limpio, confirmarBorrado });
    navegar('/', { reemplazar: true, mensaje: `Ya vives en «${hogar.nombre}».` });
  }

  /** @param {SubmitEvent} evento */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (enviando) return;
    aviso.replaceChildren();

    const resultado = validarCodigoInvitacion(leerCampo(codigo));
    ponerErrorCampo(codigo, resultado.ok ? null : resultado.errores.codigo);
    if (!resultado.ok) {
      codigo.querySelector('.campo__entrada').focus();
      return;
    }

    enviando = true;
    ponerCargando(boton, true, 'Uniéndome…');
    try {
      try {
        await unirme(resultado.datos, false);
      } catch (error) {
        if (error.codigo !== 'CONFIRMAR_BORRADO') throw error;
        // Mi casa tiene datos y me quedaría fuera: pregunto antes de borrarla.
        const seguro = await confirmar({
          titulo: 'Se borrará tu casa',
          texto: error.message,
          textoConfirmar: 'Unirme y borrarla',
          peligroso: true,
        });
        if (!seguro) {
          enviando = false;
          ponerCargando(boton, false);
          return;
        }
        await unirme(resultado.datos, true);
      }
    } catch (error) {
      enviando = false;
      ponerCargando(boton, false);
      if (error.estado === 404 || error.estado === 409 || error.campos) {
        // Código que no existe, caducado o ya usado: el error va junto al campo.
        ponerErrorCampo(codigo, error.campos?.codigo ?? error.message);
        codigo.querySelector('.campo__entrada').focus();
      } else {
        aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido unir a la casa.') }));
      }
    }
  }

  return {
    titulo: 'Unirse a una casa',
    atras: '/ajustes',
    contenido: el('form', { class: 'formulario', novalidate: true, onsubmit: alEnviar }, aviso, codigo, boton),
  };
}