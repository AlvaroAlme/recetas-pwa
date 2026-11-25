-- 011: la lista de la compra compara los nombres sin palabras vacías
-- (D-54, cambio del 2026-11-25): "turrón de chocolate" y "turrón
-- chocolate" son la misma línea.
--
-- Desde ahora el servidor guarda en nombre_normalizado claveNombre()
-- (compartido/texto.js) y no normalizar(). Aquí recalculo las líneas que
-- ya había. Lo que ya está guardado YA va sin mayúsculas ni tildes: solo
-- falta quitar las palabras vacías y dejar un espacio entre las demás.

-- La misma regla que claveNombre(), en SQL. La borro al final: solo la
-- necesito en esta migración.
CREATE FUNCTION clave_nombre_011(texto TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    -- Las palabras útiles, en su orden (WITH ORDINALITY las numera).
    (SELECT string_agg(palabra, ' ' ORDER BY n)
       FROM regexp_split_to_table(btrim(texto), '\s+') WITH ORDINALITY AS t(palabra, n)
      WHERE palabra NOT IN ('de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'en', 'al', 'a')),
    -- Si solo tenía palabras vacías, todas (la clave nunca queda vacía).
    (SELECT string_agg(palabra, ' ' ORDER BY n)
       FROM regexp_split_to_table(btrim(texto), '\s+') WITH ORDINALITY AS t(palabra, n))
  )
$$;

-- Si había dos líneas sin tachar que ahora son la misma ("turrón
-- chocolate" y "turrón de chocolate"), el índice único no dejaría
-- recalcularlas: me quedo con la más antigua (el id más bajo).
DELETE FROM lista_compra AS nueva
 USING lista_compra AS vieja
 WHERE nueva.comprada_en IS NULL
   AND vieja.comprada_en IS NULL
   AND nueva.hogar_id = vieja.hogar_id
   AND nueva.id > vieja.id
   AND clave_nombre_011(nueva.nombre_normalizado) = clave_nombre_011(vieja.nombre_normalizado);

UPDATE lista_compra
   SET nombre_normalizado = clave_nombre_011(nombre_normalizado)
 WHERE nombre_normalizado <> clave_nombre_011(nombre_normalizado);

DROP FUNCTION clave_nombre_011(TEXT);
