create or replace function public.is_espacio_member(p_id_espacio bigint) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.espacio_miembros em join public.usuarios u on u.id_usuario=em.id_usuario where em.id_espacio=p_id_espacio and em.activo and u.auth_user_id=(select auth.uid()) and u.activo) $$;
revoke all on function public.is_espacio_member(bigint) from public,anon;
grant execute on function public.is_espacio_member(bigint) to authenticated;
drop policy if exists espacio_miembros_select on public.espacio_miembros;
create policy espacio_miembros_select_same_workspace on public.espacio_miembros for select to authenticated using(public.is_admin_or_coordinator() or id_usuario=public.get_current_internal_user_id() or public.is_espacio_member(id_espacio));
