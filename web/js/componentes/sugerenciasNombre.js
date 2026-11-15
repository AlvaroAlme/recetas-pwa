/**
 * @file Sugerencias para el nombre de un alimento (D-42): primero lo que ya
 * ha tenido mi casa (servidor) y luego la lista fija, sin repetir nombres.
 * Lo usan el formulario de producto y las filas de ingredientes de una receta.
 */
import { buscarAlimentos } from '/compartido/sugerencias.js';
import { normalizar } from '/compartido/texto.js';
import { ETIQUETAS_UBICACION } from '/compartido/ubicaciones.js';

/**
 * Si el servidor falla (sin red…), solo la lista fija.
 * @param {string} texto
 * @param {(texto: string) => Promise<{ nombre: string, unidad: string, ubicacion: string }[]>} [buscarHistorial]
 * @returns {Promise<import('./ui/index.js').Sugerencia[]>}
 */
export async function sugerirNombres(texto, buscarHistorial) {
  if (normalizar(texto).length < 2) return [];
  let historial = [];
  try {
    historial = (await buscarHistorial?.(texto)) ?? [];
  } catch {
    // Sin historial: sigo con la lista fija.
  }
  const vistos = new Set(historial.map((producto) => normalizar(producto.nombre)));
  const deLaCasa = historial.map((producto) => ({
    texto: producto.nombre,
    detalle: `${producto.unidad} · ${ETIQUETAS_UBICACION[producto.ubicacion]}`,
    datos: producto,
  }));
  const comunes = buscarAlimentos(texto)
    .filter((alimento) => !vistos.has(normalizar(alimento)))
    .map((alimento) => ({ texto: alimento }));
  return [...deLaCasa, ...comunes].slice(0, 8);
}