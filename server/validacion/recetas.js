/**
 * @file Validación de lo que llega a /api/recetas. Los datos de la receta
 * los compruebo con compartido/validacion.js, igual que el formulario (D-40).
 */
import { MAX_INGREDIENTES_RECETA } from '../../compartido/constantes.js';
import { leerCantidad, validarReceta } from '../../compartido/validacion.js';
import { ErrorApi } from '../errores.js';
import { leerClave } from './productos.js';
/**
 * Comprueba una receta (alta o edición).
 * @param {unknown} cuerpo
 * @returns {import('../../compartido/validacion.js').DatosReceta}
 * @throws {ErrorApi} 400 VALIDACION con un error por campo.
 */
export function leerReceta(cuerpo) {
  const resultado = validarReceta(cuerpo);
  if (!resultado.ok) {
    throw new ErrorApi(400, 'VALIDACION', 'Revisa los campos marcados.', { campos: resultado.errores });
  }
  return resultado.datos;
}

/**
 * ¿Es un id válido (entero positivo)?
 * @param {unknown} valor
 */
const esId = (valor) => Number.isSafeInteger(valor) && valor > 0;

/**
 * Comprueba lo que llega a POST /api/cocinar ("La he cocinado").
 * Cada descuento va en la unidad del PRODUCTO (ya convertido en el navegador).
 * @param {unknown} cuerpo { clave, descuentos: [{ productoId, cantidad }], tuppersConsumidos: [id] }
 * @returns {{ clave: string, descuentos: { productoId: number, cantidad: number }[], tuppersConsumidos: number[] }}
 * @throws {ErrorApi} 400 VALIDACION
 */
export function leerCocinar(cuerpo) {
  const clave = leerClave(cuerpo?.clave);
  const { descuentos = [], tuppersConsumidos = [] } = cuerpo;
  const noValido = new ErrorApi(400, 'VALIDACION', 'Lo que hay que descontar no es válido. Vuelve a abrir la pantalla.');

  if (!Array.isArray(descuentos) || !Array.isArray(tuppersConsumidos)) throw noValido;
  if (descuentos.length > MAX_INGREDIENTES_RECETA || tuppersConsumidos.length > MAX_INGREDIENTES_RECETA) throw noValido;
  if (descuentos.length === 0 && tuppersConsumidos.length === 0) {
    throw new ErrorApi(400, 'VALIDACION', 'No hay nada que descontar.');
  }

  const descuentosLimpios = descuentos.map((descuento) => {
    const cantidadLeida = leerCantidad(descuento?.cantidad);
    if (!esId(descuento?.productoId) || 'error' in cantidadLeida) throw noValido;
    return { productoId: descuento.productoId, cantidad: cantidadLeida.valor };
  });
  if (!tuppersConsumidos.every(esId)) throw noValido;

  // Sin repetidos: marcar dos veces el mismo tupper no cambia nada.
  return { clave, descuentos: descuentosLimpios, tuppersConsumidos: [...new Set(tuppersConsumidos)] };
}