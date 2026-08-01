alter table public.usuarios add column if not exists avatar_url text;
do $$ begin
 if not exists (select 1 from pg_constraint where conname='usuarios_avatar_tamano_chk') then
  alter table public.usuarios add constraint usuarios_avatar_tamano_chk check (avatar_url is null or char_length(avatar_url) <= 700000);
 end if;
end $$;
grant select, update (avatar_url) on public.usuarios to authenticated;
notify pgrst, 'reload schema';
