/**
 * @file Perfil (P-16, D-52): sustituye a Ajustes. Arriba, mi avatar vivo
 * (parpadea y mira hacia donde toco), mi nombre y mi email; debajo, un
 * apartado por fila, cada uno con un resumen de cómo está.
 */
import { estadoAvisos } from '../avisos.js';
import { crearAvatarVivo, mirarAlToque } from '../componentes/avatar.js';
import { crearFila } from '../componentes/ui/index.js';
import { el } from '../dom.js';
import { sinMovimiento } from '../movimiento.js';
import { pantallaDePerfil, quedan } from './comunPerfil.js';

/** Cómo resumo el estado de los avisos de este dispositivo (§7.6). */
const RESUMEN_AVISOS = Object.freeze({
  activados: 'Activados',
  desactivados: 'Desactivados',
  bloqueados: 'Bloqueados en este dispositivo',
  instalar: 'Instala la app para recibirlos',
  'no-compatible': 'Este navegador no puede recibirlos',
});

/**
 * @returns {import('../router.js').Vista}
 */
export function pantallaPerfil() {
  return pantallaDePerfil({
    titulo: 'Perfil',
    atras: '/',
    mensajeError: 'No se ha podido cargar tu perfil.',
    async pintar({ usuario, hogar, cuotaIa, cuotaChat }) {
      const avisos = await estadoAvisos();
      const personas = hogar.miembros.length === 1 ? '1 persona' : `${hogar.miembros.length} personas`;

      const avatar = crearAvatarVivo({ semilla: usuario.avatarSemilla, tamano: 96 });
      const cabecera = el(
        'section',
        { class: 'perfil__cabecera', 'aria-label': 'Tú' },
        avatar,
        el('h2', { class: 'perfil__nombre' }, usuario.nombre),
        el('p', { class: 'tono--tenue perfil__email' }, usuario.email)
      );
      // Mira hacia donde toque en la pantalla. Escucho en la cabecera y la
      // lista: al cambiar de pantalla desaparecen, y con ellas el escuchador.
      const apartados = el(
        'ul',
        { class: 'lista' },
        crearFila({ href: '/perfil/datos', titulo: 'Datos personales', tono: null, subtitulo: 'Tu nombre y tu avatar' }),
        crearFila({ href: '/perfil/seguridad', titulo: 'Seguridad', tono: null, subtitulo: 'Contraseña y sesiones' }),
        crearFila({ href: '/perfil/hogar', titulo: 'Hogar', tono: null, subtitulo: `${hogar.nombre} · ${personas}` }),
        crearFila({
          href: '/perfil/avisos',
          titulo: 'Avisos',
          tono: null, subtitulo: `${RESUMEN_AVISOS[avisos] ?? ''} · plan a las ${hogar.horaAvisoPlan}`,
        }),
        crearFila({
          href: '/perfil/ia',
          titulo: 'Inteligencia artificial',
          tono: null, subtitulo: `Te quedan ${quedan(cuotaIa)} tickets y ${quedan(cuotaChat)} mensajes hoy`,
        }),
        crearFila({ href: '/privacidad', titulo: 'Privacidad', tono: null, subtitulo: 'Qué datos guardamos y dónde' })
      );
      const todo = el('div', { class: 'perfil' }, cabecera, apartados, crearVersion());
      mirarAlToque(avatar, todo);
      return [todo];
    },
  });
}

/**
 * Abajo del todo, qué versión de la app tengo y si el sistema pide reducir
 * el movimiento. Sirve para saber, en el iPhone, si ya ha llegado lo último
 * (y por qué no se ven las animaciones, D-56). La versión es el nombre de
 * la caché del Service Worker (sw.js: VERSION, "app-v40").
 * @returns {HTMLElement}
 */
function crearVersion() {
  const texto = el('p', { class: 'tono--tenue perfil__version' });
  const movimiento = sinMovimiento() ? 'Reducir movimiento: activado' : 'Animaciones: activadas';
  texto.textContent = `Stockpot · ${movimiento}`;
  if ('caches' in window) {
    caches
      .keys()
      .then((nombres) => {
        const version = nombres.find((nombre) => /^app-v\d+$/.test(nombre));
        if (version) texto.textContent = `Stockpot ${version} · ${movimiento}`;
      })
      .catch(() => {});
  }
  return texto;
}
