-- 009: enlaces que se envían por correo (fase 10, D-53).
--
-- Dos tipos:
-- - 'recuperar': "¿Has olvidado la contraseña?". Caduca a los 30 minutos.
-- - 'email': confirmar un email nuevo. Caduca a las 24 horas y guarda la
--   dirección que hay que confirmar (email_nuevo).
--
-- Como en las sesiones y las invitaciones, el token viaja en el enlace del
-- correo y aquí guardo SOLO su SHA-256: si alguien leyera la base de datos,
-- no podría usar los enlaces. Cada enlace sirve UNA vez (usada_en).
-- Si se borra la persona, sus enlaces se van con ella (CASCADE).
CREATE TABLE enlaces_correo (
  token_hash   TEXT PRIMARY KEY,
  usuario_id   BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('recuperar', 'email')),
  email_nuevo  TEXT CHECK (char_length(email_nuevo) BETWEEN 3 AND 254 AND email_nuevo = lower(email_nuevo)),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  caduca_en    TIMESTAMPTZ NOT NULL,
  usada_en     TIMESTAMPTZ,
  -- El email nuevo, solo (y siempre) en los enlaces de tipo 'email'.
  CHECK ((tipo = 'email') = (email_nuevo IS NOT NULL))
);

-- Para "borra los enlaces pendientes de esta persona y de este tipo" al
-- pedir uno nuevo.
CREATE INDEX enlaces_correo_usuario_idx ON enlaces_correo (usuario_id, tipo);
