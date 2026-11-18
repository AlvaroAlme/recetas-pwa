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
