-- 005: recetario del hogar (fase 6). Decisiones: D-48 (las sugerencias de
-- la IA ya no van aquí: son tarjetas del chat, fase 8) y D-49 (editar,
-- raciones opcionales, ingredientes en filas).

-- Recetas guardadas. UNIQUE (id, hogar_id) parece redundante (id ya es
-- único), pero lo necesita la FK compuesta del cuadrante (fase 7): así un
-- hueco solo puede apuntar a una receta de su mismo hogar.
-- 15 029 = 30 pasos × 500 caracteres + 29 saltos de línea (SEC-05).
CREATE TABLE recetas (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hogar_id       BIGINT NOT NULL REFERENCES hogares(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 80),
  raciones       SMALLINT CHECK (raciones BETWEEN 1 AND 20),   -- NULL = no lo sé
  instrucciones  TEXT NOT NULL CHECK (char_length(instrucciones) BETWEEN 1 AND 15029),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, hogar_id)
);
CREATE INDEX recetas_hogar_idx ON recetas (hogar_id, created_at DESC);

-- Ingredientes. No necesitan hogar_id: pertenecen a una receta que ya lo
-- tiene. El orden es el de inserción (ORDER BY id): al editar, borro todos
-- y los vuelvo a insertar en el orden del formulario.
CREATE TABLE receta_ingredientes (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  receta_id  BIGINT NOT NULL REFERENCES recetas(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 80),
  cantidad   NUMERIC(9,3) NOT NULL CHECK (cantidad > 0 AND cantidad <= 100000),
  unidad     TEXT NOT NULL CHECK (unidad IN ('g', 'kg', 'ml', 'l', 'unidades'))
);
CREATE INDEX receta_ingredientes_receta_idx ON receta_ingredientes (receta_id);