/**
 * @file Pruebas de server/validacion/push.js: la lista de servicios de push
 * permitidos (SSRF, §9.8) y la suscripción que llega del navegador.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { esServicioPermitido, leerEndpoint, leerSuscripcion } from '../validacion/push.js';

/** Una suscripción con la forma que da pushManager.subscribe(). */
const BUENA = {
  endpoint: 'https://web.push.apple.com/QGuQyavXutnMH6bmxuJ8ngGAW',
  keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' },
};

describe('esServicioPermitido()', () => {
  it('acepta los servicios de Apple, Google, Mozilla y Microsoft', () => {
    for (const host of ['web.push.apple.com', 'api.push.apple.com', 'fcm.googleapis.com', 'updates.push.services.mozilla.com', 'wns2-am3p.notify.windows.com']) {
      assert.equal(esServicioPermitido(host), true, host);
    }
  });

  it('rechaza todo lo demás, también los que solo se parecen', () => {
    for (const host of ['localhost', '127.0.0.1', '169.254.169.254', 'push.apple.com.evil.com', 'evilpush.apple.com', 'fcm.googleapis.com.evil.com', 'notify.windows.com.evil.com', 'xnotify.windows.com']) {
      assert.equal(esServicioPermitido(host), false, host);
    }
  });
});

describe('leerSuscripcion()', () => {
  it('acepta una suscripción buena e ignora lo que sobra', () => {
    const datos = leerSuscripcion({ ...BUENA, expirationTime: null, usuarioId: 9 });
    assert.deepEqual(datos, { endpoint: BUENA.endpoint, p256dh: BUENA.keys.p256dh, auth: BUENA.keys.auth });
  });

  it('el endpoint: HTTPS, sin puerto ni usuario, y de un servicio permitido', () => {
    for (const endpoint of [
      'http://web.push.apple.com/x',
      'https://web.push.apple.com:8443/x',
      'https://usuario:clave@web.push.apple.com/x',
      'https://169.254.169.254/latest/meta-data',
      'https://localhost/x',
      'no es una url',
      `https://web.push.apple.com/${'x'.repeat(1000)}`,
      42,
    ]) {
      assert.throws(() => leerSuscripcion({ ...BUENA, endpoint }), { estado: 400 }, String(endpoint).slice(0, 40));
    }
  });

  it('las claves: base64url y no más largas que las columnas', () => {
    assert.throws(() => leerSuscripcion({ ...BUENA, keys: { ...BUENA.keys, auth: 'con espacios' } }), { estado: 400 });
    assert.throws(() => leerSuscripcion({ ...BUENA, keys: { ...BUENA.keys, p256dh: 'A'.repeat(201) } }), { estado: 400 });
    assert.throws(() => leerSuscripcion({ endpoint: BUENA.endpoint }), { estado: 400 });
  });

  it('rechaza lo que no es un objeto', () => {
    assert.throws(() => leerSuscripcion(null), { estado: 400 });
  });
});

describe('leerEndpoint()', () => {
  it('pide un texto no vacío', () => {
    assert.equal(leerEndpoint({ endpoint: BUENA.endpoint }), BUENA.endpoint);
    assert.throws(() => leerEndpoint({}), { estado: 400 });
    assert.throws(() => leerEndpoint({ endpoint: '' }), { estado: 400 });
  });
});
