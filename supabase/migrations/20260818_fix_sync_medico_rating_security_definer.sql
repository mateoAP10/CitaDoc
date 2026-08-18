-- Bug real encontrado al probar el circuito de reseñas desde el frontend
-- (anon key real, no service role): sync_medico_rating() no tenía
-- SECURITY DEFINER, así que el UPDATE interno a public.medicos corría con
-- los permisos del rol que insertó la reseña. Con el service role (como
-- hacía cita-review) nunca se notó porque bypassea RLS. Con el anon key
-- real de un paciente (el flujo correcto ahora que la página vive en el
-- frontend), el UPDATE se ejecutaba pero RLS lo filtraba a 0 filas
-- afectadas -- sin error, en silencio: rating_promedio/total_resenas
-- nunca se actualizaban para reseñas enviadas por pacientes reales.

CREATE OR REPLACE FUNCTION sync_medico_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.medicos
  SET
    rating_promedio = (
      SELECT ROUND(AVG(rating_medico)::NUMERIC, 2)
      FROM public.resenas
      WHERE medico_id = NEW.medico_id AND rating_medico IS NOT NULL
    ),
    total_resenas = (
      SELECT COUNT(*)
      FROM public.resenas
      WHERE medico_id = NEW.medico_id AND rating_medico IS NOT NULL
    )
  WHERE id = NEW.medico_id;
  RETURN NEW;
END;
$$;
