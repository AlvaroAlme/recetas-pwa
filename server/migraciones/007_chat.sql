-- 007: chat ayudante con IA (fase 8). Decisiones: D-48 (chat con acciones
-- que se confirman, conversaciones por persona) y D-51 (una conversación
-- activa, 30 días, 40 preguntas, 30 mensajes al día, historial tal cual).
-- La tabla `sugerencias` de D-31 no se crea: las propuestas son tarjetas.

-- Cuándo aceptó la persona el aviso de privacidad DEL CHAT. Es otro aviso
-- que el del ticket: aquí se envían sus mensajes y lo que leen las
-- herramientas (inventario, recetas y plan), y la conversación se guarda.
-- NULL = aún no, y la API responde 403 AVISO_CHAT_PENDIENTE.
ALTER TABLE usuarios ADD COLUMN aviso_chat_aceptado_en TIMESTAMPTZ;

-- Cuota del chat: otra columna en la misma fila por persona y día, para no
-- tener dos tablas iguales. El ticket sigue contando en `llamadas`; como el
-- ticket inserta sin esta columna, necesita el DEFAULT 0.
ALTER TABLE uso_ia
  ADD COLUMN mensajes_chat INTEGER NOT NULL DEFAULT 0 CHECK (mensajes_chat >= 0);

-- UNA conversación activa por persona (UNIQUE usuario_id), privada: otra
-- persona del hogar no la ve. Guardo el hogar en que se empezó: si la
-- persona se cambia de casa, la conversación vieja habla de otro inventario
-- y la API la borra al abrir el chat. `preguntas` cuenta los mensajes de la
-- persona y el CHECK pone el techo de 40 (MAX_PREGUNTAS_CONVERSACION).
-- La limpieza diaria borra las que llevan más de 30 días sin mensajes
-- (actualizada_en); "Nueva conversación" la borra a mano.
CREATE TABLE conversaciones (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id      BIGINT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  hogar_id        BIGINT NOT NULL REFERENCES hogares(id) ON DELETE CASCADE,
  preguntas       SMALLINT NOT NULL DEFAULT 0 CHECK (preguntas BETWEEN 0 AND 40),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizada_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- La limpieza busca por fecha. (El índice de usuario_id ya lo crea UNIQUE;
-- el de hogar_id no hace falta: solo se usa en el CASCADE al borrar un hogar.)
CREATE INDEX conversaciones_actualizada_idx ON conversaciones (actualizada_en);

-- Los mensajes TAL CUAL los manda y los devuelve la API de Claude: la lista
-- de bloques (texto, razonamiento, tool_use, tool_result) en JSONB. Solo se
-- AÑADEN, nunca se editan: el razonamiento de Sonnet 5.5 solo vale si el
-- historial se reenvía idéntico (D-51). Un turno entero (mi pregunta, las
-- vueltas de herramientas y la respuesta) se guarda en una TX al terminar.
-- El orden de la conversación es el de `id`.
CREATE TABLE mensajes_chat (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversacion_id  BIGINT NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
  rol              TEXT NOT NULL CHECK (rol IN ('user', 'assistant')),
  contenido        JSONB NOT NULL CHECK (jsonb_typeof(contenido) = 'array'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mensajes_chat_conversacion_idx ON mensajes_chat (conversacion_id, id);

-- Qué se ha hecho con cada tarjeta: un bloque tool_use de proponer_receta o
-- proponer_huecos, identificado por su id ("toolu_…"). Sin fila = pendiente.
-- Insertar aquí con ON CONFLICT DO NOTHING es "reclamar" la tarjeta, así no
-- se guarda dos veces aunque se pulse en dos pestañas a la vez.
CREATE TABLE tarjetas_chat (
  conversacion_id  BIGINT NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
  tool_use_id      TEXT NOT NULL CHECK (char_length(tool_use_id) BETWEEN 1 AND 100),
  estado           TEXT NOT NULL CHECK (estado IN ('guardada', 'descartada')),
  resultado        JSONB,             -- { recetaId } o { guardados, saltados }
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversacion_id, tool_use_id)
);
