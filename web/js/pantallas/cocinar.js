/**
 * @file Pantalla La he cocinado (P-12, DISENO_UI §7.3): una FilaCocinar por
 * ingrediente con lo que se va a descontar, y POST /api/cocinar. Todo o nada:
 * si alguien de mi casa ha gastado algo mientras tanto, el servidor da 409 y
 * no descuenta nada; recargo el inventario y mantengo lo que ya había decidido.
 * Idempotente (P-06): una clave por visita; si reintento, la MISMA.
 */
import { api, mensajeDeError } from '../api.js';
import { crearEstadoFila, crearFilaCocinar, descuentoDeFila, problemaFila } from '../componentes/filaCocinar.js';
import { crearAviso, crearCarga, crearSinConexion, crearVacio, ponerCargando } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';
import { cargarInventarioCompleto } from './receta.js';

/** El id de la URL (?receta=3) tiene que ser un entero positivo, como en el servidor. */
const ES_ID = /^[1-9]\d*$/;

/**
 * @param {{ consulta: URLSearchParams }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaCocinar({ consulta }) {
  const texto = consulta.get('receta') ?? '';
  if (!ES_ID.test(texto)) {
    return { titulo: 'La he cocinado', contenido: crearNoDisponible(), atras: '/recetas' };
  }
  const id = Number(texto);
  // Una clave por visita: si el primer intento llegó a guardarse, el reintento no descuenta dos veces.
  const clave = crypto.randomUUID();

  const zona = el('div');
  // El botón no existe hasta tener la receta: le guardo el sitio en el pie.
  const ranuraBoton = el('div', { class: 'pie__ranura' });
  const boton = el('button', { class: 'boton boton--primario', type: 'button', 'data-escribe': true, onclick: descontar });
  const avisoGuardado = el('div');
  /** @type {import('../componentes/filaCocinar.js').FilaCocinar[]} */
  let filas = [];

  /**
   * @param {import('../componentes/filaCocinar.js').FilaCocinar[]} [anteriores] Las
   *   filas de antes de un 409: mantengo lo decidido si sigue valiendo.
   */
  async function cargar(anteriores) {
    zona.replaceChildren(crearCarga('Preparando el descuento…'));
    let receta;
    let inventario;
    try {
      [{ receta }, inventario] = await Promise.all([api.get(`/recetas/${id}`), cargarInventarioCompleto()]);
    } catch (error) {
      zona.replaceChildren(error.codigo === 'NO_EXISTE' ? crearNoDisponible() : crearError(error));
      return;
    }
    filas = receta.ingredientes.map((ingrediente, i) => {
      const fila = crearEstadoFila(ingrediente, inventario.productos, inventario.tuppers);
      const antes = anteriores?.[i];
      if (antes) {
        fila.noDescontar = antes.noDescontar;
        fila.consumirTupper = fila.tupper ? antes.consumirTupper : false;
        // Si el producto que había elegido sigue en casa, lo dejo, con lo que había escrito.
        if (fila.candidatos.some((producto) => producto.id === antes.productoId)) {
          fila.productoId = antes.productoId;
          fila.cantidad = antes.cantidad;
        }
      }
      return fila;
    });

    zona.replaceChildren(
      avisoGuardado,
      el('p', { class: 'cocinar__receta' }, receta.nombre),
      el('p', { class: 'tono--tenue' }, 'Revisa lo que se va a descontar de tu inventario.'),
      el(
        'div',
        { class: 'cocinar__filas' },
        filas.map((fila, numero) => crearFilaCocinar({ fila, numero, alCambiar: actualizarPie }))
      )
    );
    ranuraBoton.replaceChildren(boton);
    actualizarPie();
  }

  /** "Revisa N ingredientes" (deshabilitado), "No hay nada que descontar" o "Descontar del inventario". */
  function actualizarPie() {
    const revisar = filas.filter((fila) => problemaFila(fila)).length;
    const hayAlgo = filas.some((fila) => descuentoDeFila(fila) || (fila.tupper && fila.consumirTupper && !fila.noDescontar));
    boton.disabled = revisar > 0 || !hayAlgo;
    if (revisar === 1) boton.textContent = 'Revisa 1 ingrediente';
    else if (revisar > 1) boton.textContent = `Revisa ${revisar} ingredientes`;
    else if (!hayAlgo) boton.textContent = 'No hay nada que descontar';
    else boton.textContent = 'Descontar del inventario';
  }

  async function descontar() {
    avisoGuardado.replaceChildren();
    const descuentos = filas.map(descuentoDeFila).filter(Boolean);
    const tuppersConsumidos = filas
      .filter((fila) => fila.tupper && fila.consumirTupper && !fila.noDescontar)
      .map((fila) => fila.tupper.id);

    ponerCargando(boton, true, 'Actualizando…');
    try {
      const { agotados } = await api.post('/cocinar', { clave, descuentos, tuppersConsumidos });
      const mensaje =
        agotados.length > 0
          ? `¡Que aproveche! Inventario actualizado. Se han agotado: ${agotados.join(', ')}.`
          : '¡Que aproveche! Inventario actualizado.';
      // Reemplazar: así "Atrás" desde la receta no vuelve a esta pantalla ya hecha.
      navegar(`/receta/${id}`, { reemplazar: true, mensaje });
    } catch (error) {
      ponerCargando(boton, false);
      if (error.codigo === 'INVENTARIO_CAMBIADO') {
        // Nada se ha descontado (ROLLBACK). Recargo y mantengo lo decidido.
        await cargar(filas);
        avisoGuardado.replaceChildren(
          crearAviso({ tipo: 'aviso', mensaje: 'Alguien de tu casa ha cambiado el inventario. Revisa las cantidades.' })
        );
      } else {
        actualizarPie();
        avisoGuardado.replaceChildren(
          crearAviso({ mensaje: `No se ha descontado nada. ${mensajeDeError(error, 'Ha fallado la actualización del inventario. Inténtalo de nuevo.')}` })
        );
      }
      avisoGuardado.scrollIntoView({ block: 'nearest' });
    }
  }

  /** @param {import('../api.js').ErrorApi} error */
  function crearError(error) {
    if (error.codigo === 'SIN_CONEXION') return crearSinConexion(() => cargar());
    return crearAviso({
      mensaje: mensajeDeError(error, 'No se ha podido preparar el descuento.'),
      accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: () => cargar() }, 'Reintentar'),
    });
  }

  cargar();
  return { titulo: 'La he cocinado', contenido: zona, pie: [ranuraBoton], atras: `/receta/${id}` };
}

/** "Esta receta ya no está disponible": la URL no vale o la receta se ha borrado. */
function crearNoDisponible() {
  return crearVacio({
    titulo: 'Esta receta ya no está disponible',
    descripcion: 'Puede que alguien de tu casa la haya borrado.',
    accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/recetas' }, 'Volver a las recetas'),
  });
}
