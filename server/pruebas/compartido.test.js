/**
 * @file Pruebas de compartido/: normalizar() y ubicacionesPosibles().
 *
 * Las lanzo con `npm test`. Si cambio el diccionario o la forma de comparar
 * nombres y rompo algo, estas pruebas me avisan.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizar } from '../../compartido/texto.js';
import { ubicacionesPosibles } from '../../compartido/ubicaciones.js';

describe('normalizar', () => {
  it('pasa a minúsculas y quita los espacios de los extremos', () => {
    assert.equal(normalizar('  LECHE  '), 'leche');
  });

  it('quita tildes y diéresis', () => {
    assert.equal(normalizar('Salmón'), 'salmon');
    assert.equal(normalizar('Pingüino'), 'pinguino');
  });

  it('como en Expo, la ñ también pierde su tilde', () => {
    assert.equal(normalizar('Piña'), 'pina');
  });
});

describe('ubicacionesPosibles', () => {
  it('pregunta si el alimento puede ir en varios sitios', () => {
    assert.deepEqual(ubicacionesPosibles('Pechuga de pollo'), ['nevera', 'congelador']);
  });

  it('propone la ubicación si solo hay una', () => {
    assert.deepEqual(ubicacionesPosibles('Arroz 1kg'), ['despensa']);
  });

  it('las conservas van a la despensa aunque el alimento sea de nevera', () => {
    assert.deepEqual(ubicacionesPosibles('Atún en lata'), ['despensa']);
    assert.deepEqual(ubicacionesPosibles('Pollo en bote'), ['despensa']);
  });

  it('encuentra el alimento aunque lleve tildes o mayúsculas', () => {
    assert.deepEqual(ubicacionesPosibles('SALMÓN'), ['nevera', 'congelador']);
  });

  it('si no conoce el alimento, no propone nada', () => {
    assert.deepEqual(ubicacionesPosibles('Kiwi'), []);
    assert.deepEqual(ubicacionesPosibles(''), []);
  });

  it('no se confunde con nombres internos de JavaScript', () => {
    assert.deepEqual(ubicacionesPosibles('constructor'), []);
    assert.deepEqual(ubicacionesPosibles('toString'), []);
  });
});