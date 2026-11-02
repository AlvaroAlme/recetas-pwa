/**
 * @file Pruebas de servicios/contrasenas.js. Cada hash tarda unos 300 ms
 * a propósito, así que estas pruebas son las más lentas de `npm test`.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { comprobarContrasena, hashearContrasena } from '../servicios/contrasenas.js';

describe('hashearContrasena()', () => {
  it('guarda los parámetros, la sal y el hash, nunca la contraseña', async () => {
    const guardado = await hashearContrasena('una contraseña larga');
    const partes = guardado.split('$');
    assert.equal(partes.length, 6);
    assert.deepEqual(partes.slice(0, 4), ['scrypt', '16384', '8', '5']);
    assert.ok(!guardado.includes('una contraseña larga'));
  });

  it('la misma contraseña da un hash distinto cada vez (por la sal)', async () => {
    const primero = await hashearContrasena('repetida-123');
    const segundo = await hashearContrasena('repetida-123');
    assert.notEqual(primero, segundo);
  });
});

describe('comprobarContrasena()', () => {
  it('acepta la buena y rechaza la mala', async () => {
    const guardado = await hashearContrasena('correcta-1234');
    assert.equal(await comprobarContrasena('correcta-1234', guardado), true);
    assert.equal(await comprobarContrasena('Correcta-1234', guardado), false);
  });

  it('da igual cómo llegue codificada la ñ (NFC)', async () => {
    const compuesta = 'contraseña-españa';
    const separada = compuesta.normalize('NFD');
    assert.notEqual(compuesta, separada); // son textos distintos…
    const guardado = await hashearContrasena(compuesta);
    assert.equal(await comprobarContrasena(separada, guardado), true); // …pero la misma contraseña
  });

  it('rechaza un hash guardado que no tiene el formato', async () => {
    assert.equal(await comprobarContrasena('lo-que-sea-12', 'texto-cualquiera'), false);
    assert.equal(await comprobarContrasena('lo-que-sea-12', 'scrypt$16384$8$5$c2Fs$'), false);
  });
});