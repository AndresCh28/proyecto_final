import { supabase } from './supabase'

export interface Notificacion {
  id_notificacion: number
  mensaje: string
  leida: boolean
  tipo: string
  fecha_envio: string
  id_espacio: number
}

export async function fetchNotificacionesByUser(idUsuario: number, idEspacio: number) {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('id_notificacion, mensaje, leida, tipo, fecha_envio, id_espacio')
    .eq('id_usuario', idUsuario)
    .eq('id_espacio', idEspacio)
    .order('fecha_envio', { ascending: false })

  if (error) throw error
  return (data as Notificacion[]) ?? []
}

export async function markNotificacionAsRead(idNotificacion: number, idEspacio: number) {
  const { data, error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id_notificacion', idNotificacion)
    .eq('id_espacio', idEspacio)
    .select('id_notificacion, mensaje, leida, tipo, fecha_envio, id_espacio')
    .single()

  if (error) throw error
  return data as Notificacion
}
