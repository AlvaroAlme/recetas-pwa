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

/** Líneas SIN TACHAR que puede tener la lista de la compra de un hogar (D-54). SEC-05. */
export const MAX_LINEAS_LISTA = 200;

/** Un producto pasa solo a la lista al bajar a esta parte de su cantidad_inicial (el 10 %, D-54). */
export const UMBRAL_LISTA = 0.1;

/** Días que se quedan las líneas tachadas antes de borrarse solas (D-54). */
export const DIAS_LISTA_COMPRADAS = 7;

/** Llamadas a Claude al día por persona para el ticket (D-15). */
export const CUOTA_IA_DIARIA = 10;

/** Mensajes al chat ayudante al día por persona: su propia cuota (D-51). */
export const CUOTA_CHAT_DIARIA = 30;

/** Lo que puede medir un mensaje que escribo en el chat (D-51). */
export const MAX_CARACTERES_MENSAJE = 2000;

/**
 * Preguntas de una conversación: al llegar, hay que empezar otra. Pone techo
 * a lo que se reenvía en cada mensaje y a lo que se guarda (D-51). Coincide
 * con el CHECK de `conversaciones.preguntas`.
 */
export const MAX_PREGUNTAS_CONVERSACION = 40;

/** Días que se guarda una conversación desde su último mensaje (D-51). */
export const DIAS_CONVERSACION = 30;

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

/**
 * Días hasta la caducidad que cuentan como "usar pronto": lo caducado, lo
 * que caduca hoy y lo que caduca en 1 a 3 días, que es el naranja de
 * avisoCaducidad() (D-61).
 */
export const DIAS_USAR_PRONTO = 3;

/**
 * Básicos de despensa (D-61): si una receta los lleva y no los tengo en el
 * inventario, no cuentan como "te falta", porque casi nadie apunta la sal.
 * Los comparo con normalizar(), así que da igual cómo estén escritos.
 * @type {readonly string[]}
 */
export const BASICOS_DESPENSA = Object.freeze([
  'Agua', 'Sal', 'Pimienta', 'Pimienta negra', 'Aceite', 'Aceite de oliva',
  'Aceite de oliva virgen extra', 'Aceite de girasol', 'Vinagre', 'Azúcar',
]);

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

/**
 * Los dos huecos de cada día del cuadrante.
 * @typedef {'comida' | 'cena'} TipoComida
 */

/** @type {readonly TipoComida[]} */
export const TIPOS_COMIDA = Object.freeze(['comida', 'cena']);

/**
 * Grupo de alimentos de un hueco del cuadrante (D-50). Es opcional, y con él
 * calculo el equilibrio de la semana frente a AESAN. La carne va en dos para
 * poder decir "mejor aves y conejo"; para el máximo de 3, suman juntas.
 * @typedef {'legumbres' | 'pescado' | 'huevos' | 'carne_blanca' | 'carne_roja' | 'verduras' | 'pasta_arroz' | 'otro'} GrupoAlimentos
 */

/** @type {readonly GrupoAlimentos[]} */
export const GRUPOS_ALIMENTOS = Object.freeze([
  'legumbres',
  'pescado',
  'huevos',
  'carne_blanca',
  'carne_roja',
  'verduras',
  'pasta_arroz',
  'otro',
]);

/** Cuánto puedo moverme por el cuadrante: un año atrás y uno adelante (D-50). */
export const DIAS_MARGEN_PLAN = 365;