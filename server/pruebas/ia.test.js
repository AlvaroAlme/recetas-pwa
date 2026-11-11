/**
 * @file Pruebas de leerArchivoTicket() (server/validacion/ia.js): tipo,
 * tamaño (justo en el límite y un byte más) y firma del archivo.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_BYTES_IMAGEN_TICKET, MAX_BYTES_PDF_TICKET } from '../../compartido/constantes.js';
import { leerArchivoTicket } from '../validacion/ia.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF = Buffer.from('%PDF-1.7');
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

/** El cuerpo de la petición con estos bytes. */
const cuerpo = (mimeType, bytes) => ({ archivo: { mimeType, base64: bytes.toString('base64') } });

/** Unos bytes que empiezan por la firma y miden exactamente `tamano`. */
const conTamano = (firma, tamano) => Buffer.concat([firma, Buffer.alloc(tamano - firma.length)]);

/** Compruebo que falla con este estado HTTP. */
const fallaCon = (datos, estado) => assert.throws(() => leerArchivoTicket(datos), { estado });

describe('leerArchivoTicket', () => {
  it('acepta una foto y un PDF con su firma', () => {
    assert.equal(leerArchivoTicket(cuerpo('image/png', PNG)).mimeType, 'image/png');
    assert.equal(leerArchivoTicket(cuerpo('application/pdf', PDF)).mimeType, 'application/pdf');
    assert.equal(leerArchivoTicket(cuerpo('image/jpeg', JPEG)).mimeType, 'image/jpeg');
  });

  it('una foto de 5 MB justos vale; un byte más, 413', () => {
    leerArchivoTicket(cuerpo('image/png', conTamano(PNG, MAX_BYTES_IMAGEN_TICKET)));
    fallaCon(cuerpo('image/png', conTamano(PNG, MAX_BYTES_IMAGEN_TICKET + 1)), 413);
  });

  it('un PDF de 20 MB justos vale; un byte más, 413', () => {
    leerArchivoTicket(cuerpo('application/pdf', conTamano(PDF, MAX_BYTES_PDF_TICKET)));
    fallaCon(cuerpo('application/pdf', conTamano(PDF, MAX_BYTES_PDF_TICKET + 1)), 413);
  });

  it('rechaza tipos que no acepto, también los nombres de Object', () => {
    fallaCon(cuerpo('text/plain', PNG), 415);
    fallaCon(cuerpo('constructor', PNG), 415);
  });

  it('rechaza un archivo que no es lo que dice ser', () => {
    fallaCon(cuerpo('image/png', JPEG), 415);
    fallaCon(cuerpo('application/pdf', Buffer.from('<script>')), 415);
  });

  it('rechaza peticiones sin archivo o con base64 roto', () => {
    for (const datos of [undefined, {}, { archivo: null }, { archivo: { mimeType: 'image/png', base64: '' } }]) {
      fallaCon(datos, 400);
    }
    fallaCon({ archivo: { mimeType: 'image/png', base64: 'no es base64!' } }, 400);
    fallaCon({ archivo: { mimeType: 'image/png', base64: 'data:image/png;base64,iVBORw==' } }, 400);
  });
});