/**
 * @file Arranque del navegador: aquí digo qué pantalla va en cada URL.
 * También registro el Service Worker (sw.js), que guarda la app para abrirla sin red.
 */
import { escucharInstalacion } from './avisos.js';
import { iniciarConexion } from './conexion.js';
import { iniciarGestoAtras } from './gestoAtras.js';
import { logError } from './log.js';
import { iniciarRouter } from './router.js';
import { pantallaAyudante } from './pantallas/ayudante.js';
import { pantallaBienvenida } from './pantallas/bienvenida.js';
import { pantallaBorrarCuenta } from './pantallas/borrarCuenta.js';
import { pantallaCocinar } from './pantallas/cocinar.js';
import { pantallaConfirmarEmail } from './pantallas/confirmarEmail.js';
import { pantallaEditarReceta } from './pantallas/editarReceta.js';
import { pantallaEntrar } from './pantallas/entrar.js';
import { pantallaInventario } from './pantallas/inventario.js';
import { pantallaInvitar } from './pantallas/invitar.js';
import { pantallaLista } from './pantallas/lista.js';
import { pantallaNoExiste } from './pantallas/noExiste.js';
import { pantallaPerfil } from './pantallas/perfil.js';
import { pantallaPerfilAvisos } from './pantallas/perfilAvisos.js';
import { pantallaPerfilDatos } from './pantallas/perfilDatos.js';
import { pantallaPerfilHogar } from './pantallas/perfilHogar.js';
import { pantallaPerfilIa } from './pantallas/perfilIa.js';
import { pantallaPerfilSeguridad } from './pantallas/perfilSeguridad.js';
import { pantallaPlanDia } from './pantallas/planDia.js';
import { pantallaPlanificarHueco } from './pantallas/planificarHueco.js';
import { pantallaPrivacidad } from './pantallas/privacidad.js';
import { pantallaProducto } from './pantallas/producto.js';
import { pantallaReceta } from './pantallas/receta.js';
import { pantallaRecetas } from './pantallas/recetas.js';
import { pantallaRecuperar } from './pantallas/recuperar.js';
import { pantallaRegistro } from './pantallas/registro.js';
import { pantallaRestablecer } from './pantallas/restablecer.js';
import { pantallaSemana } from './pantallas/semana.js';
import { pantallaTicket } from './pantallas/ticket.js';
import { pantallaTupper } from './pantallas/tupper.js';
import { pantallaUnirse } from './pantallas/unirse.js';

/** Un id de la URL tiene que ser un entero positivo, como en el servidor. */
const ES_ID = /^[1-9]\d*$/;

iniciarConexion();
// Antes que el router: "beforeinstallprompt" puede llegar nada más cargar.
escucharInstalacion();
iniciarRouter({
  rutas: [
    // Públicas: no hace falta sesión.
    { patron: '/entrar', publica: true, pantalla: pantallaEntrar },
    { patron: '/registro', publica: true, pantalla: pantallaRegistro },
    { patron: '/privacidad', publica: true, pantalla: pantallaPrivacidad },
    // "¿Has olvidado la contraseña?" (D-53). /restablecer la abre el enlace del correo.
    { patron: '/recuperar', publica: true, pantalla: pantallaRecuperar },
    { patron: '/restablecer', publica: true, pantalla: pantallaRestablecer },
    // "Cambiar email" (D-53): la abre el enlace que llega al email nuevo.
    { patron: '/confirmar-email', publica: true, pantalla: pantallaConfirmarEmail },
    // Privadas: si no hay sesión, la API da 401 y api.js lleva a /entrar.
    { patron: '/', pestana: '/', pantalla: pantallaInventario },
    // La lista de la compra del hogar (P-30, D-54): quinta pestaña.
    { patron: '/lista', pestana: '/lista', pantalla: pantallaLista },
    // Perfil (P-16) y sus apartados (D-52): se abren con el avatar de la cabecera.
    { patron: '/perfil', pantalla: pantallaPerfil },
    { patron: '/perfil/datos', pantalla: pantallaPerfilDatos },
    { patron: '/perfil/seguridad', pantalla: pantallaPerfilSeguridad },
    { patron: '/perfil/hogar', pantalla: pantallaPerfilHogar },
    { patron: '/perfil/avisos', pantalla: pantallaPerfilAvisos },
    { patron: '/perfil/ia', pantalla: pantallaPerfilIa },
    // Antes era Ajustes: avisos y enlaces viejos llegan a Perfil.
    { patron: '/ajustes', redirigir: '/perfil', pantalla: pantallaPerfil },
    // El chat con la IA (P-21, D-51).
    { patron: '/ayudante', pestana: '/ayudante', pantalla: pantallaAyudante },
    { patron: '/recetas', pestana: '/recetas', pantalla: pantallaRecetas },
    // La semana de hoy, o la que empieza en ese lunes (la pantalla comprueba la fecha, D-50).
    { patron: '/semana', pestana: '/semana', pantalla: pantallaSemana },
    { patron: '/semana/:lunes', pestana: '/semana', pantalla: pantallaSemana },
    { patron: '/bienvenida', pantalla: pantallaBienvenida },
    { patron: '/hogar/invitar', pantalla: pantallaInvitar },
    { patron: '/hogar/unirse', pantalla: pantallaUnirse },
    { patron: '/cuenta/borrar', pantalla: pantallaBorrarCuenta },
    // "nuevo" va antes que ":id": si no, "nuevo" se tomaría por un id.
    { patron: '/producto/nuevo', pantalla: pantallaProducto },
    { patron: '/producto/:id', pantalla: pantallaProducto, validar: ({ id }) => ES_ID.test(id) },
    { patron: '/tupper/nuevo', pantalla: pantallaTupper },
    { patron: '/tupper/:id', pantalla: pantallaTupper, validar: ({ id }) => ES_ID.test(id) },
    { patron: '/ticket', pantalla: pantallaTicket },
    // Igual con las recetas: "nueva" antes que ":id" (P-20).
    { patron: '/receta/nueva', pantalla: pantallaEditarReceta },
    { patron: '/receta/:id', pantalla: pantallaReceta, validar: ({ id }) => ES_ID.test(id) },
    { patron: '/receta/:id/editar', pantalla: pantallaEditarReceta, validar: ({ id }) => ES_ID.test(id) },
    // "La he cocinado": ?receta=3 (la pantalla comprueba el id, P-12).
    { patron: '/cocinar', pantalla: pantallaCocinar },
    // Plan del día (P-15, lo abre el aviso) y Planificar hueco (P-14): /plan/2026-11-24
    // y /plan/2026-11-24/cena. Cada pantalla comprueba la fecha (y el tipo).
    { patron: '/plan/:fecha', pantalla: pantallaPlanDia },
    { patron: '/plan/:fecha/:tipo', pantalla: pantallaPlanificarHueco },
  ],
  noExiste: pantallaNoExiste,
});

// Los navegadores antiguos no tienen Service Worker: la app funciona igual, pero sin red no abre.
if ('serviceWorker' in navigator) {
  // ¿Me controlaba ya un Service Worker al abrir? Si sí, cuando llegue uno
  // nuevo recargo para usar su código. Si no (la primera visita), no hace
  // falta: lo que tengo ya es lo último.
  const habiaUno = Boolean(navigator.serviceWorker.controller);
  let recargando = false;

  navigator.serviceWorker.register('/sw.js').then(
    (registro) => {
      // La app instalada en el iPhone casi nunca se cierra del todo: al volver
      // del segundo plano no se carga de nuevo, así que tampoco busca versión
      // nueva. Se lo pido yo cada vez que vuelve a verse (2026-11-18).
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registro.update().catch(() => {});
      });
    },
    (error) => logError('No se ha podido registrar el Service Worker', error)
  );

  // El Service Worker nuevo ha tomado el control (skipWaiting + claim en
  // sw.js), pero esta página sigue con el código viejo cargado: recargo una
  // vez y ya va con el nuevo. Antes había que abrir la app dos veces.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!habiaUno || recargando) return;
    recargando = true;
    location.reload();
  });
}

// En el iPhone, Safari no aplica :active (el botón que se hunde al pulsarlo,
// D-56) si la página no escucha los toques. Con este escuchador vacío, sí.
document.addEventListener('touchstart', () => {}, { passive: true });

// En la app instalada, iOS no tiene gesto de "atrás": deslizar desde el
// borde izquierdo vuelve atrás (gestoAtras.js, D-56).
iniciarGestoAtras();
