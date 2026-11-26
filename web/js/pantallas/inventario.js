/**
 * @file Pantalla Inventario (P-04): lo que hay en casa (index.tsx de la app
 * Expo). Desde la fase 14 (D-61, con el cambio del autor del 2026-11-26), dos
 * vistas:
 * - "Todo · N": lo último que ha entrado, arriba. Con el icono de filtrar se
 *   eligen una o varias ubicaciones (Nevera, Despensa, Congelador).
 * - "Usar pronto · N": lo caducado y lo que caduca pronto de toda la casa,
 *   lo más urgente primero.
 *
 * La vista y el filtro van en la URL (/?filtro=pronto,
 * /?ubicacion=nevera&ubicacion=congelador): así, al volver de un producto con
 * "Atrás", sigues en la misma vista.
 */
import { usarPronto } from '/compartido/cocina.js';
import { UBICACIONES } from '/compartido/constantes.js';
import { avisoCaducidad, formatearCantidad } from '/compartido/formato.js';
import { ETIQUETAS_UBICACION } from '/compartido/ubicaciones.js';
import { mensajeDeError } from '../api.js';
import { crearIcono } from '../componentes/iconos.js';
import { crearMenuFiltro } from '../componentes/menuFiltro.js';
import { conMarca, crearAviso, crearCarga, crearFila, crearMarca, crearSelector, crearSinConexion, crearVacio } from '../componentes/ui/index.js';
import { mostrarTickGuardado } from '../componentes/tickGuardado.js';
import { el } from '../dom.js';
import { navegar, tomarMensaje } from '../router.js';
import { leerUbicaciones, recordarVistaInventario, urlInventario } from '../vistaInventario.js';
import { cargarInventarioCompleto } from './receta.js';

/** Nombres que van en la pregunta de "Cocina con lo que tengo" (D-61). */
const MAX_NOMBRES_PREGUNTA = 5;

/** "espinacas, tomates y pollo": une una lista como se dice en español. */
const listaEnEspanol = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' });

/**
 * Lo último que ha entrado, primero (D-61). fechaAlta llega como texto ISO,
 * que se ordena bien como texto; si dos entraron a la vez (un ticket), el id
 * más alto es el último.
 * @param {{ id: number, fechaAlta: string }} x
 * @param {{ id: number, fechaAlta: string }} y
 */
function porAlta(x, y) {
  return y.fechaAlta.localeCompare(x.fechaAlta) || y.id - x.id;
}

/**
 * La pregunta que dejo escrita en el Ayudante: "Tengo que gastar pronto:
 * espinacas, tomates cherry y pechuga de pollo. ¿Qué puedo cocinar?". Sin
 * repetir nombres y con los 5 primeros como mucho (ya vienen por urgencia).
 * @param {import('/compartido/cocina.js').CosaPronto[]} cosas
 * @returns {string}
 */
function preguntaCocinar(cosas) {
  const nombres = cosas.map((cosa) => (cosa.tipo === 'producto' ? cosa.producto.nombre : cosa.tupper.nombre).toLocaleLowerCase('es'));
  const sinRepetir = [...new Set(nombres)].slice(0, MAX_NOMBRES_PREGUNTA);
  return `Tengo que gastar pronto: ${listaEnEspanol.format(sinRepetir)}. ¿Qué puedo cocinar?`;
}

/**
 * "Hay 3 cosas que caducan pronto" / "Hay 1 cosa que caduca pronto".
 * @param {number} cuantas
 */
function textoPronto(cuantas) {
  return cuantas === 1 ? 'Hay 1 cosa que caduca pronto' : `Hay ${cuantas} cosas que caducan pronto`;
}

/**
 * @param {{ consulta: URLSearchParams }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaInventario({ consulta }) {
  // "Producto añadido.", "Cambios guardados."… si vengo de guardar algo.
  const mensaje = tomarMensaje();
  // D-58: si trae tick, no hay banda; lo enseño cuando la lista ya esté pintada.
  let tickPendiente = mensaje?.tick ? mensaje : null;
  let enPantalla = false;
  let cargado = false;
  // Lo guardo en una constante para poder quitarlo al cambiar de vista.
  // Si llega como { texto, tipo: 'aviso' } (tupper guardado sin aviso), va en amarillo y sin ✓.
  const avisoMensaje =
    mensaje &&
    !tickPendiente &&
    (typeof mensaje === 'string'
      ? crearAviso({ tipo: 'exito', mensaje: `✓ ${mensaje}` })
      : crearAviso({ tipo: mensaje.tipo, mensaje: mensaje.texto }));
  // Lo que viene en la URL lo valido: lo que no existe, no cuenta (DISENO_UI §5.2).
  /** @type {'todo' | 'pronto'} */
  let filtro = consulta.get('filtro') === 'pronto' ? 'pronto' : 'todo';
  let ubicaciones = leerUbicaciones(consulta);
  recordarVistaInventario(ubicaciones, filtro);

  /** Todo el inventario de la casa, tal como llegó. Al cambiar de vista no lo vuelvo a pedir. */
  let datos = null;
  const zona = el('div', { class: 'inventario__zona' });
  const botonNuevo = el('a', { class: 'boton boton--primario' }, conMarca('+ Producto'));
  const botonTupper = el('a', { class: 'boton boton--secundario' }, conMarca('+ Tupper'));
  // Las cuentas de los chips ("· 12"): las relleno al pintar.
  const cuentaTodo = el('span', { class: 'chip__cuenta' });
  const cuentaPronto = el('span', { class: 'chip__cuenta' });
  const menuFiltro = crearMenuFiltro({
    leyenda: 'Filtrar por ubicación',
    opciones: UBICACIONES.map((valor) => ({ valor, etiqueta: ETIQUETAS_UBICACION[valor] })),
    elegidas: ubicaciones,
    alCambiar: (elegidas) => {
      ubicaciones = elegidas;
      cambiarVista();
    },
  });
  // Debajo de los chips, lo que está filtrado ("Nevera ✗"), para quitarlo de un toque.
  const elegidas = el('div', { class: 'inventario__elegidas' });
  // Igual que en el router: si recargo mientras carga, la respuesta vieja no
  // pinta encima de la nueva.
  let turno = 0;

  /**
   * Enlace a "Nuevo producto" o "Nuevo tupper": con una sola ubicación en el
   * filtro, ya elegida; si no, el formulario la pregunta.
   * @param {'producto' | 'tupper'} que
   */
  const enlaceNuevo = (que) =>
    filtro === 'todo' && ubicaciones.length === 1 ? `/${que}/nuevo?ubicacion=${ubicaciones[0]}` : `/${que}/nuevo`;

  async function cargar() {
    const miTurno = ++turno;
    zona.replaceChildren(crearCarga('Cargando inventario…'));
    try {
      const inventario = await cargarInventarioCompleto();
      if (miTurno !== turno) return;
      datos = inventario;
      pintar();
    } catch (error) {
      if (miTurno !== turno) return;
      zona.replaceChildren(
        error.codigo === 'SIN_CONEXION'
          ? crearSinConexion(cargar)
          : crearAviso({
              mensaje: mensajeDeError(error, 'No se ha podido cargar el inventario.'),
              accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
            })
      );
    }
    // Con la lista pintada (o con el error: el guardado ya ha ido bien
    // aunque ahora falle la carga), ya puede salir el tick.
    if (miTurno === turno) {
      cargado = true;
      intentarTick();
    }
  }

  /** Pinto la vista elegida con lo que ya tengo en `datos`. */
  function pintar() {
    botonNuevo.setAttribute('href', enlaceNuevo('producto'));
    botonTupper.setAttribute('href', enlaceNuevo('tupper'));
    // El filtro de ubicación solo es de "Todo".
    menuFiltro.elemento.hidden = filtro !== 'todo';
    pintarElegidas();
    if (!datos) return;

    const filtrar = (cosa) => ubicaciones.length === 0 || ubicaciones.includes(cosa.ubicacion);
    const productos = datos.productos.filter(filtrar).sort(porAlta);
    const tuppers = datos.tuppers.filter(filtrar).sort(porAlta);
    // "Usar pronto" es siempre de toda la casa.
    const pronto = usarPronto(datos.productos, datos.tuppers);
    ponerCuenta(cuentaTodo, productos.length + tuppers.length);
    ponerCuenta(cuentaPronto, pronto.length);
    const lista = filtro === 'pronto' ? crearVistaPronto(pronto) : crearVistaTodo(productos, tuppers);
    // La tarjeta, solo si hay algo que usar pronto (D-61).
    zona.replaceChildren(lista, ...(pronto.length > 0 ? [crearTarjetaCocinar(pronto)] : []));
  }

  /** "Nevera ✗ Congelador ✗": un botón por ubicación filtrada, que la quita. */
  function pintarElegidas() {
    elegidas.hidden = filtro !== 'todo' || ubicaciones.length === 0;
    elegidas.replaceChildren(
      ...ubicaciones.map((ubicacion) =>
        el(
          'button',
          {
            class: 'chip chip--quitar',
            type: 'button',
            'aria-label': `Quitar el filtro ${ETIQUETAS_UBICACION[ubicacion]}`,
            onclick: () => {
              ubicaciones = ubicaciones.filter((otra) => otra !== ubicacion);
              menuFiltro.ponerElegidas(ubicaciones);
              cambiarVista();
              // El botón que tenía el foco ya no existe: lo llevo al icono.
              menuFiltro.elemento.querySelector('button').focus();
            },
          },
          ETIQUETAS_UBICACION[ubicacion],
          crearMarca('mal')
        )
      )
    );
  }

  /**
   * " · 12" en un chip. El punto no lo lee el lector ("Usar pronto 3").
   * @param {HTMLElement} cuenta
   * @param {number} numero
   */
  function ponerCuenta(cuenta, numero) {
    cuenta.replaceChildren(' ', el('span', { 'aria-hidden': 'true' }, '·'), ` ${numero}`);
  }

  /**
   * D-58: el tick sale una sola vez y cuando ya ves la lista: con la
   * pantalla puesta (alMostrar, acabada la transición) y la carga terminada.
   */
  function intentarTick() {
    if (!tickPendiente || !enPantalla || !cargado) return;
    mostrarTickGuardado(tickPendiente);
    tickPendiente = null;
  }

  /**
   * "Todo · N": los tuppers arriba y los productos debajo, lo último que ha
   * entrado primero (sin tuppers, la lista sin títulos de sección).
   * @param {any[]} productos
   * @param {any[]} tuppers
   */
  function crearVistaTodo(productos, tuppers) {
    if (productos.length === 0 && tuppers.length === 0) return crearEstadoVacio();
    if (tuppers.length === 0) return crearListaProductos(productos);
    return el(
      'div',
      {},
      crearSeccion('Tuppers', crearListaTuppers(tuppers)),
      crearSeccion('Productos', productos.length > 0 ? crearListaProductos(productos) : crearSinProductos())
    );
  }

  /**
   * "Usar pronto · N": productos y tuppers en una sola lista, lo más urgente
   * primero (usarPronto() ya los ordena por fecha).
   * @param {import('/compartido/cocina.js').CosaPronto[]} cosas
   */
  function crearVistaPronto(cosas) {
    if (cosas.length === 0) {
      return crearVacio({
        titulo: 'Nada caduca pronto',
        descripcion: 'Lo que caduque en 3 días o menos saldrá aquí.',
      });
    }
    return el(
      'ul',
      { class: 'lista' },
      cosas.map((cosa) => (cosa.tipo === 'producto' ? crearFilaProducto(cosa.producto) : crearFilaTupper(cosa.tupper)))
    );
  }

  function crearEstadoVacio() {
    let titulo = 'Inventario vacío';
    if (ubicaciones.length > 1) titulo = 'No hay nada en estas ubicaciones';
    // "Congelador" es masculino: no vale añadir "vacía" a cualquier ubicación.
    else if (ubicaciones[0] === 'congelador') titulo = 'Congelador vacío';
    else if (ubicaciones.length === 1) titulo = `${ETIQUETAS_UBICACION[ubicaciones[0]]} vacía`;
    return crearVacio({
      titulo,
      descripcion: 'Añade lo que tienes a mano con «+ Producto», o lo que te ha sobrado con «+ Tupper».',
      accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: enlaceNuevo('producto') }, 'Añadir producto'),
    });
  }

  /**
   * Una sección con su título (h2), enlazado con aria-labelledby para que el
   * lector diga "Tuppers, región".
   * @param {string} titulo
   * @param {Node} contenido
   */
  function crearSeccion(titulo, contenido) {
    const id = `titulo-${titulo.toLowerCase()}`;
    return el(
      'section',
      { class: 'seccion', 'aria-labelledby': id },
      el('h2', { class: 'titulo-seccion', id }, titulo),
      contenido
    );
  }

  function crearSinProductos() {
    return el('p', { class: 'tono--tenue' }, 'No hay productos en esta ubicación.');
  }

  /**
   * "Nevera" bajo el nombre, salvo cuando el filtro deja una sola ubicación
   * (entonces ya sé dónde está todo).
   * @param {string} deDonde
   */
  function lugar(deDonde) {
    return filtro === 'todo' && ubicaciones.length === 1 ? undefined : ETIQUETAS_UBICACION[deDonde];
  }

  function crearFilaTupper(tupper) {
    const aviso = avisoCaducidad(tupper.fechaLimite);
    return crearFila({
      href: `/tupper/${tupper.id}`,
      titulo: tupper.nombre,
      lugar: lugar(tupper.ubicacion),
      subtitulo: aviso.texto,
      tono: aviso.tono,
      detalle: 'Tupper',
    });
  }

  function crearFilaProducto(producto) {
    const aviso = producto.fechaCaducidad ? avisoCaducidad(producto.fechaCaducidad) : null;
    return crearFila({
      href: `/producto/${producto.id}`,
      titulo: producto.nombre,
      lugar: lugar(producto.ubicacion),
      subtitulo: aviso?.texto,
      tono: aviso?.tono,
      detalle: formatearCantidad(producto.cantidad, producto.unidad),
    });
  }

  function crearListaTuppers(tuppers) {
    return el('ul', { class: 'lista' }, tuppers.map(crearFilaTupper));
  }

  function crearListaProductos(productos) {
    return el('ul', { class: 'lista' }, productos.map(crearFilaProducto));
  }

  /**
   * "Hay 3 cosas que caducan pronto · Cocina con lo que tengo →" (D-61).
   * Abre el Ayudante con la pregunta escrita, pero NO la envía: gastar un
   * mensaje de la cuota lo decide la persona.
   * @param {import('/compartido/cocina.js').CosaPronto[]} pronto
   */
  function crearTarjetaCocinar(pronto) {
    const id = 'titulo-cocinar-pronto';
    return el(
      'section',
      { class: 'tarjeta tarjeta-cocinar', 'aria-labelledby': id },
      el('h2', { class: 'tarjeta-cocinar__titulo', id }, textoPronto(pronto.length)),
      el('p', { class: 'tono--tenue' }, 'Te propongo algo para cocinar con lo que ya tienes.'),
      el(
        'a',
        {
          class: 'tarjeta-cocinar__enlace',
          href: '/ayudante',
          // Lo hago yo (y no el router) para pasarle la pregunta. El router
          // ve defaultPrevented y no hace nada.
          onclick: (evento) => {
            evento.preventDefault();
            navegar('/ayudante', { mensaje: { pregunta: preguntaCocinar(pronto) } });
          },
        },
        'Cocina con lo que tengo',
        crearIcono('adelante')
      )
    );
  }

  // Cambiar de vista o de filtro NO repinta la pantalla entera ni vuelve a
  // pedir el inventario: cambio la URL sin añadir historial y pinto otra vez
  // la lista con lo que ya tengo. Así el foco se queda donde estaba.
  function cambiarVista() {
    // El mensaje ("«Leche» borrado…") era de la vista anterior: lo quito.
    if (avisoMensaje) avisoMensaje.remove();
    recordarVistaInventario(ubicaciones, filtro);
    history.replaceState(history.state, '', urlInventario(ubicaciones, filtro));
    pintar();
  }

  pintar();
  cargar();

  return {
    titulo: 'Inventario',
    contenido: el(
      'div',
      { class: 'inventario' },
      avisoMensaje,
      el(
        'div',
        { class: 'inventario__filtros' },
        crearSelector({
          leyenda: 'Qué enseñar',
          nombre: 'vista',
          leyendaVisible: false,
          opciones: [
            { valor: 'todo', etiqueta: el('span', {}, 'Todo', cuentaTodo) },
            { valor: 'pronto', etiqueta: el('span', {}, 'Usar pronto', cuentaPronto) },
          ],
          seleccionado: filtro,
          alCambiar: (valor) => {
            filtro = valor;
            cambiarVista();
          },
        }),
        menuFiltro.elemento
      ),
      elegidas,
      zona
    ),
    pie: [botonTupper, botonNuevo],
    alMostrar: () => {
      enPantalla = true;
      intentarTick();
    },
  };
}
