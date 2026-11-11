/**
 * @file Configuración del servidor.
 *
 * Aquí leo las variables de entorno una sola vez, al arrancar, y compruebo
 * que están bien. Si falta alguna o tiene un valor raro, el servidor no
 * arranca y te dice cuál es. Prefiero que falle al principio con un mensaje
 * claro a que falle a mitad de una petición sin saber por qué.
 *
 * El resto del código importa `config` y nunca lee `process.env` directamente.
 *
 * Norma: los mensajes de error dicen QUÉ variable falla, nunca su valor.
 * Más adelante habrá secretos (la conexión a la base de datos, la API key)
 * y no quiero que acaben en los logs.
 */

/**
 * Entornos en los que puede arrancar el servidor.
 * `development` es mi PC y `production` es Render.
 * @type {string[]}
 */
const ENTORNOS = ['development', 'production'];

/**
 * Lee una variable de entorno que tiene que estar sí o sí.
 *
 * @param {string} nombre Nombre de la variable, por ejemplo `'NODE_ENV'`.
 * @returns {string} El valor, sin espacios al principio ni al final.
 * @throws {Error} Si la variable no existe o está vacía.
 */
function obligatoria(nombre) {
  const valor = process.env[nombre];
  if (valor === undefined || valor.trim() === '') {
    throw new Error(`Falta la variable de entorno ${nombre}. Mira .env.ejemplo.`);
  }
  return valor.trim();
}

/**
 * En qué entorno estoy. Solo vale uno de los de `ENTORNOS`.
 * @type {string}
 */
const entorno = obligatoria('NODE_ENV');
if (!ENTORNOS.includes(entorno)) {
  throw new Error(`NODE_ENV debe ser ${ENTORNOS.join(' o ')}.`);
}

/**
 * Puerto donde escucha el servidor. Es opcional: si no viene, uso el 3000.
 * Las variables de entorno siempre llegan como texto, por eso lo paso a número.
 * @type {number}
 */
const puerto = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
  throw new Error('PORT debe ser un número entero entre 1 y 65535.');
}

/**
 * URL desde la que se abre la app, sin ruta ni barra final.
 * La usaré para comprobar la cabecera `Origin` de las peticiones (CSRF).
 * @type {string}
 */
let appOrigen;
try {
  // `new URL` falla si el texto no es una URL. `.origin` me la deja limpia:
  // "http://localhost:3000/" -> "http://localhost:3000".
  appOrigen = new URL(obligatoria('APP_ORIGEN')).origin;
} catch (error) {
  // Si lo que falló es que falta la variable, dejo pasar ese mismo error.
  // Si falló la URL, el mensaje de Node está en inglés: pongo uno mío más claro.
  if (error.message.startsWith('Falta')) throw error;
  throw new Error('APP_ORIGEN no es una URL válida (ej. http://localhost:3000).');
}

/**
 * Cadena de conexión a PostgreSQL (Neon). Es un SECRETO: lleva el usuario y
 * la contraseña, así que nunca la imprimo ni la pongo en un mensaje de error.
 * Solo compruebo que tiene pinta de ser una conexión de PostgreSQL.
 * @type {string}
 */
const baseDatos = obligatoria('DATABASE_URL');
if (!baseDatos.startsWith('postgresql://') && !baseDatos.startsWith('postgres://')) {
  throw new Error('DATABASE_URL debe empezar por postgresql:// (cópiala de Neon › Connect).');
}

/**
 * Claves VAPID de Web Push (D-11). Con la privada firmo cada envío para que
 * el servicio de push (Apple, Google…) sepa que soy yo; la pública la usa el
 * navegador al suscribirse. La privada es un SECRETO: nunca la imprimo.
 * Son base64url: 65 bytes la pública (87 caracteres) y 32 la privada (43).
 */
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const vapidPublica = obligatoria('VAPID_PUBLICA');
const vapidPrivada = obligatoria('VAPID_PRIVADA');
if (!BASE64URL.test(vapidPublica) || vapidPublica.length !== 87) {
  throw new Error('VAPID_PUBLICA no parece una clave pública VAPID (npx web-push generate-vapid-keys).');
}
if (!BASE64URL.test(vapidPrivada) || vapidPrivada.length !== 43) {
  throw new Error('VAPID_PRIVADA no parece una clave privada VAPID (npx web-push generate-vapid-keys).');
}

/**
 * Contacto que mando a los servicios de push por si mis envíos dan
 * problemas. Tiene que ser una URL https:// o un mailto: (RFC 8292).
 */
const vapidSujeto = obligatoria('VAPID_SUJETO');
if (!vapidSujeto.startsWith('https://') && !vapidSujeto.startsWith('mailto:')) {
  throw new Error('VAPID_SUJETO debe empezar por https:// o mailto:.');
}

/**
 * Secreto que manda cron-job.org en cada ping (Authorization: Bearer …).
 * Sin él, cualquiera podría lanzar la revisión de avisos. Es un SECRETO.
 * Pido 32 caracteres como mínimo: que no se pueda adivinar probando.
 */
const cronSecreto = obligatoria('CRON_SECRETO');
if (cronSecreto.length < 32) {
  throw new Error('CRON_SECRETO es demasiado corto (mínimo 32 caracteres).');
}

/**
 * API key de Claude (D-05). Es un SECRETO: solo vive en el servidor y nunca
 * la imprimo. En Render es obligatoria; en mi PC puede faltar hasta que cree
 * el workspace (fase 5, paso 8), y mientras tanto leer un ticket da 503.
 * @type {string | null}
 */
const anthropicApiKey = entorno === 'production'
  ? obligatoria('ANTHROPIC_API_KEY')
  : process.env.ANTHROPIC_API_KEY?.trim() || null;
if (anthropicApiKey !== null && !anthropicApiKey.startsWith('sk-ant-')) {
  throw new Error('ANTHROPIC_API_KEY no parece una key de Anthropic (empieza por sk-ant-).');
}

/**
 * Configuración ya comprobada y congelada: nadie la puede cambiar sin querer
 * desde otro archivo.
 *
 * @type {Readonly<{
 *   entorno: string,
 *   esProduccion: boolean,
 *   puerto: number,
 *   host: string,
 *   appOrigen: string,
 *   baseDatos: string,
 *   vapid: Readonly<{ publica: string, privada: string, sujeto: string }>,
 *   cronSecreto: string,
 *   anthropicApiKey: string | null
 * }>}
 */
export const config = Object.freeze({
  entorno,
  esProduccion: entorno === 'production',
  puerto,
  // En mi PC solo escucho en el propio equipo (127.0.0.1): nadie de mi Wi-Fi
  // se puede conectar (SEC-01). En Render tengo que escuchar en todas las
  // interfaces (0.0.0.0) para que su proxy llegue hasta el servidor.
  host: entorno === 'production' ? '0.0.0.0' : '127.0.0.1',
  appOrigen,
  baseDatos,
  vapid: Object.freeze({ publica: vapidPublica, privada: vapidPrivada, sujeto: vapidSujeto }),
  cronSecreto,
  anthropicApiKey,
});
