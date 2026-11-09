-- 004: cuota de IA, idempotencia y aviso de privacidad (fase 5).
-- Decisiones: D-15 (10 llamadas a Claude al día por persona), P-06 (la
-- clave de idempotencia) y SEC-04 (aviso antes del primer escaneo).

-- Cuándo aceptó la persona el aviso de privacidad de la IA. NULL = aún no,
-- y la API responde 403 AVISO_IA_PENDIENTE hasta que lo acepte.
ALTER TABLE usuarios ADD COLUMN aviso_ia_aceptado_en TIMESTAMPTZ;

-- Cuota diaria de llamadas a Claude por persona. Una fila por persona y
-- día: la sumo con ON CONFLICT en una sola sentencia (§5.2).
CREATE TABLE uso_ia (
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,          -- en la zona horaria del hogar
  llamadas    INTEGER NOT NULL CHECK (llamadas >= 0),
  PRIMARY KEY (usuario_id, fecha)
);

-- Idempotencia: si el móvil repite "Guardar ticket" porque se cortó la red
-- después de guardar, devuelvo la respuesta guardada y no lo aplico dos veces.
CREATE TABLE operaciones (
  clave       UUID PRIMARY KEY,       -- crypto.randomUUID() en el navegador
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  respuesta   JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);