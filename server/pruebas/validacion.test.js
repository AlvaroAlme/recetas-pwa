/**
 * @file Pruebas de compartido/validacion.js: validarProducto().
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validarProducto } from '../../compartido/validacion.js';

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