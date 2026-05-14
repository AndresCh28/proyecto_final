-- Permite que miembros activos de una comision creen propuestas para esa comision.
-- Ejecutar en Supabase SQL Editor despues de 001_sigecom_supabase.sql.

drop policy if exists propuestas_insert_staff on public.propuestas;

create policy propuestas_insert_staff_or_member
on public.propuestas
for insert
to authenticated
with check (
    public.is_admin_or_coordinator()
    or (
        creada_por = public.get_current_internal_user_id()
        and public.is_comision_member(id_comision)
    )
);

notify pgrst, 'reload schema';
