-- P6.7 -- ownership de pacientes.medico_id en el INSERT autenticado
--
-- "cualquiera crea paciente" era una sola policy de INSERT compartida
-- entre anon y authenticated, con check(true) -- sin ninguna validacion.
-- Un medico autenticado podia tecnicamente insertar un paciente con el
-- medico_id de otro medico. El flujo real (crearPacienteCore(), dashboard
-- + tool crear_paciente del Assistant) siempre manda su propio medico_id,
-- pero la base de datos no lo exigia.
--
-- No se puede agregar la condicion de ownership a la policy compartida:
-- anon no tiene auth.uid() (siempre NULL), y el booking publico depende
-- de insertar pacientes con medico_id=null (paciente "sin dueño",
-- reutilizable via booking-resolve-patient). Agregar ownership ahi hubiera
-- roto el booking publico completo -- exactamente el tipo de error que ya
-- evitamos en P0. Se separa en dos policies en vez de modificar una.
--
-- service_role (booking-resolve-patient, patient-summary, admin-verify)
-- bypassea RLS siempre -- no le afecta nada de esto.

drop policy "cualquiera crea paciente" on public.pacientes;

create policy "anon crea paciente sin dueño" on public.pacientes
  for insert to anon
  with check (true);

create policy "medico crea sus propios pacientes" on public.pacientes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.medicos
      where medicos.id = pacientes.medico_id
        and medicos.user_id = auth.uid()
    )
  );

-- Para revertir:
--   drop policy "anon crea paciente sin dueño" on public.pacientes;
--   drop policy "medico crea sus propios pacientes" on public.pacientes;
--   create policy "cualquiera crea paciente" on public.pacientes
--     for insert to anon, authenticated with check (true);
