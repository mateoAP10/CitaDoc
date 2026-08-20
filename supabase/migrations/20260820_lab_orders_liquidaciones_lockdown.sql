-- P2.2-B -- Doctor Center: lab_orders + lab_order_items + lab_liquidaciones
-- (20 ago 2026). Las 3 tenian RLS habilitado pero con una unica policy
-- ALL (qual:true, with_check:true, roles:{public}) -- cualquiera con la
-- anon key podia leer/crear/editar ordenes de laboratorio, sus items
-- (valor_lab, precio_final, ganancia_dres, ganancia_dc por examen) y las
-- liquidaciones (montos pagados a laboratorio/medicos), sin login.
--
-- Unico consumidor real en todo el repo: doctor-center-admin.html (nada
-- publico las toca). Mismo patron que center_patients/center_citas
-- (P2.2-A): sin policies, acceso exclusivamente via admin-center-crud
-- (requireAdmin() + admin_users). lab_exams queda fuera a proposito --
-- se agrupa en P2.2-C junto con el resto de catalogos/configuracion.

revoke all on public.lab_orders         from anon, authenticated;
revoke all on public.lab_order_items    from anon, authenticated;
revoke all on public.lab_liquidaciones  from anon, authenticated;

drop policy if exists lab_orders_public        on public.lab_orders;
drop policy if exists lab_order_items_public   on public.lab_order_items;
drop policy if exists lab_liquidaciones_public on public.lab_liquidaciones;

-- RLS ya estaba habilitado en las 3; sin policies = deny-by-default para
-- anon/authenticated. service_role sigue bypasseando RLS como siempre.
