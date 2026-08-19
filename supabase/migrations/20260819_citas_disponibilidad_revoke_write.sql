-- P0 EMERGENCIA (19 ago 2026): citas_disponibilidad (creada en la etapa
-- anterior del booking publico) heredo los ALTER DEFAULT PRIVILEGES del
-- esquema public -- que otorgan INSERT/UPDATE/DELETE/TRUNCATE (no solo
-- SELECT) a anon/authenticated sobre CUALQUIER vista nueva por defecto.
-- Descubierto al implementar medicos_publico (mismo defecto, ya corregido
-- ahi) y confirmado reproducible aqui contra una cita de prueba
-- desechable, nunca datos reales:
--   - anon UPDATE vía la vista modifico de verdad fecha/hora/estado/
--     medico_id de una cita real -- incluida la REASIGNACION completa de
--     la cita a otro medico, sin ningun login.
--   - anon DELETE vía la vista borro la cita real de la tabla base citas.
--   - anon INSERT quedaba bloqueado, pero solo por casualidad (la vista no
--     expone paciente_nombre, columna NOT NULL de citas) -- no por ningun
--     control real.
--
-- No se toca la definicion de la vista (sigue exponiendo exactamente
-- id, medico_id, fecha, hora, estado). Este es el mismo fix que
-- medicos_publico: cerrar los privilegios por defecto explicitamente.

revoke all on public.citas_disponibilidad from anon, authenticated;
grant select on public.citas_disponibilidad to anon, authenticated;
