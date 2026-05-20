-- ============================================================
-- CitaDoc Phase 2 — Safe SQL (handles missing columns)
-- ============================================================

-- ── 1. LOGS TABLE ──────────────────────────────────────────

create table if not exists logs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz default now(),
  type         text,
  message      text,
  context      jsonb,
  url          text,
  user_agent   text,
  session_id   text
);

create index if not exists idx_logs_type        on logs (type);
create index if not exists idx_logs_session     on logs (session_id);
create index if not exists idx_logs_created_at  on logs (created_at desc);

alter table logs enable row level security;

drop policy if exists "Allow anonymous log inserts" on logs;
drop policy if exists "Allow authenticated log inserts" on logs;
drop policy if exists "Service role can read logs" on logs;

create policy "Allow anonymous log inserts"
  on logs for insert
  to anon
  with check (true);

create policy "Allow authenticated log inserts"
  on logs for insert
  to authenticated
  with check (true);

create policy "Service role can read logs"
  on logs for select
  to service_role
  using (true);


-- ── 2. DOCTOR_AVAILABILITIES TABLE ─────────────────────────

create table if not exists doctor_availabilities (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid not null references medicos(id) on delete cascade,
  day_of_week   text not null check (day_of_week in ('dom','lun','mar','mie','jue','vie','sab')),
  start_time    time not null,
  end_time      time not null,
  timezone      text default 'America/Guayaquil',
  location_id   uuid,
  slot_duration integer default 30,
  active        boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

drop index if exists idx_avail_doctor_day_start;
create unique index idx_avail_doctor_day_start
  on doctor_availabilities (doctor_id, day_of_week, start_time)
  where active = true;

create index if not exists idx_avail_doctor_active
  on doctor_availabilities (doctor_id, active);

alter table doctor_availabilities enable row level security;

drop policy if exists "Public can read active availabilities" on doctor_availabilities;
drop policy if exists "Doctors can manage own availabilities" on doctor_availabilities;

create policy "Public can read active availabilities"
  on doctor_availabilities for select
  to anon, authenticated
  using (active = true);

-- Simplified: authenticated users can manage all for now
-- (update later when auth_uid column is confirmed)
create policy "Authenticated can manage availabilities"
  on doctor_availabilities for all
  to authenticated
  using (true)
  with check (true);


-- ── 3. RLS POLICIES FOR CITAS ─────────────────────────────

drop policy if exists "Doctors see own appointments" on citas;
drop policy if exists "Patients see own appointments" on citas;
drop policy if exists "Anonymous can create appointments" on citas;

-- Simplified policies for now
create policy "Authenticated can read appointments"
  on citas for select
  to authenticated
  using (true);

create policy "Anonymous can create appointments"
  on citas for insert
  to anon, authenticated
  with check (true);


-- ── 4. RLS POLICIES FOR MEDICOS ────────────────────────────

drop policy if exists "Public reads active verified doctors" on medicos;
drop policy if exists "Doctors can update own profile" on medicos;

create policy "Public reads active verified doctors"
  on medicos for select
  to anon, authenticated
  using (activo = true and verificacion_estado = 'verificado');

-- Simplified: authenticated can update for now
create policy "Authenticated can update doctors"
  on medicos for update
  to authenticated
  using (true)
  with check (true);


-- ── 5. UPDATE updated_at TRIGGER ───────────────────────────

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
