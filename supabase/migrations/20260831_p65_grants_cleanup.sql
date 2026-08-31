-- P6.5 -- cleanup de grants excedentes (citas, pacientes) + fila legacy
-- muerta de doctor_schedule_blocks. Ningun cambio de policy en este
-- archivo -- todo lo que sigue funcionando, sigue funcionando exactamente
-- igual; esto solo cierra permisos crudos que ninguna policy usa.
--
-- Reversible: los REVOKE se deshacen con los GRANT documentados al final
-- de cada bloque. El DELETE de la fila legacy se documenta completa abajo
-- para poder re-insertarla si hiciera falta (no hay ningun caller real que
-- la use, confirmado con doble evidencia en el mapeo de P6.5).

-- ── citas ────────────────────────────────────────────────────────────────
-- Policies reales hoy: anon INSERT (medico_reservable), authenticated
-- INSERT/SELECT/UPDATE (ownership). Sin DELETE para nadie.
revoke delete, references, trigger, truncate, select, update
  on public.citas from anon;
revoke delete, references, trigger, truncate
  on public.citas from authenticated;
-- Para revertir:
--   grant delete, references, trigger, truncate, select, update on public.citas to anon;
--   grant delete, references, trigger, truncate on public.citas to authenticated;

-- ── pacientes ────────────────────────────────────────────────────────────
-- Policies reales hoy: anon+authenticated INSERT (check(true) -- NO se
-- toca, hay un fallback real en citadoc-web.html/demo.html y el dashboard
-- inserta pacientes directo via crearPacienteCore()), authenticated
-- SELECT/UPDATE (ownership). Sin DELETE para nadie.
revoke delete, references, trigger, truncate, select, update
  on public.pacientes from anon;
revoke delete, references, trigger, truncate
  on public.pacientes from authenticated;
-- Para revertir:
--   grant delete, references, trigger, truncate, select, update on public.pacientes to anon;
--   grant delete, references, trigger, truncate on public.pacientes to authenticated;

-- ── doctor_schedule_blocks: fila legacy muerta ──────────────────────────
-- Fila completa antes de borrar (para poder re-insertarla si hiciera falta):
--   id:           386741ac-c98a-4835-a854-27815ea3d8d0
--   medico_id:    eb5246e4-92d9-465b-809e-1d24befd8876
--   day:          'Lunes'
--   start_time:   '7:00'
--   end_time:     '12:00'
--   location_id:  NULL
--   is_active:    true
--   created_at:   2026-05-10 23:00:55.924514+00
--
-- Para revertir:
--   insert into doctor_schedule_blocks (id, medico_id, day, start_time, end_time, location_id, is_active, created_at)
--   values ('386741ac-c98a-4835-a854-27815ea3d8d0', 'eb5246e4-92d9-465b-809e-1d24befd8876', 'Lunes', '7:00', '12:00', null, true, '2026-05-10 23:00:55.924514+00');
delete from public.doctor_schedule_blocks
  where id = '386741ac-c98a-4835-a854-27815ea3d8d0';
