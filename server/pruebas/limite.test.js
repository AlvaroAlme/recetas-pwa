/**
 * @file Pruebas de middlewares/limite.js con peticiones de mentira: no hace
 * falta arrancar el servidor para probar cuándo salta el 429.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { crearLimite } from '../middlewares/limite.js';

/** Una petición y una respuesta falsas, con lo justo que usa el middleware. */
const peticion = (ip) => ({ ip });
const respuesta = () => ({ cabeceras: {}, set(nombre, valor) { this.cabeceras[nombre] = valor; } });

describe('crearLimite()', () => {
  it('deja pasar hasta el máximo y luego da 429 con Retry-After', () => {
    const limite = crearLimite({ maximo: 2, ventanaMs: 60_000, clave: (req) => req.ip });
    let pasan = 0;
    limite(peticion('1.1.1.1'), respuesta(), () => pasan++);
    limite(peticion('1.1.1.1'), respuesta(), () => pasan++);
    const res = respuesta();
    assert.throws(() => limite(peticion('1.1.1.1'), res, () => pasan++), { estado: 429 });
    assert.equal(pasan, 2);
    assert.ok(Number(res.cabeceras['Retry-After']) > 0);
  });

  it('cada clave tiene su propio contador', () => {
    const limite = crearLimite({ maximo: 1, ventanaMs: 60_000, clave: (req) => req.ip });
    limite(peticion('1.1.1.1'), respuesta(), () => {});
    assert.doesNotThrow(() => limite(peticion('2.2.2.2'), respuesta(), () => {}));
  });

  it('olvidar() pone a cero una clave', () => {
    const limite = crearLimite({ maximo: 1, ventanaMs: 60_000, clave: (req) => req.ip });
    limite(peticion('1.1.1.1'), respuesta(), () => {});
    limite.olvidar('1.1.1.1');
    assert.doesNotThrow(() => limite(peticion('1.1.1.1'), respuesta(), () => {}));
  });

  it('si la clave es null, no cuenta', () => {
    const limite = crearLimite({ maximo: 1, ventanaMs: 60_000, clave: () => null });
    for (let i = 0; i < 5; i++) limite(peticion('1.1.1.1'), respuesta(), () => {});
  });
});