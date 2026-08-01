-- Datos de demostración: ejecutar únicamente en un proyecto de desarrollo.
-- Los espacios deben existir previamente. Este script no modifica producción por sí solo.
do $$
declare v_gen26 bigint; v_gen27 bigint;
begin
  select id_espacio into v_gen26 from public.espacios_trabajo where nombre='GEN 26' limit 1;
  select id_espacio into v_gen27 from public.espacios_trabajo where nombre='GEN 27' limit 1;
  if v_gen26 is null or v_gen27 is null then raise exception 'Cree GEN 26 y GEN 27 antes de cargar la demostración'; end if;
  -- La carga funcional debe realizarse con usuarios demo de Auth y sus membresías.
  -- Mantener cada registro asociado exclusivamente a v_gen26 o v_gen27.
  raise notice 'Espacios demo verificados: GEN 26=% y GEN 27=%',v_gen26,v_gen27;
end $$;
