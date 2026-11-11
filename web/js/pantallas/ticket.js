/**
 * @file Pantalla Escanear ticket (P-08, DISENO_UI §7.1). La primera vez, el
 * aviso de privacidad (SEC-04); luego, cuántas consultas de IA me quedan,
 * elegir la foto o el PDF y mandarlo a Claude. Después, revisar cada línea
 * (corregir, eliminar o confirmar) y guardarlo todo con /api/productos/lote.
 */
import { api, mensajeDeError } from '../api.js';
import { ErrorArchivo, prepararArchivoTicket } from '../archivoTicket.js';
import { crearLinea, crearLineaTicket, problemaLinea } from '../componentes/lineaTicket.js';
import { crearAviso, crearCarga, crearVacio, ponerCargando } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';

/** @returns {import('../router.js').Vista} */
export function pantallaTicket() {
  const zona = el('div', { class: 'ticket' });
  // { usadas, limite }, de /api/yo.
  let cuota = null;
  // El archivo ya preparado: si falla la lectura, reintento sin repetir la foto.
  let preparado = null;

  /** @type {import('../componentes/lineaTicket.js').Linea[]} */
  let lineas = [];
  // Clave de idempotencia (P-06): una por ticket leído. Si reintento, es la MISMA.
  let clave = null;
  const avisoGuardado = el('div');

  // Un solo <input> para foto, galería y PDF: iOS enseña su propio menú (R-08).
  const entrada = el('input', { type: 'file', accept: 'image/*,application/pdf', hidden: true, onchange: alElegirArchivo });
  // Los tres botones del pie (aceptar, elegir y guardar); solo se ve uno cada vez.
  const aceptar = el(
    'button',
    { class: 'boton boton--primario', type: 'button', hidden: true, 'data-escribe': true, onclick: aceptarAviso },
    'Entendido, continuar'
  );
  const elegir = el(
    'button',
    { class: 'boton boton--primario', type: 'button', hidden: true, 'data-escribe': true, onclick: () => entrada.click() },
    'Elegir el ticket'
  );
  const guardar = el(
    'button',
    { class: 'boton boton--primario', type: 'button', hidden: true, 'data-escribe': true, onclick: guardarTicket },
    'Guardar'
  );

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando…'));
    try {
      const yo = await api.get('/yo');
      cuota = yo.cuotaIa;
      if (yo.avisoIaAceptado) mostrarElegir();
      else mostrarAvisoPrivacidad();
    } catch (error) {
      zona.replaceChildren(
        crearAviso({
          mensaje: mensajeDeError(error, 'No se ha podido abrir el escáner.'),
          accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
        })
      );
    }
  }

  /** La primera vez (SEC-04): sin aceptar, no hay botón para elegir. */
  function mostrarAvisoPrivacidad() {
    aceptar.hidden = false;
    zona.replaceChildren(
      el(
        'section',
        { class: 'tarjeta', 'aria-labelledby': 'titulo-aviso-ia' },
        el('h2', { id: 'titulo-aviso-ia' }, 'Antes de escanear'),
        el('p', {}, 'La foto o el PDF del ticket se envía a Anthropic (Claude) para leer los productos. No la guardamos.'),
        el('p', {}, 'Te recomendamos recortar la foto para que solo salga la lista de productos.'),
        el('a', { href: '/privacidad' }, 'Política de privacidad')
      )
    );
  }

  async function aceptarAviso() {
    ponerCargando(aceptar, true, 'Un momento…');
    try {
      await api.post('/ia/aviso-aceptado');
      ponerCargando(aceptar, false);
      aceptar.hidden = true;
      mostrarElegir();
    } catch (error) {
      ponerCargando(aceptar, false);
      zona.append(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido guardar. Inténtalo de nuevo.') }));
    }
  }

  /**
   * Elegir el archivo, con las consultas que me quedan hoy.
   * @param {Error} [error] Si vengo de un intento que ha fallado.
   */
  function mostrarElegir(error) {
    const quedan = Math.max(0, cuota.limite - cuota.usadas);
    elegir.hidden = false;
    elegir.disabled = quedan === 0;
      zona.replaceChildren(
    error ? crearAvisoError(error) : '',
      el('p', {}, 'Haz una foto al ticket o sube el ticket digital (PDF o imagen). Claude leerá los productos y podrás revisarlos antes de guardarlos.'),
      el(
        'p',
        { class: 'tono--tenue' },
        quedan === 0
          ? `Has usado tus ${cuota.limite} consultas de hoy. Vuelve mañana.`
          : `Te quedan ${quedan} de ${cuota.limite} consultas de IA hoy.`
      ),
      entrada
    );
  }

  /**
   * "No se ha podido leer el ticket" con el motivo, y Reintentar si tiene sentido.
   * @param {Error} error Un ErrorArchivo (antes de enviar) o un ErrorApi (del servidor).
   */
  function crearAvisoError(error) {
    const puedeReintentar = !(error instanceof ErrorArchivo) && error.reintentable && preparado;
    return crearAviso({
      mensaje: `No se ha podido leer el ticket. ${error.message}`,
      accion:
        puedeReintentar &&
        el(
          'button',
          { class: 'boton boton--secundario boton--ajustado', type: 'button', 'data-escribe': true, onclick: () => leer(preparado) },
          'Reintentar con el mismo ticket'
        ),
    });
  }

  async function alElegirArchivo() {
    const archivo = entrada.files[0];
    // Lo vacío para que elegir OTRA VEZ el mismo archivo también lance "change".
    entrada.value = '';
    if (!archivo) return;
    preparado = null;
    try {
      preparado = await prepararArchivoTicket(archivo);
    } catch (error) {
      mostrarElegir(error);
      return;
    }
    leer(preparado);
  }

  /** @param {{ base64: string, mimeType: string }} archivo */
  async function leer(archivo) {
    ponerCargando(elegir, true, 'Leyendo…');
    zona.replaceChildren(crearCarga('Leyendo el ticket…'), el('p', { class: 'tono--tenue' }, 'Puede tardar unos segundos.'));
    try {
      const { productos } = await api.post('/ia/ticket', { archivo });
      ponerCargando(elegir, false);
      mostrarRevision(productos);
    } catch (error) {
      ponerCargando(elegir, false);
      await actualizarCuota();
      mostrarElegir(error);
    }
  }

  /** Tras un fallo, pregunto cuántas me quedan: unos errores gastan consulta y otros no (D-47). */
  async function actualizarCuota() {
    try {
      cuota = (await api.get('/yo')).cuotaIa;
    } catch {
      // Sin red: me quedo con la que tenía.
    }
  }

  /** @param {{ nombre: string, cantidad: number, unidad: string, ubicacionesPosibles: string[] }[]} productos */
  function mostrarRevision(productos) {
    lineas = productos.map(crearLinea);
    clave = crypto.randomUUID();
    elegir.hidden = true;
    guardar.hidden = false;
    const articulos = lineas.map((linea, numero) => {
      const articulo = crearLineaTicket({
        linea,
        numero,
        alCambiar: actualizarPie,
        alEliminar: () => {
          lineas = lineas.filter((otra) => otra !== linea);
          articulo.remove();
          actualizarPie();
        },
      });
      return articulo;
    });
    avisoGuardado.replaceChildren();
    zona.replaceChildren(
      avisoGuardado,
      el('p', {}, 'Revisa cada producto: corrígelo, elimínalo o confírmalo. No se guarda nada hasta que pulses «Guardar».'),
      el('div', { class: 'lista-ticket' }, articulos)
    );
    actualizarPie();
  }

  /** "Faltan N por confirmar" (deshabilitado) o "Guardar N productos". */
  function actualizarPie() {
    if (lineas.length === 0) {
      mostrarVacio();
      return;
    }
    const faltan = lineas.filter((linea) => !linea.confirmada).length;
    guardar.disabled = faltan > 0;
    if (faltan > 0) guardar.textContent = `Faltan ${faltan} por confirmar`;
    else guardar.textContent = lineas.length === 1 ? 'Guardar 1 producto' : `Guardar ${lineas.length} productos`;
  }

  function mostrarVacio() {
    guardar.hidden = true;
    zona.replaceChildren(
      crearVacio({
        titulo: 'No queda ningún producto',
        descripcion: 'Has eliminado todas las líneas del ticket.',
        accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Escanear otro ticket'),
      })
    );
  }

  /** Todo o nada (P-06): si falla, con la MISMA clave el reintento no duplica nada. */
  async function guardarTicket() {
    avisoGuardado.replaceChildren();
    const productos = lineas.map((linea) => problemaLinea(linea).datos);
    ponerCargando(guardar, true);
    try {
      const { creados } = await api.post('/productos/lote', { clave, productos });
      navegar('/', { reemplazar: true, mensaje: `Ticket guardado. Se han añadido ${creados} productos al inventario.` });
    } catch (error) {
      ponerCargando(guardar, false);
      actualizarPie();
      avisoGuardado.replaceChildren(
        crearAviso({ mensaje: `No se ha guardado nada. ${mensajeDeError(error, 'Ha fallado el guardado. Inténtalo de nuevo.')}` })
      );
      avisoGuardado.scrollIntoView({ block: 'nearest' });
    }
  }

  cargar();

  return { titulo: 'Escanear ticket', atras: '/', contenido: zona, pie: [aceptar, elegir, guardar] };
}