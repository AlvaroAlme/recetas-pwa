/**
 * @file Pruebas de compartido/: normalizar(), ubicacionesPosibles() y
 * formatearCantidad().
 *
 * Las lanzo con `npm test`. Si cambio el diccionario o la forma de comparar
 * nombres y rompo algo, estas pruebas me avisan.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatearCantidad } from '../../compartido/formato.js';
import { normalizar } from '../../compartido/texto.js';
import { ubicacionesPosibles } from '../../compartido/ubicaciones.js';
import {
  cantidadPropuesta,
  convertir,
  esBasico,
  escalarIngredientes,
  esPronto,
  estadoIngrediente,
  productosDelPlato,
  usarPronto,
} from '../../compartido/cocina.js';
import { hoyIso, sumarDias } from '../../compartido/fechas.js';

describe('normalizar', () => {
  it('pasa a minúsculas y quita los espacios de los extremos', () => {
    assert.equal(normalizar('  LECHE  '), 'leche');
  });

  it('quita tildes y diéresis', () => {
    assert.equal(normalizar('Salmón'), 'salmon');
    assert.equal(normalizar('Pingüino'), 'pinguino');
  });

  it('como en Expo, la ñ también pierde su tilde', () => {
    assert.equal(normalizar('Piña'), 'pina');
  });
});

describe('ubicacionesPosibles', () => {
  it('pregunta si el alimento puede ir en varios sitios', () => {
    assert.deepEqual(ubicacionesPosibles('Pechuga de pollo'), ['nevera', 'congelador']);
  });

  it('propone la ubicación si solo hay una', () => {
    assert.deepEqual(ubicacionesPosibles('Arroz 1kg'), ['despensa']);
  });

  it('las conservas van a la despensa aunque el alimento sea de nevera', () => {
    assert.deepEqual(ubicacionesPosibles('Atún en lata'), ['despensa']);
    assert.deepEqual(ubicacionesPosibles('Pollo en bote'), ['despensa']);
  });

  it('encuentra el alimento aunque lleve tildes o mayúsculas', () => {
    assert.deepEqual(ubicacionesPosibles('SALMÓN'), ['nevera', 'congelador']);
  });

  it('si no conoce el alimento, no propone nada', () => {
    assert.deepEqual(ubicacionesPosibles('Kiwi'), []);
    assert.deepEqual(ubicacionesPosibles(''), []);
  });

  it('no se confunde con nombres internos de JavaScript', () => {
    assert.deepEqual(ubicacionesPosibles('constructor'), []);
    assert.deepEqual(ubicacionesPosibles('toString'), []);
  });
});

describe('formatearCantidad', () => {
  it('usa coma decimal y la unidad', () => {
    assert.equal(formatearCantidad(1.5, 'kg'), '1,5 kg');
    assert.equal(formatearCantidad(500, 'g'), '500 g');
  });

  it('las unidades se muestran como "ud."', () => {
    assert.equal(formatearCantidad(2, 'unidades'), '2 ud.');
  });

  it('redondea a 2 decimales y no pone ceros de más', () => {
    assert.equal(formatearCantidad(0.333, 'l'), '0,33 l');
    assert.equal(formatearCantidad(0.1 + 0.2, 'kg'), '0,3 kg');
  });
});

describe('cocina: qué me falta', () => {
  const pollo = { id: 1, nombre: 'Pechuga de pollo', cantidad: 0.5, unidad: 'kg', fechaCaducidad: '2026-11-20' };
  const huevos = { id: 2, nombre: 'Huevos', cantidad: 300, unidad: 'g', fechaCaducidad: null };

  it('convierte g↔kg y ml↔l, y no mezcla familias', () => {
    assert.equal(convertir(500, 'g', 'kg'), 0.5);
    assert.equal(convertir(1.5, 'l', 'ml'), 1500);
    assert.equal(convertir(2, 'unidades', 'g'), null);
  });

  it('"Pollo" encuentra "Pechuga de pollo" y suma en la unidad del ingrediente', () => {
    assert.deepEqual(estadoIngrediente({ nombre: 'Pollo', cantidad: 300, unidad: 'g' }, [pollo], []), { tipo: 'tienes', disponible: 500 });
    assert.deepEqual(estadoIngrediente({ nombre: 'Pollo', cantidad: 800, unidad: 'g' }, [pollo], []), { tipo: 'poco', disponible: 500 });
  });

  it('distingue "otra unidad", un tupper y "falta"', () => {
    assert.equal(estadoIngrediente({ nombre: 'Huevos', cantidad: 2, unidad: 'unidades' }, [huevos], []).tipo, 'otra_unidad');
    assert.equal(estadoIngrediente({ nombre: 'Lentejas', cantidad: 1, unidad: 'unidades' }, [], [{ id: 9, nombre: 'Lentejas con chorizo' }]).tipo, 'tupper');
    assert.equal(estadoIngrediente({ nombre: 'Pimiento', cantidad: 1, unidad: 'unidades' }, [pollo], []).tipo, 'falta');
  });

  it('propone descontar en la unidad del producto, sin pasar de lo que hay', () => {
    assert.equal(cantidadPropuesta({ nombre: 'Pollo', cantidad: 300, unidad: 'g' }, pollo), 0.3);
    assert.equal(cantidadPropuesta({ nombre: 'Pollo', cantidad: 2, unidad: 'kg' }, pollo), 0.5);
    assert.equal(cantidadPropuesta({ nombre: 'Huevos', cantidad: 2, unidad: 'unidades' }, huevos), null);
  });
});

describe('cocina: lo que hay para un plato escrito a mano', () => {
  const pechuga = { id: 1, nombre: 'Pechuga de pollo', cantidad: 0.5, unidad: 'kg', fechaCaducidad: '2026-11-20' };
  const patatas = { id: 2, nombre: 'Patatas', cantidad: 2, unidad: 'kg', fechaCaducidad: null };
  const pimientos = { id: 3, nombre: 'Pimientos asados', cantidad: 1, unidad: 'unidades', fechaCaducidad: null };
  const muslos = { id: 4, nombre: 'Muslos de pollo', cantidad: 4, unidad: 'unidades', fechaCaducidad: '2026-11-18' };

  it('"Pollo asado" encuentra "Pechuga de pollo" (palabra a palabra)', () => {
    assert.deepEqual(productosDelPlato('Pollo asado', [pechuga, patatas]), [pechuga]);
  });

  it('no busca por cómo está hecho: "asado" no trae "Pimientos asados"', () => {
    assert.deepEqual(productosDelPlato('Pollo asado', [pimientos]), []);
  });

  it('primero los que comparten más palabras y luego los que caducan antes', () => {
    assert.deepEqual(productosDelPlato('Pechuga de pollo con patatas', [patatas, muslos, pechuga]), [pechuga, muslos, patatas]);
  });

  it('sin palabras en común, nada', () => {
    assert.deepEqual(productosDelPlato('Lentejas', [pechuga, patatas]), []);
  });
});

describe('cocina: usar pronto (D-61)', () => {
  // Las fechas van respecto a hoy: así la prueba sirve cualquier día.
  const hoy = hoyIso();
  const producto = (id, dias) => ({
    id,
    nombre: `Producto ${id}`,
    cantidad: 1,
    unidad: 'unidades',
    fechaCaducidad: dias === null ? null : sumarDias(hoy, dias),
  });
  const tupper = (id, dias) => ({ id, nombre: `Tupper ${id}`, fechaLimite: sumarDias(hoy, dias) });

  it('entra lo caducado, lo de hoy y lo de 3 días o menos; lo de 4 días no', () => {
    assert.equal(esPronto(sumarDias(hoy, -2)), true);
    assert.equal(esPronto(hoy), true);
    assert.equal(esPronto(sumarDias(hoy, 3)), true);
    assert.equal(esPronto(sumarDias(hoy, 4)), false);
  });

  it('los productos sin fecha o que caducan más tarde no entran', () => {
    assert.deepEqual(usarPronto([producto(1, null), producto(2, 4)], [tupper(3, 10)]), []);
  });

  it('junta productos y tuppers en una sola lista, primero lo que antes caduca', () => {
    const lista = usarPronto([producto(1, 3), producto(2, -1)], [tupper(3, 1)]);
    assert.deepEqual(lista.map((cosa) => cosa.tipo), ['producto', 'tupper', 'producto']);
    assert.deepEqual(lista.map((cosa) => cosa.fecha), [sumarDias(hoy, -1), sumarDias(hoy, 1), sumarDias(hoy, 3)]);
    assert.equal(lista[1].tupper.id, 3);
  });
});

describe('cocina: escalar las raciones (D-61)', () => {
  const ingredientes = [
    { nombre: 'Patatas', cantidad: 0.5, unidad: 'kg' },
    { nombre: 'Huevos', cantidad: 3, unidad: 'unidades' },
  ];

  it('de 2 a 4 raciones dobla las cantidades sin tocar la receta', () => {
    assert.deepEqual(escalarIngredientes(ingredientes, 2, 4).map((ingrediente) => ingrediente.cantidad), [1, 6]);
    assert.equal(ingredientes[0].cantidad, 0.5);
  });

  it('redondea a 3 decimales, como la base de datos, y nunca deja un 0', () => {
    assert.equal(escalarIngredientes([{ nombre: 'Harina', cantidad: 0.125, unidad: 'kg' }], 2, 1)[0].cantidad, 0.063);
    assert.equal(escalarIngredientes([{ nombre: 'Sal', cantidad: 0.001, unidad: 'kg' }], 20, 1)[0].cantidad, 0.001);
  });

  it('sin raciones en la receta, o con las mismas, devuelve los mismos ingredientes', () => {
    assert.equal(escalarIngredientes(ingredientes, null, 4), ingredientes);
    assert.equal(escalarIngredientes(ingredientes, 2, 2), ingredientes);
  });
});

describe('cocina: básicos de despensa (D-61)', () => {
  it('reconoce los básicos escritos de cualquier forma', () => {
    assert.equal(esBasico('Sal'), true);
    assert.equal(esBasico('  aceite DE OLIVA '), true);
    assert.equal(esBasico('Azucar'), true);
  });

  it('compara el nombre entero: "Aceitunas" y "Pimiento" no son básicos', () => {
    assert.equal(esBasico('Aceitunas'), false);
    assert.equal(esBasico('Pimiento'), false);
  });
});
