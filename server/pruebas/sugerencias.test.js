/**
 * @file Pruebas de compartido/sugerencias.js: la lista fija del autocompletado.
 * Las lanzo con `npm test`.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_LONGITUD_NOMBRE } from '../../compartido/constantes.js';
import { ALIMENTOS_COMUNES, buscarAlimentos } from '../../compartido/sugerencias.js';
import { normalizar } from '../../compartido/texto.js';

describe('ALIMENTOS_COMUNES', () => {
  it('todos caben en un nombre de producto y no hay repetidos', () => {
    for (const nombre of ALIMENTOS_COMUNES) {
      assert.ok(nombre.length <= MAX_LONGITUD_NOMBRE, nombre);
    }
    const normalizados = ALIMENTOS_COMUNES.map(normalizar);
    assert.equal(new Set(normalizados).size, normalizados.length);
  });
});

describe('buscarAlimentos()', () => {
  it('no sugiere nada con menos de 2 letras', () => {
    assert.deepEqual(buscarAlimentos('l'), []);
    assert.deepEqual(buscarAlimentos('   '), []);
  });

  it('no mira tildes ni mayúsculas', () => {
    assert.ok(buscarAlimentos('PLATANO').includes('Plátanos'));
    assert.ok(buscarAlimentos('salmon').includes('Salmón'));
  });

  it('pone primero los que empiezan por el texto', () => {
    const resultado = buscarAlimentos('pollo');
    assert.equal(resultado[0], 'Pollo entero');
    assert.ok(resultado.includes('Pechuga de pollo'));
  });

  it('respeta el límite', () => {
    assert.equal(buscarAlimentos('de', 3).length, 3);
  });

  it('sin coincidencias, devuelve una lista vacía', () => {
    assert.deepEqual(buscarAlimentos('xyz'), []);
  });
});