/**
 * @file "Qué tengo y qué me falta" de una receta, y cuánto descontar al
 * cocinar (lib/cocina.ts de la app Expo, sin la parte de la base de datos).
 * Lo usan el navegador (detalle de la receta, "La he cocinado") y el
 * servidor (comprobar los descuentos de /api/cocinar).
 */
import { normalizar } from './texto.js';

/**
 * @typedef {import('./validacion.js').DatosIngrediente} Ingrediente
 * @typedef {{ id: number, nombre: string, cantidad: number, unidad: string, fechaCaducidad: string | null }} Producto
 * @typedef {{ id: number, nombre: string }} Tupper
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