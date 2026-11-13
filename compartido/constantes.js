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

/** Días que aguanta un tupper: de 1 a 365, como el CHECK de la tabla. */
export const MIN_DIAS_TUPPER = 1;
export const MAX_DIAS_TUPPER = 365;

/** Productos que se pueden guardar de una vez desde un ticket. SEC-05. */
export const MAX_PRODUCTOS_TICKET = 100;

/** Llamadas a Claude al día por persona (D-15). */
export const CUOTA_IA_DIARIA = 10;

/** Tamaño máximo de la foto del ticket: el límite de la API por imagen. */
export const MAX_BYTES_IMAGEN_TICKET = 5 * 1024 * 1024;

/** Tamaño máximo del PDF del ticket: en base64 tiene que caber en 32 MB (D-47). */
export const MAX_BYTES_PDF_TICKET = 20 * 1024 * 1024;

/** Ingredientes y pasos de una receta, y lo que mide cada paso. SEC-05. */
export const MAX_INGREDIENTES_RECETA = 30;
export const MAX_PASOS_RECETA = 30;
export const MAX_LONGITUD_PASO = 500;

/** Para cuántas personas es una receta: opcional, de 1 a 20 (D-49). */
export const MIN_RACIONES = 1;
export const MAX_RACIONES = 20;

/** Longitud de la contraseña: de 10 a 128 caracteres, sin más reglas (D-17). */
export const MIN_LONGITUD_CONTRASENA = 10;
export const MAX_LONGITUD_CONTRASENA = 128;

/** Longitud máxima de un email (la del estándar). */
export const MAX_LONGITUD_EMAIL = 254;

/**
 * Códigos de invitación: 8 caracteres de este alfabeto. Sin I, L, O, 0 ni 1,
 * que se confunden al dictarlos ("¿es una O o un cero?").
 */
export const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const LONGITUD_CODIGO = 8;