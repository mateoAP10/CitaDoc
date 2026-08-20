-- P2.1 -- Admin Auth real (20 ago 2026).
-- Reemplaza el mecanismo de autorizacion admin basado en un secreto
-- compartido (x-admin-token / ADMIN_TOKEN / '7citadoc7') por identidad
-- real via Supabase Auth. admin_users es la unica fuente de verdad de
-- quien es admin -- las Edge Functions validan JWT + membresia aqui,
-- nunca un secreto estatico.
--
-- Sin policies -- RLS habilitado sin ninguna policy permissive es
-- deny-by-default para anon/authenticated (ni siquiera el propio admin
-- puede leer su fila desde el cliente; la decision de "sos admin" la
-- toma siempre una Edge Function con service role). service_role sigue
-- bypasseando RLS como siempre.

create table public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

revoke all on public.admin_users from anon, authenticated;

-- Mateo -- cuenta real ya existente en Supabase Auth (mateoalarconpons@gmail.com,
-- creada 28 abr 2026). Se reusa esa identidad en vez de crear una nueva.
insert into public.admin_users (user_id, role)
values ('cdab9a30-94f9-4963-9875-b28f91253b2d', 'admin');
