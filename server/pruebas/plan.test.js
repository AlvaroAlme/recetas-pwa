/**
 * @file Pruebas del cuadrante en compartido/: las semanas (plan.js) y
 * validarHueco() (validacion.js), la validación de /api/plan y el
 * equilibrio de la semana, fase 7.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GRUPOS_ALIMENTOS, MAX_LONGITUD_NOMBRE } from '../../compartido/constantes.js';
import {
  ETIQUETAS_GRUPO,
  OBJETIVOS_AESAN,
  avisosDia,
  dentroDelMargen,
  equilibrioSemana,
  esLunes,
  lunesDe,
  nombrePlato,
  textoDia,
  textoSemana,
} from '../../compartido/plan.js';
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
    assert.deepEqual(validarHueco({ texto: '  Lentejas con chorizo ', grupo: 'legumbres' }), {
      ok: true,
      datos: { recetaId: null, texto: 'Lentejas con chorizo', fueraDeCasa: false, grupo: 'legumbres' },
    });
  });

  it('fuera de casa, solo', () => {
    assert.deepEqual(validarHueco({ fueraDeCasa: true }), {
      ok: true,
      datos: { recetaId: null, texto: null, fueraDeCasa: true, grupo: null },
    });
  });

  it('ninguna de las tres, o más de una, no', () => {
    for (const entrada of [{}, { fueraDeCasa: false }, { recetaId: 3, texto: 'Lentejas' }, { recetaId: 3, fueraDeCasa: true }]) {
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

  it('fuera de casa, con una nota opcional (vacía = sin nota)', () => {
    assert.deepEqual(validarHueco({ fueraDeCasa: true, texto: ' Comida aniversario ' }).datos, {
      recetaId: null,
      texto: 'Comida aniversario',
      fueraDeCasa: true,
      grupo: null,
    });
    assert.equal(validarHueco({ fueraDeCasa: true, texto: '   ' }).datos.texto, null);
    assert.ok(validarHueco({ fueraDeCasa: true, texto: 'a'.repeat(MAX_LONGITUD_NOMBRE + 1) }).errores.texto.startsWith('La nota'));
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

describe('equilibrioSemana', () => {
  /** Huecos con estos grupos. */
  const conGrupos = (...grupos) => grupos.map((grupo) => ({ grupo, fueraDeCasa: false }));
  const linea = (resultado, clave) => resultado.objetivos.find((objetivo) => objetivo.clave === clave);

  it('una semana vacía: faltan legumbres y pescado; huevos y carne, bien', () => {
    const resultado = equilibrioSemana([]);
    assert.deepEqual(
      resultado.objetivos.map(({ clave, estado, texto }) => [clave, estado, texto]),
      [
        ['legumbres', 'faltan', '0 de 4 o más'],
        ['pescado', 'faltan', '0 de 3 o más'],
        ['huevos', 'bien', '0 de 4 como mucho'],
        ['carne', 'bien', '0 de 3 como mucho'],
      ]
    );
    assert.deepEqual(resultado.otros, []);
    assert.equal(resultado.conGrupo, 0);
  });

  it('el mínimo se cumple justo al llegar', () => {
    assert.equal(linea(equilibrioSemana(conGrupos('pescado', 'pescado')), 'pescado').estado, 'faltan');
    assert.equal(linea(equilibrioSemana(conGrupos('pescado', 'pescado', 'pescado')), 'pescado').estado, 'bien');
  });

  it('la carne blanca y la roja suman para el máximo de 3', () => {
    const carne = linea(equilibrioSemana(conGrupos('carne_blanca', 'carne_blanca', 'carne_roja', 'carne_roja')), 'carne');
    assert.equal(carne.veces, 4);
    assert.equal(carne.estado, 'demasiado');
    assert.equal(carne.texto, '4 de 3 como mucho');
  });

  it('aconseja aves y conejo solo si gana la carne roja', () => {
    assert.equal(linea(equilibrioSemana(conGrupos('carne_roja')), 'carne').consejo, 'Mejor aves y conejo.');
    assert.equal(linea(equilibrioSemana(conGrupos('carne_roja', 'carne_blanca')), 'carne').consejo, null);
    assert.equal(linea(equilibrioSemana([]), 'carne').consejo, null);
  });

  it('no cuenta los huecos sin grupo ni los de fuera de casa', () => {
    const resultado = equilibrioSemana([
      { grupo: null, fueraDeCasa: false },
      { grupo: null, fueraDeCasa: true },
      { grupo: 'legumbres', fueraDeCasa: false },
    ]);
    assert.equal(linea(resultado, 'legumbres').veces, 1);
    assert.equal(resultado.conGrupo, 1);
  });

  it('los grupos sin cifra de AESAN salen aparte, solo si aparecen', () => {
    const resultado = equilibrioSemana(conGrupos('verduras', 'verduras', 'otro'));
    assert.deepEqual(resultado.otros, [
      { grupo: 'verduras', etiqueta: 'Verduras', veces: 2 },
      { grupo: 'otro', etiqueta: 'Otro', veces: 1 },
    ]);
  });

  it('cada grupo de un objetivo existe en GRUPOS_ALIMENTOS', () => {
    for (const objetivo of OBJETIVOS_AESAN) {
      for (const grupo of objetivo.grupos) assert.ok(GRUPOS_ALIMENTOS.includes(grupo), grupo);
    }
  });
});

describe('textoDia y nombrePlato', () => {
  it('textoDia: el día de la semana y el número', () => {
    assert.equal(textoDia('2026-11-23'), 'Lunes 23');
    assert.equal(textoDia('2026-11-25'), 'Miércoles 25');
    assert.equal(textoDia('2026-11-29'), 'Domingo 29');
  });

  it('nombrePlato: la receta, el texto o fuera de casa', () => {
    assert.equal(nombrePlato({ receta: { id: 1, nombre: 'Tortilla' }, texto: null, fueraDeCasa: false }), 'Tortilla');
    assert.equal(nombrePlato({ receta: null, texto: 'Lentejas con chorizo', fueraDeCasa: false }), 'Lentejas con chorizo');
    assert.equal(nombrePlato({ receta: null, texto: null, fueraDeCasa: true }), 'Fuera de casa');
    // Con fuera de casa, el texto es la nota: el plato sigue siendo "Fuera de casa".
    assert.equal(nombrePlato({ receta: null, texto: 'Comida aniversario', fueraDeCasa: true }), 'Fuera de casa');
    assert.equal(nombrePlato(undefined), null);
  });
});

describe('avisosDia', () => {
  /** Un hueco con grupo. */
  const h = (fecha, tipo, grupo, fueraDeCasa = false) => ({ fecha, tipo, grupo, fueraDeCasa });

  it('una semana sin nada que decir', () => {
    assert.deepEqual(avisosDia([h('2026-11-16', 'comida', 'pescado'), h('2026-11-16', 'cena', 'verduras')]), {});
  });

  it('el mismo grupo en la comida y en la cena, ese día', () => {
    assert.deepEqual(avisosDia([h('2026-11-16', 'cena', 'carne_roja'), h('2026-11-16', 'comida', 'carne_roja')]), {
      '2026-11-16': ['Carne roja en la comida y en la cena: mejor variar.'],
    });
  });

  it('"otro" dos veces no avisa', () => {
    assert.deepEqual(avisosDia([h('2026-11-16', 'comida', 'otro'), h('2026-11-16', 'cena', 'otro')]), {});
  });

  it('pasar del máximo: en el día en que se pasa, con la vez más alta de ese día', () => {
    const avisos = avisosDia([
      // Desordenados a propósito: cuento por fecha y comida antes que cena.
      h('2026-11-19', 'cena', 'carne_roja'),
      h('2026-11-16', 'comida', 'carne_blanca'),
      h('2026-11-19', 'comida', 'carne_roja'),
      h('2026-11-17', 'cena', 'carne_roja'),
      h('2026-11-18', 'comida', 'carne_blanca'),
    ]);
    assert.deepEqual(avisos, {
      '2026-11-19': [
        'Carne roja en la comida y en la cena: mejor variar.',
        'Quinta vez de carne esta semana (AESAN: 3 como mucho).',
      ],
    });
  });

  it('los huevos, a partir del quinto', () => {
    const huevos = ['16', '17', '18', '19', '20'].map((dia) => h(`2026-11-${dia}`, 'cena', 'huevos'));
    assert.deepEqual(avisosDia(huevos), { '2026-11-20': ['Quinta vez de huevos esta semana (AESAN: 4 como mucho).'] });
  });

  it('fuera de casa y sin grupo no cuentan', () => {
    assert.deepEqual(
      avisosDia([h('2026-11-16', 'comida', null), h('2026-11-16', 'cena', null, true), h('2026-11-17', 'comida', 'legumbres')]),
      {}
    );
  });
});
