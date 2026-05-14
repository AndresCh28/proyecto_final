import { supabase } from './supabase'

export interface BalanceComisionRow {
  id_comision: number
  titulo: string
  estado: string
  monto_estimado: number
  monto_aprobado: number
  total_ingresos: number
  total_gastos: number
  balance_actual: number
}

export interface ResultadoPropuestaRow {
  id_propuesta: number
  id_comision: number
  titulo: string
  estado: string
  resultado_final: string
  votos_a_favor: number
  votos_en_contra: number
  abstenciones: number
  aprobada_por_mayoria_simple: boolean
}

export interface ActividadComisionRow {
  id_comision: number
  titulo: string
  cantidad_propuestas: number
  cantidad_archivos: number
  cantidad_movimientos: number
  cantidad_miembros: number
}

export async function fetchBalanceComisiones() {
  const { data, error } = await supabase
    .from('vw_balance_comisiones')
    .select(
      'id_comision, titulo, estado, monto_estimado, monto_aprobado, total_ingresos, total_gastos, balance_actual',
    )
    .order('id_comision', { ascending: true })

  if (error) throw error
  return (data as BalanceComisionRow[]) ?? []
}

export async function fetchResultadosPropuestas() {
  const { data, error } = await supabase
    .from('vw_resultados_propuestas')
    .select(
      'id_propuesta, id_comision, titulo, estado, resultado_final, votos_a_favor, votos_en_contra, abstenciones, aprobada_por_mayoria_simple',
    )
    .order('id_propuesta', { ascending: false })

  if (error) throw error
  return (data as ResultadoPropuestaRow[]) ?? []
}

export async function fetchActividadComisiones() {
  const { data, error } = await supabase
    .from('vw_actividad_comisiones')
    .select(
      'id_comision, titulo, cantidad_propuestas, cantidad_archivos, cantidad_movimientos, cantidad_miembros',
    )
    .order('id_comision', { ascending: true })

  if (error) throw error
  return (data as ActividadComisionRow[]) ?? []
}
