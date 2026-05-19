-- ============================================================
-- CitaDoc Phase 2 — Observability + Availability Infrastructure
-- ============================================================

-- ── 1. LOGS TABLE (observability.js writes here) ───────────

create table if not exists logs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  type         text,           -- 'error', 'event', 'geo', 'warn'
  message      text,
  context      jsonb,
  url          text,
  user_agent   text,
  session_id   text
);

-- Index for fast filtering
create index idx_logs_type        on logs (type);
create index idx_logs_session     on logs (session_id);
create index idx_logs_created_at  on logs (created_at desc);

-- Allow anonymous inserts (observability.js uses anon key)
alter table logs enable row level security;

create policy "Allow anonymous log inserts"
  on logs for insert
  to anon
  with check (true);

create policy "Allow authenticated log inserts"
  on logs for insert
  to authenticated
  with check (true);

-- Only service role can read logs (security)
create policy "Service role can read logs"
  on logs for select
  to service_role
  using (true);


-- ── 2. DOCTOR_AVAILABILITIES TABLE ─────────────────────────
-- Decouples availability from medicos.horarios_config JSONB
-- Enables complex scheduling, multiple locations, exceptions

create table if not exists doctor_availabilities (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid not null references medicos(id) on delete cascade,
  day_of_week   text not null check (day_of_week in ('dom','lun','mar','mie','jue','vie','sab')),
  start_time    time not null,
  end_time      time not null,
  timezone      text default 'America/Guayaquil',
  location_id   uuid,           -- optional: link to sedes table later
  slot_duration integer default 30,  -- minutes
  active        boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Prevent overlapping slots for same doctor on same day
create unique index idx_avail_doctor_day_start
  on doctor_availabilities (doctor_id, day_of_week, start_time)
  where active = true;

create index idx_avail_doctor_active
  on doctor_availabilities (doctor_id, active);

-- RLS
doctor_availabilities enable row level security;

create policy "Public can read active availabilities"
  on doctor_availabilities for select
  to anon, authenticated
  using (active = true);

create policy "Doctors can manage own availabilities"
  on doctor_availabilities for all
  to authenticated
  using (doctor_id in (
    select id from medicos where auth_uid = auth.uid()
  ))
  with check (doctor_id in (
    select id from medicos where auth_uid = auth.uid()
  ));


-- ── 3. RLS POLICIES FOR CITAS (appointments) ──────────────
-- Ensure doctors see only their appointments
-- Patients see only their own

create policy if not exists "Doctors see own appointments"
  on citas for select
  to authenticated
  using (medico_id in (
    select id from medicos where auth_uid = auth.uid()
  ));

create policy if not exists "Patients see own appointments"
  on citas for select
  to authenticated
  using (paciente_id in (
    select id from pacientes where auth_uid = auth.uid()
  ));

-- Anonymous can create appointments (booking flow)
create policy if not exists "Anonymous can create appointments"
  on citas for insert
  to anon, authenticated
  with check (true);


-- ── 4. RLS POLICIES FOR MEDICOS ────────────────────────────
-- Public reads only active verified doctors

create policy if not exists "Public reads active verified doctors"
  on medicos for select
  to anon, authenticated
  using (activo = true and verificacion_estado = 'verificado');

create policy if not exists "Doctors can update own profile"
  on medicos for update
  to authenticated
  using (auth_uid = auth.uid())
  with check (auth_uid = auth.uid());


-- ── 5. HELPER: UPDATE updated_at trigger ───────────────────
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_doctor_availabilities_updated_at
  on doctor_availabilities;

create trigger update_doctor_availabilities_updated_at
  before update on doctor_availabilities
  for each row execute function update_updated_at_column();


-- ── 6. SEED: Migrate existing horario_desde/hasta/dias_atencion ──
-- One-time migration from medicos columns to doctor_availabilities
insert into doctor_availabilities (doctor_id, day_of_week, start_time, end_time, active)
select
  m.id,
  unnest(m.dias_atencion) as day_of_week,
  m.horario_desde::time,
  m.horario_hasta::time,
  true
from medicos m
where m.activo = true
  and m.horario_desde is not null
  and m.horario_hasta is not null
  and m.dias_atencion is not null
on conflict do nothing;
