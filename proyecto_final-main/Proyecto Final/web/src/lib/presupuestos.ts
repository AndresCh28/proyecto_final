import { supabase } from './supabase'
import type { MovimientoFinanciero, Presupuesto } from '../types'

export interface BalanceResumen {
  ingresos: number
  gastos: number
  balance: number
}

export async function fetchPresupuestoByComision(idComision: number) {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('id_presupuesto, id_comision, monto_estimado, monto_aprobado, fecha_aprobacion, observaciones')
    .eq('id_comision', idComision)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return (data as Presupuesto | null) ?? null
}

export async function savePresupuesto(payload: {
  id_comision: number
  monto_estimado: number
  monto_aprobado: number
  observaciones: string | null
  creado_por: number
}) {
  const existing = await fetchPresupuestoByComision(payload.id_comision)

  if (existing) {
    const { data, error } = await supabase
      .from('presupuestos')
      .update({
        monto_estimado: payload.monto_estimado,
        monto_aprobado: payload.monto_aprobado,
        observaciones: payload.observaciones,
        fecha_aprobacion: payload.monto_aprobado > 0 ? new Date().toISOString().slice(0, 10) : null,
        creado_por: payload.creado_por,
      })
      .eq('id_presupuesto', existing.id_presupuesto)
      .select('id_presupuesto, id_comision, monto_estimado, monto_aprobado, fecha_aprobacion, observaciones')
      .single()

    if (error) throw error
    return data as Presupuesto
  }

  const { data, error } = await supabase
    .from('presupuestos')
    .insert({
      ...payload,
      fecha_aprobacion: payload.monto_aprobado > 0 ? new Date().toISOString().slice(0, 10) : null,
    })
    .select('id_presupuesto, id_comision, monto_estimado, monto_aprobado, fecha_aprobacion, observaciones')
    .single()

  if (error) throw error
  return data as Presupuesto
}

export async function aprobarPresupuestoDesdeVotacion(payload: {
  id_comision: number
  monto_aprobado: number
  observaciones: string | null
  creado_por: number
}) {
  const existing = await fetchPresupuestoByComision(payload.id_comision)

  if (!existing) {
    return savePresupuesto({
      id_comision: payload.id_comision,
      monto_estimado: payload.monto_aprobado,
      monto_aprobado: payload.monto_aprobado,
      observaciones: payload.observaciones,
      creado_por: payload.creado_por,
    })
  }

  const { data, error } = await supabase
    .from('presupuestos')
    .update({
      monto_aprobado: payload.monto_aprobado,
      observaciones: payload.observaciones,
      fecha_aprobacion: new Date().toISOString().slice(0, 10),
      creado_por: payload.creado_por,
    })
    .eq('id_presupuesto', existing.id_presupuesto)
    .select('id_presupuesto, id_comision, monto_estimado, monto_aprobado, fecha_aprobacion, observaciones')
    .single()

  if (error) throw error
  return data as Presupuesto
}

export async function fetchMovimientosByComision(idComision: number) {
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .select('id_movimiento, id_comision, tipo, monto, descripcion, fecha, id_propuesta_origen')
    .eq('id_comision', idComision)
    .order('fecha', { ascending: false })

  if (error) throw error
  return (data as MovimientoFinanciero[]) ?? []
}

export async function createMovimiento(payload: {
  id_comision: number
  tipo: 'ingreso' | 'gasto'
  monto: number
  descripcion: string
  creado_por: number
}) {
  const { data, error } = await supabase
    .from('movimientos_financieros')
    .insert(payload)
    .select('id_movimiento, id_comision, tipo, monto, descripcion, fecha')
    .single()

  if (error) throw error
  return data as MovimientoFinanciero
}

export function computeBalance(movimientos: MovimientoFinanciero[]): BalanceResumen {
  const ingresos = movimientos
    .filter((item) => item.tipo === 'ingreso')
    .reduce((total, item) => total + Number(item.monto ?? 0), 0)

  const gastos = movimientos
    .filter((item) => item.tipo === 'gasto')
    .reduce((total, item) => total + Number(item.monto ?? 0), 0)

  return {
    ingresos,
    gastos,
    balance: ingresos - gastos,
  }
}
