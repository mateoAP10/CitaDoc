-- P1 seguridad, website_contacts (20 ago 2026). wc_owner_read (SELECT)
-- solo exigia auth.uid() IS NOT NULL -- cualquier medico autenticado (no
-- solo el dueno) podia leer los mensajes de contacto (PII real de
-- terceros: nombre, telefono, email, mensaje) de CUALQUIER otro medico.
-- 0 filas reales hoy, pero la policy ya esta viva.
--
-- Ademas: UPDATE y DELETE no tenian NINGUNA policy -- con RLS habilitado,
-- eso las bloquea para todos, incluido el propio dueno. El unico
-- consumidor (experimental/web-admin-v1.html, marcar leido / borrar
-- contacto) ya filtra por medico_id=state.id en el codigo, pero sin
-- respaldo real en RLS -- esas dos funciones estan rotas hoy. Este cambio
-- no es solo cerrar una fuga: tambien hace funcionar por primera vez algo
-- que el codigo ya intenta hacer.
--
-- INSERT publico (wc_public_insert) se deja intacto -- es la unica forma
-- en que un visitante anonimo puede enviar un mensaje, no hay dueno que
-- asignar en ese momento. Sin caso cross-doctor/admin legitimo -- no hace
-- falta Edge Function.

drop policy if exists "wc_owner_read" on public.website_contacts;

create policy "medico lee sus mensajes de contacto" on public.website_contacts
  for select
  using (medico_id in (select id from public.medicos where user_id = auth.uid()));

create policy "medico actualiza sus mensajes de contacto" on public.website_contacts
  for update
  using (medico_id in (select id from public.medicos where user_id = auth.uid()));

create policy "medico borra sus mensajes de contacto" on public.website_contacts
  for delete
  using (medico_id in (select id from public.medicos where user_id = auth.uid()));
