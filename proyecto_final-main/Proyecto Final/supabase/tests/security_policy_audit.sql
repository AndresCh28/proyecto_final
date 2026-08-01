-- Auditoría automatizable: debe devolver cero filas.
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('presupuestos','movimientos_financieros','propuestas','votos','mensajes_comision','mensajes_privados','notificaciones','historial_cambios','eventos_seguridad','sesiones_seguridad')
  and (qual = 'true' or with_check = 'true');

-- Todas las tablas sensibles deben exigir AAL2 mediante una política restrictiva.
select required.table_name
from (values ('presupuestos'),('movimientos_financieros'),('propuestas'),('votos'),('mensajes_comision'),('mensajes_privados'),('notificaciones'),('historial_cambios'),('eventos_seguridad'),('sesiones_seguridad')) required(table_name)
where not exists (
  select 1 from pg_policies p
  where p.schemaname='public' and p.tablename=required.table_name
    and p.permissive='RESTRICTIVE' and (coalesce(p.qual,'') like '%aal2%' or coalesce(p.with_check,'') like '%aal2%')
);
