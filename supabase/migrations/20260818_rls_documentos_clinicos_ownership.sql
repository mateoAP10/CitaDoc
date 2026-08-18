-- P0 seguridad, siguiente capa (18 ago 2026): Hallazgo 1 de la auditoria de
-- documentos_clinicos + Storage. documentos_clinicos_all era la UNICA policy
-- de la tabla -- FOR ALL, PERMISSIVE, roles {public}, USING(true),
-- WITH CHECK(true) -- es decir SELECT/INSERT/UPDATE/DELETE sin ninguna
-- restriccion, para cualquiera (anon incluido). Confirmado reproducible
-- contra produccion: anon lee/inserta/modifica (incluido secuestrar pdf_url)/
-- borra documentos ajenos; medico B lee/modifica/borra documentos de
-- medico A. Ver conversacion para el informe completo.
--
-- Esta migracion SOLO toca documentos_clinicos. No se tocan documentos-
-- medicos (bucket publico, Hallazgo 2) ni verificacion-docs (Hallazgo 3) --
-- quedan para etapas separadas, aprobadas una por una.
--
-- No existe ningun flujo publico (anon) legitimo sobre esta tabla -- a
-- diferencia de pacientes/citas, aqui no hay booking anonimo que dependa de
-- ella. Los 3 unicos consumidores (_registrarDocumentoClinico,
-- _marcarDocumentoEnviado, renderFichaDocumentos en citadoc-dashboard.html)
-- corren siempre con una sesion de medico real y ya usan medico_id = M.id
-- (el propio medico logueado) o filtran por paciente_id de una ficha que ya
-- pertenece a ese medico -- ninguno necesita ver documentos ajenos, asi que
-- se puede cerrar sin abrir ninguna Edge Function nueva.

drop policy if exists "documentos_clinicos_all" on public.documentos_clinicos;

create policy "medico ve sus documentos" on public.documentos_clinicos
  for select
  using (medico_id in (select id from public.medicos where user_id = auth.uid()));

create policy "medico crea sus documentos" on public.documentos_clinicos
  for insert
  with check (medico_id in (select id from public.medicos where user_id = auth.uid()));

create policy "medico actualiza sus documentos" on public.documentos_clinicos
  for update
  using (medico_id in (select id from public.medicos where user_id = auth.uid()))
  with check (medico_id in (select id from public.medicos where user_id = auth.uid()));

create policy "medico borra sus documentos" on public.documentos_clinicos
  for delete
  using (medico_id in (select id from public.medicos where user_id = auth.uid()));
