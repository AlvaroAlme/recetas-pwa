/**
 * @file Bienvenida (P-03, flujo §7.6, D-46): tres pasos tras crear la cuenta.
 * 1. Tu casa: el nombre (se puede cambiar) y unirse con un código.
 * 2. Instala la app: sin instalar, el iPhone no recibe avisos (R-01).
 * 3. Activa los avisos.
 * Cada paso se puede saltar. El paso va en la URL (/bienvenida?paso=2): así
 * "Atrás" vuelve al anterior.
 */
import { validarNombreCasa } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { esIos, estaInstalada, instalarApp, puedeInstalar } from '../avisos.js';
import { crearPanelAvisos } from '../componentes/panelAvisos.js';
import { crearAviso, crearCampo, crearCarga, crearSinConexion, leerCampo, ponerCargando, ponerErrorCampo } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';

const PASOS = 3;

/** "Saltar" en cualquier paso: al inventario (§7.6). */
const crearSaltar = () => el('a', { class: 'boton boton--fantasma', href: '/' }, 'Saltar');

/**
 * La cabecera de cada paso: "Paso 1 de 3" y su título.
 * @param {number} paso
 * @param {string} titulo
 */
function crearEncabezado(paso, titulo) {
  return el(
    'div',
    { class: 'bienvenida__encabezado' },
    el('p', { class: 'tono--tenue' }, `Paso ${paso} de ${PASOS}`),
    el('h2', { class: 'bienvenida__titulo' }, titulo)
  );
}

/**
 * @param {{ consulta: URLSearchParams }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaBienvenida({ consulta }) {
  // Un paso que no existe (?paso=9) cuenta como el primero.
  const paso = Number(consulta.get('paso'));
  if (paso === 2) return pasoInstalar();
  if (paso === 3) return pasoAvisos();
  return pasoCasa();
}

/** Paso 1: tu casa. */
function pasoCasa() {
  const idFormulario = 'formulario-bienvenida';
  const zona = el('div');
  const boton = el('button', { class: 'boton boton--primario', type: 'submit', form: idFormulario, 'data-escribe': true }, 'Siguiente');

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando…'));
    try {
      const { usuario, hogar } = await api.get('/yo');
      zona.replaceChildren(crearFormulario(usuario, hogar));
    } catch (error) {
      zona.replaceChildren(
        error.codigo === 'SIN_CONEXION' ? crearSinConexion(cargar) : crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido cargar tu casa.') })
      );
    }
  }

  /**
   * @param {{ nombre: string }} usuario
   * @param {{ nombre: string, zonaHoraria: string }} hogar
   */
  function crearFormulario(usuario, hogar) {
    const aviso = el('div');
    const nombre = crearCampo({
      etiqueta: 'Nombre de tu casa',
      nombre: 'nombre',
      valor: hogar.nombre,
      ayuda: 'Lo verán las personas que vivan contigo. Puedes cambiarlo cuando quieras.',
      atributos: { maxlength: 80, autocapitalize: 'sentences', autocomplete: 'off' },
    });
    let enviando = false;

    /** @param {SubmitEvent} evento */
    async function alEnviar(evento) {
      evento.preventDefault();
      if (enviando) return;
      aviso.replaceChildren();
      const resultado = validarNombreCasa(leerCampo(nombre));
      ponerErrorCampo(nombre, resultado.ok ? null : resultado.errores.nombre);
      if (!resultado.ok) {
        nombre.querySelector('input').focus();
        return;
      }

      // Solo mando lo que cambia. La zona horaria la tomo de este dispositivo:
      // con ella calculo el "día anterior a las 10:00" de los avisos.
      const cambios = {};
      if (resultado.datos !== hogar.nombre) cambios.nombre = resultado.datos;
      const zona = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (zona && zona !== hogar.zonaHoraria) cambios.zonaHoraria = zona;

      enviando = true;
      ponerCargando(boton, true);
      try {
        if (Object.keys(cambios).length > 0) await api.patch('/hogar', cambios);
        navegar('/bienvenida?paso=2');
      } catch (error) {
        enviando = false;
        ponerCargando(boton, false);
        if (error.campos?.nombre) ponerErrorCampo(nombre, error.campos.nombre);
        else aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido guardar. Inténtalo de nuevo.') }));
      }
    }

    return el(
      'form',
      { class: 'formulario bienvenida', id: idFormulario, novalidate: true, onsubmit: alEnviar },
      el('p', { class: 'bienvenida__saludo' }, `Hola, ${usuario.nombre}. Vamos a dejarlo todo listo en un minuto.`),
      crearEncabezado(1, 'Tu casa'),
      aviso,
      nombre,
      el(
        'section',
        { class: 'tarjeta', 'aria-labelledby': 'titulo-convives' },
        el('h3', { class: 'texto--fuerte', id: 'titulo-convives' }, '¿Vives con alguien?'),
        el('p', {}, 'Si ya usa Vigía, pídele un código para unirte a su casa. Si no, puedes invitarle más tarde desde Ajustes.'),
        el('a', { class: 'boton boton--secundario boton--ajustado', href: '/hogar/unirse' }, 'Tengo un código')
      )
    );
  }

  cargar();
  return { titulo: 'Bienvenida', contenido: zona, pie: [crearSaltar(), boton] };
}

/** Paso 2: instalar la app. Si ya está instalada, no hace falta. */
function pasoInstalar() {
  if (estaInstalada()) {
    navegar('/bienvenida?paso=3', { reemplazar: true });
    return { titulo: 'Bienvenida', contenido: crearCarga('Cargando…') };
  }

  const siguiente = el('a', { class: 'boton boton--primario', href: '/bienvenida?paso=3' }, 'Siguiente');
  const resultado = el('div');
  let comoInstalar;

  if (esIos()) {
    // Safari no tiene un botón de instalar que se pueda programar.
    comoInstalar = el(
      'ol',
      { class: 'pasos' },
      el('li', {}, 'Pulsa el botón Compartir de Safari.'),
      el('li', {}, 'Elige «Añadir a pantalla de inicio».'),
      el('li', {}, 'Abre Vigía desde el icono nuevo.')
    );
  } else if (puedeInstalar()) {
    const boton = el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button' }, 'Instalar la app');
    boton.addEventListener('click', async () => {
      ponerCargando(boton, true, 'Instalando…');
      const aceptada = await instalarApp();
      boton.remove();
      resultado.replaceChildren(
        aceptada
          ? crearAviso({ tipo: 'exito', mensaje: '✓ Vigía instalada. Ábrela desde su icono la próxima vez.' })
          : crearAviso({ tipo: 'aviso', mensaje: 'No pasa nada: puedes instalarla más tarde desde el menú del navegador.' })
      );
    });
    comoInstalar = boton;
  } else {
    comoInstalar = el('p', {}, 'Puedes instalarla desde el menú del navegador: busca «Instalar Vigía» o «Añadir a pantalla de inicio».');
  }

  return {
    titulo: 'Bienvenida',
    atras: '/bienvenida',
    contenido: el(
      'div',
      { class: 'bienvenida' },
      crearEncabezado(2, 'Instala la app'),
      el('p', {}, 'Así Vigía se abre como una app, sin la barra del navegador. En el iPhone, además, es la única forma de recibir avisos.'),
      comoInstalar,
      resultado
    ),
    pie: [crearSaltar(), siguiente],
  };
}

/** Paso 3: activar los avisos (el mismo bloque que Ajustes). */
function pasoAvisos() {
  return {
    titulo: 'Bienvenida',
    atras: '/bienvenida?paso=2',
    contenido: el('div', { class: 'bienvenida' }, crearEncabezado(3, 'Activa los avisos'), crearPanelAvisos()),
    pie: [el('a', { class: 'boton boton--primario', href: '/' }, 'Terminar')],
  };
}
