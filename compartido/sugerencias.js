/**
 * @file Alimentos comunes para sugerir mientras se escribe el nombre de un
 * producto (D-42). Es la lista fija: sirve desde el primer día y sin red.
 * Las sugerencias del historial del hogar las da el servidor
 * (GET /api/productos/nombres) y van antes que estas.
 *
 * Los nombres van bien escritos, con tildes y mayúsculas, porque son los que
 * se guardan. Para buscar los comparo normalizados (sin tildes ni
 * mayúsculas), así "platano" encuentra "Plátanos".
 */
import { normalizar } from './texto.js';

/** @type {readonly string[]} */
export const ALIMENTOS_COMUNES = Object.freeze([
  // Lácteos y huevos
  'Leche entera', 'Leche semidesnatada', 'Leche desnatada', 'Yogur natural', 'Yogur griego',
  'Queso fresco', 'Queso curado', 'Queso rallado', 'Mantequilla', 'Nata para cocinar', 'Huevos',
  // Carne y embutido
  'Pechuga de pollo', 'Muslos de pollo', 'Pollo entero', 'Carne picada', 'Filetes de ternera',
  'Lomo de cerdo', 'Costillas de cerdo', 'Chuletas de cordero', 'Hamburguesas', 'Salchichas',
  'Jamón serrano', 'Jamón cocido', 'Pavo en lonchas', 'Chorizo', 'Bacon',
  // Pescado y marisco
  'Merluza', 'Salmón', 'Bacalao', 'Gambas', 'Langostinos', 'Calamares', 'Mejillones',
  // Fruta
  'Manzanas', 'Plátanos', 'Naranjas', 'Mandarinas', 'Peras', 'Fresas', 'Uvas', 'Limones',
  'Kiwis', 'Melón', 'Sandía', 'Aguacates',
  // Verdura
  'Tomates', 'Lechuga', 'Cebollas', 'Ajos', 'Patatas', 'Zanahorias', 'Pimientos rojos',
  'Pimientos verdes', 'Calabacín', 'Berenjena', 'Pepino', 'Espinacas', 'Brócoli', 'Coliflor',
  'Champiñones', 'Judías verdes', 'Puerros',
  // Despensa
  'Arroz', 'Macarrones', 'Espaguetis', 'Fideos', 'Lentejas', 'Garbanzos', 'Alubias', 'Harina',
  'Azúcar', 'Sal', 'Aceite de oliva', 'Vinagre', 'Pan de molde', 'Pan', 'Galletas', 'Cereales',
  'Café', 'Cacao en polvo', 'Tomate frito', 'Caldo de pollo', 'Atún en lata', 'Sardinas en lata',
  'Maíz en lata',
  // Congelados
  'Guisantes congelados', 'Pizza congelada', 'Croquetas congeladas', 'Helado',
]);

// Normalizo cada nombre UNA vez, al cargar el archivo, y no en cada tecla.
const INDICE = ALIMENTOS_COMUNES.map((nombre) => [nombre, normalizar(nombre)]);

/**
 * Alimentos de la lista que contienen el texto, sin mirar tildes ni
 * mayúsculas. Primero los que EMPIEZAN por él: al escribir "pollo", "Pollo
 * entero" va antes que "Pechuga de pollo".
 * @param {string} texto Lo que lleva escrito el usuario.
 * @param {number} [limite] Cuántos devuelvo como mucho.
 * @returns {string[]} Vacío si hay menos de 2 letras.
 */
export function buscarAlimentos(texto, limite = 8) {
  const buscado = normalizar(texto);
  if (buscado.length < 2) return [];

  const empiezan = [];
  const contienen = [];
  for (const [nombre, normalizado] of INDICE) {
    if (normalizado.startsWith(buscado)) {
      empiezan.push(nombre);
    } else if (normalizado.includes(buscado)) {
      contienen.push(nombre);
    }
  }
  return [...empiezan, ...contienen].slice(0, limite);
}