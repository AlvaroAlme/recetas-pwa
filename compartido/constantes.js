/**
 * @file Constantes del dominio, compartidas por el navegador y el servidor.
 *
 * Son las mismas que lib/types.ts de la app Expo. Las listas cerradas
 * (unidades, ubicaciones) y los límites coinciden con los CHECK de la base de
 * datos: si cambio algo aquí, tengo que cambiarlo también en una migración nueva.
 */

/**
 * Dónde se guarda un producto o un tupper.
 * @typedef {'nevera' | 'despensa' | 'congelador'} Ubicacion
 */

/** @type {readonly Ubicacion[]} */
export const UBICACIONES = Object.freeze(['nevera', 'despensa', 'congelador']);

/**
 * Unidad de una cantidad. g/kg son peso, ml/l volumen y "unidades" se cuentan.
 * @typedef {'g' | 'kg' | 'ml' | 'l' | 'unidades'} Unidad
 */

/** @type {readonly Unidad[]} */
export const UNIDADES = Object.freeze(['g', 'kg', 'ml', 'l', 'unidades']);

/** Longitud máxima de un nombre (producto, tupper, receta…). SEC-05. */
export const MAX_LONGITUD_NOMBRE = 80;

/** Cantidad máxima de un producto o ingrediente. SEC-05. */
export const MAX_CANTIDAD = 100_000;
