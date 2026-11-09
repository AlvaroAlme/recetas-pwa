-- 003: tuppers, suscripciones push y zona horaria del hogar (fase 4).
-- Decisiones: D-11 (web-push), D-13 (un solo formato de aviso) y D-14
-- (el próximo aviso en memoria). La hora del aviso del plan llega en la 006.

-- La zona horaria de la casa. Con ella calculo el "hoy" de la fecha límite
-- y el "día anterior a las 10:00" del aviso. La valida la API contra la
-- lista IANA; aquí solo pongo un tope de longitud.
ALTER TABLE hogares
  ADD COLUMN zona_horaria TEXT NOT NULL DEFAULT 'Europe/Madrid'
             CHECK (char_length(zona_horaria) BETWEEN 1 AND 64);

-- Tuppers. `notification_id` (id del aviso local en Expo) desaparece:
-- ahora el servidor marca `aviso_enviado_en` cuando lo envía, y así nunca
-- avisa dos veces del mismo tupper.
CREATE TABLE tuppers (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hogar_id          BIGINT NOT NULL REFERENCES hogares(id) ON DELETE CASCADE,
  nombre            TEXT NOT NULL CHECK (char_length(btrim(nombre)) BETWEEN 1 AND 80),
  ubicacion         TEXT NOT NULL CHECK (ubicacion IN ('nevera', 'despensa', 'congelador')),
  fecha_alta        TIMESTAMPTZ NOT NULL DEFAULT now(),
  dias_maximos      INTEGER NOT NULL CHECK (dias_maximos BETWEEN 1 AND 365),
  fecha_limite      DATE NOT NULL,       -- hoy (en la zona del hogar) + dias_maximos
  consumido         BOOLEAN NOT NULL DEFAULT false,
  aviso_enviado_en  TIMESTAMPTZ
);

-- Índice PARCIAL para listar una ubicación: solo los que no se han
-- consumido, ya ordenados por fecha límite.
CREATE INDEX tuppers_listado_idx ON tuppers (hogar_id, ubicacion, fecha_limite)
  WHERE NOT consumido;

-- Lo que busca el programador: tuppers vivos cuyo aviso no se ha enviado.
CREATE INDEX tuppers_avisos_idx ON tuppers (fecha_limite)
  WHERE NOT consumido AND aviso_enviado_en IS NULL;

-- Una suscripción push por dispositivo y navegador. `endpoint` es la URL
-- del servicio de push (Apple, Google…), única en el mundo. Si el
-- dispositivo cambia de cuenta, la fila pasa a la nueva (upsert en la API).
CREATE TABLE suscripciones_push (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE
              CHECK (char_length(endpoint) <= 1000 AND endpoint LIKE 'https://%'),
  p256dh      TEXT NOT NULL CHECK (char_length(p256dh) <= 200),
  auth        TEXT NOT NULL CHECK (char_length(auth) <= 100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX suscripciones_usuario_idx ON suscripciones_push (usuario_id);
