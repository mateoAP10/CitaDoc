-- P1 seguridad, doctor_availabilities (20 ago 2026). "Authenticated can
-- manage availabilities" -- FOR ALL, roles={authenticated}, qual=true,
-- with_check=true -- permitia que cualquier medico logueado creara/
-- modificara/borrara disponibilidad de CUALQUIER otro.
--
-- 0 filas reales y -- confirmado con grep en todo el repo -- cero archivos
-- del proyecto referencian esta tabla. El sistema real de disponibilidad
-- en produccion es medicos.horario_desde/horario_hasta/dias_atencion +
-- doctor_schedule_blocks + citas_disponibilidad. Esta tabla parece un
-- esquema mas granular (por dia de semana) que quedo vestigial, nunca
-- conectado a la app. Se cierra igual, para no dejarla como una puerta
-- abierta si algun dia se empieza a usar. No hace falta tocar ningun
-- archivo cliente -- no hay consumidores.
--
-- SELECT publica se deja intacta (dato no sensible, franjas horarias sin
-- PII, mismo criterio que citas_disponibilidad/doctor_locations) -- se
-- elimina solo la duplicada, queda una unica policy.

drop policy if exists "Authenticated can manage availabilities" on public.doctor_availabilities;
drop policy if exists "public_read_avail" on public.doctor_availabilities;
-- "Public can read active availabilities" queda como la unica de SELECT.

create policy "medico crea su disponibilidad" on public.doctor_availabilities
  for insert
  with check (doctor_id in (select id from public.medicos where user_id = auth.uid()));

create policy "medico actualiza su disponibilidad" on public.doctor_availabilities
  for update
  using (doctor_id in (select id from public.medicos where user_id = auth.uid()));

create policy "medico borra su disponibilidad" on public.doctor_availabilities
  for delete
  using (doctor_id in (select id from public.medicos where user_id = auth.uid()));
