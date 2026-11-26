/**
 * @file "Qué tengo y qué me falta" de una receta, y cuánto descontar al
 * cocinar (lib/cocina.ts de la app Expo, sin la parte de la base de datos).
 * Lo usan el navegador (detalle de la receta, "La he cocinado") y el
 * servidor (comprobar los descuentos de /api/cocinar).
 */
import { BASICOS_DESPENSA, DIAS_USAR_PRONTO } from './constantes.js';
import { diasHasta } from './fechas.js';
import { normalizar } from './texto.js';

/**
 * @typedef {import('./validacion.js').DatosIngrediente} Ingrediente
 * @typedef {{ id: number, nombre: string, cantidad: number, unidad: string, fechaCaducidad: string | null }} Producto
 * @typedef {{ id: number, nombre: string }} Tupper
 * @typedef {{ id: number, nombre: string, fechaLimite: string }} TupperConFecha
 */

// --- Conversión de unidades ---
// Cada unidad es de una "familia" y tiene un factor respecto a la base de
// esa familia (gramos para el peso, mililitros para el volumen).
const UNIDADES_INFO = {
  g: { familia: 'peso', factor: 1 },
  kg: { familia: 'peso', factor: 1000 },
  ml: { familia: 'volumen', factor: 1 },
  l: { familia: 'volumen', factor: 1000 },
  unidades: { familia: 'unidades', factor: 1 },
};

/**
 * Paso una cantidad de una unidad a otra: 500 g → 0,5 kg.
 * Devuelvo null si no son compatibles (gramos → unidades): entonces la app
 * PREGUNTA en vez de inventarse la conversión.
 * @param {number} cantidad
 * @param {string} de
 * @param {string} a
 * @returns {number | null}
 */
export function convertir(cantidad, de, a) {
  const origen = UNIDADES_INFO[de];
  const destino = UNIDADES_INFO[a];
  if (origen.familia !== destino.familia) return null;
  return redondear((cantidad * origen.factor) / destino.factor);
}

/**
 * Quito los restos de la coma flotante: 0.30000000000000004 → 0.3.
 * @param {number} n
 */
export function redondear(n) {
  return Math.round(n * 1000) / 1000;
}

// --- Buscar un ingrediente en el inventario ---
const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'las', 'los', 'en', 'con', 'y', 'a', 'al']);

/**
 * Las palabras con significado, en singular aproximado:
 * "Pechuga de pollo" → ["pechuga", "pollo"].
 * @param {string} nombre
 * @returns {string[]}
 */
function palabrasClave(nombre) {
  return normalizar(nombre)
    .split(/[^a-zñ0-9]+/)
    .filter((palabra) => palabra && !PALABRAS_VACIAS.has(palabra))
    .map((palabra) => (palabra.length > 3 && palabra.endsWith('s') ? palabra.slice(0, -1) : palabra));
}

/**
 * ¿El ingrediente es este producto o tupper? Coinciden si todas las
 * palabras de uno están en el otro: "Pollo" ~ "Pechuga de pollo",
 * "Tomates" ~ "Tomate".
 * @param {string} nombreIngrediente
 * @param {string} nombreCosa
 */
function coincide(nombreIngrediente, nombreCosa) {
  const a = palabrasClave(nombreIngrediente);
  const b = palabrasClave(nombreCosa);
  if (a.length === 0 || b.length === 0) return false;
  return a.every((palabra) => b.includes(palabra)) || b.every((palabra) => a.includes(palabra));
}

/**
 * Los productos que pueden ser este ingrediente: primero los que se llaman
 * exactamente igual y, si no hay, los parecidos. Los que caducan antes, primero.
 * @param {Ingrediente} ingrediente
 * @param {Producto[]} productos
 * @returns {Producto[]}
 */
export function buscarProductos(ingrediente, productos) {
  const nombre = normalizar(ingrediente.nombre);
  const exactos = productos.filter((producto) => normalizar(producto.nombre) === nombre);
  const candidatos = exactos.length > 0 ? exactos : productos.filter((producto) => coincide(ingrediente.nombre, producto.nombre));
  return [...candidatos].sort((x, y) => (x.fechaCaducidad ?? '9999').localeCompare(y.fechaCaducidad ?? '9999'));
}

/**
 * El tupper que puede ser este ingrediente, o null.
 * @param {Ingrediente} ingrediente
 * @param {Tupper[]} tuppers
 * @returns {Tupper | null}
 */
export function buscarTupper(ingrediente, tuppers) {
  const nombre = normalizar(ingrediente.nombre);
  return (
    tuppers.find((tupper) => normalizar(tupper.nombre) === nombre) ??
    tuppers.find((tupper) => coincide(ingrediente.nombre, tupper.nombre)) ??
    null
  );
}

/**
 * Palabras que dicen CÓMO está hecho un plato, no de qué. No me sirven para
 * buscar: "Pollo asado" no tiene nada que ver con "Pimientos asados".
 */
const PALABRAS_DE_COCINA = new Set([
  'asado', 'asada', 'frito', 'frita', 'cocido', 'cocida', 'guisado', 'guisada', 'plancha', 'horno',
  'casero', 'casera', 'fresco', 'fresca', 'natural', 'entero', 'entera', 'picado', 'picada', 'rallado', 'rallada',
]);

/**
 * Lo que hay en casa para un plato escrito a mano (el Plan del día). Aquí no
 * busco el ingrediente entero como en buscarProductos(): me vale con que el
 * producto y el plato compartan una palabra con significado, así
 * "Pollo asado" encuentra "Pechuga de pollo". Primero los que comparten más
 * palabras y, a igualdad, los que caducan antes.
 * @param {string} plato
 * @param {Producto[]} productos
 * @returns {Producto[]}
 */
export function productosDelPlato(plato, productos) {
  const delPlato = palabrasClave(plato).filter((palabra) => !PALABRAS_DE_COCINA.has(palabra));
  return productos
    .map((producto) => ({ producto, comunes: palabrasClave(producto.nombre).filter((palabra) => delPlato.includes(palabra)).length }))
    .filter(({ comunes }) => comunes > 0)
    .sort((x, y) => y.comunes - x.comunes || (x.producto.fechaCaducidad ?? '9999').localeCompare(y.producto.fechaCaducidad ?? '9999'))
    .map(({ producto }) => producto);
}

// --- Qué tengo y qué me falta ---

/**
 * @typedef {{ tipo: 'tienes', disponible: number }
 *   | { tipo: 'poco', disponible: number }
 *   | { tipo: 'otra_unidad', productos: Producto[] }
 *   | { tipo: 'tupper', tupper: Tupper }
 *   | { tipo: 'falta' }} EstadoIngrediente
 * `disponible` va en la unidad del INGREDIENTE.
 */

/**
 * Cómo estoy de este ingrediente.
 * @param {Ingrediente} ingrediente
 * @param {Producto[]} productos
 * @param {Tupper[]} tuppers
 * @returns {EstadoIngrediente}
 */
export function estadoIngrediente(ingrediente, productos, tuppers) {
  const candidatos = buscarProductos(ingrediente, productos);

  if (candidatos.length === 0) {
    const tupper = buscarTupper(ingrediente, tuppers);
    return tupper ? { tipo: 'tupper', tupper } : { tipo: 'falta' };
  }

  // Sumo todo lo que hay en unidades compatibles: 200 g + 0,5 kg = 700 g.
  let disponible = 0;
  let algunoComparable = false;
  for (const producto of candidatos) {
    const convertido = convertir(producto.cantidad, producto.unidad, ingrediente.unidad);
    if (convertido !== null) {
      disponible += convertido;
      algunoComparable = true;
    }
  }
  if (!algunoComparable) return { tipo: 'otra_unidad', productos: candidatos };

  disponible = redondear(disponible);
  return disponible >= ingrediente.cantidad ? { tipo: 'tienes', disponible } : { tipo: 'poco', disponible };
}

// --- Cuánto descontar al cocinar ---

/**
 * Lo que propongo descontar de `producto` para cubrir `ingrediente`, ya en
 * la unidad del producto y sin pasar de lo que hay. null = unidades no
 * compatibles: hay que preguntar.
 * @param {Ingrediente} ingrediente
 * @param {Producto} producto
 * @returns {number | null}
 */
export function cantidadPropuesta(ingrediente, producto) {
  const necesaria = convertir(ingrediente.cantidad, ingrediente.unidad, producto.unidad);
  if (necesaria === null) return null;
  return Math.min(necesaria, producto.cantidad);
}

// --- Usar pronto (D-61) ---

/**
 * @typedef {{ tipo: 'producto', producto: Producto, fecha: string }
 *   | { tipo: 'tupper', tupper: TupperConFecha, fecha: string }} CosaPronto
 * `fecha` es la caducidad del producto o la fecha límite del tupper.
 */

/**
 * ¿Hay que usarlo pronto? Sí si ya ha caducado, caduca hoy o caduca en
 * DIAS_USAR_PRONTO días o menos: el rojo y el naranja de avisoCaducidad().
 * @param {string} fechaIso AAAA-MM-DD
 * @returns {boolean}
 */
export function esPronto(fechaIso) {
  return diasHasta(fechaIso) <= DIAS_USAR_PRONTO;
}

/**
 * Lo que tengo que usar pronto, productos y tuppers juntos en una sola
 * lista, con lo que antes caduca primero. Los productos sin fecha no entran.
 * @param {Producto[]} productos
 * @param {TupperConFecha[]} tuppers
 * @returns {CosaPronto[]}
 */
export function usarPronto(productos, tuppers) {
  /** @type {CosaPronto[]} */
  const cosas = [
    ...productos
      .filter((producto) => producto.fechaCaducidad && esPronto(producto.fechaCaducidad))
      .map((producto) => ({ tipo: 'producto', producto, fecha: producto.fechaCaducidad })),
    ...tuppers
      .filter((tupper) => esPronto(tupper.fechaLimite))
      .map((tupper) => ({ tipo: 'tupper', tupper, fecha: tupper.fechaLimite })),
  ];
  // Las fechas AAAA-MM-DD se ordenan bien como texto. sort() es estable: con
  // la misma fecha, los productos se quedan delante de los tuppers.
  return cosas.sort((x, y) => x.fecha.localeCompare(y.fecha));
}

// --- Raciones (D-61) ---

/**
 * Los ingredientes para otro número de raciones: copias con la cantidad
 * multiplicada por elegidas / raciones (de 2 a 4 raciones, el doble). Redondeo
 * con redondear(), a los mismos 3 decimales que guarda la base de datos, y
 * nunca bajo de 0,001, porque un ingrediente no puede tener cantidad 0. Si la
 * receta no dice para cuántos es, o no cambio nada, devuelvo los mismos.
 * @param {Ingrediente[]} ingredientes
 * @param {number | null} raciones Las de la receta (son opcionales, D-49).
 * @param {number} elegidas Las que elijo en la pantalla.
 * @returns {Ingrediente[]}
 */
export function escalarIngredientes(ingredientes, raciones, elegidas) {
  if (!raciones || elegidas === raciones) return ingredientes;
  const factor = elegidas / raciones;
  return ingredientes.map((ingrediente) => ({
    ...ingrediente,
    cantidad: Math.max(redondear(ingrediente.cantidad * factor), 0.001),
  }));
}

// --- Básicos de despensa (D-61) ---

/** Los básicos ya normalizados, para no normalizar la lista en cada llamada. */
const BASICOS = new Set(BASICOS_DESPENSA.map(normalizar));

/**
 * ¿Es un básico de despensa (sal, aceite…)? Comparo el nombre entero
 * normalizado: "Aceite de oliva" sí, pero "Aceitunas" no.
 * @param {string} nombre
 * @returns {boolean}
 */
export function esBasico(nombre) {
  return BASICOS.has(normalizar(nombre));
}