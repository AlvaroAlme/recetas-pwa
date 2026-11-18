/**
 * @file Pruebas del avatar (D-52) tal como lo usa la app: blobatar 2.7.0 con
 * nuestras semillas (32 cifras hexadecimales). El componente del navegador
 * (web/js/componentes/avatar.js) usa el DOM y no se prueba aquí; lo que sí
 * pruebo es lo que le llega de blobatar.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { blobatar } from 'blobatar';
import { _parts } from 'blobatar/internal';
import { happy, idle, sad, thinking } from 'blobatar/expression';

/** Las mismas opciones que crearAvatar() y crearAvatarVivo(). */
const QUIETO = { background: 'circle' };
const VIVO = { background: 'circle', animate: 'always' };

const SEMILLAS = Array.from({ length: 500 }, () => randomBytes(16).toString('hex'));

describe('blobatar con nuestras semillas', () => {
  it('la versión está fija en package.json (sin ^ ni ~)', () => {
    const paquete = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    assert.equal(paquete.dependencies.blobatar, '2.7.0');
  });

  it('esta semilla da siempre este dibujo: si cambia, cambian los avatares de todo el mundo', () => {
    // Pasaría al subir de versión mayor de blobatar (o al cambiar las
    // opciones). Solo se toca a propósito, avisando en D-52.
    const svg = blobatar('00000000000000000000000000000000', QUIETO);
    assert.equal(createHash('sha256').update(svg).digest('hex'), 'b58ae3cc565835ccfe7a0434ca2960ea88026ae19f013a765e8ecc60b0f690df');
  });

  it('la misma semilla da el mismo dibujo, y semillas distintas casi siempre dibujos distintos', () => {
    assert.equal(blobatar(SEMILLAS[0], QUIETO), blobatar(SEMILLAS[0], QUIETO));
    const distintos = new Set(SEMILLAS.map((semilla) => blobatar(semilla, QUIETO)));
    assert.ok(distintos.size > 495, `solo ${distintos.size} distintos de ${SEMILLAS.length}`);
  });

  it('el quieto es un SVG sin estilos, scripts ni enlaces (va en un <img> data:)', () => {
    for (const semilla of SEMILLAS.slice(0, 100)) {
      const svg = blobatar(semilla, QUIETO);
      assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100">/);
      assert.doesNotMatch(svg, /style=|<script|\son\w+=|href|<foreignObject/i);
    }
  });

  it('el vivo solo trae estilos de su animación, que aplico con el CSSOM', () => {
    for (const semilla of SEMILLAS.slice(0, 100)) {
      const partes = _parts(semilla, VIVO);
      assert.equal(partes.cls, 'mo-root mo-always');
      assert.ok(Object.keys(partes.vars).every((variable) => variable.startsWith('--mo-')));
      assert.doesNotMatch(partes.inner, /<script|\son\w+=|href|<foreignObject/i);
      // Los style="…" de los ojos: solo variables --mo-… y transform-origin.
      for (const [, estilo] of partes.inner.matchAll(/ style="([^"]*)"/g)) {
        for (const declaracion of estilo.split(';').filter(Boolean)) {
          assert.match(declaracion, /^(--mo-[\w-]+|transform-origin):/);
        }
      }
    }
  });
});

describe('las expresiones del avatar (D-56)', () => {
  const SEMILLA = '00000000000000000000000000000000';
  const variables = (pose) => _parts(SEMILLA, { ...VIVO, expression: pose }).vars;

  it('idle es el avatar de siempre: sin variables de expresión ni la clase mo-expr', () => {
    const normal = _parts(SEMILLA, VIVO);
    const conIdle = _parts(SEMILLA, { ...VIVO, expression: idle });
    assert.deepEqual(conIdle.vars, normal.vars);
    assert.equal(conIdle.cls, normal.cls);
    assert.ok(!conIdle.cls.includes('mo-expr'));
  });

  it('una expresión no cambia el dibujo: solo variables y la clase mo-expr (así ponerExpresion no toca el SVG)', () => {
    const normal = _parts(SEMILLA, VIVO);
    for (const pose of [happy, sad, thinking]) {
      const partes = _parts(SEMILLA, { ...VIVO, expression: pose });
      assert.equal(partes.inner, normal.inner);
      assert.ok(partes.cls.split(' ').includes('mo-expr'));
      // Las variables de siempre siguen igual; la expresión solo añade.
      for (const [variable, valor] of Object.entries(normal.vars)) {
        if (!variable.startsWith('--mo-head') && !variable.startsWith('--mo-eye')) assert.equal(partes.vars[variable], valor);
      }
    }
  });

  it('cada expresión que uso trae sus variables de siempre (si cambian, cambian las caras: avisar en D-56)', () => {
    assert.equal(variables(happy)['--mo-esx'], '1.72');
    assert.equal(variables(happy)['--mo-bdy'], '-2.2');
    assert.ok('--mo-edy' in variables(sad));
    assert.ok('--mo-rock' in variables(thinking));
  });

  it('las variables son números o colores sencillos: nada que la CSP o setProperty no acepten', () => {
    for (const pose of [happy, sad, thinking]) {
      for (const [variable, valor] of Object.entries(variables(pose))) {
        assert.match(variable, /^--mo-[a-z0-9-]+$/);
        assert.match(String(valor), /^(-?[0-9.]+(ms|px)?|#[0-9a-f]{3,8})$/i);
      }
    }
  });
});
