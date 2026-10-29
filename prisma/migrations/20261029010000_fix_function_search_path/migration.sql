-- Fija el search_path de la función del trigger para que no dependa del rol que la invoca
-- (recomendación del linter de seguridad de Supabase: function_search_path_mutable).
ALTER FUNCTION public.nexora_forbid_mutation() SET search_path = '';
