import { supabase } from './supabase'

export interface DashboardSummary {
  totalComisiones: number
  pendientes: number
  enProceso: number
  finalizadas: number
  notificacionesPendientes: number
}

export async function fetchDashboardSummary(idUsuario: number): Promise<DashboardSummary> {
  const [{ data: comisionRows, error: comisionRowsError }, { data: notificaciones, error: notificacionesError }] =
    await Promise.all([
      supabase.from('comisiones').select('id_estado'),
    supabase
      .from('notificaciones')
      .select('id_notificacion, leida')
      .eq('id_usuario', idUsuario)
      .order('fecha_envio', { ascending: false }),
    ])

  if (comisionRowsError) throw comisionRowsError
  if (notificacionesError) throw notificacionesError

  return {
    totalComisiones: (comisionRows ?? []).length,
    pendientes: (comisionRows ?? []).filter((item) => item.id_estado === 1).length,
    enProceso: (comisionRows ?? []).filter((item) => item.id_estado === 2).length,
    finalizadas: (comisionRows ?? []).filter((item) => item.id_estado === 3).length,
    notificacionesPendientes: (notificaciones ?? []).filter((item) => !item.leida).length,
  }
}
