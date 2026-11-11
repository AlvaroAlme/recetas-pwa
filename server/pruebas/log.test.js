/**
 * @file Pruebas de logError() (server/log.js): en producción, una línea sin
 * traza; en desarrollo, el error entero.
 */
import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { configurarLog, logError } from '../log.js';

describe('logError', () => {
  afterEach(() => configurarLog({ esProduccion: false }));

  it('en producción: qué, id y mensaje, en una sola línea y sin traza', (t) => {
    const consola = t.mock.method(console, 'error', () => {});
    configurarLog({ esProduccion: true });
    logError('Error inesperado', new Error('se ha roto'), 'ab12cd34');
    assert.deepEqual(consola.mock.calls[0].arguments, ['Error inesperado [ab12cd34]: se ha roto']);
  });

  it('en producción, un dato suelto (un código HTTP) también vale', (t) => {
    const consola = t.mock.method(console, 'error', () => {});
    configurarLog({ esProduccion: true });
    logError('No se ha podido enviar un aviso', 500);
    assert.deepEqual(consola.mock.calls[0].arguments, ['No se ha podido enviar un aviso: 500']);
  });

  it('en desarrollo: el error entero, para ver la traza', (t) => {
    const consola = t.mock.method(console, 'error', () => {});
    const error = new Error('se ha roto');
    logError('Error inesperado', error);
    assert.equal(consola.mock.calls[0].arguments[1], error);
  });
});