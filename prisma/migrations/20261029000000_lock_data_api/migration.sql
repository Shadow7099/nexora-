-- Cierra el acceso por API de datos (PostgREST de Supabase u otros).
--
-- Nexora solo accede a la base desde el servidor, con el rol dueño de las
-- tablas. En Supabase, el esquema `public` además se expone por una API REST
-- con la llave pública "anon": sin estas líneas, cualquiera con esa llave
-- podría leer empleados y salarios.
--
-- 1. RLS activo en todas las tablas y SIN políticas: ningún rol que no sea el
--    dueño puede leer ni escribir filas. El dueño (la app) no se ve afectado.
-- 2. Se retiran los permisos de los roles públicos de Supabase si existen
--    (en un PostgreSQL normal estos roles no existen y se omite el paso).

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      -- También para tablas que creen migraciones futuras.
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END $$;
