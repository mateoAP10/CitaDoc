-- P1 seguridad, doctor_locations (20 ago 2026). INSERT/UPDATE/DELETE
-- (roles={authenticated}, qual=true, sin ownership) permitian que cualquier
-- medico logueado creara/modificara/borrara la ubicacion de CUALQUIER
-- otro medico. 6 filas reales. SELECT publica se deja intacta -- la
-- direccion del consultorio es dato intencionalmente publico para el
-- perfil/booking.
--
-- Mapeo de consumidores: 20 de 22 archivos solo hacen SELECT (paginas
-- publicas). Los 2 que escriben (citadoc-dashboard.html,
-- experimental/web-admin-v1.html) siempre operan sobre el propio perfil
-- autenticado (medico_id = M.id / state.id, resuelto de la sesion propia)
-- -- cero caso cross-doctor legitimo, a diferencia de medicos/doctor_leads.
-- No hace falta Edge Function.

drop policy if exists "Allow delete doctor locations" on public.doctor_locations;
drop policy if exists "Allow insert doctor locations" on public.doctor_locations;
drop policy if exists "Doctors can insert locations" on public.doctor_locations;
drop policy if exists "Allow update doctor locations" on public.doctor_locations;

create policy "medico crea sus ubicaciones" on public.doctor_locations
  for insert
  with check (medico_id in (select id from public.medicos where user_id = auth.uid()));

create policy "medico actualiza sus ubicaciones" on public.doctor_locations
  for update
  using (medico_id in (select id from public.medicos where user_id = auth.uid()));

create policy "medico borra sus ubicaciones" on public.doctor_locations
  for delete
  using (medico_id in (select id from public.medicos where user_id = auth.uid()));
