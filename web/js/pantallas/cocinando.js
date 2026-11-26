/**
 * @file Modo cocina (P-31, D-61): los pasos de una receta de uno en uno, en
 * letra grande, con "Anterior" y "Siguiente"; el último lleva a "La he
 * cocinado". Los ingredientes, plegados, con las raciones elegidas en la
 * receta (?raciones=4).
 *
 * Mientras está abierto, la pantalla no se apaga (Screen Wake Lock), si el
 * navegador lo deja: en la app instalada del iPhone, desde iOS 18.4. iOS la
 * suelta cuando la app deja de verse, así que la vuelvo a pedir al volver.
 * El paso no va en la URL: Atrás vuelve a la receta.
 */
import { escalarIngredientes } from '/compartido/cocina.js';
import { MAX_RACIONES, MIN_RACIONES } from '/compartido/constantes.js';
import { formatearCantidad } from '/compartido/formato.js';
import { api, mensajeDeError } from '../api.js';
import { crearAviso, crearCarga, crearSinConexion, crearVacio } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { entrar } from '../movimiento.js';
import { ponerTitulo } from '../router.js';

/** Un entero positivo, como el id de la ruta o las raciones de la URL. */
const ES_ENTERO = /^[1-9]\d*$/;

/**
 * @param {{ parametros: Record<string, string>, consulta: URLSearchParams }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaCocinando({ parametros, consulta }) {
  // El router ya ha comprobado que el id es un entero positivo.
  const id = Number(parametros.id);
  // ?raciones=4 si las he cambiado en la receta. Si no vale, como si no viniera.
  const textoRaciones = consulta.get('raciones') ?? '';
  const pedidas = ES_ENTERO.test(textoRaciones) ? Number(textoRaciones) : null;
  const raciones = pedidas !== null && pedidas >= MIN_RACIONES && pedidas <= MAX_RACIONES ? pedidas : null;

  const zona = el('div', { class: 'cocinando' });
  const ranura = el('div', { class: 'pie__ranura' });
  // "La pantalla no se apagará…": solo sale si de verdad la tengo encendida.
  const avisoPantalla = el('p', { class: 'cocinando__pantalla tono--tenue', hidden: true }, 'La pantalla no se apagará mientras cocinas.');

  /** @type {string[]} */
  let pasos = [];
  let actual = 0;
  /** El enlace a "La he cocinado", con las raciones si las he cambiado. */
  const urlCocinado = raciones ? `/cocinar?receta=${id}&raciones=${raciones}` : `/cocinar?receta=${id}`;
  /** @type {WakeLockSentinel | null} */
  let bloqueo = null;
  // false en cuanto otra pantalla ocupa mi sitio: entonces ya no pido nada.
  let puesta = true;

  const textoPaso = el('div', { class: 'cocinando__paso', tabindex: '-1' });
  const botonAnterior = el('button', { class: 'boton boton--secundario', type: 'button', onclick: () => irA(actual - 1) }, 'Anterior');
  const botonSiguiente = el('button', { class: 'boton boton--primario', type: 'button', onclick: () => irA(actual + 1) }, 'Siguiente');
  const enlaceCocinado = el('a', { class: 'boton boton--primario', href: urlCocinado }, 'La he cocinado');

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando la receta…'));
    let receta;
    try {
      ({ receta } = await api.get(`/recetas/${id}`));
    } catch (error) {
      zona.replaceChildren(error.codigo === 'NO_EXISTE' ? crearNoExiste() : crearError(error));
      return;
    }
    // El nombre va a la cabecera. Lo pongo también en la vista: si el router
    // todavía no la ha puesto, usará este título y no "Modo cocina".
    vista.titulo = receta.nombre;
    ponerTitulo(receta.nombre);
    pasos = receta.pasos;
    // Las cantidades, para las raciones que elegí en la receta.
    const escalan = raciones !== null && receta.raciones !== null && raciones !== receta.raciones;
    const ingredientes = escalan ? escalarIngredientes(receta.ingredientes, receta.raciones, raciones) : receta.ingredientes;
    zona.replaceChildren(crearIngredientes(ingredientes, escalan ? raciones : receta.raciones), textoPaso, avisoPantalla);
    irA(0, { foco: false });
    pedirPantallaEncendida();
  }

  /**
   * Enseño el paso `numero` (de 0 a pasos.length - 1). Al cambiar, el foco va
   * al paso nuevo, así el lector lee "Paso 2 de 5" y su texto.
   * @param {number} numero
   * @param {{ foco?: boolean }} [opciones]
   */
  function irA(numero, { foco = true } = {}) {
    if (numero < 0 || numero >= pasos.length) return;
    actual = numero;
    textoPaso.replaceChildren(
      el('p', { class: 'cocinando__contador tono--tenue' }, `Paso ${actual + 1} de ${pasos.length}`),
      entrar(el('p', { class: 'cocinando__texto' }, pasos[actual]))
    );
    const ultimo = actual === pasos.length - 1;
    // En el primero no hay "Anterior"; en el último, "Siguiente" pasa a ser "La he cocinado".
    ranura.replaceChildren(...(actual > 0 ? [botonAnterior] : []), ultimo ? enlaceCocinado : botonSiguiente);
    if (foco) textoPaso.focus();
  }

  /**
   * Los ingredientes, plegados: al cocinar se miran de vez en cuando.
   * @param {import('/compartido/validacion.js').DatosIngrediente[]} ingredientes
   * @param {number | null} paraCuantos
   */
  function crearIngredientes(ingredientes, paraCuantos) {
    let resumen = 'Ingredientes';
    if (paraCuantos === 1) resumen = 'Ingredientes (1 ración)';
    else if (paraCuantos) resumen = `Ingredientes (${paraCuantos} raciones)`;
    return el(
      'details',
      { class: 'cocinando__ingredientes' },
      el('summary', {}, resumen),
      el(
        'ul',
        {},
        ingredientes.map((ingrediente) => el('li', {}, `${ingrediente.nombre} · ${formatearCantidad(ingrediente.cantidad, ingrediente.unidad)}`))
      )
    );
  }

  /** Pido que la pantalla no se apague. Si no se puede, no pasa nada. */
  async function pedirPantallaEncendida() {
    if (!('wakeLock' in navigator) || !puesta || document.visibilityState !== 'visible') return;
    if (bloqueo && !bloqueo.released) return;
    try {
      bloqueo = await navigator.wakeLock.request('screen');
      // Si mientras esperaba me he ido a otra pantalla, la suelto enseguida.
      if (!puesta) {
        bloqueo.release();
        return;
      }
      avisoPantalla.hidden = false;
      bloqueo.addEventListener('release', () => {
        avisoPantalla.hidden = true;
      });
    } catch {
      // Sin permiso, con poca batería o el navegador no quiere: sigo sin ella.
    }
  }

  /** iOS suelta la pantalla encendida al salir de la app: al volver, la pido otra vez. */
  function alCambiarVisibilidad() {
    if (document.visibilityState === 'visible') pedirPantallaEncendida();
  }
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  function crearNoExiste() {
    return crearVacio({
      titulo: 'Esta receta ya no existe',
      descripcion: 'Puede que alguien de tu casa la haya borrado.',
      accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/recetas' }, 'Volver a las recetas'),
    });
  }

  /** @param {import('../api.js').ErrorApi} error */
  function crearError(error) {
    if (error.codigo === 'SIN_CONEXION') return crearSinConexion(cargar);
    return crearAviso({
      mensaje: mensajeDeError(error, 'No se ha podido abrir la receta.'),
      accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
    });
  }

  /** @type {import('../router.js').Vista} */
  const vista = {
    titulo: 'Modo cocina',
    contenido: zona,
    pie: [ranura],
    atras: `/receta/${id}`,
    alMostrar: pedirPantallaEncendida,
    // Al irme, suelto la pantalla encendida y dejo de escuchar.
    alSalir: () => {
      puesta = false;
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      bloqueo?.release();
      bloqueo = null;
    },
  };
  cargar();
  return vista;
}
