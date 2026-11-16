/**
 * @file Pruebas de leerCambiosHogar() (PATCH /api/hogar): el nombre de la casa,
 * su zona horaria y la hora del aviso del plan.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { leerCambiosHogar } from '../validacion/hogar.js';

describe('leerCambiosHogar()', () => {
  it('acepta el nombre (limpio), la zona o los dos; lo que no llega es null', () => {
    assert.deepEqual(leerCambiosHogar({ nombre: '  Piso de la calle Luna ' }), {
      nombre: 'Piso de la calle Luna',
      zonaHoraria: null,
      horaAvisoPlan: null,
    });
    assert.deepEqual(leerCambiosHogar({ zonaHoraria: 'Atlantic/Canary' }), { nombre: null, zonaHoraria: 'Atlantic/Canary', horaAvisoPlan: null });
    assert.deepEqual(leerCambiosHogar({ nombre: 'Casa', zonaHoraria: 'Europe/Madrid' }), {
      nombre: 'Casa',
      zonaHoraria: 'Europe/Madrid',
      horaAvisoPlan: null,
    });
  });

  it('acepta la hora del aviso del plan (HH:MM) y rechaza las que no valen', () => {
    assert.deepEqual(leerCambiosHogar({ horaAvisoPlan: '21:30' }), { nombre: null, zonaHoraria: null, horaAvisoPlan: '21:30' });
    assert.throws(() => leerCambiosHogar({ horaAvisoPlan: '25:00' }), (error) => error.estado === 400 && Boolean(error.campos.horaAvisoPlan));
    assert.throws(() => leerCambiosHogar({ horaAvisoPlan: '21:00:00' }), { estado: 400 });
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
