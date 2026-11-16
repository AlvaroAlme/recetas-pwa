/**
 * @file Pantalla Planificar hueco (P-14, D-50): /plan/2026-11-24/cena. Qué se
 * come en ese hueco: una receta guardada, un plato escrito a mano o "fuera
 * de casa", y el grupo de alimentos si se quiere. Al guardar vuelvo a la
 * semana del hueco. PUT o DELETE /api/plan/:fecha/:tipo.
 */
import { GRUPOS_ALIMENTOS, TIPOS_COMIDA } from '/compartido/constantes.js';
import { esFechaIso, hoyIso } from '/compartido/fechas.js';
import { ETIQUETAS_GRUPO, ETIQUETAS_TIPO, dentroDelMargen, lunesDe, textoDia } from '/compartido/plan.js';
import { validarHueco } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { estadoAvisos } from '../avisos.js';
import { sugerirNombres } from '../componentes/sugerenciasNombre.js';
import {
  crearAutocompletar,
  crearAviso,
  crearCampo,
  crearCarga,
  crearSelector,
  crearSinConexion,
  crearVacio,
  leerCampo,
  leerSelector,
  ponerCargando,
  ponerErrorCampo,
} from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';

/** Las tres cosas que puede llevar un hueco, como opciones del selector. */
const OPCIONES = [
  { valor: 'receta', etiqueta: 'Una receta guardada' },
  { valor: 'texto', etiqueta: 'Escribir un plato' },
  { valor: 'fuera', etiqueta: 'Fuera de casa' },
];

/**
 * Como en el formulario de receta: el historial de nombres de mi casa.
 * @param {string} texto
 */
async function buscarHistorial(texto) {
  const { nombres } = await api.get(`/productos/nombres?q=${encodeURIComponent(texto.trim())}`);
  return nombres;
}

/**
 * @param {{ parametros: Record<string, string> }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaPlanificarHueco({ parametros }) {
  const { fecha, tipo } = parametros;
  if (!esFechaIso(fecha) || !TIPOS_COMIDA.includes(tipo) || !dentroDelMargen(fecha, hoyIso())) {
    return { titulo: 'Planificar', contenido: crearNoValido(), atras: '/semana' };
  }

  const semana = `/semana/${lunesDe(fecha)}`;
  const ruta = `/plan/${fecha}/${tipo}`;
  const zona = el('div');
  // "Guardar" no sale hasta tener el hueco y las recetas: le guardo el sitio.
  const ranuraBoton = el('div', { class: 'pie__ranura' });
  // Si este dispositivo no tiene avisos, al guardar lo digo (DISENO_UI §7.5, paso 3).
  const sinAvisos = estadoAvisos()
    .then((estado) => ['desactivados', 'bloqueados', 'instalar'].includes(estado))
    .catch(() => false);

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando…'));
    ranuraBoton.replaceChildren();
    let huecos;
    let recetas;
    try {
      [{ huecos }, { recetas }] = await Promise.all([api.get(`/plan/${fecha}`), api.get('/recetas')]);
    } catch (error) {
      zona.replaceChildren(crearError(error));
      return;
    }
    const { formulario, boton } = crearFormulario(huecos.find((hueco) => hueco.tipo === tipo) ?? null, recetas);
    zona.replaceChildren(formulario);
    ranuraBoton.replaceChildren(boton);
  }

  /**
   * El formulario, con lo que ya tenía el hueco marcado.
   * @param {any | null} actual El hueco como está ahora (null si vacío).
   * @param {{ id: number, nombre: string }[]} recetas
   */
  function crearFormulario(actual, recetas) {
    const idFormulario = 'formulario-hueco';
    const avisoGeneral = el('div');
    let guardando = false;

    // Si ya tenía algo, eso; si no, una receta (o escribir, si aún no hay recetas).
    // "Fuera de casa" primero: su texto es la nota, no un plato.
    let inicial = recetas.length > 0 ? 'receta' : 'texto';
    if (actual?.fueraDeCasa) inicial = 'fuera';
    else if (actual?.receta) inicial = 'receta';
    else if (actual?.texto) inicial = 'texto';

    const que = crearSelector({ leyenda: '¿Qué vas a comer?', nombre: 'que', opciones: OPCIONES, seleccionado: inicial, alCambiar: mostrar });

    // Receta: un <select> (en el iPhone, la rueda del sistema). Si la receta
    // que tenía se borró, no está en la lista y sale la primera.
    const campoReceta =
      recetas.length > 0
        ? crearCampo({
            etiqueta: 'Receta',
            nombre: 'receta',
            elemento: 'select',
            valor: actual?.receta ? String(actual.receta.id) : undefined,
            opciones: recetas.map((receta) => ({ valor: String(receta.id), etiqueta: receta.nombre })),
          })
        : el(
            'div',
            { class: 'seccion hueco__sin-recetas' },
            el('p', { class: 'tono--tenue' }, 'Aún no tienes recetas guardadas.'),
            el('a', { class: 'boton boton--secundario boton--ajustado', href: '/receta/nueva' }, 'Escribir una')
          );

    const campoTexto = crearCampo({
      etiqueta: 'Nombre del plato',
      nombre: 'plato',
      valor: actual?.fueraDeCasa ? '' : (actual?.texto ?? ''),
      atributos: { autocomplete: 'off', maxlength: 80, placeholder: 'Ej. Lentejas con chorizo', enterkeyhint: 'done' },
    });
    crearAutocompletar(campoTexto, {
      buscar: (texto) => sugerirNombres(texto, buscarHistorial),
      alElegir: () => {},
    });

    // La nota de "fuera de casa": una cita, una comida de empresa… Opcional.
    const campoNota = crearCampo({
      etiqueta: 'Nota (opcional)',
      nombre: 'nota',
      valor: actual?.fueraDeCasa ? (actual.texto ?? '') : '',
      atributos: { autocomplete: 'off', maxlength: 80, placeholder: 'Ej. Comida aniversario', enterkeyhint: 'done' },
    });

    const campoGrupo = crearCampo({
      etiqueta: 'Grupo de alimentos (opcional)',
      nombre: 'grupo',
      elemento: 'select',
      valor: actual?.grupo ?? '',
      opciones: [{ valor: '', etiqueta: 'Sin grupo' }, ...GRUPOS_ALIMENTOS.map((grupo) => ({ valor: grupo, etiqueta: ETIQUETAS_GRUPO[grupo] }))],
      ayuda: 'Sirve para ver el equilibrio de la semana.',
    });

    const boton = el('button', { class: 'boton boton--primario', type: 'submit', form: idFormulario, 'data-escribe': true }, 'Guardar');

    // "Dejar este hueco vacío", solo si tiene algo. Sin confirmar: se deshace volviendo a planificarlo.
    const botonVaciar =
      actual &&
      el('button', { class: 'boton boton--fantasma boton--ajustado', type: 'button', 'data-escribe': true, onclick: vaciar }, 'Dejar este hueco vacío');

    /** Enseño solo lo que va con la opción elegida. */
    function mostrar() {
      const opcion = leerSelector(que);
      campoReceta.hidden = opcion !== 'receta';
      campoTexto.hidden = opcion !== 'texto';
      campoNota.hidden = opcion !== 'fuera';
      // "Fuera de casa" no lleva grupo (D-50).
      campoGrupo.hidden = opcion === 'fuera';
    }

    /** Lo que mando a la API, según la opción elegida. */
    function leerDatos() {
      const opcion = leerSelector(que);
      const grupo = leerCampo(campoGrupo) || null;
      if (opcion === 'fuera') return { fueraDeCasa: true, texto: leerCampo(campoNota) };
      if (opcion === 'texto') return { texto: leerCampo(campoTexto), grupo };
      // Sin recetas no hay <select>: mando null y validarHueco() pide elegir una.
      const id = recetas.length > 0 ? Number(leerCampo(campoReceta)) : null;
      return { recetaId: id, grupo };
    }

    /** @param {Record<string, string>} errores */
    function mostrarErrores(errores) {
      // El error de la receta, en su <select>; si no hay recetas, como aviso.
      if (recetas.length > 0) ponerErrorCampo(campoReceta, errores.recetaId);
      // El error del texto va al campo que se ve: el plato o la nota.
      const fuera = leerSelector(que) === 'fuera';
      ponerErrorCampo(campoTexto, fuera ? undefined : errores.texto);
      ponerErrorCampo(campoNota, fuera ? errores.texto : undefined);
      ponerErrorCampo(campoGrupo, errores.grupo);
      const general = errores.general ?? (recetas.length === 0 ? errores.recetaId : undefined);
      avisoGeneral.replaceChildren(...(general ? [crearAviso({ mensaje: general })] : []));
    }

    /** @param {SubmitEvent} evento */
    async function alEnviar(evento) {
      evento.preventDefault();
      if (guardando) return;
      const datos = leerDatos();
      // { recetaId: null } sin recetas: validarHueco() lo tomaría por "no viene nada".
      const resultado = datos.recetaId === null ? { ok: false, errores: { recetaId: 'Elige una receta.' } } : validarHueco(datos);
      mostrarErrores(resultado.ok ? {} : resultado.errores);
      if (!resultado.ok) return;

      guardando = true;
      ponerCargando(boton, true);
      try {
        await api.put(ruta, datos);
        // Si mañana me tocaría el aviso y aquí no llega, lo digo (pero se ha guardado).
        const mensaje = (await sinAvisos)
          ? { tipo: 'aviso', texto: 'Plan guardado. Activa los avisos en Ajustes para que te lo recordemos la noche antes.' }
          : 'Plan guardado.';
        navegar(semana, { reemplazar: true, mensaje });
      } catch (error) {
        guardando = false;
        ponerCargando(boton, false);
        if (error.codigo === 'NO_EXISTE') {
          mostrarErrores({ recetaId: 'Esta receta ya no existe. Elige otra.' });
        } else if (error.campos) {
          mostrarErrores(error.campos);
        } else {
          mostrarErrores({ general: mensajeDeError(error, 'No se ha guardado. Ha fallado el cambio en el plan. Inténtalo de nuevo.') });
        }
      }
    }

    async function vaciar() {
      if (guardando) return;
      guardando = true;
      ponerCargando(botonVaciar, true, 'Vaciando…');
      try {
        await api.borrar(ruta);
        navegar(semana, { reemplazar: true, mensaje: 'Hueco vaciado.' });
      } catch (error) {
        guardando = false;
        ponerCargando(botonVaciar, false);
        mostrarErrores({ general: mensajeDeError(error, 'No se ha vaciado el hueco. Inténtalo de nuevo.') });
      }
    }

    const formulario = el(
      'form',
      { class: 'formulario', id: idFormulario, novalidate: true, onsubmit: alEnviar },
      avisoGeneral,
      que,
      campoReceta,
      campoTexto,
      campoNota,
      campoGrupo,
      botonVaciar
    );
    mostrar();
    return { formulario, boton };
  }

  /** @param {import('../api.js').ErrorApi} error */
  function crearError(error) {
    if (error.codigo === 'SIN_CONEXION') return crearSinConexion(cargar);
    return crearAviso({
      mensaje: mensajeDeError(error, 'No se ha podido abrir este hueco.'),
      accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
    });
  }

  cargar();
  return { titulo: `${textoDia(fecha)} · ${ETIQUETAS_TIPO[tipo]}`, contenido: zona, pie: [ranuraBoton], atras: semana };
}

/** "Hueco no válido": la fecha no existe, se sale del margen o no es comida ni cena. */
function crearNoValido() {
  return crearVacio({
    titulo: 'Hueco no válido',
    descripcion: 'Solo se puede planificar la comida o la cena, desde un año atrás hasta un año adelante.',
    accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/semana' }, 'Ir a esta semana'),
  });
}
