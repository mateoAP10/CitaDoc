-- P0 seguridad, etapa 2 de 2 (18 ago 2026): cierre final.
-- public_read_slots (SELECT, qual:true) era la última superficie pública que
-- exponía la fila COMPLETA de citas (paciente_nombre, paciente_tel,
-- paciente_email) sin login. citas_disponibilidad (ver
-- 20260818_citas_disponibilidad_view.sql) ya reemplaza, para los 9
-- consumidores públicos de booking, todo lo que esa policy servía:
-- id, medico_id, fecha, hora, estado -- nada de PII.
--
-- Con este DROP, un SELECT directo y anónimo sobre public.citas deja de
-- devolver filas. El único acceso de lectura a la tabla real que queda es
-- "medico ve citas" (ownership por auth.uid()). El INSERT público (booking)
-- no se toca -- sigue permitiendo crear citas sin login, como siempre.

drop policy if exists "public_read_slots" on public.citas;
