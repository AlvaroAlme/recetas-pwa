-- 001 · Hogares y productos (fase 1).
-- Solo esquema: los datos de prueba los crea `npm run semilla` (D-39).
-- Una migración aplicada NO se edita: cualquier cambio va en una 002, 003…

-- Una casa. De momento solo el nombre: la zona horaria y la hora del aviso
-- llegarán con sus fases (003 y 006).
CREATE TABLE hogares (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre      TEXT NOT NULL CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 80),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Productos del inventario. Igual que en Expo: el mismo alimento en dos
-- sitios son dos filas. El CHECK final hace imposible "agotado con cantidad"
-- o "disponible con 0".
CREATE TABLE productos (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hogar_id         BIGINT NOT NULL REFERENCES hogares(id) ON DELETE CASCADE,
  nombre           TEXT NOT NULL CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 80),
  cantidad         NUMERIC(9,3) NOT NULL CHECK (cantidad BETWEEN 0 AND 100000),
  unidad           TEXT NOT NULL CHECK (unidad IN ('g', 'kg', 'ml', 'l', 'unidades')),
  ubicacion        TEXT NOT NULL CHECK (ubicacion IN ('nevera', 'despensa', 'congelador')),
  fecha_alta       TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_caducidad  DATE,
  agotado          BOOLEAN NOT NULL DEFAULT false,
  CHECK ((agotado AND cantidad = 0) OR (NOT agotado AND cantidad > 0))
);

-- Índice PARCIAL para listar una ubicación: solo los no agotados, que son
-- los que se ven, ya ordenados por caducidad.
CREATE INDEX productos_listado_idx
  ON productos (hogar_id, ubicacion, fecha_caducidad)
  WHERE NOT agotado;