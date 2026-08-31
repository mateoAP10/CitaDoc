-- P6.4 -- permite al medico autenticado crear sus propias citas manualmente
--
-- citas tenia RLS de INSERT solo para anon (citas_insert_medico_habilitado,
-- booking publico, gateado por medico_reservable()) y de UPDATE/SELECT para
-- authenticated (ownership por medicos.user_id = auth.uid()), pero NUNCA
-- una policy de INSERT para authenticated. El grant base de tabla si
-- incluia INSERT para authenticated -- el bloqueo era exclusivamente la
-- ausencia de policy, confirmado (0 rows) antes de este cambio.
--
-- Afectaba dos callers reales, ambos via appointmentsCore(): el boton
-- "Nueva cita" del dashboard y la tool crear_cita del asistente de voz --
-- las dos fallaban con "new row violates row-level security policy for
-- table citas", confirmado en vivo durante el mapeo de P6.3.1.
--
-- Misma logica de ownership que ya usan "medico actualiza citas" y
-- "medico ve citas" -- sin condicion de plan Pro en RLS (eso ya lo filtra
-- esPro() en appointmentsCore(), client-side, igual que hoy) y sin ninguna
-- otra regla nueva: un medico solo puede insertar citas con su propio
-- medico_id, nada mas.

create policy "medico crea citas propias" on public.citas
  for insert to authenticated
  with check (
    exists (
      select 1 from public.medicos
      where medicos.id = citas.medico_id
        and medicos.user_id = auth.uid()
    )
  );
