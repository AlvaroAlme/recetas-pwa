/**
 * @file Pruebas de compartido/: normalizar(), ubicacionesPosibles() y
 * formatearCantidad().
 *
 * Las lanzo con `npm test`. Si cambio el diccionario o la forma de comparar
 * nombres y rompo algo, estas pruebas me avisan.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatearCantidad } from '../../compartido/formato.js';
import { normalizar } from '../../compartido/texto.js';
import { ubicacionesPosibles } from '../../compartido/ubicaciones.js';
import { cantidadPropuesta, convertir, estadoIngrediente } from '../../compartido/cocina.js';

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

describe('formatearCantidad', () => {
  it('usa coma decimal y la unidad', () => {
    assert.equal(formatearCantidad(1.5, 'kg'), '1,5 kg');
    assert.equal(formatearCantidad(500, 'g'), '500 g');
  });

  it('las unidades se muestran como "ud."', () => {
    assert.equal(formatearCantidad(2, 'unidades'), '2 ud.');
  });

  it('redondea a 2 decimales y no pone ceros de más', () => {
    assert.equal(formatearCantidad(0.333, 'l'), '0,33 l');
    assert.equal(formatearCantidad(0.1 + 0.2, 'kg'), '0,3 kg');
  });
});

describe('cocina: qué me falta', () => {
  const pollo = { id: 1, nombre: 'Pechuga de pollo', cantidad: 0.5, unidad: 'kg', fechaCaducidad: '2026-11-20' };
  const huevos = { id: 2, nombre: 'Huevos', cantidad: 300, unidad: 'g', fechaCaducidad: null };

  it('convierte g↔kg y ml↔l, y no mezcla familias', () => {
    assert.equal(convertir(500, 'g', 'kg'), 0.5);
    assert.equal(convertir(1.5, 'l', 'ml'), 1500);
    assert.equal(convertir(2, 'unidades', 'g'), null);
  });

  it('"Pollo" encuentra "Pechuga de pollo" y suma en la unidad del ingrediente', () => {
    assert.deepEqual(estadoIngrediente({ nombre: 'Pollo', cantidad: 300, unidad: 'g' }, [pollo], []), { tipo: 'tienes', disponible: 500 });
    assert.deepEqual(estadoIngrediente({ nombre: 'Pollo', cantidad: 800, unidad: 'g' }, [pollo], []), { tipo: 'poco', disponible: 500 });
  });

  it('distingue "otra unidad", un tupper y "falta"', () => {
    assert.equal(estadoIngrediente({ nombre: 'Huevos', cantidad: 2, unidad: 'unidades' }, [huevos], []).tipo, 'otra_unidad');
    assert.equal(estadoIngrediente({ nombre: 'Lentejas', cantidad: 1, unidad: 'unidades' }, [], [{ id: 9, nombre: 'Lentejas con chorizo' }]).tipo, 'tupper');
    assert.equal(estadoIngrediente({ nombre: 'Pimiento', cantidad: 1, unidad: 'unidades' }, [pollo], []).tipo, 'falta');
  });

  it('propone descontar en la unidad del producto, sin pasar de lo que hay', () => {
    assert.equal(cantidadPropuesta({ nombre: 'Pollo', cantidad: 300, unidad: 'g' }, pollo), 0.3);
    assert.equal(cantidadPropuesta({ nombre: 'Pollo', cantidad: 2, unidad: 'kg' }, pollo), 0.5);
    assert.equal(cantidadPropuesta({ nombre: 'Huevos', cantidad: 2, unidad: 'unidades' }, huevos), null);
  });
});
