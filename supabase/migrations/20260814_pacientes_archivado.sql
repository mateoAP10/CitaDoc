-- Archivado (soft delete) de pacientes -- decisión explícita: CitaDoc nunca
-- borra físicamente un paciente ni su historial clínico. "Eliminar paciente"
-- (botón manual o Assistant) siempre significa archivar: el paciente deja de
-- aparecer en la lista activa, búsquedas y el Action Engine del Assistant,
-- pero su registro, citas, consultas y recetas se conservan intactos y son
-- recuperables desde la sección de archivados.
--
-- Motivo técnico adicional: consultas_paciente_id_fkey y
-- recetas_paciente_id_fkey NO tienen ON DELETE CASCADE (a diferencia de
-- historias_clinicas y medico_paciente) -- un DELETE real de un paciente con
-- historial clínico ya fallaría por violación de foreign key. El archivado
-- es también la única opción técnicamente viable, no solo la más segura.

alter table pacientes add column if not exists archivado_at timestamptz null;

create index if not exists idx_pacientes_medico_activo
  on pacientes(medico_id) where archivado_at is null;
