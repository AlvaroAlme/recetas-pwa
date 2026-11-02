/**
 * @file Contraseñas: guardar su hash y comprobarlas (D-04, D-43).
 *
 * Nunca guardo una contraseña, sino el resultado de scrypt: una función
 * hecha A PROPÓSITO para ser lenta y gastar memoria. Así, si alguien roba
 * una copia de la base de datos, probar millones de contraseñas le cuesta
 * muchísimo. Todo con node:crypto, sin paquetes.
 *
 * El hash se guarda junto con sus parámetros: "scrypt$N$r$p$sal$hash". Si
 * algún día los endurezco, las contraseñas antiguas se siguen comprobando.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

// scrypt de Node avisa con un callback. promisify me da una versión que
// devuelve una promesa, para poder usar await.
const scryptAsync = promisify(scrypt);

/** Parámetros de OWASP elegidos en D-43: 16 MiB por hash. */
const PARAMETROS = Object.freeze({ N: 2 ** 14, r: 8, p: 5 });
const LONGITUD_SAL = 16;
const LONGITUD_HASH = 64;

/**
 * Calcula scrypt. Node no deja usar más de 32 MiB si no se lo digo: le
 * paso el doble de lo que necesitan estos parámetros (128 · N · r).
 * @param {string} contrasena
 * @param {Buffer} sal
 * @param {number} longitud
 * @param {{ N: number, r: number, p: number }} parametros
 * @returns {Promise<Buffer>}
 */
function calcular(contrasena, sal, longitud, { N, r, p }) {
  // NFC: la "ñ" se puede escribir como un carácter o como "n" + "~". Según
  // el teclado (iPhone o PC) llega de una forma u otra: la dejo siempre igual.
  return scryptAsync(contrasena.normalize('NFC'), sal, longitud, { N, r, p, maxmem: 2 * 128 * N * r });
}

/**
 * Calcula el hash de una contraseña para guardarlo en usuarios.hash_contrasena.
 * @param {string} contrasena Ya validada (de 10 a 128 caracteres, D-17).
 * @returns {Promise<string>} "scrypt$16384$8$5$<sal en base64>$<hash en base64>"
 */
export async function hashearContrasena(contrasena) {
  const sal = randomBytes(LONGITUD_SAL);
  const hash = await calcular(contrasena, sal, LONGITUD_HASH, PARAMETROS);
  const { N, r, p } = PARAMETROS;
  return ['scrypt', N, r, p, sal.toString('base64'), hash.toString('base64')].join('$');
}

/**
 * Comprueba una contraseña contra el hash guardado.
 * @param {string} contrasena La que acaba de escribir el usuario.
 * @param {string} guardado El texto de usuarios.hash_contrasena.
 * @returns {Promise<boolean>}
 */
export async function comprobarContrasena(contrasena, guardado) {
  const partes = guardado.split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') return false;

  const [, textoN, textoR, textoP, salBase64, hashBase64] = partes;
  const esperado = Buffer.from(hashBase64, 'base64');
  if (esperado.length === 0) return false;

  // Uso los parámetros CON LOS QUE SE GUARDÓ, no los de ahora.
  const parametros = { N: Number(textoN), r: Number(textoR), p: Number(textoP) };
  const calculado = await calcular(contrasena, Buffer.from(salBase64, 'base64'), esperado.length, parametros);

  // timingSafeEqual tarda lo mismo acierte o falle. Una comparación normal
  // se para en el primer byte distinto, y midiendo tiempos se podría
  // adivinar el hash poco a poco.
  return timingSafeEqual(calculado, esperado);
}