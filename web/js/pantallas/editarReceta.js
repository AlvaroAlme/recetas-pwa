/**
 * @file Pantalla Nueva / editar receta (P-20, D-49): /receta/nueva y
 * /receta/:id/editar. El formulario lo hace FormularioReceta; aquí llamo a
 * la API (POST o PUT /api/recetas) y, al guardar, voy a la receta.
 */
import { api, mensajeDeError } from '../api.js';
import { crearFormularioReceta } from '../componentes/formularioReceta.js';
import { crearAviso, crearCarga, crearSinConexion, crearVacio } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';

/**
 * Cómo pide el formulario el historial de nombres de mi casa: él no llama a la API.
 * @param {string} texto
 */
async function buscarHistorial(texto) {
  const { nombres } = await api.get(`/productos/nombres?q=${encodeURIComponent(texto.trim())}`);
  return nombres;
}

/**
 * @param {{ parametros: Record<string, string> }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaEditarReceta({ parametros }) {
  // El router ya ha comprobado que el id es un entero positivo.
  return parametros.id ? pantallaEditar(Number(parametros.id)) : pantallaNueva();
}

/**
 * Alta de una receta.
 * @returns {import('../router.js').Vista}
 */
function pantallaNueva() {
  const { formulario, boton } = crearFormularioReceta({
    textoBoton: 'Guardar receta',
    buscarHistorial,
    alGuardar: async (datos) => {
      const { id } = await api.post('/recetas', datos);
      // Reemplazar: así "Atrás" desde la receta no vuelve al formulario ya guardado.
      navegar(`/receta/${id}`, { reemplazar: true, mensaje: 'Receta guardada.' });
    },
  });
  return { titulo: 'Nueva receta', contenido: formulario, pie: [boton], atras: '/recetas' };
}

/**
 * Edición de una receta. Devuelvo la vista enseguida, con "Cargando…", y la
 * relleno cuando llega la receta (como Editar producto).
 * @param {number} id
 * @returns {import('../router.js').Vista}
 */
function pantallaEditar(id) {
  const zona = el('div');
  // El botón "Guardar cambios" no existe hasta tener la receta: le guardo el
  // sitio en el pie. Mientras está vacío, el pie no se ve (CSS :has).
  const ranuraBoton = el('div', { class: 'pie__ranura' });

  async function cargar() {
    zona.replaceChildren(crearCarga('Cargando…'));
    let receta;
    try {
      ({ receta } = await api.get(`/recetas/${id}`));
    } catch (error) {
      zona.replaceChildren(error.codigo === 'NO_EXISTE' ? crearNoExiste() : crearError(error));
      return;
    }
    const { formulario, boton } = crearFormularioReceta({
      inicial: receta,
      textoBoton: 'Guardar cambios',
      buscarHistorial,
      alGuardar: async (datos) => {
        await api.put(`/recetas/${id}`, datos);
        navegar(`/receta/${id}`, { reemplazar: true, mensaje: 'Cambios guardados.' });
      },
    });
    zona.replaceChildren(formulario);
    ranuraBoton.replaceChildren(boton);
  }

  function crearNoExiste() {
    return crearVacio({
      titulo: 'Esta receta ya no existe',
      descripcion: 'Puede que alguien de tu casa la haya borrado.',
      accion: el('a', { class: 'boton boton--secundario boton--ajustado', href: '/recetas' }, 'Volver a las recetas'),
    });
  }

  /** @param {import('../api.js').ErrorApi} error */
  function crearError(error) {
    if (error.codigo === 'SIN_CONEXION') return crearSinConexion(cargar);
    return crearAviso({
      mensaje: mensajeDeError(error, 'No se ha podido abrir la receta.'),
      accion: el('button', { class: 'boton boton--secundario boton--ajustado', type: 'button', onclick: cargar }, 'Reintentar'),
    });
  }

  cargar();
  return { titulo: 'Editar receta', contenido: zona, pie: [ranuraBoton], atras: `/receta/${id}` };
}
