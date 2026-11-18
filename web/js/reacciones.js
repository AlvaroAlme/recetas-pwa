/**
 * @file Las caras del avatar de la cabecera (D-56). Se alegra cuando algo
 * se guarda, se pone triste cuando no se ha podido guardar y piensa
 * mientras el Ayudante responde. Después vuelve solo a la normal.
 *
 * api.js lanza el evento "vigia:escritura" con { ok } al terminar cada
 * escritura; aquí lo escucho. Si en ese momento no hay avatar en la
 * cabecera (una pantalla secundaria, como Nuevo producto), me lo apunto y
 * reacciona el de la pantalla a la que vuelves, si llega en menos de 1 s.
 */
import { happy, idle, sad, thinking } from '/vendor/blobatar/expression.js';
import { ponerExpresion } from './componentes/avatar.js';

/** Cuánto dura cada cara antes de volver a la normal. */
const DURACION_MS = { contento: 1200, triste: 1500 };

/** Cuánto espero, como mucho, a que aparezca un avatar para reaccionar. */
const ESPERA_PENDIENTE_MS = 1000;

/** @type {SVGSVGElement | null} El avatar de la cabecera de ahora. */
let avatar = null;
/** @type {{ pose: object, duracion: number, hasta: number } | null} */
let pendiente = null;
let temporizador;
let pensando = false;

/** @returns {boolean} true si hay un avatar en la cabecera y se ve. */
const hayAvatar = () => Boolean(avatar?.isConnected);

/**
 * El router me pasa el avatar de cada cabecera nueva. Si estaba pensando,
 * sigue pensando; si había una reacción pendiente (y no es vieja), la hace.
 * @param {SVGSVGElement} nuevo
 */
export function usarAvatarCabecera(nuevo) {
  // Ojo: el router me lo pasa ANTES de meterlo en la página (aún no está
  // "conectado"), así que aquí no compruebo hayAvatar(): pongo la cara y ya.
  avatar = nuevo;
  clearTimeout(temporizador);
  const quedaba = pendiente;
  pendiente = null;
  if (pensando) {
    ponerExpresion(avatar, thinking);
  } else if (quedaba && Date.now() <= quedaba.hasta) {
    mostrar(quedaba.pose, quedaba.duracion);
  }
}

/**
 * Una cara durante un rato y vuelta a la normal. Mientras piensa, no. Si
 * ahora no hay avatar a la vista, me la apunto para el siguiente.
 * @param {object} pose
 * @param {number} duracion En ms.
 */
function reaccionar(pose, duracion) {
  if (pensando) return;
  if (!hayAvatar()) {
    pendiente = { pose, duracion, hasta: Date.now() + ESPERA_PENDIENTE_MS };
    return;
  }
  mostrar(pose, duracion);
}

/**
 * @param {object} pose
 * @param {number} duracion
 */
function mostrar(pose, duracion) {
  ponerExpresion(avatar, pose);
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    if (avatar && !pensando) ponerExpresion(avatar, idle);
  }, duracion);
}

/**
 * El Ayudante me avisa al empezar a responder (true) y al terminar (false).
 * @param {boolean} si
 */
export function pensar(si) {
  pensando = si;
  clearTimeout(temporizador);
  pendiente = null;
  if (hayAvatar()) ponerExpresion(avatar, si ? thinking : idle);
}

addEventListener('vigia:escritura', (evento) => {
  if (evento.detail.ok) reaccionar(happy, DURACION_MS.contento);
  else reaccionar(sad, DURACION_MS.triste);
});
