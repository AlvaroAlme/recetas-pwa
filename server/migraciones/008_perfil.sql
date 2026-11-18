-- 008: perfil y avatar (fase 9, D-52).

-- La semilla del avatar: 32 cifras hexadecimales al azar. De ella sale
-- SIEMPRE el mismo avatar (lo dibuja blobatar en el navegador), así que
-- guardo la semilla y no el dibujo: si un día cambio el dibujo, no hay que
-- migrar nada.
--
-- gen_random_uuid() viene con PostgreSQL desde la 13 (Neon usa la 18). El
-- uuid sin guiones son justo 32 cifras hexadecimales. Como el DEFAULT cambia
-- en cada llamada, PostgreSQL lo calcula fila a fila: cada persona que ya
-- existe recibe su propia semilla, y las nuevas también al registrarse.
-- "Otro avatar" hace UPDATE ... SET avatar_semilla = DEFAULT.
ALTER TABLE usuarios
  ADD COLUMN avatar_semilla TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', '')
  CHECK (avatar_semilla ~ '^[0-9a-f]{32}$');
