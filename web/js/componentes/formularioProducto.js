/**
 * @file Formulario de alta y edición de un producto (FormularioProducto.tsx
 * de Expo), con la regla "¿Dónde lo guardas?" (DISENO_UI §7.2).
 *
 * Valido con validarProducto(), EL MISMO que usa el servidor (D-40): mismas
 * reglas y mismos mensajes. Aquí no llamo a la API: me pasan alGuardar() y
 * la pantalla decide qué hacer (crear o editar).
 */
import { UBICACIONES, UNIDADES } from '/compartido/constantes.js';
import { ETIQUETAS_UBICACION, ubicacionesPosibles } from '/compartido/ubicaciones.js';
import { validarProducto } from '/compartido/validacion.js';
import { el } from '../dom.js';
import {
  crearAviso,
  crearCampo,
  crearSelector,
  elegirEnSelector,
  leerSelector,
  ponerCargando,
  ponerErrorCampo,
  recomendarEnSelector,
} from './ui/index.js';

/**
 * Une las ubicaciones en una frase: ['nevera', 'congelador'] → "Nevera o Congelador".
 * @param {readonly string[]} ubicaciones
 * @returns {string}
 */
function listarUbicaciones(ubicaciones) {
  const nombres = ubicaciones.map((ubicacion) => ETIQUETAS_UBICACION[ubicacion]);
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} o ${nombres.at(-1)}` : nombres[0];
}

/**
 * @param {{
 *   inicial?: import('/compartido/validacion.js').DatosProducto,
 *   ubicacionSugerida?: string,
 *   textoBoton: string,
 *   alGuardar: (datos: import('/compartido/validacion.js').DatosProducto) => Promise<void>
 * }} opciones inicial: los datos al editar (sin él, es un alta).
 *   ubicacionSugerida: la pestaña desde la que se pulsó "+ Producto".
 * @returns {{ formulario: HTMLFormElement, boton: HTMLButtonElement }} El
 *   botón va aparte porque la pantalla lo pone en el pie.
 */
export function crearFormularioProducto({ inicial, ubicacionSugerida, textoBoton, alGuardar }) {
  const esNuevo = !inicial;
  const idFormulario = 'formulario-producto';
  // La ubicación que el usuario ha pulsado a mano (null = aún no ha elegido).
  let elegidaAMano = inicial?.ubicacion ?? null;
  let guardando = false;

  const avisoGeneral = el('div');
  const nombre = crearCampo({
    etiqueta: 'Nombre',
    nombre: 'nombre',
    valor: inicial?.nombre,
    atributos: {
      placeholder: 'Ej. Pechuga de pollo',
      maxlength: 80,
      autocapitalize: 'sentences',
      autocomplete: 'off',
      oninput: actualizarUbicacion,
    },
  });
  const cantidad = crearCampo({
    etiqueta: 'Cantidad',
    nombre: 'cantidad',
    valor: inicial ? String(inicial.cantidad).replace('.', ',') : undefined,
    atributos: { placeholder: 'Ej. 500', inputmode: 'decimal', autocomplete: 'off' },
  });
  const unidad = crearSelector({
    leyenda: 'Unidad',
    nombre: 'unidad',
    opciones: UNIDADES.map((valor) => ({ valor, etiqueta: valor })),
    seleccionado: inicial?.unidad ?? 'unidades',
  });
  const pregunta = el('div', { class: 'pregunta', role: 'status' });
  const ubicacion = crearSelector({
    leyenda: 'Ubicación',
    nombre: 'ubicacion',
    opciones: UBICACIONES.map((valor) => ({ valor, etiqueta: ETIQUETAS_UBICACION[valor] })),
    seleccionado: inicial?.ubicacion ?? null,
    alCambiar: (valor) => {
      elegidaAMano = valor;
      ponerErrorCampo(ubicacion, null);
      actualizarUbicacion();
    },
  });
  const caducidad = crearCampo({
    etiqueta: 'Caducidad (opcional)',
    nombre: 'caducidad',
    valor: inicial?.fechaCaducidad ?? undefined,
    atributos: { type: 'date' },
  });
  const quitarFecha = el(
    'button',
    {
      class: 'boton boton--fantasma boton--ajustado',
      type: 'button',
      onclick: () => {
        caducidad.querySelector('input').value = '';
      },
    },
    'Quitar fecha'
  );
  // type="submit" con form="…": envía el formulario aunque esté fuera de él (en el pie).
  const boton = el('button', { class: 'boton boton--primario', type: 'submit', form: idFormulario }, textoBoton);

  // Los campos en el orden de la pantalla: así el foco va al PRIMERO que falla.
  const CAMPOS = [
    ['nombre', nombre],
    ['cantidad', cantidad],
    ['unidad', unidad],
    ['ubicacion', ubicacion],
    ['fechaCaducidad', caducidad],
  ];

  /**
   * La regla de "¿Dónde lo guardas?". Se ejecuta con cada letra del nombre.
   * Una ubicación posible → la marco. Ninguna → la de la pestaña de la que
   * vengo. Varias y es un alta → no marco nada y pregunto.
   */
  function actualizarUbicacion() {
    const posibles = ubicacionesPosibles(nombre.querySelector('input').value);
    const hayQuePreguntar = esNuevo && posibles.length > 1 && elegidaAMano === null;

    if (elegidaAMano === null) {
      elegirEnSelector(ubicacion, hayQuePreguntar ? null : (posibles[0] ?? ubicacionSugerida ?? null));
    }
    recomendarEnSelector(ubicacion, hayQuePreguntar ? posibles : []);

    // Solo cambio el recuadro cuando cambia la pregunta: así el lector la
    // anuncia una vez, no con cada letra.
    const texto = hayQuePreguntar ? `Puede ir en ${listarUbicaciones(posibles)}.` : '';
    if (pregunta.dataset.texto !== texto) {
      pregunta.dataset.texto = texto;
      pregunta.replaceChildren(...(texto ? [el('strong', {}, '¿Dónde lo guardas?'), el('p', {}, texto)] : []));
    }
  }

  /**
   * Enseña los errores de cada campo (y quita los que ya no están) y lleva
   * el foco al primero. En la ubicación, al primer chip recomendado.
   * @param {Record<string, string>} errores
   */
  function mostrarErrores(errores) {
    let primero = null;
    for (const [clave, campo] of CAMPOS) {
      ponerErrorCampo(campo, errores[clave]);
      if (errores[clave] && !primero) primero = campo;
    }
    if (errores.general) avisoGeneral.replaceChildren(crearAviso({ mensaje: errores.general }));
    const destino = primero?.querySelector('.chip--recomendado')?.control ?? primero?.querySelector('input');
    destino?.focus();
  }

  /** @param {SubmitEvent} evento */
  async function alEnviar(evento) {
    evento.preventDefault();
    if (guardando) return;
    avisoGeneral.replaceChildren();

    const fecha = caducidad.querySelector('input').value;
    const resultado = validarProducto({
      nombre: nombre.querySelector('input').value,
      // En España escribimos "1,5": lo paso a 1.5. Vacío da 0 y el validador lo rechaza.
      cantidad: Number(cantidad.querySelector('input').value.replace(',', '.')),
      unidad: leerSelector(unidad),
      ubicacion: leerSelector(ubicacion),
      fechaCaducidad: fecha === '' ? null : fecha,
    });
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
          crearAviso({
            mensaje: error.codigo === 'SIN_CONEXION' ? error.message : 'No se ha podido guardar el producto. Inténtalo de nuevo.',
          })
        );
      }
    }
  }

  const formulario = el(
    'form',
    { class: 'formulario', id: idFormulario, novalidate: true, onsubmit: alEnviar },
    avisoGeneral,
    nombre,
    cantidad,
    unidad,
    el('div', {}, pregunta, ubicacion),
    el('div', { class: 'formulario__fecha' }, caducidad, quitarFecha)
  );
  actualizarUbicacion();
  return { formulario, boton };
}
