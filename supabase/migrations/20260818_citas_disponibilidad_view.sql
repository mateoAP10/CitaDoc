-- P0 seguridad, etapa 2 (18 ago 2026): public_read_slots en citas expone la
-- fila completa (paciente_nombre, paciente_tel, paciente_email) sin login,
-- cuando ningún consumidor real -- revisados los 9 archivos que hacen booking
-- público -- necesita más que fecha/hora/id/estado para calcular
-- disponibilidad y chequear doble-booking.
--
-- citas NO se toca -- su RLS queda exactamente como en la etapa 1. Esta vista
-- es la única superficie pública nueva: proyecta 5 columnas sin PII sobre la
-- tabla real. security_invoker=false a propósito -- la vista corre con los
-- permisos de su dueño (bypasa RLS de citas para SU propia lectura interna),
-- pero solo puede devolver hacia afuera las columnas que la vista declara.

CREATE VIEW public.citas_disponibilidad
WITH (security_invoker = false) AS
  SELECT id, medico_id, fecha, hora, estado
  FROM public.citas;

GRANT SELECT ON public.citas_disponibilidad TO anon, authenticated;
