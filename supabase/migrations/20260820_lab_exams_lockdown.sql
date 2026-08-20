-- P2.2-C1 -- Doctor Center: lab_exams (20 ago 2026). RLS habilitado pero
-- con una unica policy ALL (qual:true, with_check:true, roles:{public}) --
-- sin ningun gate, ni siquiera en SELECT. Cualquiera con la anon key
-- podia leer/crear/editar/borrar el catalogo completo de examenes,
-- incluidos precios y comisiones (valor_lab, precio_final, ganancia_dres,
-- ganancia_dc). Unico consumidor en todo el repo: doctor-center-admin.html
-- (sin publico, sin self-service).
--
-- Mismo patron que lab_orders/lab_order_items/lab_liquidaciones (P2.2-B):
-- sin policies, acceso exclusivamente via admin-center-crud (requireAdmin()
-- + admin_users). El "eliminar" del panel sigue siendo un soft-delete
-- (activo=false) via update_lab_exam -- no se introduce DELETE real.

revoke all on public.lab_exams from anon, authenticated;

drop policy if exists lab_exams_public on public.lab_exams;

-- RLS ya estaba habilitado; sin policies = deny-by-default para
-- anon/authenticated. service_role sigue bypasseando RLS como siempre.
