-- ============================================================
-- CitaDoc Argentina Validation Script
-- Run this in Supabase SQL Editor to check data readiness
-- ============================================================

-- ── 1. Check total active verified doctors by country ───────
select
  pais,
  count(*) as total,
  count(*) filter (where activo = true and verificacion_estado = 'verificado') as visible
from medicos
where pais is not null
group by pais
order by visible desc;

-- ── 2. Check Argentina specifically ─────────────────────────
select
  id,
  nombre,
  apellido,
  titulo,
  ciudad,
  pais,
  especialidades,
  activo,
  verificacion_estado,
  horario_desde,
  horario_hasta,
  dias_atencion
from medicos
where pais = 'argentina'
order by created_at desc
limit 20;

-- ── 3. Check if any doctor is missing critical fields ───────
select
  'missing_pais' as issue,
  count(*) as count
from medicos
where pais is null or pais = ''
union all
select
  'missing_ciudad' as issue,
  count(*) as count
from medicos
where ciudad is null or ciudad = ''
union all
select
  'missing_especialidades' as issue,
  count(*) as count
from medicos
where especialidades is null or array_length(especialidades, 1) = 0
union all
select
  'not_verified' as issue,
  count(*) as count
from medicos
where verificacion_estado != 'verificado'
union all
select
  'not_active' as issue,
  count(*) as count
from medicos
where activo != true;

-- ── 4. Quick fix: set pais for doctors missing it ───────────
-- Uncomment and modify if needed:
-- update medicos set pais = 'ecuador' where pais is null or pais = '';

-- ── 5. Quick fix: verify doctors that should be visible ─────
-- Uncomment if you want to auto-verify existing doctors:
-- update medicos
-- set verificacion_estado = 'verificado', activo = true
-- where verificacion_estado is null or verificacion_estado = '';
