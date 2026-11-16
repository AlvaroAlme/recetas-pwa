-- 006: cuadrante por fechas y aviso de la noche anterior (fase 7).
-- Decisiones: D-48 (por fechas, "fuera de casa" y grupo de alimentos) y
-- D-50 (8 grupos, opcional, un año de margen). Sustituye al
-- planificador_semanal por días de la semana, que nunca llegó a crearse.

-- La hora del aviso del plan, en la hora local de la casa. Sin segundos:
-- en Ajustes se elige como HH:MM.
ALTER TABLE hogares
  ADD COLUMN hora_aviso_plan TIME NOT NULL DEFAULT '21:00'
             CHECK (date_part('second', hora_aviso_plan) = 0);

-- Cuadrante: una fila por hogar + fecha + comida/cena. Las semanas empiezan
-- vacías: solo hay fila si alguien ha planificado algo. Cada hueco lleva UNA
-- de tres cosas: una receta, un texto libre ("Comida aniversario") o "fuera
-- de casa"; y, si no es "fuera de casa", un grupo de alimentos opcional
-- (la misma lista que GRUPOS_ALIMENTOS en compartido/constantes.js).
--
-- FK COMPUESTA (receta_id, hogar_id): la receta tiene que ser DEL MISMO
-- HOGAR (un CHECK no puede mirar otra tabla, R-15). Al borrar la receta,
-- SET NULL (receta_id) vacía solo receta_id y deja hogar_id intacto. Si
-- receta_id es NULL, la FK no se comprueba (MATCH SIMPLE, por defecto).
--
-- No exijo "receta, texto o fuera de casa": haría FALLAR el borrado de una
-- receta asignada. Una fila sin ninguna de las tres es un hueco VACÍO
-- (aunque le quede el grupo): no se lista ni cuenta para nada.
-- El margen de fechas (un año atrás y uno adelante) lo valida la API: un
-- CHECK con current_date no vale, porque tiene que dar siempre lo mismo.
CREATE TABLE cuadrante (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hogar_id       BIGINT NOT NULL REFERENCES hogares(id) ON DELETE CASCADE,
  fecha          DATE NOT NULL,
  tipo_comida    TEXT NOT NULL CHECK (tipo_comida IN ('comida', 'cena')),
  receta_id      BIGINT,
  texto_libre    TEXT CHECK (texto_libre IS NULL OR char_length(btrim(texto_libre)) BETWEEN 1 AND 80),
  fuera_de_casa  BOOLEAN NOT NULL DEFAULT false,
  grupo          TEXT CHECK (grupo IS NULL OR grupo IN ('legumbres', 'pescado', 'huevos',
                   'carne_blanca', 'carne_roja', 'verduras', 'pasta_arroz', 'otro')),
  -- También es el índice para leer una semana (hogar + fechas seguidas).
  UNIQUE (hogar_id, fecha, tipo_comida),
  -- Nunca una receta y un texto a la vez.
  CHECK (receta_id IS NULL OR texto_libre IS NULL),
  -- "Fuera de casa" va solo: sin receta, sin texto y sin grupo.
  CHECK (NOT fuera_de_casa OR (receta_id IS NULL AND texto_libre IS NULL AND grupo IS NULL)),
  FOREIGN KEY (receta_id, hogar_id) REFERENCES recetas (id, hogar_id)
    ON DELETE SET NULL (receta_id)
);

-- Qué avisos del plan se han enviado ya. Insertar aquí con ON CONFLICT
-- DO NOTHING es la forma de "reclamar" el envío una sola vez, aunque dos
-- pings lleguen a la vez. La tarea de avisos borra las de más de 7 días.
CREATE TABLE avisos_plan_enviados (
  hogar_id    BIGINT NOT NULL REFERENCES hogares(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,          -- el día del plan ("mañana" en la zona del hogar)
  enviado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hogar_id, fecha)
);
