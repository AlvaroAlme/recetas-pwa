/**
 * @file Pruebas de leerLote() (server/validacion/productos.js): la clave de
 * idempotencia (P-06) y los productos del ticket.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { leerLote } from '../validacion/productos.js';

const CLAVE = '1b4e28ba-2fa1-41d2-883f-0016d3cca427';
const LECHE = { nombre: 'Leche', cantidad: 1, unidad: 'l', ubicacion: 'nevera' };

describe('leerLote', () => {
  it('devuelve la clave y los productos', () => {
    const { clave, lista } = leerLote({ clave: CLAVE, productos: [LECHE] });
    assert.equal(clave, CLAVE);
    assert.equal(lista.length, 1);
  });

  it('sin clave o con una que no es un UUID, 400', () => {
    for (const clave of [undefined, '', 'hola', 42, `${CLAVE}x`]) {
      assert.throws(() => leerLote({ clave, productos: [LECHE] }), { estado: 400 });
    }
  });

  it('marca la línea que falla', () => {
    assert.throws(() => leerLote({ clave: CLAVE, productos: [LECHE, { ...LECHE, cantidad: -1 }] }), (error) =>
      Object.keys(error.campos).some((campo) => campo.startsWith('productos.1.'))
    );
  });
});