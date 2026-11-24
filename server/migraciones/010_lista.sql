-- 010: lista de la compra (fase 12, D-54).

-- La cantidad con la que entró cada producto: la "cantidad de referencia".
-- Cuando un producto baja al 10 % o menos de ella, pasa solo a la lista.
-- Si al editarlo pongo más, sube (lo hace el servicio, no la base de datos).
-- NULL = sin referencia: nunca se añade solo.
ALTER TABLE productos
  ADD COLUMN cantidad_inicial NUMERIC(9,3)
             CHECK (cantidad_inicial IS NULL OR cantidad_inicial > 0);

-- Los productos que ya existen toman su cantidad de ahora. Los agotados
-- (cantidad 0) se quedan en NULL: ya se han acabado.
UPDATE productos SET cantidad_inicial = cantidad WHERE cantidad > 0;

-- Lista de la compra: compartida por el hogar. Cada línea es un nombre y,
-- si se quiere, cuánto ("Leche entera · 6 l"). 'auto' = la ha añadido
-- Vigía porque un producto bajó al 10 %. comprada_en NULL = sin tachar.
-- nombre_normalizado lo calcula el servidor con normalizar() (sin
-- mayúsculas ni tildes): con él se tacha sola y no se repite.
CREATE TABLE lista_compra (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hogar_id            BIGINT NOT NULL REFERENCES hogares(id) ON DELETE CASCADE,
  nombre              TEXT NOT NULL CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 80),
  nombre_normalizado  TEXT NOT NULL CHECK (char_length(nombre_normalizado) BETWEEN 1 AND 80),
  cantidad            NUMERIC(9,3) CHECK (cantidad IS NULL OR cantidad BETWEEN 0.001 AND 100000),
  unidad              TEXT CHECK (unidad IS NULL OR unidad IN ('g', 'kg', 'ml', 'l', 'unidades')),
  origen              TEXT NOT NULL CHECK (origen IN ('manual', 'auto')),
  creada_por          BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  creada_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  comprada_en         TIMESTAMPTZ,
  -- La cantidad y la unidad van juntas: las dos o ninguna.
  CHECK ((cantidad IS NULL) = (unidad IS NULL))
);

-- Lo que está SIN TACHAR no se repite en la misma casa, aunque dos
-- personas lo añadan a la vez: INSERT … ON CONFLICT DO NOTHING.
-- Lo tachado no cuenta: puedo volver a apuntar "Pan" la semana que viene.
CREATE UNIQUE INDEX lista_compra_pendiente_idx
  ON lista_compra (hogar_id, nombre_normalizado)
  WHERE comprada_en IS NULL;

-- Para leer la lista de una casa (con las tachadas).
CREATE INDEX lista_compra_hogar_idx ON lista_compra (hogar_id);
