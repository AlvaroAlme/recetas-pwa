/**
 * @file Pantalla Nuevo / editar producto (P-05). De momento solo el alta;
 * la edición llega en el paso 8e-3.
 */
import { UBICACIONES } from '/compartido/constantes.js';
import { api } from '../api.js';
import { crearFormularioProducto } from '../componentes/formularioProducto.js';
import { el } from '../dom.js';
import { navegar } from '../router.js';

/**
 * @param {{ parametros: Record<string, string>, consulta: URLSearchParams }} entrada
 * @returns {import('../router.js').Vista}
 */
export function pantallaProducto({ parametros, consulta }) {
  if (parametros.id) {
    return { titulo: 'Editar producto', contenido: el('p', {}, 'Aquí irá la edición (paso 8e-3).'), atras: '/' };
  }

  // La pestaña desde la que se pulsó "+ Producto". Viene de la URL: la valido.
  const pedida = consulta.get('ubicacion');
  const { formulario, boton } = crearFormularioProducto({
    ubicacionSugerida: UBICACIONES.includes(pedida) ? pedida : undefined,
    textoBoton: 'Añadir al inventario',
    alGuardar: async (datos) => {
      await api.post('/productos', datos);
      // Reemplazar: así "Atrás" desde el inventario no vuelve al formulario ya guardado.
      navegar(`/?ubicacion=${datos.ubicacion}`, {
        reemplazar: true,
        mensaje: `«${datos.nombre}» añadido al inventario.`,
      });
    },
  });

  return { titulo: 'Nuevo producto', contenido: formulario, pie: [boton], atras: '/' };
}