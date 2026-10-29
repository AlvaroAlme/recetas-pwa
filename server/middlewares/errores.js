/**
 * @file Lo último por lo que pasa una petición: convierte cualquier error en
 * el JSON de ARQUITECTURA §5.1. Nunca envío la traza del error al navegador
 * (enseñaría rutas de archivos de mi PC): solo la apunto en la consola.
 */
import { ErrorApi } from '../errores.js';

/**
 * Para cualquier /api/... que no exista: 404 en JSON (y no la página de Express).
 * @type {import('express').RequestHandler}
 */
export function rutaNoEncontrada(req, res, next) {
  next(new ErrorApi(404, 'NO_EXISTE', 'Esa dirección de la API no existe.'));
}

/**
 * Middleware de errores de Express. Tiene que tener los 4 parámetros, aunque
 * no use `next`: así es como Express sabe que es de errores.
 * @type {import('express').ErrorRequestHandler}
 */
export function manejarErrores(error, req, res, next) {
  // Si ya había empezado a contestar, no puedo cambiar la respuesta: que lo cierre Express.
  if (res.headersSent) return next(error);

  if (error instanceof ErrorApi) {
    return res.status(error.estado).json({
      error: {
        codigo: error.codigo,
        mensaje: error.message,
        campos: error.campos,
        reintentable: error.reintentable,
      },
    });
  }

  // Errores al leer el cuerpo de la petición (los lanza express.json()).
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: { codigo: 'DEMASIADO_GRANDE', mensaje: 'Lo que has enviado es demasiado grande.', reintentable: false },
    });
  }
  if (typeof error.type === 'string' && error.status >= 400 && error.status < 500) {
    return res.status(400).json({
      error: { codigo: 'VALIDACION', mensaje: 'Lo que has enviado no es un JSON válido.', reintentable: false },
    });
  }

  // Cualquier otra cosa es un fallo mío: lo apunto (solo el mensaje, nunca
  // datos ni cabeceras, SEC-09) y contesto algo genérico.
  console.error('Error inesperado:', error.message);
  return res.status(500).json({
    error: { codigo: 'INTERNO', mensaje: 'Algo ha fallado en el servidor.', reintentable: true },
  });
}