/**
 * @file Formulario de alta y edición de una receta (P-20, D-49): nombre,
 * raciones (opcional), una fila por ingrediente (nombre, cantidad y unidad)
 * y los pasos en un área de texto, uno por línea.
 *
 * Valido con validarReceta(), LA MISMA que usa el servidor (D-40): mismas
 * reglas y mismos mensajes, también los de cada fila ("ingredientes.2.cantidad").
 * Aquí no llamo a la API: me pasan alGuardar() y la pantalla decide qué hacer.
 */
import { MAX_INGREDIENTES_RECETA, MAX_LONGITUD_NOMBRE, UNIDADES } from '/compartido/constantes.js';
import { validarReceta } from '/compartido/validacion.js';
import { mensajeDeError } from '../api.js';
import { el } from '../dom.js';
import { entrar, salir } from '../movimiento.js';
import { sugerirNombres } from './sugerenciasNombre.js';
import { conMarca, crearAutocompletar, crearAviso, crearCampo, ponerCargando, ponerErrorCampo } from './ui/index.js';

/**
 * Una fila de ingrediente tal como la tengo en pantalla.
 * @typedef {Object} FilaIngrediente
 * @property {HTMLFieldSetElement} caja
 * @property {HTMLLegendElement} leyenda "Ingrediente 2" (solo para el lector).
 * @property {HTMLDivElement} nombre
 * @property {HTMLDivElement} cantidad
 * @property {HTMLDivElement} unidad
 * @property {HTMLButtonElement} quitar
 */

/** La cantidad como la escribimos aquí: 0.5 → "0,5". */
const cantidadATexto = (cantidad) => String(cantidad).replace('.', ',');

/**
 * El área de texto crece con lo que escribo, para ver todos los pasos sin
 * barra de desplazamiento. Primero la encojo y luego la pongo a la altura
 * de su contenido (scrollHeight), más el borde.
 * @param {HTMLTextAreaElement} area
 */
function crecer(area) {
  area.style.height = 'auto';
  area.style.height = `${area.scrollHeight + 2}px`;
}

/**
 * @param {{
 *   inicial?: import('/compartido/validacion.js').DatosReceta,
 *   textoBoton: string,
 *   alGuardar: (datos: import('/compartido/validacion.js').DatosReceta) => Promise<void>,
 *   buscarHistorial?: (texto: string) => Promise<{ nombre: string, unidad: string, ubicacion: string }[]>
 * }} opciones inicial: la receta al editar (sin ella, es un alta).
 * @returns {{ formulario: HTMLFormElement, boton: HTMLButtonElement }} El
 *   botón va aparte porque la pantalla lo pone en el pie.
 */
export function crearFormularioReceta({ inicial, textoBoton, alGuardar, buscarHistorial }) {
  const idFormulario = 'formulario-receta';
  let guardando = false;
  // Cada fila tiene su número para que sus campos y radios no se repitan, aunque borre filas.
  let siguienteFila = 0;
  /** @type {FilaIngrediente[]} */
  let filas = [];
  // Las filas que mandé la última vez: los errores "ingredientes.N" se refieren a ellas.
  /** @type {FilaIngrediente[]} */
  let filasEnviadas = [];

  const avisoGeneral = el('div');
  const nombre = crearCampo({
    etiqueta: 'Nombre',
    nombre: 'nombre',
    valor: inicial?.nombre,
    atributos: { placeholder: 'Ej. Tortilla de patatas', maxlength: MAX_LONGITUD_NOMBRE, autocomplete: 'off', autocapitalize: 'sentences' },
  });
  const raciones = crearCampo({
    etiqueta: ['Raciones ', el('span', { class: 'campo__opcional' }, '(opcional)')],
    nombre: 'raciones',
    valor: inicial?.raciones ? String(inicial.raciones) : undefined,
    ayuda: 'Solo para saber para cuántas personas es.',
    atributos: { placeholder: 'Ej. 4', inputmode: 'numeric', autocomplete: 'off' },
  });

  // Ingredientes: la lista de filas, su error general y el botón de añadir.
  const listaFilas = el('div', { class: 'ingredientes__filas' });
  const errorIngredientes = el('p', { class: 'campo__error', role: 'alert', hidden: true });
  const motivoTope = el('p', { class: 'campo__ayuda', id: 'motivo-tope-ingredientes', hidden: true }, `Como mucho ${MAX_INGREDIENTES_RECETA} ingredientes.`);
  const botonAnadir = el(
    'button',
    { class: 'boton boton--secundario', type: 'button', onclick: () => anadirFila(null, true) },
    conMarca('+ Añadir ingrediente')
  );

  const pasos = crearCampo({
    etiqueta: 'Pasos',
    nombre: 'pasos',
    elemento: 'textarea',
    valor: inicial?.pasos.join('\n'),
    ayuda: 'Escribe un paso por línea.',
    atributos: { rows: 4, autocapitalize: 'sentences', oninput: (evento) => crecer(evento.target) },
  });

  // type="submit" con form="…": envía el formulario aunque esté fuera de él (en el pie).
  const boton = el('button', { class: 'boton boton--primario', type: 'submit', form: idFormulario, 'data-escribe': true }, textoBoton);

  /**
   * Añado una fila de ingrediente al final.
   * @param {import('/compartido/validacion.js').DatosIngrediente | null} ingrediente Al editar, el que ya tenía.
   * @param {boolean} enfocar true cuando la añade la persona: el foco va a su nombre.
   */
  function anadirFila(ingrediente, enfocar) {
    const n = siguienteFila++;
    const nombreIngrediente = crearCampo({
      etiqueta: 'Ingrediente',
      nombre: `ingrediente-${n}`,
      valor: ingrediente?.nombre,
      atributos: { placeholder: 'Ej. Patatas', maxlength: MAX_LONGITUD_NOMBRE, autocomplete: 'off', autocapitalize: 'sentences' },
    });
    const cantidad = crearCampo({
      etiqueta: 'Cantidad',
      nombre: `cantidad-${n}`,
      valor: ingrediente ? cantidadATexto(ingrediente.cantidad) : undefined,
      atributos: { placeholder: 'Ej. 500', inputmode: 'decimal', autocomplete: 'off' },
    });
    const unidad = crearCampo({
      etiqueta: 'Unidad',
      nombre: `unidad-${n}`,
      elemento: 'select',
      valor: ingrediente?.unidad ?? 'g',
      opciones: UNIDADES.map((valor) => ({ valor, etiqueta: valor })),
    });
    // Si elijo algo que ya ha tenido mi casa, propongo su unidad; luego, a la cantidad.
    crearAutocompletar(nombreIngrediente, {
      buscar: (texto) => sugerirNombres(texto, buscarHistorial),
      alElegir: (sugerencia) => {
        if (sugerencia.datos) unidad.querySelector('select').value = sugerencia.datos.unidad;
        cantidad.querySelector('input').focus();
      },
    });

    const leyenda = el('legend', { class: 'solo-lector' });
    const quitar = el('button', { class: 'boton boton--fantasma boton--ajustado', type: 'button' }, 'Quitar');
    const caja = el(
      'fieldset',
      { class: 'tarjeta fila-ingrediente' },
      leyenda,
      nombreIngrediente,
      el('div', { class: 'fila-ingrediente__cantidad' }, cantidad, unidad),
      el('div', { class: 'fila-ingrediente__acciones' }, quitar)
    );
    /** @type {FilaIngrediente} */
    const fila = { caja, leyenda, nombre: nombreIngrediente, cantidad, unidad, quitar };
    quitar.addEventListener('click', () => quitarFila(fila));

    filas.push(fila);
    // Al pintar la receta no animo nada; solo la fila que añades tú (D-56).
    listaFilas.append(enfocar ? entrar(caja) : caja);
    actualizarFilas();
    if (enfocar) nombreIngrediente.querySelector('input').focus();
  }

  /**
   * Quito una fila. El foco no se pierde: va al nombre de la fila de antes
   * (o de la siguiente, si quité la primera).
   * @param {FilaIngrediente} fila
   */
  function quitarFila(fila) {
    const posicion = filas.indexOf(fila);
    filas = filas.filter((otra) => otra !== fila);
    // Sale con su animación; la quito del array ya, así que no cuenta.
    salir(fila.caja);
    actualizarFilas();
    (filas[posicion - 1] ?? filas[posicion])?.nombre.querySelector('input').focus();
  }

  /**
   * Después de añadir o quitar: renumero las leyendas, "Quitar" solo si hay
   * más de una fila y "Añadir" deshabilitado (con su motivo) al llegar al tope.
   */
  function actualizarFilas() {
    filas.forEach((fila, i) => {
      fila.leyenda.textContent = `Ingrediente ${i + 1}`;
      fila.quitar.hidden = filas.length === 1;
    });
    const lleno = filas.length >= MAX_INGREDIENTES_RECETA;
    botonAnadir.disabled = lleno;
    motivoTope.hidden = !lleno;
    if (lleno) botonAnadir.setAttribute('aria-describedby', motivoTope.id);
    else botonAnadir.removeAttribute('aria-describedby');
  }

  /**
   * Leo lo escrito tal cual lo espera validarReceta(). Las filas vacías del
   * todo (sin nombre ni cantidad) no cuentan: alguien puede añadir una de más.
   * @returns {{ datos: object, enviadas: FilaIngrediente[] }}
   */
  function leerFormulario() {
    const valor = (campo) => campo.querySelector('.campo__entrada').value;
    const enviadas = filas.filter((fila) => valor(fila.nombre).trim() !== '' || valor(fila.cantidad).trim() !== '');
    const textoRaciones = valor(raciones).trim();
    return {
      enviadas,
      datos: {
        nombre: valor(nombre),
        // Vacío = no lo sé. Si escribo "4,5" o "dos", validarReceta() dirá qué pasa.
        raciones: textoRaciones === '' ? null : Number(textoRaciones.replace(',', '.')),
        ingredientes: enviadas.map((fila) => ({
          nombre: valor(fila.nombre),
          // En España escribimos "0,5": lo paso a 0.5. Vacío da 0 y el validador lo rechaza.
          cantidad: Number(valor(fila.cantidad).replace(',', '.')),
          unidad: valor(fila.unidad),
        })),
        // Un paso por línea; las vacías las quita validarReceta().
        pasos: valor(pasos).split(/\r?\n/),
      },
    };
  }

  /**
   * Enseño los errores de cada campo (y quito los que ya no están) y llevo el
   * foco al primero, en el orden de la pantalla.
   * @param {Record<string, string>} errores Los de validarReceta() o los del servidor.
   */
  function mostrarErrores(errores) {
    // Los campos en el orden de la pantalla, con la clave de su error.
    const campos = [
      ['nombre', nombre],
      ['raciones', raciones],
      ...filas.flatMap((fila) => {
        const i = filasEnviadas.indexOf(fila);
        // Una fila vacía que no mandé no puede tener errores: la limpio.
        const clave = i === -1 ? 'sin-enviar' : `ingredientes.${i}`;
        return [
          [`${clave}.nombre`, fila.nombre],
          [`${clave}.cantidad`, fila.cantidad],
          [`${clave}.unidad`, fila.unidad],
        ];
      }),
      ['pasos', pasos],
    ];
    let primero = null;
    for (const [clave, campo] of campos) {
      ponerErrorCampo(campo, errores[clave]);
      if (errores[clave] && !primero) primero = campo;
    }

    // "Añade al menos un ingrediente" o "Como mucho 30": no es de ningún campo.
    errorIngredientes.replaceChildren(...(errores.ingredientes ? conMarca(`✗ ${errores.ingredientes}`) : []));
    errorIngredientes.hidden = !errores.ingredientes;
    if (errores.general) avisoGeneral.replaceChildren(crearAviso({ mensaje: errores.general }));

    if (primero) primero.querySelector('.campo__entrada').focus();
    else if (errores.ingredientes) filas[0]?.nombre.querySelector('input').focus();
  }

  /** @param {SubmitEvent} evento */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (guardando) return;
    avisoGeneral.replaceChildren();

    const { datos, enviadas } = leerFormulario();
    filasEnviadas = enviadas;
    const resultado = validarReceta(datos);
    mostrarErrores(resultado.ok ? {} : resultado.errores);
    if (!resultado.ok) return;

    guardando = true;
    ponerCargando(boton, true);
    try {
      await alGuardar(resultado.datos);
    } catch (error) {
      guardando = false;
      ponerCargando(boton, false);
      if (error.campos) {
        mostrarErrores(error.campos);
      } else {
        avisoGeneral.replaceChildren(
          crearAviso({ mensaje: mensajeDeError(error, 'No se ha guardado. Ha fallado el guardado de la receta. Inténtalo de nuevo.') })
        );
      }
    }
  }

  // Al editar, una fila por ingrediente; en un alta, una vacía.
  if (inicial) for (const ingrediente of inicial.ingredientes) anadirFila(ingrediente, false);
  else anadirFila(null, false);

  const formulario = el(
    'form',
    { class: 'formulario', id: idFormulario, novalidate: true, onsubmit: alEnviar },
    avisoGeneral,
    nombre,
    raciones,
    el(
      'section',
      { class: 'ingredientes', 'aria-labelledby': 'titulo-ingredientes' },
      el('h2', { class: 'titulo-seccion', id: 'titulo-ingredientes' }, 'Ingredientes'),
      errorIngredientes,
      listaFilas,
      botonAnadir,
      motivoTope
    ),
    pasos
  );
  // El área de texto aún no está en la página: la hago crecer cuando ya se ha pintado.
  requestAnimationFrame(() => crecer(pasos.querySelector('textarea')));
  return { formulario, boton };
}
