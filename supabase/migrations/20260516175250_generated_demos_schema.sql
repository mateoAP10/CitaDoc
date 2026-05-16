-- Demo Generator: tabla principal
create table if not exists generated_demos (
  id                 uuid        primary key default gen_random_uuid(),
  slug               text        unique not null,

  -- inputs del médico
  doctor_name        text        not null,
  specialty          text        not null,
  city               text,
  logo_url           text,
  photo_url          text,

  -- config AI generada (fuente de verdad)
  web_config_jsonb   jsonb       not null default '{}',
  dna                text        not null,
  hero_title         text,

  -- previews generados por screenshot API
  preview_image_url  text,
  mobile_preview_url text,

  -- analytics básico
  views              integer     not null default 0,
  whatsapp_clicks    integer     not null default 0,

  -- lifecycle
  status             text        not null default 'demo',
  expires_at         timestamptz not null default (now() + interval '7 days'),
  activated_at       timestamptz,
  medico_id          uuid        references medicos(id) on delete set null,

  created_at         timestamptz not null default now()
);

-- Indexes críticos
create index idx_generated_demos_slug       on generated_demos (slug);
create index idx_generated_demos_status     on generated_demos (status);
create index idx_generated_demos_expires_at on generated_demos (expires_at);
create index idx_generated_demos_medico_id  on generated_demos (medico_id);

-- RLS
alter table generated_demos enable row level security;

-- Lectura pública de demos activos (para /demo/[slug])
create policy "demos_public_read"
  on generated_demos for select
  using (status in ('demo', 'pending_activation', 'active', 'published'));

-- Solo service role puede insertar/actualizar (Edge Functions)
create policy "demos_service_insert"
  on generated_demos for insert
  with check (true);

create policy "demos_service_update"
  on generated_demos for update
  using (true);

-- pg_cron: configurar desde dashboard o con extensión habilitada
-- select cron.schedule('cleanup-expired-demos', '0 3 * * *',
--   $$ delete from generated_demos where status = 'demo' and expires_at < now(); $$
-- );
