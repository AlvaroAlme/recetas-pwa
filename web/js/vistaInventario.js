/**
 * @file La última vista del Inventario: "Todo" o "Usar pronto", y las
 * ubicaciones del filtro de "Todo" (D-61). Así, al guardar, mover o borrar un
 * producto o un tupper, vuelvo a la vista de la que venía y no a otra.
 *
 * Vive en memoria: si recargo la app, se olvida y vuelvo a "Todo" sin
 * filtro, donde lo último que entró sale arriba.
 */
import { UBICACIONES } from '/compartido/constantes.js';

/**
 * @typedef {import('/compartido/constantes.js').Ubicacion} Ubicacion
 * @typedef {'todo' | 'pronto'} FiltroVista
 */

/** @type {{ ubicaciones: Ubicacion[], filtro: FiltroVista } | null} */
let ultima = null;

/**
 * Apunto la vista que estoy viendo. La llama Inventario al abrirse y cada
 * vez que cambio de vista o de filtro.
 * @param {Ubicacion[]} ubicaciones Las del filtro; vacío = todas.
 * @param {FiltroVista} filtro
 */
export function recordarVistaInventario(ubicaciones, filtro) {
  ultima = { ubicaciones: [...ubicaciones], filtro };
}

/**
 * La URL de una vista del Inventario. Lo que es por defecto (Todo, sin
 * filtro) no lo escribo: '/' es Todo, '/?filtro=pronto' es "Usar pronto" y
 * '/?ubicacion=nevera&ubicacion=congelador' es Todo con dos ubicaciones.
 * @param {Ubicacion[]} ubicaciones
 * @param {FiltroVista} filtro
 * @returns {string}
 */
export function urlInventario(ubicaciones, filtro) {
  const consulta = new URLSearchParams();
  for (const ubicacion of ubicaciones) consulta.append('ubicacion', ubicacion);
  if (filtro !== 'todo') consulta.set('filtro', filtro);
  const texto = consulta.toString();
  return texto ? `/?${texto}` : '/';
}

/**
 * Las ubicaciones del filtro que vienen en la URL, sin repetir, sin las que
 * no existen y en el orden de siempre (Nevera, Despensa, Congelador).
 * @param {URLSearchParams} consulta
 * @returns {Ubicacion[]}
 */
export function leerUbicaciones(consulta) {
  const pedidas = consulta.getAll('ubicacion');
  return UBICACIONES.filter((ubicacion) => pedidas.includes(ubicacion));
}

/**
 * A dónde vuelvo tras guardar, mover o borrar algo: a la misma vista. Si el
 * filtro ya no deja ver el producto (lo he movido a otra ubicación), le
 * añado la suya, para verlo donde ha ido.
 * @param {Ubicacion} ubicacionDelProducto
 * @returns {string}
 */
export function urlVuelta(ubicacionDelProducto) {
  if (!ultima) return '/';
  const { ubicaciones, filtro } = ultima;
  const seVe = ubicaciones.length === 0 || ubicaciones.includes(ubicacionDelProducto);
  const conLaSuya = seVe
    ? ubicaciones
    : UBICACIONES.filter((ubicacion) => ubicaciones.includes(ubicacion) || ubicacion === ubicacionDelProducto);
  return urlInventario(conLaSuya, filtro);
}
