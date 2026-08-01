alter table public.propuestas add column if not exists tipo varchar(30) not null default 'general';
update public.propuestas set tipo='presupuesto' where lower(titulo) like 'aprobación de presupuesto%' or lower(titulo) like 'aprobacion de presupuesto%';
alter table public.propuestas drop constraint if exists propuestas_tipo_chk;
alter table public.propuestas add constraint propuestas_tipo_chk check (tipo in ('general','presupuesto'));
alter table public.movimientos_financieros add column if not exists id_propuesta_origen bigint null references public.propuestas(id_propuesta) on delete set null;
create unique index if not exists movimientos_propuesta_origen_uidx on public.movimientos_financieros(id_propuesta_origen) where id_propuesta_origen is not null;
alter table public.movimientos_financieros drop constraint if exists movimientos_tipo_chk;
alter table public.movimientos_financieros add constraint movimientos_tipo_chk check (tipo in ('ingreso','gasto','presupuesto_aprobado'));

create or replace function public.actualizar_resultado_propuesta(p_id_propuesta bigint)
returns table(id_propuesta bigint,votos_a_favor integer,votos_en_contra integer,abstenciones integer,resultado_calculado varchar)
language plpgsql security definer set search_path=public as $$
declare v_favor integer;v_contra integer;v_abstencion integer;v_resultado varchar(20);v_comision bigint;v_tipo varchar(30);v_titulo varchar;v_actor bigint;v_presupuesto public.presupuestos%rowtype;
begin
 v_actor:=public.get_current_internal_user_id();
 select p.id_comision,p.tipo,p.titulo into v_comision,v_tipo,v_titulo from public.propuestas p where p.id_propuesta=p_id_propuesta;
 if v_comision is null or v_actor is null or not(public.is_comision_member(v_comision) or public.is_admin_or_coordinator()) then raise exception 'No tienes permiso para actualizar esta votación.';end if;
 select count(*)filter(where voto='a_favor'),count(*)filter(where voto='en_contra'),count(*)filter(where voto='abstencion') into v_favor,v_contra,v_abstencion from public.votos where votos.id_propuesta=p_id_propuesta;
 if v_favor>v_contra then v_resultado:='aprobada';elsif v_contra>v_favor then v_resultado:='rechazada';else v_resultado:='empate';end if;
 update public.propuestas set resultado_final=v_resultado,estado=case when v_resultado='aprobada' then 'aprobada' when v_resultado='rechazada' then 'rechazada' else estado end,fecha_cierre=case when v_resultado in('aprobada','rechazada') then coalesce(fecha_cierre,now()) else fecha_cierre end where propuestas.id_propuesta=p_id_propuesta;
 if v_resultado='aprobada' and v_tipo='presupuesto' then
  select * into v_presupuesto from public.presupuestos where presupuestos.id_comision=v_comision for update;
  if found and v_presupuesto.monto_estimado>0 then
   update public.presupuestos set monto_aprobado=v_presupuesto.monto_estimado,fecha_aprobacion=current_date,observaciones=coalesce(observaciones,'')||case when coalesce(observaciones,'')='' then '' else E'\n' end||'Aprobado mediante votación: '||v_titulo,creado_por=v_actor where presupuestos.id_presupuesto=v_presupuesto.id_presupuesto;
   insert into public.movimientos_financieros(id_comision,tipo,monto,descripcion,creado_por,id_propuesta_origen) values(v_comision,'presupuesto_aprobado',v_presupuesto.monto_estimado,'Presupuesto aprobado mediante votación: '||v_titulo,v_actor,p_id_propuesta) on conflict(id_propuesta_origen) where id_propuesta_origen is not null do nothing;
  end if;
 end if;
 return query select p_id_propuesta,v_favor,v_contra,v_abstencion,v_resultado;
end;$$;
revoke execute on function public.actualizar_resultado_propuesta(bigint) from anon;
grant execute on function public.actualizar_resultado_propuesta(bigint) to authenticated;
