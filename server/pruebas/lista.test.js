/**
 * @file Pruebas de la lista de la compra (D-54): validarLineaLista()
 * (compartido/validacion.js), leerComprada() (server/validacion/lista.js)
 * cruzaUmbral() (compartido/lista.js) y claveNombre() (compartido/texto.js).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_LONGITUD_NOMBRE } from '../../compartido/constantes.js';
import { cruzaUmbral } from '../../compartido/lista.js';
import { claveNombre } from '../../compartido/texto.js';
import { validarLineaLista } from '../../compartido/validacion.js';
import { leerComprada, leerLineaLista } from '../validacion/lista.js';

describe('validarLineaLista()', () => {
  it('solo el nombre vale, sin espacios a los lados', () => {
    assert.deepEqual(validarLineaLista({ nombre: '  Pan ' }), {
      ok: true,
      datos: { nombre: 'Pan', cantidad: null, unidad: null },
    });
  });

  it('con cantidad y unidad, las dos', () => {
    const resultado = validarLineaLista({ nombre: 'Leche entera', cantidad: 6, unidad: 'l' });
    assert.deepEqual(resultado, { ok: true, datos: { nombre: 'Leche entera', cantidad: 6, unidad: 'l' } });
  });

  it('cantidad vacía del campo ("") y unidad vacía cuentan como que no las han puesto', () => {
    const resultado = validarLineaLista({ nombre: 'Pan', cantidad: '', unidad: '' });
    assert.equal(resultado.ok, true);
    assert.equal(resultado.datos.cantidad, null);
    assert.equal(resultado.datos.unidad, null);
  });

  it('sin nombre o con uno demasiado largo, falla el nombre', () => {
    assert.ok(validarLineaLista({ nombre: '   ' }).errores.nombre);
    assert.ok(validarLineaLista({ nombre: 'a'.repeat(MAX_LONGITUD_NOMBRE + 1) }).errores.nombre);
  });

  it('cantidad sin unidad: falta la unidad', () => {
    const { ok, errores } = validarLineaLista({ nombre: 'Pan', cantidad: 2 });
    assert.equal(ok, false);
    assert.deepEqual(Object.keys(errores), ['unidad']);
  });

  it('unidad sin cantidad: falta la cantidad', () => {
    const { ok, errores } = validarLineaLista({ nombre: 'Pan', unidad: 'unidades' });
    assert.equal(ok, false);
    assert.deepEqual(Object.keys(errores), ['cantidad']);
  });

  it('cantidad no válida o unidad que no existe', () => {
    assert.ok(validarLineaLista({ nombre: 'Pan', cantidad: -1, unidad: 'kg' }).errores.cantidad);
    assert.ok(validarLineaLista({ nombre: 'Pan', cantidad: '2', unidad: 'kg' }).errores.cantidad);
    assert.ok(validarLineaLista({ nombre: 'Pan', cantidad: 2, unidad: 'barras' }).errores.unidad);
  });

  it('si no es un objeto, error general', () => {
    for (const entrada of [null, 'Pan', ['Pan']]) {
      assert.ok(validarLineaLista(entrada).errores.general);
    }
  });
});

describe('leerLineaLista() y leerComprada() (POST y PATCH /api/lista)', () => {
  it('leerLineaLista lanza un 400 VALIDACION con el campo que falla', () => {
    assert.throws(() => leerLineaLista({}), (error) => error.estado === 400 && error.codigo === 'VALIDACION' && Boolean(error.campos.nombre));
  });

  it('leerComprada solo acepta un booleano', () => {
    assert.equal(leerComprada({ comprada: true }), true);
    assert.equal(leerComprada({ comprada: false }), false);
    for (const cuerpo of [{}, { comprada: 'true' }, { comprada: 1 }, null]) {
      assert.throws(() => leerComprada(cuerpo), { estado: 400 });
    }
  });
});

describe('cruzaUmbral() en g, kg, ml y l (se apunta solo al bajar al 10 %)', () => {
  it('de más del 10 % a 10 % o menos: sí', () => {
    assert.equal(cruzaUmbral(0.5, 0.1, 1, 'l'), true);
    assert.equal(cruzaUmbral(6, 0.5, 6, 'kg'), true);
    assert.equal(cruzaUmbral(2, 0, 2, 'l'), true);
  });

  it('justo en el 10 % ya cuenta (decimales incluidos)', () => {
    assert.equal(cruzaUmbral(0.3, 0.03, 0.3, 'kg'), true);
  });

  it('si sigue por encima, no', () => {
    assert.equal(cruzaUmbral(1, 0.5, 1, 'l'), false);
  });

  it('si ya estaba por debajo, no se vuelve a apuntar', () => {
    assert.equal(cruzaUmbral(0.1, 0.05, 1, 'l'), false);
  });

  it('si sube (he comprado más), no', () => {
    assert.equal(cruzaUmbral(0.05, 2, 1, 'l'), false);
  });

  it('sin referencia, nunca', () => {
    assert.equal(cruzaUmbral(5, 0, null, 'g'), false);
    assert.equal(cruzaUmbral(5, 0, 0, 'g'), false);
  });
});

describe('cruzaUmbral() en unidades (cambio del 2026-11-25)', () => {
  it('si entraron más de 1, al quedar 1: 4 yogures', () => {
    assert.equal(cruzaUmbral(2, 1, 4, 'unidades'), true);
    assert.equal(cruzaUmbral(4, 0, 4, 'unidades'), true);
    assert.equal(cruzaUmbral(4, 2, 4, 'unidades'), false);
  });

  it('con 2 latas, también al quedar 1', () => {
    assert.equal(cruzaUmbral(2, 1, 2, 'unidades'), true);
  });

  it('si entró 1, solo al gastarse: 1 solomillo', () => {
    assert.equal(cruzaUmbral(1, 0.5, 1, 'unidades'), false);
    assert.equal(cruzaUmbral(1, 0, 1, 'unidades'), true);
  });

  it('si ya quedaba 1, gastar el último no lo vuelve a apuntar', () => {
    assert.equal(cruzaUmbral(1, 0, 4, 'unidades'), false);
  });
});

describe('claveNombre() (para comparar nombres en la lista)', () => {
  it('quita las palabras vacías: "turrón de chocolate" = "turrón chocolate"', () => {
    assert.equal(claveNombre('Turrón de chocolate'), 'turron chocolate');
    assert.equal(claveNombre('turrón chocolate'), claveNombre('Turrón de chocolate'));
    assert.equal(claveNombre('Pechuga  del pollo'), 'pechuga pollo');
  });

  it('no junta nombres distintos', () => {
    assert.notEqual(claveNombre('Pan'), claveNombre('Pan rallado'));
    assert.notEqual(claveNombre('Leche'), claveNombre('Leche entera'));
  });

  it('solo quita palabras enteras ("Ajo" no pierde la "a")', () => {
    assert.equal(claveNombre('Ajo'), 'ajo');
    assert.equal(claveNombre('Arroz a la cubana'), 'arroz cubana');
  });

  it('si solo hay palabras vacías, se queda con todas', () => {
    assert.equal(claveNombre(' De '), 'de');
  });
});
