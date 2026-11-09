/**
 * @file Pruebas de leerCambiosHogar() (PATCH /api/hogar): el nombre de la casa y su zona horaria.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { leerCambiosHogar } from '../validacion/hogar.js';

describe('leerCambiosHogar()', () => {
  it('acepta el nombre (limpio), la zona o los dos; lo que no llega es null', () => {
    assert.deepEqual(leerCambiosHogar({ nombre: '  Piso de la calle Luna ' }), { nombre: 'Piso de la calle Luna', zonaHoraria: null });
    assert.deepEqual(leerCambiosHogar({ zonaHoraria: 'Atlantic/Canary' }), { nombre: null, zonaHoraria: 'Atlantic/Canary' });
    assert.deepEqual(leerCambiosHogar({ nombre: 'Casa', zonaHoraria: 'Europe/Madrid' }), { nombre: 'Casa', zonaHoraria: 'Europe/Madrid' });
  });

  it('rechaza un nombre vacío o de más de 80', () => {
    assert.throws(() => leerCambiosHogar({ nombre: '   ' }), { estado: 400 });
    assert.throws(() => leerCambiosHogar({ nombre: 'a'.repeat(81) }), { estado: 400 });
  });

  it('rechaza una zona que no existe', () => {
    assert.throws(() => leerCambiosHogar({ zonaHoraria: 'Europe/Narnia' }), { estado: 400 });
    assert.throws(() => leerCambiosHogar({ zonaHoraria: 3 }), { estado: 400 });
  });

  it('pide al menos un cambio', () => {
    assert.throws(() => leerCambiosHogar({}), { estado: 400 });
    assert.throws(() => leerCambiosHogar(null), { estado: 400 });
  });
});
