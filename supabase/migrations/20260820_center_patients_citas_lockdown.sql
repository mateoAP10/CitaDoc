-- P2.2-A -- Doctor Center: center_patients + center_citas (20 ago 2026).
-- Ambas tablas tenian RLS habilitado pero con policies 100% publicas
-- (roles:{public}, qual:true/with_check:true) en SELECT/INSERT/UPDATE --
-- cualquiera con la anon key podia leer/editar la cedula, telefono, email
-- de cualquier paciente del centro, y crear/leer/modificar cualquier cita,
-- sin login. RLS no puede expresar "solo busqueda exacta por email/cedula"
-- (evalua fila por fila, no ve si el filtro es exacto o esta ausente) --
-- por eso el fix no es una policy mas fina, es sacar a anon/authenticated
-- del acceso directo por completo.
--
-- Los dos consumidores reales legitimos pasan a ser Edge Functions con
-- service role, cada uno con su propio nivel de confianza:
--   - center-booking (publica, sin auth): reserva de paciente nuevo,
--     replica el find-or-create que antes vivia en doctor-center.html.
--   - admin-center-crud (JWT admin_users, via requireAdmin()): CRUD
--     completo para doctor-center-admin.html.
-- center-followup ya usa service role directo -- no le afecta este cambio.

revoke all on public.center_patients from anon, authenticated;
revoke all on public.center_citas    from anon, authenticated;

drop policy if exists cp_select on public.center_patients;
drop policy if exists cp_insert on public.center_patients;
drop policy if exists cp_update on public.center_patients;

drop policy if exists cc_select on public.center_citas;
drop policy if exists cc_insert on public.center_citas;
drop policy if exists cc_update on public.center_citas;

-- RLS ya estaba habilitado en ambas; sin policies = deny-by-default para
-- anon/authenticated. service_role sigue bypasseando RLS como siempre.
