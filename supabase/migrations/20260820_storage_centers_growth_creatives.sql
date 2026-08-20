-- P1 seguridad, Storage centers + growth-creatives (20 ago 2026).
-- centers_storage_insert/update y growth_creatives_upload -- INSERT/UPDATE,
-- roles={public}, sin ninguna autenticacion -- permitian que cualquiera
-- subiera o sobrescribiera imagenes en ambos buckets sin login. Confirmado
-- reproducible en la auditoria global previa: anon subio un PNG real a
-- ambos sin sesion.
--
-- Los 3 consumidores reales (admin.html, doctor-center-admin.html,
-- js/web-builder-v2.js) migran a la Edge Function admin-storage-upload
-- (x-admin-token + service role, valida bucket/mime/tamano). Como esa
-- funcion usa service role, bypasa RLS por completo -- no hace falta
-- ninguna policy de INSERT/UPDATE/DELETE para que funcione. SELECT
-- publica queda intacta en ambos buckets -- las imagenes siguen
-- viendose sin login, eso nunca fue el problema.
--
-- centers no tenia ninguna policy de DELETE -- stgDelete('centers',...)
-- en doctor-center-admin.html (limpiar portada/logo antes de subir un
-- reemplazo) estaba roto, no solo abierto. Queda resuelto porque ahora
-- pasa por la Edge Function (service role), sin necesidad de agregar
-- una policy publica de DELETE que no deberia existir de todas formas.

drop policy if exists "centers_storage_insert" on storage.objects;
drop policy if exists "centers_storage_update" on storage.objects;
drop policy if exists "growth_creatives_upload" on storage.objects;
-- centers_storage_public_read y growth_creatives_public_read (SELECT) quedan intactas.
