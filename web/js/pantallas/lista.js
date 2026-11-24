/**
 * @file Pantalla Lista de la compra (P-30, D-54): lo que falta en casa,
 * compartido por el hogar. Arriba, apuntar algo (nombre con el
 * autocompletado de D-42 y, si quiero, cuánto); debajo, lo que falta por
 * comprar y, al final, lo comprado (tachado) con "Borrar comprados".
 *
 * Vigía también apunta y tacha solo (paso 4 de la fase 12): por eso la
 * lista se recarga al volver a la app, que alguien de casa puede haber
 * gastado o comprado algo mientras tanto. No hay tiempo real.
 */
import { MAX_LONGITUD_NOMBRE, UNIDADES } from '/compartido/constantes.js';
import { formatearCantidad } from '/compartido/formato.js';
import { validarLineaLista } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { sugerirNombres } from '../componentes/sugerenciasNombre.js';
import {
  crearAutocompletar,
  crearAviso,
  crearCampo,
  crearCarga,
  crearMarca,
  crearSinConexion,
  crearVacio,
  ponerCargando,
  ponerErrorCampo,
} from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { entrar, salir } from '../movimiento.js';

/**
 * Como en editarReceta.js: el historial de nombres de mi casa, para el
 * autocompletado (sugerirNombres no llama a la API).
 * @param {string} texto
 */
async function buscarHistorial(texto) {
  const { nombres } = await api.get(`/productos/nombres?q=${encodeURIComponent(texto.trim())}`);
  return nombres;
}

/**
 * Lo que escribo en el campo de cantidad: '' = sin cantidad; "0,5" → 0.5.
 * Si no es un número (NaN), validarLineaLista() dirá qué pasa.
 * @param {string} texto
 * @returns {number | null}
 */
function leerCantidadEscrita(texto) {
  const limpio = texto.trim();
  return limpio === '' ? null : Number(limpio.replace(',', '.'));
}

/**
 * Una línea como la devuelve GET /api/lista.
 * @typedef {Object} LineaLista
 * @property {number} id
 * @property {string} nombre
 * @property {number | null} cantidad
 * @property {string | null} unidad
 * @property {'manual' | 'auto'} origen
 * @property {string} creadaEn
 * @property {string | null} compradaEn null = sin tachar.
 */

/** @returns {import('../router.js').Vista} */
export function pantallaLista() {
  /** @type {LineaLista[]} */
  let lineas = [];
  // Como en Inventario: si recargo mientras carga, la respuesta vieja no pinta.
  let turno = 0;

  const zona = el('div', { class: 'lista-compra__zona' });
  // Errores al apuntar, tachar o borrar ("No hay conexión…", "ya está").
  const avisos = el('div');
  // Lo que pasa, para VoiceOver: "«Pan» apuntado.", "«Leche» comprada."
  const anuncio = el('p', { class: 'solo-lector', role: 'status' });

  // ---------- Apuntar ----------
  const nombre = crearCampo({
    etiqueta: '¿Qué hay que comprar?',
    nombre: 'nombre',
    atributos: { maxlength: MAX_LONGITUD_NOMBRE, autocomplete: 'off', autocapitalize: 'sentences', enterkeyhint: 'done' },
  });
  const cantidad = crearCampo({
    etiqueta: 'Cantidad',
    nombre: 'cantidad',
    atributos: { inputmode: 'decimal', autocomplete: 'off' },
  });
  // La primera opción, vacía: la cantidad es opcional (D-54).
  const unidad = crearCampo({
    etiqueta: 'Unidad',
    nombre: 'unidad',
    elemento: 'select',
    valor: '',
    opciones: [{ valor: '', etiqueta: '—' }, ...UNIDADES.map((valor) => ({ valor, etiqueta: valor }))],
  });
  const botonAnadir = el('button', { class: 'boton boton--primario', type: 'submit', 'data-escribe': true }, 'Añadir');
  // Al elegir un nombre NO relleno la cantidad (es opcional, P-30): el foco
  // se queda en el nombre y con Enter se apunta.
  crearAutocompletar(nombre, { buscar: (texto) => sugerirNombres(texto, buscarHistorial), alElegir: () => {} });

  const formulario = el(
    'form',
    { class: 'lista-compra__formulario', novalidate: true, onsubmit: apuntar },
    nombre,
    el('div', { class: 'lista-compra__cuanto' }, cantidad, unidad, botonAnadir)
  );

  /** @param {SubmitEvent} evento */
  async function apuntar(evento) {
    // Sin esto, el navegador enviaría el formulario y recargaría la página.
    evento.preventDefault();
    avisos.replaceChildren();
    const valor = (campo) => campo.querySelector('.campo__entrada').value;
    const resultado = validarLineaLista({
      nombre: valor(nombre),
      cantidad: leerCantidadEscrita(valor(cantidad)),
      unidad: valor(unidad) || null,
    });
    // Pongo (o quito) el error de cada campo; con errores, no envío nada.
    const errores = resultado.ok ? {} : resultado.errores;
    ponerErrorCampo(nombre, errores.nombre);
    ponerErrorCampo(cantidad, errores.cantidad);
    ponerErrorCampo(unidad, errores.unidad);
    if (!resultado.ok) {
      const primero = [nombre, cantidad, unidad].find((campo) => campo.querySelector('[aria-invalid]'));
      primero?.querySelector('.campo__entrada').focus();
      return;
    }

    ponerCargando(botonAnadir, true, 'Añadiendo…');
    try {
      const { linea, yaEstaba } = await api.post('/lista', resultado.datos);
      if (yaEstaba) {
        // No es un error: ya estaba sin tachar (D-54).
        avisos.replaceChildren(crearAviso({ tipo: 'aviso', mensaje: `«${linea.nombre}» ya está en la lista.` }));
      } else {
        lineas = [linea, ...lineas];
        pintar(linea.id);
        anuncio.textContent = `«${linea.nombre}» apuntado.`;
      }
      // Vacío el formulario y me quedo en el nombre, para apuntar otra cosa seguida.
      formulario.reset();
      const entradaNombre = nombre.querySelector('.campo__entrada');
      // reset() no lanza "input": sin él, la búsqueda que estaba esperando
      // (la de lo que acabo de apuntar) pintaría sus sugerencias encima.
      entradaNombre.dispatchEvent(new Event('input'));
      entradaNombre.focus();
    } catch (error) {
      avisos.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido apuntar. Inténtalo de nuevo.') }));
    } finally {
      ponerCargando(botonAnadir, false);
    }
  }

  // ---------- Cargar y pintar ----------
  async function cargar() {
    const miTurno = ++turno;
    // La rueda solo la primera vez: al recargar, la lista vieja se queda hasta que llega la nueva.
    if (lineas.length === 0) zona.replaceChildren(crearCarga('Cargando la lista…'));
    try {
      const respuesta = await api.get('/lista');
      if (miTurno !== turno) return;
      lineas = respuesta.lineas;
      pintar();
    } catch (error) {
      if (miTurno !== turno) return;
      zona.replaceChildren(
        error.codigo === 'SIN_CONEXION'
          ? crearSinConexion(cargar)
          : crearAviso({
              mensaje: mensajeDeError(error, 'No se ha podido cargar la lista.'),
              accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
            })
      );
    }
  }

  /**
   * Pinto la lista entera desde `lineas` (ya vienen ordenadas del servidor
   * y las mantengo así). Solo anima la línea que acaba de entrar (D-56).
   * @param {number} [idQueEntra]
   */
  function pintar(idQueEntra) {
    const porComprar = lineas.filter((linea) => !linea.compradaEn);
    const compradas = lineas.filter((linea) => linea.compradaEn);
    if (lineas.length === 0) {
      zona.replaceChildren(
        crearVacio({
          titulo: 'La lista está vacía',
          descripcion: 'Apunta lo que te falta. Cuando algo se esté acabando en casa, Vigía lo añadirá solo.',
        })
      );
      return;
    }
    /** @param {LineaLista} linea */
    const fila = (linea) => (linea.id === idQueEntra ? entrar(crearLinea(linea)) : crearLinea(linea));
    zona.replaceChildren(
      porComprar.length > 0
        ? el('ul', { class: 'lista', 'aria-label': 'Por comprar' }, porComprar.map(fila))
        : el('p', { class: 'tono--tenue' }, 'No falta nada por comprar.'),
      ...(compradas.length > 0
        ? [
            el(
              'section',
              { class: 'seccion', 'aria-labelledby': 'titulo-comprados' },
              el('h2', { class: 'titulo-seccion', id: 'titulo-comprados' }, `Comprados (${compradas.length})`),
              el('ul', { class: 'lista' }, compradas.map(fila)),
              el(
                'button',
                { class: 'boton boton--secundario boton--ajustado', type: 'button', 'data-escribe': true, onclick: borrarComprados },
                'Borrar comprados'
              )
            ),
          ]
        : [])
    );
  }

  /**
   * Una línea: el botón grande que tacha o destacha (con el nombre, la
   * cantidad y "Añadida sola") y la ✗ que la quita.
   * @param {LineaLista} linea
   * @returns {HTMLLIElement}
   */
  function crearLinea(linea) {
    const comprada = Boolean(linea.compradaEn);
    const marcar = el(
      'button',
      { class: 'linea-lista__marcar', type: 'button', 'aria-pressed': String(comprada), 'data-escribe': true },
      el('span', { class: 'linea-lista__casilla', 'aria-hidden': 'true' }, crearMarca('bien')),
      el(
        'span',
        { class: 'linea-lista__textos' },
        el('span', { class: 'linea-lista__nombre' }, linea.nombre),
        linea.origen === 'auto' && el('span', { class: 'linea-lista__origen' }, 'Añadida sola')
      ),
      linea.cantidad !== null && el('span', { class: 'linea-lista__cantidad' }, formatearCantidad(linea.cantidad, linea.unidad))
    );
    const quitar = el(
      'button',
      { class: 'boton-icono linea-lista__quitar', type: 'button', 'aria-label': `Quitar «${linea.nombre}»`, 'data-escribe': true },
      crearMarca('mal')
    );
    const elemento = el('li', { class: 'linea-lista' }, marcar, quitar);
    marcar.addEventListener('click', () => cambiarComprada(linea, elemento, marcar));
    quitar.addEventListener('click', () => quitarLinea(linea, elemento, quitar));
    return elemento;
  }

  // ---------- Tachar, quitar y borrar comprados ----------
  /**
   * Tacho o destacho. Primero el servidor; si va bien, la fila sale de su
   * grupo y entra en el otro.
   * @param {LineaLista} linea
   * @param {HTMLLIElement} elemento
   * @param {HTMLButtonElement} boton
   */
  async function cambiarComprada(linea, elemento, boton) {
    const comprada = !linea.compradaEn;
    avisos.replaceChildren();
    boton.disabled = true;
    try {
      const { linea: nueva } = await api.patch(`/lista/${linea.id}`, { comprada });
      await salir(elemento);
      // Al destachar, si ya había otra igual sin tachar, el servidor borra
      // esta y me devuelve la otra (D-54): quito las dos y pongo la nueva.
      lineas = lineas.filter((otra) => otra.id !== linea.id && otra.id !== nueva.id);
      lineas = ordenar([nueva, ...lineas]);
      pintar(nueva.id);
      anuncio.textContent = comprada ? `«${nueva.nombre}» comprado.` : `«${nueva.nombre}» vuelve a la lista.`;
    } catch (error) {
      boton.disabled = false;
      avisos.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido cambiar. Inténtalo de nuevo.') }));
      // Si ya no existe (otra persona la ha borrado), recargo para verlo.
      if (error.codigo === 'NO_EXISTE') cargar();
    }
  }

  /**
   * Quito una línea sin preguntar: se puede volver a apuntar (P-30).
   * @param {LineaLista} linea
   * @param {HTMLLIElement} elemento
   * @param {HTMLButtonElement} boton
   */
  async function quitarLinea(linea, elemento, boton) {
    avisos.replaceChildren();
    boton.disabled = true;
    try {
      await api.borrar(`/lista/${linea.id}`);
    } catch (error) {
      // Si ya no estaba, me da igual: el resultado es el mismo.
      if (error.codigo !== 'NO_EXISTE') {
        boton.disabled = false;
        avisos.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido quitar. Inténtalo de nuevo.') }));
        return;
      }
    }
    await salir(elemento);
    lineas = lineas.filter((otra) => otra.id !== linea.id);
    pintar();
    anuncio.textContent = `«${linea.nombre}» quitado de la lista.`;
  }

  /** "Borrar comprados": sin confirmar, son cosas ya compradas (P-30). */
  async function borrarComprados(evento) {
    const boton = evento.currentTarget;
    avisos.replaceChildren();
    ponerCargando(boton, true, 'Borrando…');
    try {
      await api.borrar('/lista/comprados');
      lineas = lineas.filter((linea) => !linea.compradaEn);
      pintar();
      anuncio.textContent = 'Comprados borrados.';
    } catch (error) {
      ponerCargando(boton, false);
      avisos.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se han podido borrar. Inténtalo de nuevo.') }));
    }
  }

  /**
   * El mismo orden que GET /api/lista: por comprar (lo último apuntado
   * arriba) y después comprado (lo último tachado arriba).
   * @param {LineaLista[]} lista
   */
  function ordenar(lista) {
    const fecha = (texto) => new Date(texto).getTime();
    return lista.toSorted((a, b) => {
      if (Boolean(a.compradaEn) !== Boolean(b.compradaEn)) return a.compradaEn ? 1 : -1;
      if (a.compradaEn) return fecha(b.compradaEn) - fecha(a.compradaEn);
      return fecha(b.creadaEn) - fecha(a.creadaEn) || b.id - a.id;
    });
  }

  // Al volver a la app (otra persona puede haber comprado o gastado algo),
  // recargo. Cuando esta pantalla ya no está, el escuchador se quita solo.
  function alVolver() {
    if (!zona.isConnected) {
      document.removeEventListener('visibilitychange', alVolver);
      return;
    }
    if (document.visibilityState === 'visible') cargar();
  }
  document.addEventListener('visibilitychange', alVolver);

  cargar();

  return {
    titulo: 'Lista',
    contenido: el('div', { class: 'lista-compra' }, formulario, avisos, anuncio, zona),
  };
}
