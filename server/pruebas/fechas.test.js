/**
 * @file Pruebas de compartido/fechas.js.
 *
 * Las que dependen de "hoy" las calculo a partir de hoyIso(), así dan el
 * mismo resultado cualquier día que las lance.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diasHasta, esFechaIso, hoyIso, isoATexto, sumarDias } from '../../compartido/fechas.js';

describe('esFechaIso', () => {
  it('acepta fechas que existen', () => {
    assert.equal(esFechaIso('2026-10-15'), true);
    assert.equal(esFechaIso('2028-02-29'), true); // 2028 es bisiesto
  });

  it('rechaza fechas que no existen', () => {
    assert.equal(esFechaIso('2026-02-31'), false);
    assert.equal(esFechaIso('2027-02-29'), false); // 2027 no es bisiesto
    assert.equal(esFechaIso('2026-13-01'), false);
  });

  it('rechaza otros formatos y lo que no es texto', () => {
    assert.equal(esFechaIso('15/10/2026'), false);
    assert.equal(esFechaIso('2026-10-15T10:00:00'), false);
    assert.equal(esFechaIso(''), false);
    assert.equal(esFechaIso(20261015), false);
    assert.equal(esFechaIso(null), false);
  });
});

describe('isoATexto', () => {
  it('pasa de AAAA-MM-DD a DD/MM/AAAA', () => {
    assert.equal(isoATexto('2026-03-05'), '05/03/2026');
  });
});

describe('sumarDias', () => {
  it('cambia de mes y de año', () => {
    assert.equal(sumarDias('2026-01-31', 1), '2026-02-01');
    assert.equal(sumarDias('2026-12-31', 1), '2027-01-01');
  });

  it('tiene en cuenta los bisiestos', () => {
    assert.equal(sumarDias('2028-02-28', 1), '2028-02-29');
  });

  it('resta con números negativos', () => {
    assert.equal(sumarDias('2026-03-01', -1), '2026-02-28');
  });
});

describe('diasHasta', () => {
  it('hoy es 0, mañana 1 y ayer -1', () => {
    const hoy = hoyIso();
    assert.equal(diasHasta(hoy), 0);
    assert.equal(diasHasta(sumarDias(hoy, 1)), 1);
    assert.equal(diasHasta(sumarDias(hoy, -1)), -1);
  });

  it('cuenta bien aunque en medio haya un cambio de hora', () => {
    assert.equal(diasHasta(sumarDias(hoyIso(), 200)), 200);
  });
});
