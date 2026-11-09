/**
 * @file Pruebas de validarRespuestaTicket() (server/servicios/ticket.js):
 * los límites de SEC-05, justo en el límite y uno de más.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_CANTIDAD, MAX_LONGITUD_NOMBRE, MAX_PRODUCTOS_TICKET } from '../../compartido/constantes.js';
import { validarRespuestaTicket } from '../servicios/ticket.js';

/** Un producto válido tal y como lo devuelve Claude. */
const LECHE = { nombre: 'Leche entera', cantidad: 6, unidad: 'l', ubicaciones_posibles: ['nevera'] };

/** Una respuesta de Claude con estos productos. */
const ticket = (productos) => ({ es_ticket: true, productos });

/** Compruebo que falla con este código. */
const fallaCon = (datos, codigo) => assert.throws(() => validarRespuestaTicket(datos), { codigo });

describe('validarRespuestaTicket', () => {
  it('acepta un ticket válido, limpia el nombre y quita ubicaciones repetidas', () => {
    const [producto] = validarRespuestaTicket(
      ticket([{ ...LECHE, nombre: '  Leche entera  ', ubicaciones_posibles: ['nevera', 'nevera'] }])
    );
    assert.deepEqual(producto, { nombre: 'Leche entera', cantidad: 6, unidad: 'l', ubicacionesPosibles: ['nevera'] });
  });

  it(`acepta ${MAX_PRODUCTOS_TICKET} productos y rechaza uno más`, () => {
    assert.equal(validarRespuestaTicket(ticket(Array(MAX_PRODUCTOS_TICKET).fill(LECHE))).length, MAX_PRODUCTOS_TICKET);
    fallaCon(ticket(Array(MAX_PRODUCTOS_TICKET + 1).fill(LECHE)), 'DEMASIADOS_PRODUCTOS');
  });

  it(`acepta un nombre de ${MAX_LONGITUD_NOMBRE} caracteres y rechaza uno más`, () => {
    validarRespuestaTicket(ticket([{ ...LECHE, nombre: 'a'.repeat(MAX_LONGITUD_NOMBRE) }]));
    fallaCon(ticket([{ ...LECHE, nombre: 'a'.repeat(MAX_LONGITUD_NOMBRE + 1) }]), 'IA_FORMATO');
  });

  it(`acepta la cantidad ${MAX_CANTIDAD} y rechaza una más`, () => {
    validarRespuestaTicket(ticket([{ ...LECHE, cantidad: MAX_CANTIDAD }]));
    fallaCon(ticket([{ ...LECHE, cantidad: MAX_CANTIDAD + 1 }]), 'IA_FORMATO');
  });

  it('rechaza cantidades 0, negativas o que no son números', () => {
    for (const cantidad of [0, -1, NaN, Infinity, '2']) {
      fallaCon(ticket([{ ...LECHE, cantidad }]), 'IA_FORMATO');
    }
  });

  it('rechaza unidades y ubicaciones que no existen', () => {
    fallaCon(ticket([{ ...LECHE, unidad: 'litros' }]), 'IA_FORMATO');
    fallaCon(ticket([{ ...LECHE, ubicaciones_posibles: ['armario'] }]), 'IA_FORMATO');
  });

  it('dice que no es un ticket si es_ticket es false', () => {
    fallaCon({ es_ticket: false, productos: [] }, 'NO_ES_TICKET');
  });

  it('dice que no hay alimentos si la lista está vacía', () => {
    fallaCon(ticket([]), 'SIN_ALIMENTOS');
  });

  it('rechaza respuestas sin la forma esperada', () => {
    for (const datos of [null, 'texto', {}, { es_ticket: true }, ticket([null])]) {
      fallaCon(datos, 'IA_FORMATO');
    }
  });
});