-- P6.1 -- Eje 2c: cierra la escritura anonima directa a `resenas`
--
-- Hasta ahora resenas.html escribia con la anon key directo contra
-- PostgREST, protegido solo por la policy de RLS
-- "insertar/actualizar reseña con medico_id real de la cita"
-- (medico_id = citas_medico_id_de(cita_id)). Esa policy queda tal cual --
-- es defensa en profundidad real, no hace daño dejarla -- pero deja de ser
-- la unica linea de defensa: resena-submit (service role) ahora agrega
-- ownership + elegibilidad de la cita + rate-limit + escritura atomica
-- (ON CONFLICT DO NOTHING sobre resenas_cita_id_key) antes de escribir.
--
-- anon/authenticated tenian grants crudos de mas (mismo patron que
-- citas_disponibilidad en Eje 1): INSERT/UPDATE/DELETE/TRUNCATE ademas de
-- SELECT. Se revoca todo menos SELECT -- resena-submit corre con
-- service_role, no necesita el grant de anon para escribir.
--
-- resenas_public_read (SELECT, sin condicion) NO se toca: lo usan
-- js/reviews-public.js (testimonios en los templates cinema-v1..v5) y el
-- propio resena.html (chequeo de "ya reseñaste" antes de mostrar el form).

revoke insert, update, delete, truncate, references, trigger
  on public.resenas from anon, authenticated;
