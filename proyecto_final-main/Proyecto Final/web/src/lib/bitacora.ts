import { supabase } from './supabase'

export interface AuditEntry {
  id_historial: number
  tabla_afectada: string
  id_registro: number
  accion: string
  realizado_por: number | null
  descripcion: string | null
  fecha: string
  responsable: Array<{ nombre: string }> | null
}

export async function fetchAuditLog() {
  const { data, error } = await supabase
    .from('historial_cambios')
    .select('id_historial,tabla_afectada,id_registro,accion,realizado_por,descripcion,fecha,responsable:usuarios!historial_cambios_realizado_por_fkey(nombre)')
    .order('fecha', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data ?? []) as AuditEntry[]
}
