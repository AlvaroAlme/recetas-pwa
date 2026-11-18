/**
 * @file Avisos (P-25, D-52): lo que eran "Avisos en este dispositivo" y
 * "Aviso del plan" en Ajustes. Cada dispositivo activa sus avisos por su
 * cuenta (§7.6); la hora del aviso del plan es de toda la casa.
 */
import { validarHora } from '/compartido/horas.js';
import { api, mensajeDeError } from '../api.js';
import { crearPanelAvisos } from '../componentes/panelAvisos.js';
import { crearAviso, crearCampo, leerCampo, ponerCargando, ponerErrorCampo } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { pantallaDePerfil } from './comunPerfil.js';

/**
 * @returns {import('../router.js').Vista}
 */
export function pantallaPerfilAvisos() {
  return pantallaDePerfil({
    titulo: 'Avisos',
    atras: '/perfil',
    mensajeError: 'No se han podido cargar tus avisos.',
    pintar({ hogar }) {
      return [
        el(
          'section',
          { class: 'seccion', 'aria-labelledby': 'titulo-avisos' },
          el('h2', { class: 'titulo-seccion', id: 'titulo-avisos' }, 'En este dispositivo'),
          crearPanelAvisos()
        ),
        crearSeccionPlan(hogar),
      ];
    },
  });
}

/**
 * "Aviso del plan": a qué hora llega, la noche anterior, "Mañana comes…"
 * (§7.4). Es de la casa: si la cambio, cambia para todos.
 * @param {{ horaAvisoPlan: string }} hogar
 */
function crearSeccionPlan(hogar) {
  const aviso = el('div');
  // type="time": en el iPhone, la rueda de horas; siempre da HH:MM.
  const campo = crearCampo({
    etiqueta: 'Hora del aviso',
    nombre: 'hora-aviso-plan',
    valor: hogar.horaAvisoPlan,
    atributos: { type: 'time', required: true },
  });
  const guardar = el('button', { class: 'boton boton--secundario boton--ajustado', type: 'submit', 'data-escribe': true }, 'Guardar hora');

  /** @param {SubmitEvent} evento */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (guardar.disabled) return;
    aviso.replaceChildren();
    const resultado = validarHora(leerCampo(campo));
    ponerErrorCampo(campo, resultado.ok ? null : resultado.errores.horaAvisoPlan);
    if (!resultado.ok) return;
    ponerCargando(guardar, true);
    try {
      const { hogar: nuevo } = await api.patch('/hogar', { horaAvisoPlan: resultado.datos });
      hogar.horaAvisoPlan = nuevo.horaAvisoPlan;
      aviso.replaceChildren(crearAviso({ tipo: 'exito', mensaje: `✓ Hora guardada: ${nuevo.horaAvisoPlan}.` }));
    } catch (error) {
      if (error.campos?.horaAvisoPlan) ponerErrorCampo(campo, error.campos.horaAvisoPlan);
      else aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido guardar la hora.') }));
    } finally {
      ponerCargando(guardar, false);
    }
  }

  return el(
    'section',
    { class: 'seccion', 'aria-labelledby': 'titulo-plan' },
    el('h2', { class: 'titulo-seccion', id: 'titulo-plan' }, 'Aviso del plan'),
    el('p', { class: 'tono--tenue' }, 'La noche anterior te avisamos de lo que tienes planificado, a esta hora. Es la misma para toda tu casa.'),
    el('form', { class: 'formulario', novalidate: true, onsubmit: alEnviar }, aviso, campo, el('div', { class: 'seccion__acciones' }, guardar))
  );
}
