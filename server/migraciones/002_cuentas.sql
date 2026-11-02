-- 002: cuentas, hogares compartidos, invitaciones y sesiones (fase 2).
-- Decisiones: D-03 (hogar compartido), D-04 (email y contraseña con scrypt),
-- D-16 (una persona, un solo hogar) y D-17 (sesión de 30 días).
-- La columna usuarios.aviso_ia_aceptado_en llega en la 004 (fase 5).

-- Personas registradas. El email se guarda siempre en minúsculas (lo
-- normaliza la API; el CHECK lo garantiza) para que UNIQUE funcione.
CREATE TABLE usuarios (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE
                   CHECK (char_length(email) BETWEEN 3 AND 254 AND email = lower(email)),
  nombre           TEXT NOT NULL CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 80),
  hash_contrasena  TEXT NOT NULL,          -- "scrypt$N$r$p$sal$hash" (D-04)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quién vive en cada hogar. PRIMARY KEY (usuario_id): una persona está en
-- UN solo hogar (D-16). Al borrar el hogar o la persona, se borra la fila.
CREATE TABLE miembros (
  usuario_id  BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  hogar_id    BIGINT NOT NULL REFERENCES hogares(id) ON DELETE CASCADE,
  rol         TEXT NOT NULL CHECK (rol IN ('propietario', 'miembro')),
  unido_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX miembros_hogar_idx ON miembros (hogar_id);

-- Códigos para unirse a un hogar. Guardo el HASH (SHA-256), no el código:
-- si alguien lee la base de datos, no puede usarlos. Un solo uso; caducan.
CREATE TABLE invitaciones (
  codigo_hash  TEXT PRIMARY KEY,
  hogar_id     BIGINT NOT NULL REFERENCES hogares(id) ON DELETE CASCADE,
  creada_por   BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  caduca_en    TIMESTAMPTZ NOT NULL,
  usada_en     TIMESTAMPTZ
);
CREATE INDEX invitaciones_hogar_idx ON invitaciones (hogar_id);

-- Sesiones abiertas. La cookie lleva un token aleatorio; aquí solo su hash.
CREATE TABLE sesiones (
  token_hash  TEXT PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  caduca_en   TIMESTAMPTZ NOT NULL
);
CREATE INDEX sesiones_usuario_idx ON sesiones (usuario_id);