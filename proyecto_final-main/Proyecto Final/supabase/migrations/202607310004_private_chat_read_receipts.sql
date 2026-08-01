drop policy if exists mensajes_privados_update_destinatario on public.mensajes_privados;
create policy mensajes_privados_update_destinatario on public.mensajes_privados for update to authenticated using(id_destinatario=public.get_current_internal_user_id()) with check(id_destinatario=public.get_current_internal_user_id());
grant update(leido) on public.mensajes_privados to authenticated;
