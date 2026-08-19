-- P0 seguridad, medicos SELECT (19 ago 2026): auditoria confirmo que las 4
-- policies de SELECT en medicos son PERMISSIVE (se combinan con OR), asi que
-- "activo=true" solas ya conceden la fila COMPLETA (66 columnas) a
-- cualquiera -- anon o autenticado, sin excepcion. Confirmado reproducible:
-- select(*) explicito extrae cedula, senescyt, user_id, plan,
-- subscription_status, trial_ends_at, web_config_draft (borrador NO
-- publicado) de cualquier medico activo, aunque ningun archivo del repo
-- pida esas columnas asi -- el atacante no depende de que el frontend las
-- use, solo de que RLS las permita.
--
-- Solucion (mismo patron que citas_disponibilidad, aprobado explicitamente
-- por Mateo por el mismo motivo: 21+ consumidores publicos, la vista reduce
-- el cambio y cierra la fuga de raiz en un solo lugar en vez de confiar en
-- que cada uno de los 21 archivos elija las columnas correctas):
--
-- medicos_publico expone solo lo que el perfil publico/booking realmente
-- necesita. mostrar_direccion y whatsapp_activo se aplican DENTRO de la
-- vista (no en cada template) porque son toggles reales que el medico
-- configura en el dashboard pero que ningun template respeta hoy -- 0/21
-- lo chequean pese a existir la opcion. email NO se gatea aqui a proposito
-- -- js/agendar-cinema.js y js/booking.js lo usan para notificar al medico
-- de citas nuevas, no solo para mostrarlo en pantalla; gatearlo por
-- mostrar_email (default false) habria roto esas notificaciones para la
-- mayoria de medicos. plan se reemplaza por un boolean "destacado" -- el
-- unico uso real detectado (citadoc-perfil.html) es un badge, no necesita
-- el string completo del plan de facturacion.
--
-- Se excluyen sin ambiguedad: user_id, cedula, cedula_doc_url,
-- titulo_doc_url, subscription_status, trial_ends_at, maint_paid_until,
-- plan_activated_at, onboarding_state, growth_agent_fired_at,
-- trial_reminders_sent, onboarding_emails_sent, perfil_nudges_sent,
-- verificacion_estado, web_config_draft, plan crudo, plan_activo,
-- created_at, aparecer_directorio (es del directorio/busqueda, no del
-- perfil por slug -- tema aparte).

create view public.medicos_publico
with (security_invoker = false) as
select
  id, slug, titulo, nombre, apellido, especialidades, subespecialidad,
  bio, foto_url, pais, ciudad, anos_experiencia, seguros, universidad, idiomas,

  case when mostrar_direccion then direccion else null end as direccion,
  case when mostrar_direccion then maps_url   else null end as maps_url,
  case when mostrar_direccion then lat        else null end as lat,
  case when mostrar_direccion then lng        else null end as lng,

  case when whatsapp_activo then whatsapp else null end as whatsapp,
  whatsapp_activo, telefono, agendamiento_citadoc, whatsapp_directo,
  email,

  horario_desde, horario_hasta, dias_atencion, horarios_config,

  instagram, tiktok, linkedin, facebook, website, slogan,

  web_config, web_status, landing_config,

  activo, verificado, senescyt,

  rating_promedio, total_resenas,

  (plan = 'destacado') as destacado

from public.medicos;

-- CRITICO: el esquema public en este proyecto tiene ALTER DEFAULT PRIVILEGES
-- que otorga TODO (INSERT/UPDATE/DELETE/TRUNCATE, no solo SELECT) a anon y
-- authenticated sobre cualquier tabla/vista NUEVA por defecto -- confirmado
-- reproducible: sin el REVOKE explicito de abajo, un anon UPDATE contra esta
-- misma vista recien creada modifico de verdad la fila real de un medico en
-- produccion en cuanto se probo. citas_disponibilidad (vista creada en la
-- etapa anterior) tiene el mismo defecto activo ahora mismo -- pendiente de
-- fix urgente aparte, no se toca en esta migracion.
revoke all on public.medicos_publico from anon, authenticated;
grant select on public.medicos_publico to anon, authenticated;
