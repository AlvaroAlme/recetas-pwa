/**
 * @file Pruebas de compartido/validacion.js: validarProducto(), validarTupper(), validarRegistro() y validarLogin().
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validarLogin, validarProducto, validarRegistro, validarTupper, validarReceta } from '../../compartido/validacion.js';
import { MAX_INGREDIENTES_RECETA, MAX_LONGITUD_PASO, MAX_PASOS_RECETA } from '../../compartido/constantes.js';

/** Un producto válido del que parten las pruebas. */
const BUENO = {
  nombre: 'Leche',
  cantidad: 1.5,
  unidad: 'l',
  ubicacion: 'nevera',
  fechaCaducidad: '2026-11-15',
};

describe('validarProducto', () => {
  it('acepta un producto válido y limpia el nombre', () => {
    const resultado = validarProducto({ ...BUENO, nombre: '  Leche  ' });
    assert.deepEqual(resultado, { ok: true, datos: BUENO });
  });

  it('la caducidad es opcional', () => {
    const { fechaCaducidad, ...sinFecha } = BUENO;
    const resultado = validarProducto(sinFecha);
    assert.equal(resultado.ok, true);
    assert.equal(resultado.datos.fechaCaducidad, null);
  });

  it('ignora campos que no conoce, como un hogarId colado', () => {
    const resultado = validarProducto({ ...BUENO, hogarId: 7 });
    assert.equal(resultado.ok, true);
    assert.equal('hogarId' in resultado.datos, false);
  });

  it('devuelve un error por cada campo que falla', () => {
    const resultado = validarProducto({ nombre: '', cantidad: -1, unidad: 'litros', ubicacion: 'trastero', fechaCaducidad: '2026-02-31' });
    assert.equal(resultado.ok, false);
    assert.deepEqual(Object.keys(resultado.errores).sort(), ['cantidad', 'fechaCaducidad', 'nombre', 'ubicacion', 'unidad']);
  });

  it('el nombre tiene como mucho 80 caracteres', () => {
    assert.equal(validarProducto({ ...BUENO, nombre: 'a'.repeat(80) }).ok, true);
    assert.equal(validarProducto({ ...BUENO, nombre: 'a'.repeat(81) }).ok, false);
  });

  it('la cantidad tiene que ser un número de verdad', () => {
    assert.equal(validarProducto({ ...BUENO, cantidad: '5' }).ok, false);
    assert.equal(validarProducto({ ...BUENO, cantidad: Infinity }).ok, false);
  });

  it('una cantidad que se queda en 0 al redondear no vale', () => {
    assert.equal(validarProducto({ ...BUENO, cantidad: 0.0001 }).ok, false);
    assert.equal(validarProducto({ ...BUENO, cantidad: 0.001 }).ok, true);
  });

  it('la cantidad tiene un máximo de 100 000', () => {
    assert.equal(validarProducto({ ...BUENO, cantidad: 100_000 }).ok, true);
    assert.equal(validarProducto({ ...BUENO, cantidad: 100_001 }).ok, false);
  });

  it('rechaza lo que no es un objeto', () => {
    for (const malo of [null, 'leche', 42, []]) {
      assert.deepEqual(validarProducto(malo), { ok: false, errores: { general: 'Los datos del producto no son válidos.' } });
    }
  });
});

describe('validarRegistro()', () => {
  const buena = { email: '  Ana@Correo.COM ', nombre: ' Ana ', contrasena: 'diez letras' };

  it('limpia el email (minúsculas y sin espacios) y el nombre', () => {
    assert.deepEqual(validarRegistro(buena), {
      ok: true,
      datos: { email: 'ana@correo.com', nombre: 'Ana', contrasena: 'diez letras' },
    });
  });

  it('marca cada campo con su error', () => {
    const resultado = validarRegistro({ email: 'ana@correo', nombre: '   ', contrasena: 'corta' });
    assert.equal(resultado.ok, false);
    assert.deepEqual(Object.keys(resultado.errores).sort(), ['contrasena', 'email', 'nombre']);
  });

  it('la contraseña: de 10 a 128 caracteres', () => {
    assert.equal(validarRegistro({ ...buena, contrasena: '123456789' }).ok, false);
    assert.equal(validarRegistro({ ...buena, contrasena: '1234567890' }).ok, true);
    assert.equal(validarRegistro({ ...buena, contrasena: 'x'.repeat(129) }).ok, false);
  });

  it('rechaza lo que no es un objeto', () => {
    assert.equal(validarRegistro(null).ok, false);
    assert.equal(validarRegistro(['ana@correo.com']).ok, false);
  });
});

describe('validarLogin()', () => {
  it('no exige el mínimo de 10 (el error será el genérico)', () => {
    assert.deepEqual(validarLogin({ email: 'ANA@correo.com', contrasena: 'corta' }), {
      ok: true,
      datos: { email: 'ana@correo.com', contrasena: 'corta' },
    });
  });

  it('pide email y contraseña', () => {
    const resultado = validarLogin({ email: '', contrasena: '' });
    assert.deepEqual(resultado.errores, { email: 'Escribe tu email.', contrasena: 'Escribe tu contraseña.' });
  });
});
describe('validarTupper()', () => {
  const bueno = { nombre: 'Cocido', ubicacion: 'nevera', diasMaximos: 3 };

  it('acepta un tupper válido, limpia el nombre e ignora lo que no conoce', () => {
    assert.deepEqual(validarTupper({ ...bueno, nombre: '  Cocido ', fechaLimite: '2020-01-01', hogarId: 7 }), {
      ok: true,
      datos: bueno,
    });
  });

  it('los días: enteros de 1 a 365', () => {
    assert.equal(validarTupper({ ...bueno, diasMaximos: 1 }).ok, true);
    assert.equal(validarTupper({ ...bueno, diasMaximos: 365 }).ok, true);
    assert.equal(validarTupper({ ...bueno, diasMaximos: 0 }).ok, false);
    assert.equal(validarTupper({ ...bueno, diasMaximos: 366 }).ok, false);
    assert.equal(validarTupper({ ...bueno, diasMaximos: 2.5 }).ok, false);
    assert.equal(validarTupper({ ...bueno, diasMaximos: '3' }).ok, false);
  });

  it('devuelve un error por cada campo que falla', () => {
    const resultado = validarTupper({ nombre: ' ', ubicacion: 'trastero' });
    assert.deepEqual(Object.keys(resultado.errores).sort(), ['diasMaximos', 'nombre', 'ubicacion']);
  });

  it('rechaza lo que no es un objeto', () => {
    assert.equal(validarTupper(null).ok, false);
  });
});

describe('validarReceta', () => {
  const HUEVOS = { nombre: 'Huevos', cantidad: 2, unidad: 'unidades' };
  const RECETA = { nombre: 'Tortilla', raciones: 2, ingredientes: [HUEVOS], pasos: ['Bate los huevos.', 'Cuájalos.'] };

  it('acepta una receta válida, limpia textos y quita líneas vacías', () => {
    const resultado = validarReceta({ ...RECETA, nombre: '  Tortilla ', pasos: [' Bate los huevos. ', '', 'Cuájalos.'] });
    assert.deepEqual(resultado, { ok: true, datos: RECETA });
  });

  it('las raciones son opcionales, pero si vienen son un entero de 1 a 20', () => {
    const { raciones, ...sinRaciones } = RECETA;
    assert.equal(validarReceta(sinRaciones).datos.raciones, null);
    for (const mal of [0, 21, 2.5, '2']) {
      assert.ok(validarReceta({ ...RECETA, raciones: mal }).errores.raciones);
    }
  });

  it(`acepta ${MAX_INGREDIENTES_RECETA} ingredientes y rechaza uno más`, () => {
    assert.equal(validarReceta({ ...RECETA, ingredientes: Array(MAX_INGREDIENTES_RECETA).fill(HUEVOS) }).ok, true);
    assert.ok(validarReceta({ ...RECETA, ingredientes: Array(MAX_INGREDIENTES_RECETA + 1).fill(HUEVOS) }).errores.ingredientes);
  });

  it(`acepta ${MAX_PASOS_RECETA} pasos de ${MAX_LONGITUD_PASO} caracteres y rechaza uno más`, () => {
    const largo = 'a'.repeat(MAX_LONGITUD_PASO);
    assert.equal(validarReceta({ ...RECETA, pasos: Array(MAX_PASOS_RECETA).fill(largo) }).ok, true);
    assert.ok(validarReceta({ ...RECETA, pasos: Array(MAX_PASOS_RECETA + 1).fill('Paso') }).errores.pasos);
    assert.ok(validarReceta({ ...RECETA, pasos: [largo + 'a'] }).errores.pasos);
  });

  it('marca el campo exacto del ingrediente que falla', () => {
    const resultado = validarReceta({ ...RECETA, ingredientes: [HUEVOS, { nombre: 'Sal', cantidad: 0, unidad: 'pizca' }] });
    assert.deepEqual(Object.keys(resultado.errores).sort(), ['ingredientes.1.cantidad', 'ingredientes.1.unidad']);
  });

  it('pide al menos un ingrediente y un paso', () => {
    const { errores } = validarReceta({ ...RECETA, ingredientes: [], pasos: ['', '  '] });
    assert.ok(errores.ingredientes);
    assert.ok(errores.pasos);
  });

  it('rechaza un paso con un salto de línea dentro e ignora campos que no conoce', () => {
    assert.ok(validarReceta({ ...RECETA, pasos: ['uno\ndos'] }).errores.pasos);
    assert.equal('hogarId' in validarReceta({ ...RECETA, hogarId: 99 }).datos, false);
  });
});