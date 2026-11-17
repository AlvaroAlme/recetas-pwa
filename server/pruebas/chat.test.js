/**
 * @file Pruebas del chat (fase 8, D-51) que no necesitan base de datos ni
 * red: la vista de la conversación, las tarjetas como están ahora, los
 * huecos elegidos y la validación de /api/chat.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_CARACTERES_MENSAJE } from '../../compartido/constantes.js';
import { leerIdTarjeta, leerMensaje } from '../validacion/chat.js';
import {
  ESTADOS_HERRAMIENTA,
  bloqueFecha,
  huecosAhora,
  leerElegidos,
  loQueNombranLasTarjetas,
  tarjetaParaPantalla,
  vistaMensajes,
} from '../servicios/vistaChat.js';
import { DEFINICIONES } from '../servicios/herramientasChat.js';

const HOY = '2026-11-17';
const RECETA = { nombre: 'Pollo al ajillo', raciones: 2, ingredientes: [{ nombre: 'Pollo', cantidad: 500, unidad: 'g' }], pasos: ['Dóralo.'] };
const HUECOS = {
  huecos: [
    { fecha: '2026-11-19', tipo: 'cena', recetaId: null, plato: 'Merluza', grupo: 'pescado' },
    { fecha: '2026-11-18', tipo: 'cena', recetaId: 4, plato: null, grupo: null },
  ],
};

/** Una conversación guardada como la guarda chat.js: dos turnos. */
const FILAS = [
  { rol: 'user', contenido: [bloqueFecha(HOY), { type: 'text', text: '¿Qué ceno?' }] },
  {
    rol: 'assistant',
    contenido: [
      { type: 'thinking', thinking: '', signature: 'xyz' },
      { type: 'text', text: 'Miro tu nevera.' },
      { type: 'tool_use', id: 'toolu_1', name: 'leer_inventario', input: {} },
    ],
  },
  { rol: 'user', contenido: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: '{}' }] },
  {
    rol: 'assistant',
    contenido: [
      { type: 'text', text: 'Te propongo esto:' },
      { type: 'tool_use', id: 'toolu_mal', name: 'proponer_receta', input: { nombre: '' } },
      { type: 'tool_use', id: 'toolu_2', name: 'proponer_receta', input: RECETA },
    ],
  },
  {
    rol: 'user',
    contenido: [
      { type: 'tool_result', tool_use_id: 'toolu_mal', content: 'La receta no es válida.', is_error: true },
      { type: 'tool_result', tool_use_id: 'toolu_2', content: 'Tarjeta enseñada.' },
    ],
  },
  { rol: 'assistant', contenido: [{ type: 'text', text: '¿Te sirve?' }] },
  { rol: 'user', contenido: [bloqueFecha(HOY), { type: 'text', text: 'Y el cuadrante' }] },
  { rol: 'assistant', contenido: [{ type: 'tool_use', id: 'toolu_3', name: 'proponer_huecos', input: HUECOS }] },
  { rol: 'user', contenido: [{ type: 'tool_result', tool_use_id: 'toolu_3', content: 'Tarjeta enseñada.' }] },
  { rol: 'assistant', contenido: [{ type: 'text', text: 'Elige los que quieras.' }] },
];

describe('bloqueFecha()', () => {
  it('dice la fecha en palabras y en ISO', () => {
    assert.deepEqual(bloqueFecha(HOY), { type: 'text', text: '<hoy>Hoy es martes 17 de noviembre de 2026 (2026-11-17).</hoy>' });
  });
});

describe('ESTADOS_HERRAMIENTA', () => {
  it('hay un texto para cada herramienta', () => {
    for (const { name } of DEFINICIONES) assert.ok(ESTADOS_HERRAMIENTA[name], name);
  });
});

describe('vistaMensajes()', () => {
  const vista = vistaMensajes(FILAS, new Map([['toolu_2', { estado: 'guardada', resultado: { recetaId: 7 } }]]));

  it('tus mensajes sin la fecha, y cada turno del ayudante en UN mensaje', () => {
    assert.deepEqual(
      vista.map((m) => [m.rol, m.texto]),
      [
        ['tu', '¿Qué ceno?'],
        ['ayudante', 'Miro tu nevera.\n\nTe propongo esto:\n\n¿Te sirve?'],
        ['tu', 'Y el cuadrante'],
        ['ayudante', 'Elige los que quieras.'],
      ]
    );
  });

  it('nunca saca el razonamiento ni los tool_result', () => {
    const texto = JSON.stringify(vista);
    assert.ok(!texto.includes('signature'));
    assert.ok(!texto.includes('Tarjeta enseñada'));
  });

  it('solo las tarjetas de propuestas válidas, con su estado', () => {
    assert.deepEqual(
      vista[1].tarjetas.map((t) => [t.id, t.tipo, t.estado, t.resultado]),
      [['toolu_2', 'receta', 'guardada', { recetaId: 7 }]]
    );
    assert.deepEqual(
      vista[3].tarjetas.map((t) => [t.id, t.tipo, t.estado]),
      [['toolu_3', 'huecos', 'pendiente']]
    );
  });

  it('las herramientas de leer no son tarjetas', () => {
    assert.ok(vista.flatMap((m) => m.tarjetas).every((t) => t.id !== 'toolu_1'));
  });
});

describe('loQueNombranLasTarjetas()', () => {
  it('las fechas y las recetas de las tarjetas de huecos', () => {
    const vista = vistaMensajes(FILAS, new Map());
    assert.deepEqual(loQueNombranLasTarjetas(vista), { fechas: ['2026-11-19', '2026-11-18'], recetaIds: [4] });
  });
});

describe('huecosAhora()', () => {
  const recetas = new Map([[4, 'Pollo asado']]);

  it('ordenados, con su posición original, el nombre y lo que hay ahora', () => {
    const actuales = [{ fecha: '2026-11-19', tipo: 'cena', receta: null, texto: 'Pizza', fueraDeCasa: false, grupo: null }];
    const huecos = huecosAhora(HUECOS, { hoy: HOY, recetas, actuales });
    assert.deepEqual(
      huecos.map((h) => [h.indice, h.fecha, h.nombre, h.sustituyeA, h.noSePuede]),
      [
        [1, '2026-11-18', 'Pollo asado', null, null],
        [0, '2026-11-19', 'Merluza', 'Pizza', null],
      ]
    );
    assert.equal(huecos[1].texto, 'Merluza');
    assert.equal(huecos[0].texto, null);
  });

  it('marca lo que ya no se puede: pasado, "fuera de casa" o receta borrada', () => {
    const actuales = [{ fecha: '2026-11-19', tipo: 'cena', receta: null, texto: null, fueraDeCasa: true, grupo: null }];
    const pasado = huecosAhora(HUECOS, { hoy: '2026-11-19', recetas, actuales });
    assert.deepEqual(
      pasado.map((h) => h.noSePuede),
      ['pasado', 'fuera de casa']
    );
    const sinReceta = huecosAhora(HUECOS, { hoy: HOY, recetas: new Map(), actuales: [] });
    assert.equal(sinReceta[0].noSePuede, 'receta borrada');
    assert.equal(sinReceta[0].nombre, 'Receta borrada');
  });

  it('"fuera de casa" no sale como "sustituye a"', () => {
    const actuales = [{ fecha: '2026-11-19', tipo: 'cena', receta: null, texto: 'Boda', fueraDeCasa: true, grupo: null }];
    assert.equal(huecosAhora(HUECOS, { hoy: HOY, recetas, actuales })[1].sustituyeA, null);
  });

  it('con una entrada rara, ningún hueco', () => {
    assert.deepEqual(huecosAhora(null, { hoy: HOY, recetas, actuales: [] }), []);
  });
});

describe('tarjetaParaPantalla()', () => {
  const contexto = { hoy: HOY, recetas: new Map([[4, 'Pollo asado']]), actuales: [] };

  it('la receta, validada y sin la entrada en bruto', () => {
    const tarjeta = tarjetaParaPantalla({ id: 'toolu_2', tipo: 'receta', entrada: RECETA, estado: 'pendiente', resultado: null }, contexto);
    assert.equal(tarjeta.propuesta.nombre, 'Pollo al ajillo');
    assert.ok(!('entrada' in tarjeta));
  });

  it('los huecos, como están ahora', () => {
    const tarjeta = tarjetaParaPantalla({ id: 'toolu_3', tipo: 'huecos', entrada: HUECOS, estado: 'pendiente', resultado: null }, contexto);
    assert.equal(tarjeta.propuesta.huecos.length, 2);
  });
});

describe('leerElegidos()', () => {
  it('posiciones que existen, sin repetir', () => {
    assert.deepEqual(leerElegidos({ elegidos: [1, 0] }, 2), [1, 0]);
  });

  it('vacío, repetido, fuera de rango o no entero: no', () => {
    assert.equal(leerElegidos({ elegidos: [] }, 2), null);
    assert.equal(leerElegidos({ elegidos: [0, 0] }, 2), null);
    assert.equal(leerElegidos({ elegidos: [2] }, 2), null);
    assert.equal(leerElegidos({ elegidos: [0.5] }, 2), null);
    assert.equal(leerElegidos({ elegidos: ['0'] }, 2), null);
    assert.equal(leerElegidos({}, 2), null);
    assert.equal(leerElegidos(null, 2), null);
  });
});

describe('leerMensaje()', () => {
  it('quita los espacios de los lados', () => {
    assert.equal(leerMensaje({ texto: '  ¿Qué ceno?  ' }), '¿Qué ceno?');
  });

  it('vacío o sin texto: 400', () => {
    assert.throws(() => leerMensaje({ texto: '   ' }), { estado: 400 });
    assert.throws(() => leerMensaje({}), { estado: 400 });
    assert.throws(() => leerMensaje(null), { estado: 400 });
  });

  it(`hasta ${MAX_CARACTERES_MENSAJE} caracteres, ni uno más`, () => {
    assert.equal(leerMensaje({ texto: 'a'.repeat(MAX_CARACTERES_MENSAJE) }).length, MAX_CARACTERES_MENSAJE);
    assert.throws(() => leerMensaje({ texto: 'a'.repeat(MAX_CARACTERES_MENSAJE + 1) }), { estado: 400 });
  });
});

describe('leerIdTarjeta()', () => {
  it('un id de tool_use vale', () => {
    assert.equal(leerIdTarjeta('toolu_01AbC-9'), 'toolu_01AbC-9');
  });

  it('con caracteres raros o demasiado largo: 404', () => {
    assert.throws(() => leerIdTarjeta('../x'), { estado: 404 });
    assert.throws(() => leerIdTarjeta('a'.repeat(101)), { estado: 404 });
    assert.throws(() => leerIdTarjeta(''), { estado: 404 });
  });
});
