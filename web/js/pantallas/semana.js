/**
 * @file Pantalla Semana (P-13, D-50): /semana (la de hoy) y /semana/:lunes.
 * Los 7 días de lunes a domingo, cada uno con su comida y su cena; lo que
 * caduca pronto arriba y el equilibrio frente a AESAN abajo. Una semana
 * nueva aparece vacía. Todo se calcula aquí, sin IA.
 */
import { diasHasta, hoyIso, sumarDias } from '/compartido/fechas.js';
import { TIPOS_COMIDA } from '/compartido/constantes.js';
import { avisosDia, dentroDelMargen, esLunes, lunesDe, textoDia, textoSemana } from '/compartido/plan.js';
import { api, mensajeDeError } from '../api.js';
import { crearEquilibrio } from '../componentes/equilibrioSemana.js';
import { crearHueco } from '../componentes/hueco.js';
import { crearAviso, crearCarga, crearSinConexion, crearVacio } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { tomarMensaje } from '../router.js';
import { cargarInventarioCompleto } from './receta.js';

/** Hasta cuántos días cuento algo como "caduca pronto" (como avisoCaducidad()). */
const DIAS_PRONTO = 3;

/**
 * ¿Cabe la semana en el margen? Basta con un día (como en el servidor).
 * @param {string} lunes
 * @param {string} hoy
 */
const semanaEnMargen = (lunes, hoy) => dentroDelMargen(lunes, hoy) || dentroDelMargen(sumarDias(lunes, 6), hoy);

/**
 * "Caduca pronto: Pollo (mañana), Leche (hoy)." con lo que caduca de hoy a 3
 * días, lo más urgente primero. Lo ya caducado lo enseña Inventario.
 * @param {{ productos: any[], tuppers: any[] }} inventario
 * @returns {HTMLElement | null}
 */
function crearCaducaPronto({ productos, tuppers }) {
  const cosas = [
    ...productos.filter((producto) => producto.fechaCaducidad).map((producto) => ({ nombre: producto.nombre, fecha: producto.fechaCaducidad })),
    ...tuppers.map((tupper) => ({ nombre: `tupper de ${tupper.nombre}`, fecha: tupper.fechaLimite })),
  ]
    .map((cosa) => ({ ...cosa, dias: diasHasta(cosa.fecha) }))
    .filter((cosa) => cosa.dias >= 0 && cosa.dias <= DIAS_PRONTO)
    .sort((a, b) => a.dias - b.dias);
  if (cosas.length === 0) return null;

  const cuando = (dias) => (dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`);
  const lista = cosas.map((cosa) => `${cosa.nombre} (${cuando(cosa.dias)})`).join(', ');
  return crearAviso({ tipo: 'aviso', mensaje: `Caduca pronto: ${lista}. Tenlo en cuenta al planificar.` });
}

/**
 * @param {{ parametros: Record<string, string> }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaSemana({ parametros }) {
  const hoy = hoyIso();
  const lunesDeHoy = lunesDe(hoy);
  const lunes = parametros.lunes ?? lunesDeHoy;
  if (!esLunes(lunes) || !semanaEnMargen(lunes, hoy)) {
    return { titulo: 'Semana', contenido: crearNoValida() };
  }

  // "Plan guardado.", "Hueco vaciado."… si vengo de Planificar hueco.
  const mensaje = tomarMensaje();
  const zona = el('div', { class: 'semana' });

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando el plan…'));
    // Lo que caduca solo importa si la semana no ha pasado ya.
    const semanaPasada = sumarDias(lunes, 6) < hoy;
    let huecos;
    let inventario = null;
    try {
      [{ huecos }, inventario] = await Promise.all([
        api.get(`/plan?desde=${lunes}`),
        semanaPasada ? null : cargarInventarioCompleto(),
      ]);
    } catch (error) {
      zona.replaceChildren(crearError(error));
      return;
    }

    zona.replaceChildren(
      ...(mensaje ? [crearMensaje(mensaje)] : []),
      ...(inventario ? [crearCaducaPronto(inventario)].filter(Boolean) : []),
      el('div', { class: 'semana__dias' }, crearDias(huecos)),
      crearEquilibrio({ huecos })
    );
  }

  /**
   * Los 7 días, cada uno con sus dos huecos (vacíos si no hay nada).
   * @param {any[]} huecos
   */
  function crearDias(huecos) {
    // "Carne roja en la comida y en la cena…", junto al día en que pasa (D-50).
    const avisos = avisosDia(huecos);
    return Array.from({ length: 7 }, (_, i) => {
      const fecha = sumarDias(lunes, i);
      const idTitulo = `dia-${fecha}`;
      let marca = '';
      if (fecha === hoy) marca = ' · Hoy';
      else if (fecha === sumarDias(hoy, 1)) marca = ' · Mañana';
      return el(
        'section',
        { class: fecha === hoy ? 'dia dia--hoy' : 'dia', 'aria-labelledby': idTitulo },
        el(
          'div',
          { class: 'dia__cabecera' },
          el('h2', { class: 'dia__titulo', id: idTitulo }, textoDia(fecha), marca),
          // "Ver día" (P-15: qué tengo y qué me falta), solo si hay algo.
          huecos.some((hueco) => hueco.fecha === fecha) &&
            el('a', { class: 'dia__ver', href: `/plan/${fecha}`, 'aria-label': `Ver el ${textoDia(fecha).toLocaleLowerCase('es')}` }, 'Ver día')
        ),
        // Con texto y en naranja: no es un error, es para variar.
        (avisos[fecha] ?? []).map((aviso) => el('p', { class: 'dia__aviso tono--aviso' }, aviso)),
        el(
          'ul',
          { class: 'lista' },
          TIPOS_COMIDA.map((tipo) =>
            crearHueco({ fecha, tipo, hueco: huecos.find((hueco) => hueco.fecha === fecha && hueco.tipo === tipo) ?? null })
          )
        )
      );
    });
  }

  /** @param {import('../api.js').ErrorApi} error */
  function crearError(error) {
    if (error.codigo === 'SIN_CONEXION') return crearSinConexion(cargar);
    return crearAviso({
      mensaje: mensajeDeError(error, 'No se ha podido cargar el plan.'),
      accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
    });
  }

  cargar();
  return {
    titulo: 'Semana',
    contenido: el('div', {}, crearNavegacion(lunes, hoy, lunesDeHoy), zona),
  };
}

/**
 * "‹ Semana del 23 al 29 de noviembre ›" y, si no es la de hoy, "Ir a esta
 * semana". Al llegar al margen, la flecha se queda deshabilitada y dice por qué.
 * @param {string} lunes
 * @param {string} hoy
 * @param {string} lunesDeHoy
 */
function crearNavegacion(lunes, hoy, lunesDeHoy) {
  /**
   * @param {string} destino El lunes al que lleva.
   * @param {string} texto "‹" o "›".
   * @param {string} etiqueta Lo que lee el lector de pantallas.
   */
  function flecha(destino, texto, etiqueta) {
    if (!semanaEnMargen(destino, hoy)) {
      return el(
        'button',
        { class: 'boton boton--secundario semana__flecha', type: 'button', disabled: true, 'aria-label': `${etiqueta}: solo se puede planificar un año atrás y uno adelante` },
        texto
      );
    }
    return el('a', { class: 'boton boton--secundario semana__flecha', href: `/semana/${destino}`, 'aria-label': etiqueta }, texto);
  }

  return el(
    'nav',
    { class: 'semana__navegacion', 'aria-label': 'Cambiar de semana' },
    flecha(sumarDias(lunes, -7), '‹', 'Semana anterior'),
    el(
      'div',
      { class: 'semana__fechas' },
      // aria-live: al cambiar de semana, el lector dice cuál es la nueva.
      el('p', { class: 'semana__texto', 'aria-live': 'polite' }, textoSemana(lunes)),
      lunes !== lunesDeHoy && el('a', { class: 'semana__hoy', href: '/semana' }, 'Ir a esta semana')
    ),
    flecha(sumarDias(lunes, 7), '›', 'Semana siguiente')
  );
}

/**
 * El aviso que me deja Planificar hueco: un texto (éxito) o { tipo, texto }.
 * @param {string | { texto: string, tipo: 'aviso' }} mensaje
 */
function crearMensaje(mensaje) {
  return typeof mensaje === 'string'
    ? crearAviso({ tipo: 'exito', mensaje: `✓ ${mensaje}` })
    : crearAviso({ tipo: mensaje.tipo, mensaje: mensaje.texto });
}

/** "Semana no válida": la URL no es un lunes o se sale del margen. */
function crearNoValida() {
  return crearVacio({
    titulo: 'Semana no válida',
    descripcion: 'Solo se puede planificar de lunes a domingo, desde un año atrás hasta un año adelante.',
    accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/semana' }, 'Ir a esta semana'),
  });
}
