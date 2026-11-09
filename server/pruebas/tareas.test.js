/**
 * @file Pruebas de server/validacion/tareas.js: el secreto del ping de cron-job.org.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { coincideSecreto } from '../validacion/tareas.js';

const SECRETO = 'un-secreto-de-prueba-bastante-largo-123';

describe('coincideSecreto()', () => {
  it('acepta "Bearer <secreto>"', () => {
    assert.equal(coincideSecreto(`Bearer ${SECRETO}`, SECRETO), true);
  });

  it('rechaza sin cabecera, sin "Bearer " o con otro secreto', () => {
    assert.equal(coincideSecreto(undefined, SECRETO), false);
    assert.equal(coincideSecreto(SECRETO, SECRETO), false);
    assert.equal(coincideSecreto(`Basic ${SECRETO}`, SECRETO), false);
    assert.equal(coincideSecreto('Bearer ', SECRETO), false);
    assert.equal(coincideSecreto(`Bearer ${SECRETO}x`, SECRETO), false);
    assert.equal(coincideSecreto(`Bearer ${SECRETO.slice(0, -1)}`, SECRETO), false);
  });
});
