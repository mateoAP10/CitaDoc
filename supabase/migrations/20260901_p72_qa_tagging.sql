-- P7.2 -- Tagging QA/producción + origen de citas, para tener un dataset
-- confiable a futuro. Puramente aditivo, sin tocar RLS ni reclasificar
-- historicos ambiguos (quedan tal cual, con sus valores/NULLs actuales).
--
-- Reversible: ver bloque ROLLBACK al final (comentado).

-- 1. medicos.is_test -- cuentas completas de testing/interno.
--    Ningun caller de codigo lo setea en true; solo lo setean scripts QA
--    explicitos via service_role.
alter table public.medicos
  add column if not exists is_test boolean not null default false;

-- 2. citas.origen -- como nacio la cita. Nullable a proposito: el
--    historico (antes de este bloque) no se reclasifica, queda NULL =
--    "no clasificable". Valores validos hacia adelante:
--    'public_widget' | 'dashboard_manual' | 'assistant' | 'qa_script'
alter table public.citas
  add column if not exists origen text;

-- 3. citas.is_qa -- si esta fila debe excluirse de metricas reales,
--    independiente de is_test (medico real, cita/paciente de prueba).
alter table public.citas
  add column if not exists is_qa boolean not null default false;

-- 4. pacientes.is_qa -- mismo criterio que citas.is_qa.
--    pacientes.origen YA EXISTE (default 'manual') -- no se toca la
--    columna ni se reclasifica lo historico. Solo se corrigen, en
--    codigo, los callers que hoy dejan que caiga al default sin
--    quererlo (booking-resolve-patient, demo.html, citadoc-web.html).
alter table public.pacientes
  add column if not exists is_qa boolean not null default false;

-- 5. web_analytics.is_qa -- misma logica, aplicada unicamente al
--    tracking que YA EXISTE (wkTrack() en citadoc-web.html). No se
--    agrega tracking nuevo a ninguna superficie.
alter table public.web_analytics
  add column if not exists is_qa boolean not null default false;

-- 6. Vista de funnel limpio -- filtra is_test/is_qa, no agrega/inventa
--    etapas que hoy no podemos medir (sin "visita"/"link compartido":
--    el tracking real solo cubre 1 de 9 superficies publicas).
create or replace view public.v_funnel_limpio as
select
  m.id                as medico_id,
  m.slug,
  m.created_at        as registro_at,
  m.activo,
  m.email_confirmado,
  c.id                as cita_id,
  c.created_at         as cita_at,
  c.origen             as cita_origen,
  c.paciente_id,
  row_number() over (
    partition by c.medico_id, c.paciente_id
    order by c.created_at
  ) as n_visita_paciente
from public.medicos m
left join public.citas c
  on c.medico_id = m.id and c.is_qa = false
left join public.pacientes p
  on p.id = c.paciente_id and p.is_qa = false
where m.is_test = false;

comment on view public.v_funnel_limpio is
  'P7.2 -- funnel filtrado por is_test/is_qa=false. No incluye visita/link '
  'compartido: sin tracking confiable para esas etapas todavia (ver P9.x).';

-- ROLLBACK (ejecutar manualmente si hace falta revertir este bloque):
-- drop view if exists public.v_funnel_limpio;
-- alter table public.web_analytics drop column if exists is_qa;
-- alter table public.pacientes      drop column if exists is_qa;
-- alter table public.citas          drop column if exists is_qa;
-- alter table public.citas          drop column if exists origen;
-- alter table public.medicos        drop column if exists is_test;
