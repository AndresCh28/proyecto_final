import { supabase } from './supabase'

export interface Notificacion {
  id_notificacion: number
  mensaje: string
  leida: boolean
  tipo: string
  fecha_envio: string
}

export async function fetchNotificacionesByUser(idUsuario: number) {
  const { data, error } = await supabase
    .from('notificaciones')
    .select('id_notificacion, mensaje, leida, tipo, fecha_envio')
    .eq('id_usuario', idUsuario)
    .order('fecha_envio', { ascending: false })

  if (error) throw error
  return (data as Notificacion[]) ?? []
}

export async function markNotificacionAsRead(idNotificacion: number) {
  const { data, error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id_notificacion', idNotificacion)
    .select('id_notificacion, mensaje, leida, tipo, fecha_envio')
    .single()

  if (error) throw error
  return data as Notificacion
}
