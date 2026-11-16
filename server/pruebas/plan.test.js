/**
 * @file Pruebas del cuadrante en compartido/: las semanas (plan.js) y
 * validarHueco() (validacion.js), y la validación de /api/plan, fase 7.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GRUPOS_ALIMENTOS, MAX_LONGITUD_NOMBRE } from '../../compartido/constantes.js';
import { ETIQUETAS_GRUPO, dentroDelMargen, esLunes, lunesDe, textoSemana } from '../../compartido/plan.js';
import { validarHueco } from '../../compartido/validacion.js';
import { leerFechaPlan, leerHueco, leerLunes, leerTipo } from '../validacion/plan.js';

describe('lunesDe', () => {
  it('un lunes es su propio lunes', () => {
    assert.equal(lunesDe('2026-11-23'), '2026-11-23');
  });

  it('el domingo es el ÚLTIMO día de la semana, no el primero', () => {
    assert.equal(lunesDe('2026-11-29'), '2026-11-23');
  });

  it('cruza de mes y de año hacia atrás', () => {
    assert.equal(lunesDe('2026-12-03'), '2026-11-30');
    assert.equal(lunesDe('2027-01-01'), '2026-12-28');
  });

  it('no le afecta el cambio de hora (29 de marzo de 2026, domingo)', () => {
    assert.equal(lunesDe('2026-03-29'), '2026-03-23');
    assert.equal(lunesDe('2026-03-30'), '2026-03-30');
  });
});

describe('esLunes', () => {
  it('sí con un lunes que existe', () => {
    assert.equal(esLunes('2026-11-23'), true);
  });

  it('no con otro día, con fechas que no existen ni con lo que no es texto', () => {
    assert.equal(esLunes('2026-11-24'), false);
    assert.equal(esLunes('2026-02-30'), false);
    assert.equal(esLunes('23/11/2026'), false);
    assert.equal(esLunes(20261123), false);
  });
});

describe('dentroDelMargen', () => {
  const HOY = '2026-11-16';

  it('hoy, y justo un año (365 días) atrás y adelante', () => {
    assert.equal(dentroDelMargen(HOY, HOY), true);
    assert.equal(dentroDelMargen('2025-11-16', HOY), true);
    assert.equal(dentroDelMargen('2027-11-16', HOY), true);
  });

  it('un día más allá, no', () => {
    assert.equal(dentroDelMargen('2025-11-15', HOY), false);
    assert.equal(dentroDelMargen('2027-11-17', HOY), false);
  });
});

describe('textoSemana', () => {
  it('dentro del mismo mes', () => {
    assert.equal(textoSemana('2026-11-23'), 'Semana del 23 al 29 de noviembre');
  });

  it('si cambia de mes, los dos meses', () => {
    assert.equal(textoSemana('2026-11-30'), 'Semana del 30 de noviembre al 6 de diciembre');
  });

  it('si cambia de año, también los años', () => {
    assert.equal(textoSemana('2026-12-28'), 'Semana del 28 de diciembre de 2026 al 3 de enero de 2027');
  });
});

describe('ETIQUETAS_GRUPO', () => {
  it('tiene un nombre para cada grupo de la lista', () => {
    assert.deepEqual(Object.keys(ETIQUETAS_GRUPO), [...GRUPOS_ALIMENTOS]);
  });
});

describe('validarHueco', () => {
  it('una receta, con o sin grupo', () => {
    assert.deepEqual(validarHueco({ recetaId: 3 }), {
      ok: true,
      datos: { recetaId: 3, texto: null, fueraDeCasa: false, grupo: null },
    });
    assert.equal(validarHueco({ recetaId: 3, grupo: 'huevos' }).datos.grupo, 'huevos');
  });

  it('un texto, sin los espacios de los extremos', () => {
    assert.deepEqual(validarHueco({ texto: '  Comida aniversario ', grupo: 'otro' }), {
      ok: true,
      datos: { recetaId: null, texto: 'Comida aniversario', fueraDeCasa: false, grupo: 'otro' },
    });
  });

  it('fuera de casa, solo', () => {
    assert.deepEqual(validarHueco({ fueraDeCasa: true }), {
      ok: true,
      datos: { recetaId: null, texto: null, fueraDeCasa: true, grupo: null },
    });
  });

  it('ninguna de las tres, o más de una, no', () => {
    for (const entrada of [{}, { fueraDeCasa: false }, { recetaId: 3, texto: 'Lentejas' }, { texto: 'Pizza', fueraDeCasa: true }]) {
      const resultado = validarHueco(entrada);
      assert.equal(resultado.ok, false);
      assert.ok(resultado.errores.general);
    }
  });

  it('lo que no es un objeto, o un fueraDeCasa que no es booleano, no', () => {
    assert.ok(validarHueco(null).errores.general);
    assert.ok(validarHueco([]).errores.general);
    assert.ok(validarHueco({ fueraDeCasa: 'sí' }).errores.general);
  });

  it('una receta con un id que no es un entero positivo', () => {
    for (const recetaId of [0, -1, 1.5, '3']) {
      assert.equal(validarHueco({ recetaId }).errores.recetaId, 'Elige una receta.');
    }
  });

  it('un texto vacío o demasiado largo', () => {
    assert.equal(validarHueco({ texto: '   ' }).errores.texto, 'Escribe el plato.');
    assert.ok(validarHueco({ texto: 'a'.repeat(MAX_LONGITUD_NOMBRE + 1) }).errores.texto);
    assert.equal(validarHueco({ texto: 'a'.repeat(MAX_LONGITUD_NOMBRE) }).ok, true);
    assert.equal(validarHueco({ texto: 42 }).errores.texto, 'Escribe el plato.');
  });

  it('un grupo que no está en la lista', () => {
    assert.equal(validarHueco({ texto: 'Pizza', grupo: 'pizza' }).errores.grupo, 'Elige un grupo de la lista.');
  });

  it('fuera de casa no lleva grupo', () => {
    assert.ok(validarHueco({ fueraDeCasa: true, grupo: 'pescado' }).errores.grupo);
  });
});

describe('validación de /api/plan', () => {
  const HOY = '2026-11-16';

  it('leerFechaPlan: una fecha que existe y dentro del margen', () => {
    assert.equal(leerFechaPlan('2026-11-24', HOY), '2026-11-24');
    assert.throws(() => leerFechaPlan('2026-02-30', HOY), { estado: 400, codigo: 'VALIDACION' });
    assert.throws(() => leerFechaPlan('mañana', HOY), { estado: 400, codigo: 'VALIDACION' });
    assert.throws(() => leerFechaPlan('2027-11-17', HOY), { estado: 400, codigo: 'FECHA_FUERA_DE_MARGEN' });
  });

  it('leerLunes: tiene que ser lunes', () => {
    assert.equal(leerLunes('2026-11-23', HOY), '2026-11-23');
    assert.throws(() => leerLunes('2026-11-24', HOY), { estado: 400, codigo: 'VALIDACION' });
    assert.throws(() => leerLunes(undefined, HOY), { estado: 400, codigo: 'VALIDACION' });
  });

  it('leerLunes: vale la semana del borde si alguno de sus días cabe', () => {
    // El 2027-11-15 es lunes y cae dentro (364 días); el 2027-11-22, ya no.
    assert.equal(leerLunes('2027-11-15', HOY), '2027-11-15');
    assert.throws(() => leerLunes('2027-11-22', HOY), { codigo: 'FECHA_FUERA_DE_MARGEN' });
    // Hacia atrás: la semana del 2025-11-10 acaba el 16, justo un año antes.
    assert.equal(leerLunes('2025-11-10', HOY), '2025-11-10');
    assert.throws(() => leerLunes('2025-11-03', HOY), { codigo: 'FECHA_FUERA_DE_MARGEN' });
  });

  it('leerTipo: comida o cena', () => {
    assert.equal(leerTipo('cena'), 'cena');
    assert.throws(() => leerTipo('desayuno'), { estado: 400 });
  });

  it('leerHueco: 400 con el mensaje general o con los campos', () => {
    assert.throws(() => leerHueco({}), (error) => error.estado === 400 && /fuera de casa/i.test(error.message));
    assert.throws(() => leerHueco({ texto: '' }), (error) => error.campos.texto === 'Escribe el plato.');
    assert.deepEqual(leerHueco({ fueraDeCasa: true }), { recetaId: null, texto: null, fueraDeCasa: true, grupo: null });
  });
});
