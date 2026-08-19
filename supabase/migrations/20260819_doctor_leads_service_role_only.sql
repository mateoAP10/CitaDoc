-- P1 seguridad, doctor_leads (19 ago 2026). Las 3 policies (SELECT/UPDATE/
-- DELETE, todas PERMISSIVE, roles={public}, qual=true) exponian el pipeline
-- de ventas completo de captacion de medicos (instagram_handle, doctor_name,
-- premium_score, score_reason, status, contacted_at) a cualquiera, sin
-- login -- y permitian borrar o modificar cualquier lead. 48 leads reales.
--
-- Mapeo de consumidores confirmado: ningun flujo publico depende de esto.
-- admin.html (unico consumidor cliente) corre con la anon key pura, sin
-- sesion -- las policies abiertas eran la UNICA razon por la que funcionaba,
-- no una necesidad real. scout-leads e invite-doctor ya usan service_role,
-- no les afecta este cambio.
--
-- Mismo patron que "leads"/"platform_settings": cierre total, solo
-- service_role. admin.html migra sus 5 operaciones a la Edge Function
-- admin-leads (x-admin-token + service role, mismo patron que
-- admin-update-medico).

drop policy if exists "leads_public_read" on public.doctor_leads;
drop policy if exists "leads_anon_update" on public.doctor_leads;
drop policy if exists "leads_anon_delete" on public.doctor_leads;

create policy "service_role_only" on public.doctor_leads
  for all
  using (false);
