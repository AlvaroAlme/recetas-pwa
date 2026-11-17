/**
 * @file Pruebas de las herramientas del chat (fase 8, D-51): los esquemas
 * que ve Claude y cómo compruebo y resumo. Sin base de datos ni red.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFINICIONES,
  MAX_HUECOS_PROPUESTA,
  fechasDePropuesta,
  leerLunesPedido,
  resumirInventario,
  resumirRecetas,
  resumirSemana,
  validarPropuestaHuecos,
  validarPropuestaReceta,
} from '../servicios/herramientasChat.js';

const HOY = '2026-11-17'; // martes

/** Recorro un esquema y le aplico una comprobación a cada objeto. */
function cadaObjeto(esquema, comprobar) {
  if (!esquema || typeof esquema !== 'object') return;
  if (esquema.type === 'object') comprobar(esquema);
  for (const valor of Object.values(esquema)) {
    if (Array.isArray(valor)) valor.forEach((v) => cadaObjeto(v, comprobar));
    else if (typeof valor === 'object') cadaObjeto(valor, comprobar);
  }
}

describe('DEFINICIONES', () => {
  it('son las 5, en este orden (si cambia el orden, se pierde la caché)', () => {
    assert.deepEqual(
      DEFINICIONES.map((d) => d.name),
      ['leer_inventario', 'leer_recetas', 'leer_semana', 'proponer_receta', 'proponer_huecos']
    );
  });

  it('todas con strict y eager_input_streaming', () => {
    for (const definicion of DEFINICIONES) {
      assert.equal(definicion.strict, true, definicion.name);
      assert.equal(definicion.eager_input_streaming, true, definicion.name);
    }
  });

  it('cada objeto: additionalProperties false y todos sus campos obligatorios (strict)', () => {
    for (const definicion of DEFINICIONES) {
      cadaObjeto(definicion.input_schema, (objeto) => {
        assert.equal(objeto.additionalProperties, false, definicion.name);
        assert.deepEqual([...objeto.required].sort(), Object.keys(objeto.properties).sort(), definicion.name);
      });
    }
  });

  it('sin los límites que strict no admite (minimum, maxLength…)', () => {
    const texto = JSON.stringify(DEFINICIONES);
    for (const prohibido of ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems']) {
      assert.ok(!texto.includes(`"${prohibido}"`), prohibido);
    }
  });

  it('no se pueden cambiar sin querer', () => {
    assert.throws(() => DEFINICIONES.push({}));
    assert.throws(() => {
      DEFINICIONES[0].name = 'otra';
    });
  });
});

describe('resumirInventario()', () => {
  const productos = [
    { id: 1, nombre: 'Arroz', cantidad: 1, unidad: 'kg', ubicacion: 'despensa', fechaCaducidad: null },
    { id: 2, nombre: 'Pollo', cantidad: 500, unidad: 'g', ubicacion: 'nevera', fechaCaducidad: '2026-11-18' },
    { id: 3, nombre: 'Yogur', cantidad: 2, unidad: 'unidades', ubicacion: 'nevera', fechaCaducidad: '2026-11-16' },
  ];
  const tuppers = [{ id: 9, nombre: 'Cocido', ubicacion: 'nevera', fechaLimite: '2026-11-19', consumido: false }];

  it('lo que caduca antes, primero; sin caducidad, al final; días desde el hoy de la casa', () => {
    const resumen = resumirInventario({ productos, tuppers }, HOY);
    assert.equal(resumen.hoy, HOY);
    assert.deepEqual(
      resumen.productos.map((p) => [p.nombre, p.diasParaCaducar]),
      [
        ['Yogur', -1],
        ['Pollo', 1],
        ['Arroz', null],
      ]
    );
    assert.deepEqual(resumen.tuppers, [{ nombre: 'Cocido', ubicacion: 'nevera', fechaLimite: '2026-11-19', diasParaCaducar: 2 }]);
  });

  it('no manda ids ni nada que el modelo no necesite', () => {
    const resumen = resumirInventario({ productos, tuppers }, HOY);
    assert.ok(!('id' in resumen.productos[0]));
    assert.ok(!('id' in resumen.tuppers[0]));
  });

  it('no cambia las listas que recibe', () => {
    const copia = structuredClone(productos);
    resumirInventario({ productos, tuppers }, HOY);
    assert.deepEqual(productos, copia);
  });
});

describe('resumirRecetas()', () => {
  const receta = { id: 4, nombre: 'Tortilla', raciones: 2, ingredientes: [{ nombre: 'Huevos', cantidad: 4, unidad: 'unidades' }] };

  it('con el id para poder usarla en el cuadrante, y sin aviso si están todas', () => {
    assert.deepEqual(resumirRecetas([receta], 1), { recetas: [receta] });
  });

  it('avisa si hay más de las que ve', () => {
    assert.match(resumirRecetas([receta], 150).aviso, /150 recetas; solo ves las 1/);
  });
});

describe('leerLunesPedido()', () => {
  it('null (o nada) es la semana de hoy', () => {
    assert.deepEqual(leerLunesPedido({ lunes: null }, HOY), { ok: true, lunes: '2026-11-16' });
    assert.deepEqual(leerLunesPedido({}, HOY), { ok: true, lunes: '2026-11-16' });
  });

  it('un lunes dentro del margen vale', () => {
    assert.deepEqual(leerLunesPedido({ lunes: '2026-11-23' }, HOY), { ok: true, lunes: '2026-11-23' });
  });

  it('un martes o una fecha mal escrita, no', () => {
    assert.equal(leerLunesPedido({ lunes: '2026-11-24' }, HOY).ok, false);
    assert.equal(leerLunesPedido({ lunes: 'mañana' }, HOY).ok, false);
  });

  it('fuera del año de margen, no', () => {
    assert.equal(leerLunesPedido({ lunes: '2028-01-03' }, HOY).ok, false);
  });
});

describe('resumirSemana()', () => {
  const huecos = [
    { fecha: '2026-11-16', tipo: 'comida', receta: null, texto: 'Lentejas', fueraDeCasa: false, grupo: 'legumbres' },
    { fecha: '2026-11-17', tipo: 'comida', receta: { id: 4, nombre: 'Pollo asado' }, texto: null, fueraDeCasa: false, grupo: 'carne_blanca' },
    { fecha: '2026-11-17', tipo: 'cena', receta: null, texto: 'Pollo al curry', fueraDeCasa: false, grupo: 'carne_blanca' },
    { fecha: '2026-11-20', tipo: 'cena', receta: null, texto: 'Comida aniversario', fueraDeCasa: true, grupo: null },
  ];
  const semana = resumirSemana('2026-11-16', huecos, HOY);

  it('los 7 días, de lunes a domingo, con el hoy y el texto de la semana', () => {
    assert.equal(semana.hoy, HOY);
    assert.equal(semana.semana, 'Semana del 16 al 22 de noviembre');
    assert.deepEqual(
      semana.dias.map((d) => d.fecha),
      ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']
    );
    assert.equal(semana.dias[1].dia, 'Martes 17');
  });

  it('libre, plato, receta y "fuera de casa" con su nota', () => {
    assert.deepEqual(semana.dias[0].comida, { plato: 'Lentejas', grupo: 'legumbres' });
    assert.equal(semana.dias[0].cena, 'libre');
    assert.deepEqual(semana.dias[1].comida, { receta: { id: 4, nombre: 'Pollo asado' }, grupo: 'carne_blanca' });
    assert.deepEqual(semana.dias[4].cena, { fueraDeCasa: true, nota: 'Comida aniversario' });
  });

  it('marca los días pasados', () => {
    assert.equal(semana.dias[0].pasado, true);
    assert.equal(semana.dias[1].pasado, undefined);
  });

  it('los avisos van en su día, como en la pantalla', () => {
    assert.equal(semana.dias[1].avisos.length, 1);
    assert.equal(semana.dias[0].avisos, undefined);
  });

  it('el equilibrio de AESAN', () => {
    const legumbres = semana.equilibrio.find((linea) => linea.grupo === 'Legumbres');
    assert.deepEqual(legumbres, { grupo: 'Legumbres', veces: '1 de 4 o más', estado: 'faltan' });
  });
});

describe('validarPropuestaReceta()', () => {
  const buena = {
    nombre: 'Pollo al ajillo',
    raciones: 2,
    ingredientes: [{ nombre: 'Pollo', cantidad: 500, unidad: 'g' }],
    pasos: ['Trocea el pollo.', 'Dóralo con ajo.'],
  };

  it('una receta válida pasa, igual que en el formulario', () => {
    const resultado = validarPropuestaReceta(buena);
    assert.equal(resultado.ok, true);
    assert.equal(resultado.datos.nombre, 'Pollo al ajillo');
  });

  it('raciones null vale', () => {
    assert.equal(validarPropuestaReceta({ ...buena, raciones: null }).ok, true);
  });

  it('los errores van en una línea, con el campo', () => {
    const resultado = validarPropuestaReceta({ ...buena, nombre: '', pasos: [] });
    assert.equal(resultado.ok, false);
    assert.match(resultado.error, /nombre: Escribe el nombre/);
    assert.match(resultado.error, /pasos: Escribe al menos un paso/);
  });

  it('una unidad que no existe, no', () => {
    const resultado = validarPropuestaReceta({ ...buena, ingredientes: [{ nombre: 'Sal', cantidad: 1, unidad: 'pizca' }] });
    assert.match(resultado.error, /ingredientes\.0\.unidad/);
  });
});

describe('fechasDePropuesta()', () => {
  it('las fechas válidas, sin repetir', () => {
    const entrada = { huecos: [{ fecha: '2026-11-18' }, { fecha: '2026-11-18' }, { fecha: 'ayer' }, null, { fecha: '2026-11-19' }] };
    assert.deepEqual(fechasDePropuesta(entrada), ['2026-11-18', '2026-11-19']);
  });

  it('con una entrada rara, ninguna', () => {
    assert.deepEqual(fechasDePropuesta(null), []);
    assert.deepEqual(fechasDePropuesta({ huecos: 'no' }), []);
  });
});

describe('validarPropuestaHuecos()', () => {
  const recetas = new Map([[4, 'Pollo asado']]);
  const actuales = [
    { fecha: '2026-11-19', tipo: 'cena', receta: null, texto: 'Pizza', fueraDeCasa: false, grupo: 'otro' },
    { fecha: '2026-11-20', tipo: 'cena', receta: null, texto: 'Comida aniversario', fueraDeCasa: true, grupo: null },
  ];
  const contexto = { hoy: HOY, recetas, actuales };
  const hueco = (cambios) => ({ fecha: '2026-11-18', tipo: 'cena', recetaId: null, plato: 'Lentejas', grupo: 'legumbres', ...cambios });

  it('una propuesta buena: con el nombre, lo que sustituye y ordenada', () => {
    const resultado = validarPropuestaHuecos(
      {
        huecos: [
          hueco({ fecha: '2026-11-19', plato: 'Merluza', grupo: 'pescado' }),
          hueco({ tipo: 'cena' }),
          hueco({ tipo: 'comida', recetaId: 4, plato: null, grupo: null }),
        ],
      },
      contexto
    );
    assert.equal(resultado.ok, true);
    assert.deepEqual(
      resultado.huecos.map((h) => [h.fecha, h.tipo, h.nombre, h.sustituyeA]),
      [
        ['2026-11-18', 'comida', 'Pollo asado', null],
        ['2026-11-18', 'cena', 'Lentejas', null],
        ['2026-11-19', 'cena', 'Merluza', 'Pizza'],
      ]
    );
    assert.equal(resultado.huecos[0].recetaId, 4);
    assert.equal(resultado.huecos[1].texto, 'Lentejas');
  });

  it('hoy vale; ayer no (D-51: de hoy en adelante)', () => {
    assert.equal(validarPropuestaHuecos({ huecos: [hueco({ fecha: HOY })] }, contexto).ok, true);
    const ayer = validarPropuestaHuecos({ huecos: [hueco({ fecha: '2026-11-16' })] }, contexto);
    assert.equal(ayer.ok, false);
    assert.match(ayer.error, /día pasado/);
  });

  it('un hueco "fuera de casa" NO se toca', () => {
    const resultado = validarPropuestaHuecos({ huecos: [hueco({ fecha: '2026-11-20' })] }, contexto);
    assert.equal(resultado.ok, false);
    assert.match(resultado.error, /fuera de casa/);
  });

  it('una receta que no es de la casa, no', () => {
    const resultado = validarPropuestaHuecos({ huecos: [hueco({ recetaId: 99, plato: null })] }, contexto);
    assert.match(resultado.error, /id 99/);
  });

  it('receta y plato a la vez, o ninguno, no', () => {
    assert.equal(validarPropuestaHuecos({ huecos: [hueco({ recetaId: 4 })] }, contexto).ok, false);
    assert.equal(validarPropuestaHuecos({ huecos: [hueco({ plato: null })] }, contexto).ok, false);
  });

  it('el mismo día y comida dos veces, no', () => {
    const resultado = validarPropuestaHuecos({ huecos: [hueco(), hueco({ plato: 'Garbanzos' })] }, contexto);
    assert.match(resultado.error, /Hueco 2 .*repetido/);
  });

  it('un grupo que no existe o un tipo raro, no', () => {
    assert.equal(validarPropuestaHuecos({ huecos: [hueco({ grupo: 'dulces' })] }, contexto).ok, false);
    assert.equal(validarPropuestaHuecos({ huecos: [hueco({ tipo: 'desayuno' })] }, contexto).ok, false);
  });

  it('un plato de más de 80 caracteres, no', () => {
    assert.equal(validarPropuestaHuecos({ huecos: [hueco({ plato: 'a'.repeat(81) })] }, contexto).ok, false);
  });

  it('da TODOS los errores a la vez, uno por línea', () => {
    const resultado = validarPropuestaHuecos({ huecos: [hueco({ fecha: '2026-11-16' }), hueco({ fecha: '2026-11-20' })] }, contexto);
    assert.equal(resultado.error.split('\n').length, 2);
  });

  it(`de 1 a ${MAX_HUECOS_PROPUESTA} huecos`, () => {
    assert.equal(validarPropuestaHuecos({ huecos: [] }, contexto).ok, false);
    const quince = Array.from({ length: 15 }, (_, i) => hueco({ fecha: `2026-12-${String(i + 1).padStart(2, '0')}` }));
    assert.equal(validarPropuestaHuecos({ huecos: quince.slice(0, 14) }, contexto).ok, true);
    assert.equal(validarPropuestaHuecos({ huecos: quince }, contexto).ok, false);
  });

  it('una entrada que no es una propuesta, no', () => {
    assert.equal(validarPropuestaHuecos(null, contexto).ok, false);
    assert.equal(validarPropuestaHuecos({ huecos: [null] }, contexto).ok, false);
  });
});
