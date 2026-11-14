/**
 * @file Pruebas de leerCocinar() (server/validacion/recetas.js): la clave,
 * los descuentos y los tuppers de "La he cocinado".
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { leerCocinar } from '../validacion/recetas.js';

const CLAVE = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';

describe('leerCocinar', () => {
  it('devuelve la clave, los descuentos redondeados y los tuppers sin repetir', () => {
    const resultado = leerCocinar({ clave: CLAVE, descuentos: [{ productoId: 3, cantidad: 0.30001 }], tuppersConsumidos: [5, 5] });
    assert.deepEqual(resultado, { clave: CLAVE, descuentos: [{ productoId: 3, cantidad: 0.3 }], tuppersConsumidos: [5] });
  });

  it('sin clave, 400', () => {
    assert.throws(() => leerCocinar({ descuentos: [{ productoId: 3, cantidad: 1 }] }), { estado: 400 });
  });

  it('pide algo que descontar', () => {
    assert.throws(() => leerCocinar({ clave: CLAVE }), { estado: 400 });
  });

  it('rechaza ids y cantidades que no valen', () => {
    for (const descuento of [{ productoId: '3', cantidad: 1 }, { productoId: 0, cantidad: 1 }, { productoId: 3, cantidad: 0 }, { productoId: 3, cantidad: -2 }, null]) {
      assert.throws(() => leerCocinar({ clave: CLAVE, descuentos: [descuento] }), { estado: 400 });
    }
    assert.throws(() => leerCocinar({ clave: CLAVE, tuppersConsumidos: [1.5] }), { estado: 400 });
  });
});