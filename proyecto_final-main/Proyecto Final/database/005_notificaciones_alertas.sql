-- SIGECOM - Notificaciones automaticas, alertas financieras y Realtime.
-- Ejecutar en Supabase SQL Editor despues de 001, 002 y 004.

begin;

create or replace function public.notificar_comision(
    p_id_comision bigint,
    p_mensaje text,
    p_tipo varchar default 'informativa'
)
returns void
language sql
security definer
set search_path = public
as $$
    insert into public.notificaciones (id_usuario, mensaje, tipo)
    select destinatarios.id_usuario, p_mensaje, p_tipo
    from (
        select cm.id_usuario
        from public.comision_miembros cm
        join public.usuarios u on u.id_usuario = cm.id_usuario
        where cm.id_comision = p_id_comision and cm.activo and u.activo
        union
        select u.id_usuario
        from public.usuarios u
        join public.roles r on r.id_rol = u.id_rol
        where u.activo and r.nombre in ('Administrador', 'Coordinador')
    ) destinatarios;
$$;

create or replace function public.notificar_nueva_propuesta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.notificar_comision(
        new.id_comision,
        format('Nueva propuesta: %s. Ya puedes revisar sus detalles y participar en la votacion.', new.titulo),
        'propuesta'
    );
    return new;
end;
$$;

drop trigger if exists trg_notificar_nueva_propuesta on public.propuestas;
create trigger trg_notificar_nueva_propuesta
after insert on public.propuestas
for each row execute function public.notificar_nueva_propuesta();

create or replace function public.notificar_resultado_propuesta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.resultado_final is distinct from old.resultado_final
       and new.resultado_final <> 'pendiente' then
        perform public.notificar_comision(
            new.id_comision,
            format('La propuesta "%s" finalizo con resultado: %s.', new.titulo, new.resultado_final),
            'resultado'
        );
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notificar_resultado_propuesta on public.propuestas;
create trigger trg_notificar_resultado_propuesta
after update of resultado_final on public.propuestas
for each row execute function public.notificar_resultado_propuesta();

create or replace function public.notificar_estado_comision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_estado text;
begin
    if new.id_estado is distinct from old.id_estado then
        select nombre into v_estado from public.estados where id_estado = new.id_estado;
        perform public.notificar_comision(
            new.id_comision,
            format('La comision "%s" cambio al estado %s.', new.titulo, coalesce(v_estado, 'actualizado')),
            'comision'
        );
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notificar_estado_comision on public.comisiones;
create trigger trg_notificar_estado_comision
after update of id_estado on public.comisiones
for each row execute function public.notificar_estado_comision();

create or replace function public.alertar_movimiento_financiero()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_aprobado numeric := 0;
    v_gastos numeric := 0;
    v_ingresos numeric := 0;
    v_porcentaje numeric := 0;
    v_comision text;
begin
    select coalesce(p.monto_aprobado, p.monto_estimado, 0), c.titulo
      into v_aprobado, v_comision
    from public.comisiones c
    left join public.presupuestos p on p.id_comision = c.id_comision
    where c.id_comision = new.id_comision;

    select
        coalesce(sum(monto) filter (where tipo = 'gasto'), 0),
        coalesce(sum(monto) filter (where tipo = 'ingreso'), 0)
      into v_gastos, v_ingresos
    from public.movimientos_financieros
    where id_comision = new.id_comision;

    if v_aprobado > 0 then v_porcentaje := (v_gastos / v_aprobado) * 100; end if;

    if v_aprobado > 0 and v_gastos > v_aprobado then
        perform public.notificar_comision(new.id_comision,
            format('Alerta critica: %s excedio su presupuesto. Gastos: %s de %s.', v_comision, v_gastos, v_aprobado),
            'critica');
    elsif v_aprobado > 0 and v_porcentaje >= 80 then
        perform public.notificar_comision(new.id_comision,
            format('Advertencia financiera: %s ha utilizado %s%% de su presupuesto.', v_comision, round(v_porcentaje, 1)),
            'advertencia');
    elsif v_ingresos - v_gastos < 0 then
        perform public.notificar_comision(new.id_comision,
            format('Alerta critica: %s tiene fondos insuficientes. Balance actual: %s.', v_comision, v_ingresos - v_gastos),
            'critica');
    end if;
    return new;
end;
$$;

drop trigger if exists trg_alertar_movimiento_financiero on public.movimientos_financieros;
create trigger trg_alertar_movimiento_financiero
after insert on public.movimientos_financieros
for each row execute function public.alertar_movimiento_financiero();

create or replace function public.notificar_resolucion_solicitud()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_comision text;
    v_tipo text;
begin
    if new.estado is distinct from old.estado and new.estado in ('aprobada', 'rechazada') then
        select titulo into v_comision from public.comisiones where id_comision = new.id_comision;
        v_tipo := case when tg_table_name = 'solicitudes_presupuesto' then 'presupuesto' else 'solicitud' end;
        insert into public.notificaciones (id_usuario, mensaje, tipo)
        values (new.id_usuario,
            format('Tu solicitud de %s para "%s" fue %s.', v_tipo, v_comision, new.estado),
            case when new.estado = 'aprobada' then 'aprobacion' else 'rechazo' end);
    end if;
    return new;
end;
$$;

drop trigger if exists trg_notificar_solicitud_comision on public.solicitudes_comision;
create trigger trg_notificar_solicitud_comision
after update of estado on public.solicitudes_comision
for each row execute function public.notificar_resolucion_solicitud();

drop trigger if exists trg_notificar_solicitud_presupuesto on public.solicitudes_presupuesto;
create trigger trg_notificar_solicitud_presupuesto
after update of estado on public.solicitudes_presupuesto
for each row execute function public.notificar_resolucion_solicitud();

revoke all on function public.notificar_comision(bigint, text, varchar) from public, anon, authenticated;
revoke all on function public.notificar_nueva_propuesta() from public, anon, authenticated;
revoke all on function public.notificar_resultado_propuesta() from public, anon, authenticated;
revoke all on function public.notificar_estado_comision() from public, anon, authenticated;
revoke all on function public.alertar_movimiento_financiero() from public, anon, authenticated;
revoke all on function public.notificar_resolucion_solicitud() from public, anon, authenticated;

do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'notificaciones'
    ) then
        alter publication supabase_realtime add table public.notificaciones;
    end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
