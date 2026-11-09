/**
 * @file Límite de peticiones EN MEMORIA (ARQUITECTURA §9.5). Hay un solo
 * servidor; si se reinicia, los contadores empiezan de cero, y se acepta.
 *
 * Ventana fija: el contador de una clave (una IP, un email) empieza con su
 * primera petición y se pone a cero cuando pasa la ventana. Si se pasa del
 * máximo antes, 429 con la cabecera Retry-After (cuántos segundos esperar).
 */
import { ErrorApi } from '../errores.js';

const QUINCE_MINUTOS = 15 * 60 * 1000;
const UNA_HORA = 60 * 60 * 1000;

/**
 * Crea un limitador: como mucho `maximo` peticiones cada `ventanaMs` por clave.
 * @param {{
 *   maximo: number,
 *   ventanaMs: number,
 *   clave: (req: import('express').Request) => string | null,
 *   mensaje?: string
 * }} opciones clave: de quién cuento las peticiones (null = esta no cuenta).
 * @returns {import('express').RequestHandler & { olvidar: (clave: string) => void }}
 *   El middleware, con olvidar() para poner a cero una clave (tras un login bueno).
 */
export function crearLimite({ maximo, ventanaMs, clave, mensaje = 'Demasiados intentos. Espera unos minutos.' }) {
  /** @type {Map<string, { cuenta: number, reiniciaEn: number }>} */
  const contadores = new Map();

  // Cada minuto borro los contadores caducados, para que el Map no crezca
  // sin fin. unref(): este temporizador no impide que Node se cierre.
  setInterval(() => {
    const ahora = Date.now();
    for (const [k, contador] of contadores) {
      if (contador.reiniciaEn <= ahora) contadores.delete(k);
    }
  }, 60_000).unref();

  /** @type {import('express').RequestHandler} */
  function limite(req, res, next) {
    const k = clave(req);
    if (k === null) return next();

    const ahora = Date.now();
    let contador = contadores.get(k);
    if (!contador || contador.reiniciaEn <= ahora) {
      contador = { cuenta: 0, reiniciaEn: ahora + ventanaMs };
      contadores.set(k, contador);
    }
    contador.cuenta += 1;

    if (contador.cuenta > maximo) {
      res.set('Retry-After', String(Math.ceil((contador.reiniciaEn - ahora) / 1000)));
      throw new ErrorApi(429, 'DEMASIADAS_PETICIONES', mensaje, { reintentable: true });
    }
    next();
  }

  limite.olvidar = (k) => contadores.delete(k);
  return limite;
}

/** Cuento por la IP de quien llama (con trust proxy, la de verdad: paso 5c). */
const porIp = (req) => req.ip;

/** El email del login, igual que lo limpia validarLogin(). Sin email, no cuenta. */
export const emailDelLogin = (req) =>
  typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : null;

export const limiteGeneral = crearLimite({
  maximo: 300,
  ventanaMs: QUINCE_MINUTOS,
  clave: porIp,
  mensaje: 'Demasiadas peticiones. Espera unos minutos.',
});
export const limiteLoginIp = crearLimite({ maximo: 10, ventanaMs: QUINCE_MINUTOS, clave: porIp });
export const limiteLoginEmail = crearLimite({ maximo: 5, ventanaMs: QUINCE_MINUTOS, clave: emailDelLogin });
export const limiteRegistro = crearLimite({ maximo: 5, ventanaMs: UNA_HORA, clave: porIp });

/** Como mucho 3 invitaciones por hora y por persona (§9.5). Va detrás de exigirSesion. */
export const limiteInvitaciones = crearLimite({
  maximo: 3,
  ventanaMs: UNA_HORA,
  clave: (req) => `usuario:${req.usuario.id}`,
});
/** Como mucho 3 avisos de prueba por hora y por persona (§9.5). Va detrás de exigirSesion. */
export const limitePruebaPush = crearLimite({
  maximo: 3,
  ventanaMs: UNA_HORA,
  clave: (req) => `usuario:${req.usuario.id}`,
  mensaje: 'Ya has enviado 3 avisos de prueba esta hora. Espera un poco.',
});
