/**
 * @file Pruebas de lo que no toca la base de datos en "recuperar la
 * contraseña" y "cambiar el email" (D-53): los tokens y sus URLs, los textos
 * de los correos (escapados) y la validación de lo que llega.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validarCambioEmail, validarContrasenaNueva, validarEmail } from '../../compartido/validacion.js';
import { crearToken, esFormatoToken, hashDeToken, MINUTOS_ENLACE, urlDeEnlace } from '../servicios/enlaces.js';
import { correoAvisoCambioEmail, correoConfirmarEmail, correoRecuperar, escaparHtml } from '../servicios/mensajesCorreo.js';
import { leerCambioEmail, leerOlvide, leerRestablecer, leerToken } from '../validacion/auth.js';

const ORIGEN = 'https://vigia.example';

describe('enlaces: token, hash y URL', () => {
  it('el token tiene 43 caracteres base64url y el hash es su SHA-256 en hexadecimal', () => {
    const { token, hash } = crearToken();
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(hashDeToken(token), hash);
    assert.notEqual(hash, token);
  });

  it('cada token es distinto', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => crearToken().token));
    assert.equal(tokens.size, 200);
  });

  it('esFormatoToken() rechaza lo que no es un token', () => {
    assert.equal(esFormatoToken(crearToken().token), true);
    for (const malo of ['', 'corto', 'a'.repeat(42), 'a'.repeat(44), `${'a'.repeat(42)}=`, `${'a'.repeat(42)}/`, null, 42, undefined]) {
      assert.equal(esFormatoToken(malo), false, String(malo));
    }
  });

  it('la URL usa el origen que le paso y lleva el token detrás de #', () => {
    const { token } = crearToken();
    assert.equal(urlDeEnlace(ORIGEN, '/restablecer', token), `${ORIGEN}/restablecer#t=${token}`);
    const url = new URL(urlDeEnlace(ORIGEN, '/confirmar-email', token));
    assert.equal(url.origin, ORIGEN);
    assert.equal(url.search, '', 'el token no va en la consulta (?…): esa sí llega al servidor');
    assert.equal(url.hash, `#t=${token}`);
  });

  it('recuperar caduca en 30 minutos y confirmar el email en 24 horas', () => {
    assert.deepEqual(MINUTOS_ENLACE, { recuperar: 30, email: 1440 });
  });
});

describe('textos de los correos', () => {
  const url = urlDeEnlace(ORIGEN, '/restablecer', crearToken().token);

  it('escaparHtml() cambia & < > " y \'', () => {
    assert.equal(escaparHtml(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });

  it('recuperar: va a su email, lleva el enlace en el texto y en el HTML, y ningún otro enlace', () => {
    const correo = correoRecuperar({ nombre: 'Ana', email: 'ana@prueba.test', url });
    assert.equal(correo.para, 'ana@prueba.test');
    assert.ok(correo.texto.includes(url));
    assert.ok(correo.texto.includes('30 minutos'));
    const enlaces = [...correo.html.matchAll(/href="([^"]*)"/g)].map(([, href]) => href);
    assert.deepEqual(enlaces, [url]);
  });

  it('un nombre con HTML sale escrito, no como HTML', () => {
    const correo = correoRecuperar({ nombre: '<a href="https://malo.example">Ana</a>', email: 'ana@prueba.test', url });
    assert.ok(!correo.html.includes('https://malo.example">'));
    assert.ok(correo.html.includes('&lt;a href=&quot;https://malo.example&quot;&gt;'));
    assert.equal([...correo.html.matchAll(/href="/g)].length, 1);
  });

  it('cambiar el email: el enlace al nuevo y un aviso SIN enlaces al actual', () => {
    const confirmar = correoConfirmarEmail({ nombre: 'Ana', emailNuevo: 'nueva@prueba.test', url });
    assert.equal(confirmar.para, 'nueva@prueba.test');
    assert.ok(confirmar.texto.includes(url));
    const aviso = correoAvisoCambioEmail({ nombre: 'Ana', email: 'ana@prueba.test', emailNuevo: 'nueva@prueba.test' });
    assert.equal(aviso.para, 'ana@prueba.test');
    assert.ok(aviso.texto.includes('nueva@prueba.test'));
    assert.ok(!aviso.html.includes('href='));
    assert.ok(!aviso.texto.includes('http'));
  });
});

describe('validación (compartido y servidor)', () => {
  it('validarEmail() limpia el email y rechaza los que no tienen formato', () => {
    assert.deepEqual(validarEmail('  Ana@Prueba.TEST '), { ok: true, datos: 'ana@prueba.test' });
    assert.equal(validarEmail('').errores.email, 'Escribe tu email.');
    assert.equal(validarEmail('ana@').ok, false);
    assert.equal(validarEmail(42).ok, false);
  });

  it('validarContrasenaNueva(): de 10 a 128, tal cual', () => {
    assert.deepEqual(validarContrasenaNueva(' una clave larga '), { ok: true, datos: ' una clave larga ' });
    assert.ok(validarContrasenaNueva('corta').errores.contrasena);
    assert.ok(validarContrasenaNueva('a'.repeat(129)).errores.contrasena);
    assert.ok(validarContrasenaNueva(undefined).errores.contrasena);
  });

  it('validarCambioEmail(): email nuevo distinto del actual y la contraseña escrita', () => {
    assert.deepEqual(validarCambioEmail({ emailNuevo: ' Nueva@Prueba.test ', contrasena: 'x' }, 'ana@prueba.test'), {
      ok: true,
      datos: { emailNuevo: 'nueva@prueba.test', contrasena: 'x' },
    });
    assert.equal(validarCambioEmail({ emailNuevo: 'ANA@prueba.test', contrasena: 'x' }, 'ana@prueba.test').errores.emailNuevo, 'Ese ya es tu email.');
    assert.equal(validarCambioEmail({ emailNuevo: '', contrasena: '' }, 'ana@prueba.test').errores.emailNuevo, 'Escribe tu email nuevo.');
    assert.ok(validarCambioEmail({ emailNuevo: 'nueva@prueba.test', contrasena: '' }, 'ana@prueba.test').errores.contrasena);
    assert.ok(validarCambioEmail(null, 'ana@prueba.test').errores.general);
  });

  it('un token sin forma de token da ENLACE_NO_VALIDO (el mismo error que uno caducado)', () => {
    const esEnlaceNoValido = (error) => error.estado === 400 && error.codigo === 'ENLACE_NO_VALIDO';
    assert.throws(() => leerToken({ token: 'no-es-un-token' }), esEnlaceNoValido);
    assert.throws(() => leerToken({}), esEnlaceNoValido);
    assert.throws(() => leerRestablecer({ token: 'x', contrasena: 'una clave larga' }), esEnlaceNoValido);
  });

  it('leerRestablecer(), leerOlvide() y leerCambioEmail() devuelven los datos o un 400 VALIDACION', () => {
    const { token } = crearToken();
    assert.deepEqual(leerRestablecer({ token, contrasena: 'una clave larga' }), { token, contrasena: 'una clave larga' });
    assert.throws(() => leerRestablecer({ token, contrasena: 'corta' }), (error) => error.codigo === 'VALIDACION' && Boolean(error.campos.contrasena));
    assert.equal(leerToken({ token }), token);
    assert.equal(leerOlvide({ email: ' ANA@prueba.test' }), 'ana@prueba.test');
    assert.throws(() => leerOlvide({ email: 'no' }), { estado: 400, codigo: 'VALIDACION' });
    assert.throws(() => leerCambioEmail({ emailNuevo: 'ana@prueba.test', contrasena: 'x' }, 'ana@prueba.test'), { estado: 400 });
  });
});
