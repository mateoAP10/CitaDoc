-- P0 seguridad -- gate real de "publicamente reservable" (27 ago 2026)
--
-- Hallazgo: citadoc-perfil.html filtraba activo=true para decidir si
-- mostrar el widget de booking, pero la tabla citas tenia 3 policies de
-- INSERT redundantes para "anon", las 3 con check_expr = true (sin
-- ninguna condicion). Cualquiera con la anon key podia insertar una fila
-- en citas para CUALQUIER medico_id -- activo, verificado o no --
-- saltandose por completo la pagina de perfil. El filtro de UI no
-- protegia nada a nivel de base de datos.
--
-- Decision de Mateo: el gate autoritativo de "reservable" es
-- activo AND email_confirmado -- NO verificacion_estado (proceso de
-- revision manual, separado) ni verificado (columna boolean que ya
-- existia pero nunca la escribe nadie -- queda fuera de este cambio,
-- se revisa aparte).

-- ── 1. medicos.email_confirmado ─────────────────────────────────────────
alter table public.medicos
  add column if not exists email_confirmado boolean not null default false;

-- Backfill: medicos cuyo auth.users ya tiene email_confirmed_at hoy.
update public.medicos m
set email_confirmado = true
from auth.users u
where u.id = m.user_id
  and u.email_confirmed_at is not null
  and m.email_confirmado = false;

-- Sincronizacion futura: cubre tanto el alta (INSERT, cubre signup con
-- OAuth/Google o creacion admin donde email_confirmed_at ya viene seteado
-- desde el primer momento) como la confirmacion posterior real
-- (UPDATE de email_confirmed_at, el flujo normal de registro con
-- password). Mismo patron que el trigger on_auth_user_created ya
-- existente en 20260527_trigger_auto_create_medico.sql (SECURITY
-- DEFINER, search_path fijo, EXCEPTION WHEN OTHERS para nunca bloquear
-- un write real de auth.users).
create or replace function public.sync_medico_email_confirmado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.email_confirmed_at is not null
     and (TG_OP = 'INSERT' or OLD.email_confirmed_at is null) then
    update public.medicos
    set email_confirmado = true
    where user_id = NEW.id
      and email_confirmado is distinct from true;
  end if;
  return NEW;
exception when others then
  -- Nunca bloquear un write real de auth.users por un error aqui.
  return NEW;
end;
$$;

drop trigger if exists trg_sync_medico_email_confirmado on auth.users;
create trigger trg_sync_medico_email_confirmado
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.sync_medico_email_confirmado();

-- ── 2. RLS de citas -- gate autoritativo, no la UI ──────────────────────
-- Elimina las 3 policies redundantes de INSERT para anon, sin condicion.
drop policy if exists "Anonymous can create appointments" on public.citas;
drop policy if exists "citas_insert_public" on public.citas;
drop policy if exists "cualquiera crea cita" on public.citas;

-- medicos tiene su propio RLS que restringe el SELECT de anon a
-- ownership (20260819_medicos_select_ownership_only.sql -- por eso existe
-- medicos_publico para lectura publica). Un EXISTS(...) directo contra
-- medicos dentro del WITH CHECK de citas correria como el rol que hace el
-- INSERT (anon) y no veria NINGUNA fila -- ni siquiera la del medico
-- habilitado -- dejando el gate roto (rechaza todo, falso negativo
-- descubierto en la prueba real antes de darlo por cerrado). Se resuelve
-- con una funcion SECURITY DEFINER (mismo patron que
-- sync_medico_email_confirmado arriba) que corre como el owner de la
-- tabla (postgres, sin FORCE ROW LEVEL SECURITY) y por lo tanto bypassa
-- el RLS de medicos solo para esta verificacion puntual, sin exponer la
-- tabla completa.
create or replace function public.medico_reservable(p_medico_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.medicos m
    where m.id = p_medico_id
      and m.activo = true
      and m.email_confirmado = true
  );
$$;

revoke all on function public.medico_reservable(uuid) from public;
grant execute on function public.medico_reservable(uuid) to anon, authenticated;

-- Unica policy de INSERT publico: exige que el medico exista, este
-- activo y tenga el email confirmado. verificacion_estado/verificado
-- quedan fuera a proposito (ver nota arriba).
create policy "citas_insert_medico_habilitado" on public.citas
  for insert
  to anon
  with check ( public.medico_reservable(citas.medico_id) );

-- Nota: no existia (ni existe tras este cambio) ninguna policy de INSERT
-- para "authenticated" en citas -- el insert manual que hace el dashboard
-- del medico (citadoc-dashboard.html, _sb.from("citas").insert(...), fuera
-- de este bloque) corre con sesion autenticada y hoy no tiene ninguna
-- policy que lo permita. Posible bug preexistente sin relacion con este
-- fix -- documentado, no se toca aqui (fuera de alcance de P0).

-- ── 3. medicos_publico -- mismo filtro, para que la UI tampoco muestre
-- lo que la base de datos rechazaria ──────────────────────────────────
create or replace view public.medicos_publico
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

from public.medicos
where activo = true and email_confirmado = true;

revoke all on public.medicos_publico from anon, authenticated;
grant select on public.medicos_publico to anon, authenticated;
