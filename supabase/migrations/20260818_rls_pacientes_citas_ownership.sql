-- P0 seguridad (18 ago 2026): pacientes y citas exponían PII completa
-- (nombre, email, telefono, cedula) sin ningun filtro de dueño -- confirmado
-- reproducible con la anon key publica, sin login, 100% de ambas tablas
-- (11/11 pacientes, 41/41 citas). Ver conversación para el informe completo
-- del hallazgo y el mapa de dependencias que confirma que NINGUNA ruta
-- legitima (dashboard, Assistant, booking) dependia de este agujero --
-- el código ya filtraba por medico_id en JS en los 19+ sitios que leen
-- pacientes/citas del médico logueado.
--
-- Etapa 1 de 2 (aprobada explícitamente por Mateo): solo SELECT/UPDATE por
-- ownership real. NO se toca en esta migración:
--   - INSERT público de pacientes ni de citas (booking sin login)
--   - public_read_slots (SELECT público de citas para mostrar disponibilidad)
-- Esos dos quedan para la etapa 2, con diseño propio (reemplazar la lectura
-- publica de la tabla completa por una función acotada).

-- ── pacientes: SELECT y UPDATE por dueño real ──────────────────────────────
drop policy if exists "buscar paciente por email" on public.pacientes;
drop policy if exists "medico actualiza paciente" on public.pacientes;

create policy "medico ve sus pacientes" on public.pacientes
  for select
  using (medico_id in (select id from public.medicos where user_id = auth.uid()));

create policy "medico actualiza sus pacientes" on public.pacientes
  for update
  using (medico_id in (select id from public.medicos where user_id = auth.uid()));

-- "cualquiera crea paciente" (INSERT) se deja intacta -- la necesita el
-- booking público (buscarOCrearPaciente en js/shared.js y js/booking.js).

-- ── citas: SELECT por dueño real ───────────────────────────────────────────
-- "medico ve citas" (auth.uid() contra medicos) YA existía y es correcta --
-- el problema real era que "Authenticated can read appointments" (qual:true)
-- coexistía con ella. RLS combina políticas del mismo comando con OR, así
-- que la permisiva anulaba a la correcta. Alcanza con eliminar la permisiva.
drop policy if exists "Authenticated can read appointments" on public.citas;

-- "public_read_slots" (SELECT público) y las 3 políticas de INSERT público
-- de citas se dejan intactas -- las necesita el booking. Quedan para la
-- etapa 2.
