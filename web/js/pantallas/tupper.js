/**
 * @file Pantallas de los tuppers: Nuevo tupper (P-06, /tupper/nuevo?ubicacion=…)
 * y la ficha (P-07, /tupper/12), que es la que abre el aviso. En la ficha la
 * acción principal es "Marcar como consumido": el aviso no puede llevar ese
 * botón porque iOS no admite botones en las notificaciones web (R-03).
 */
import { MAX_DIAS_TUPPER, UBICACIONES } from '/compartido/constantes.js';
import { hoyIso, isoATexto, sumarDias } from '/compartido/fechas.js';
import { avisoCaducidad } from '/compartido/formato.js';
import { ETIQUETAS_UBICACION } from '/compartido/ubicaciones.js';
import { validarTupper } from '/compartido/validacion.js';
import { api, mensajeDeError } from '../api.js';
import { estadoAvisos } from '../avisos.js';
import {
  crearAviso,
  crearCampo,
  crearCarga,
  crearSelector,
  crearSinConexion,
  crearVacio,
  leerSelector,
  ponerCargando,
  ponerErrorCampo,
} from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';

/** Días por defecto, como en Expo (DISENO_UI §7.4). */
const DIAS_POR_DEFECTO = 3;

/**
 * @param {{ parametros: Record<string, string>, consulta: URLSearchParams }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaTupper({ parametros, consulta }) {
  // El router ya ha comprobado que el id es un entero positivo.
  return parametros.id ? pantallaFicha(Number(parametros.id)) : pantallaNuevo(consulta);
}

/**
 * El texto de la vista previa: cuándo llega al límite y cuándo avisaré.
 * El aviso sale el día anterior al límite a las 10:00 (§7.2).
 *
 * shortcut: uso la fecha y la hora de ESTE dispositivo, no las de la zona de
 * la casa. Solo es una vista previa (la fecha buena la calcula el servidor);
 * si algún día hay casas en otra zona, habría que pedírsela a /api/yo.
 * @param {number} dias Ya validados (de 1 a 365).
 * @returns {string[]} Dos frases: la fecha límite y el aviso.
 */
function textoVistaPrevia(dias) {
  const hoy = hoyIso();
  const limite = sumarDias(hoy, dias);
  const diaAviso = sumarDias(limite, -1);
  let aviso;
  if (diaAviso !== hoy) {
    aviso = `Te avisaremos el ${isoATexto(diaAviso)} a las 10:00.`;
  } else if (new Date().getHours() < 10) {
    aviso = 'Te avisaremos hoy a las 10:00.';
  } else {
    // Ya han pasado las 10:00: sale en el siguiente ping (≤ 5 min, DIF-02).
    aviso = 'Como el límite es mañana, el aviso llegará en unos minutos.';
  }
  return [`Fecha límite: ${isoATexto(limite)}`, aviso];
}

/**
 * Alta de un tupper (P-06).
 * @param {URLSearchParams} consulta
 * @returns {import('../router.js').Vista}
 */
function pantallaNuevo(consulta) {
  const idFormulario = 'formulario-tupper';
  // La pestaña desde la que se pulsó "+ Tupper". Viene de la URL: la valido.
  const pedida = consulta.get('ubicacion');
  let guardando = false;

  const avisoGeneral = el('div');
  const nombre = crearCampo({
    etiqueta: '¿Qué hay en el tupper?',
    nombre: 'nombre',
    atributos: { placeholder: 'Ej. Cocido', maxlength: 80, autocapitalize: 'sentences', autocomplete: 'off' },
  });
  const ubicacion = crearSelector({
    leyenda: 'Ubicación',
    nombre: 'ubicacion',
    opciones: UBICACIONES.map((valor) => ({ valor, etiqueta: ETIQUETAS_UBICACION[valor] })),
    seleccionado: UBICACIONES.includes(pedida) ? pedida : 'nevera',
    alCambiar: () => ponerErrorCampo(ubicacion, null),
  });
  const dias = crearCampo({
    etiqueta: 'Días máximos que aguanta',
    nombre: 'dias',
    valor: String(DIAS_POR_DEFECTO),
    ayuda: `Cuántos días se puede comer desde hoy (de 1 a ${MAX_DIAS_TUPPER}). Un guiso en la nevera suele aguantar 3 o 4.`,
    atributos: { inputmode: 'numeric', pattern: '[0-9]*', maxlength: 3, autocomplete: 'off', oninput: actualizarVistaPrevia },
  });
  // aria-live: el lector anuncia la fecha nueva al cambiar los días, sin mover el foco.
  const vistaPrevia = el('article', { class: 'tarjeta', 'aria-live': 'polite' });
  const boton = el(
    'button',
    { class: 'boton boton--primario', type: 'submit', form: idFormulario, 'data-escribe': true },
    'Guardar tupper'
  );

  /** Lo que hay escrito en "días", como número (vacío o con letras → NaN). */
  const leerDias = () => {
    const texto = dias.querySelector('input').value.trim();
    return /^\d+$/.test(texto) ? Number(texto) : NaN;
  };

  function actualizarVistaPrevia() {
    const valor = leerDias();
    const valido = Number.isInteger(valor) && valor >= 1 && valor <= MAX_DIAS_TUPPER;
    const frases = valido ? textoVistaPrevia(valor) : ['Escribe los días para ver la fecha límite.'];
    // Solo lo cambio si cambia: así el lector no repite lo mismo con cada tecla.
    const texto = frases.join(' ');
    if (vistaPrevia.dataset.texto === texto) return;
    vistaPrevia.dataset.texto = texto;
    vistaPrevia.replaceChildren(
      ...frases.map((frase, posicion) => el('p', { class: posicion === 0 && valido ? 'texto--fuerte' : '' }, frase))
    );
  }

  /** @param {Record<string, string>} errores */
  function mostrarErrores(errores) {
    const campos = [
      ['nombre', nombre],
      ['ubicacion', ubicacion],
      ['diasMaximos', dias],
    ];
    let primero = null;
    for (const [clave, campo] of campos) {
      ponerErrorCampo(campo, errores[clave]);
      if (errores[clave] && !primero) primero = campo;
    }
    if (errores.general) avisoGeneral.replaceChildren(crearAviso({ mensaje: errores.general }));
    primero?.querySelector('input')?.focus();
  }

  /** @param {SubmitEvent} evento */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (guardando) return;
    avisoGeneral.replaceChildren();

    const resultado = validarTupper({
      nombre: nombre.querySelector('input').value,
      ubicacion: leerSelector(ubicacion),
      diasMaximos: leerDias(),
    });
    mostrarErrores(resultado.ok ? {} : resultado.errores);
    if (!resultado.ok) return;

    guardando = true;
    ponerCargando(boton, true);
    try {
      const { avisoActivo } = await api.post('/tuppers', resultado.datos);
      navegar(`/?ubicacion=${resultado.datos.ubicacion}`, {
        reemplazar: true,
        mensaje: avisoActivo
          ? `Tupper de ${resultado.datos.nombre} guardado.`
          : { tipo: 'aviso', texto: 'Tupper guardado sin aviso: nadie de tu casa tiene los avisos activados.' },
      });
    } catch (error) {
      guardando = false;
      ponerCargando(boton, false);
      if (error.campos) {
        mostrarErrores(error.campos);
      } else {
        avisoGeneral.replaceChildren(
          crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido guardar el tupper. Inténtalo de nuevo.') })
        );
      }
    }
  }

  // "Este dispositivo no tiene los avisos activos" (§7.4, paso 3): lo pongo
  // cuando sé el estado, si se pueden activar o desbloquear desde Ajustes.
  const avisoDispositivo = el('div');
  estadoAvisos()
    .then((estado) => {
      if (!['desactivados', 'bloqueados', 'instalar'].includes(estado)) return;
      avisoDispositivo.replaceChildren(
        crearAviso({
          tipo: 'aviso',
          mensaje: 'Este dispositivo no tiene los avisos activos.',
          accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/ajustes' }, 'Activar avisos'),
        })
      );
    })
    .catch(() => {});

  const formulario = el(
    'form',
    { class: 'formulario', id: idFormulario, novalidate: true, onsubmit: alEnviar },
    avisoGeneral,
    nombre,
    ubicacion,
    dias,
    vistaPrevia,
    avisoDispositivo
  );
  actualizarVistaPrevia();
  return { titulo: 'Nuevo tupper', contenido: formulario, pie: [boton], atras: '/' };
}

/**
 * Ficha de un tupper (P-07). Devuelvo la vista enseguida, con "Cargando…",
 * y la relleno cuando llega el tupper (como Editar producto).
 * @param {number} id
 * @returns {import('../router.js').Vista}
 */
function pantallaFicha(id) {
  const zona = el('div');
  // El botón solo existe si el tupper no está consumido. Mientras la ranura
  // está vacía, el pie no se ve (CSS :has).
  const ranuraBoton = el('div', { class: 'pie__ranura' });

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando…'));
    ranuraBoton.replaceChildren();
    let tupper;
    try {
      ({ tupper } = await api.get(`/tuppers/${id}`));
    } catch (error) {
      zona.replaceChildren(error.codigo === 'NO_EXISTE' ? crearNoExiste() : crearError(error));
      return;
    }
    const aviso = el('div');
    zona.replaceChildren(aviso, crearDatos(tupper));
    if (!tupper.consumido) ranuraBoton.replaceChildren(crearBotonConsumir(tupper, aviso));
  }

  /**
   * Nombre, dónde está, la fecha límite y su estado. Si ya está consumido
   * (lo hizo otra persona de la casa), lo digo con texto y en verde.
   * @param {any} tupper
   */
  function crearDatos(tupper) {
    const estado = tupper.consumido
      ? el('p', { class: 'ficha__estado ficha__estado--exito' }, '✓ Consumido')
      : (() => {
          const { texto, tono } = avisoCaducidad(tupper.fechaLimite);
          return el('p', { class: `ficha__estado tono--${tono}` }, texto);
        })();
    return el(
      'article',
      { class: 'ficha' },
      el('h2', { class: 'ficha__nombre' }, tupper.nombre),
      el('p', {}, `Guardado en ${ETIQUETAS_UBICACION[tupper.ubicacion]}`),
      el('p', {}, `Fecha límite: ${isoATexto(tupper.fechaLimite)}`),
      estado
    );
  }

  /**
   * @param {any} tupper
   * @param {HTMLElement} aviso Donde enseño el error si falla.
   */
  function crearBotonConsumir(tupper, aviso) {
    const boton = el(
      'button',
      { class: 'boton boton--primario', type: 'button', 'data-escribe': true },
      'Marcar como consumido'
    );
    boton.addEventListener('click', async () => {
      if (boton.disabled) return;
      ponerCargando(boton, true);
      try {
        await api.post(`/tuppers/${id}/consumir`);
        navegar(`/?ubicacion=${tupper.ubicacion}`, {
          reemplazar: true,
          mensaje: `«${tupper.nombre}» marcado como consumido.`,
        });
      } catch (error) {
        ponerCargando(boton, false);
        aviso.replaceChildren(crearAviso({ mensaje: mensajeDeError(error, 'No se ha podido marcar como consumido.') }));
      }
    });
    return boton;
  }

  function crearNoExiste() {
    return crearVacio({
      titulo: 'Este tupper ya no existe',
      descripcion: 'Puede que ya no esté en tu casa.',
      accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/' }, 'Volver al inventario'),
    });
  }

  /** @param {import('../api.js').ErrorApi} error */
  function crearError(error) {
    if (error.codigo === 'SIN_CONEXION') return crearSinConexion(cargar);
    return crearAviso({
      mensaje: mensajeDeError(error, 'No se ha podido cargar el tupper.'),
      accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
    });
  }

  cargar();
  return { titulo: 'Tupper', contenido: zona, pie: [ranuraBoton], atras: '/' };
}
