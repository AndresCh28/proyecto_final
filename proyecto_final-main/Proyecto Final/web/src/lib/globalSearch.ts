import { supabase } from './supabase'
import { getActiveWorkspaceId } from './espacios'

export type SearchModule = 'Comisiones' | 'Propuestas' | 'Presupuestos' | 'Notificaciones' | 'Usuarios'

export interface GlobalSearchResult {
  id: string
  module: SearchModule
  title: string
  description: string
  href: string
}

function message(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

export async function globalSearch(term: string): Promise<GlobalSearchResult[]> {
  const idEspacio = getActiveWorkspaceId()
  const pattern = `%${term.trim().slice(0, 80)}%`
  const [committees, proposals, budgets, notifications, users] = await Promise.all([
    supabase.from('comisiones').select('id_comision,titulo,descripcion').ilike('titulo', pattern).limit(6),
    supabase.from('propuestas').select('id_propuesta,id_comision,titulo,descripcion').ilike('titulo', pattern).limit(6),
    supabase.from('presupuestos').select('id_presupuesto,id_comision,observaciones,monto_estimado').ilike('observaciones', pattern).limit(5),
    supabase.from('notificaciones').select('id_notificacion,tipo,mensaje,leida').eq('id_espacio', idEspacio).ilike('mensaje', pattern).limit(5),
    supabase.from('usuarios').select('id_usuario,nombre,correo').ilike('nombre', pattern).limit(5),
  ])

  const errors = [committees.error, proposals.error, budgets.error, notifications.error, users.error].filter(Boolean)
  if (errors.length === 5) throw new Error('No fue posible realizar la búsqueda global.')

  return [
    ...(committees.data ?? []).map((item) => ({
      id: `commission-${item.id_comision}`,
      module: 'Comisiones' as const,
      title: item.titulo,
      description: message(item.descripcion, 'Sin descripción registrada.'),
      href: `/comisiones?buscar=${encodeURIComponent(item.titulo)}`,
    })),
    ...(proposals.data ?? []).map((item) => ({
      id: `proposal-${item.id_propuesta}`,
      module: 'Propuestas' as const,
      title: item.titulo,
      description: message(item.descripcion, `Propuesta de la comisión #${item.id_comision}`),
      href: `/propuestas?comision=${item.id_comision}&buscar=${encodeURIComponent(item.titulo)}`,
    })),
    ...(budgets.data ?? []).map((item) => ({
      id: `budget-${item.id_presupuesto}`,
      module: 'Presupuestos' as const,
      title: `Presupuesto de comisión #${item.id_comision}`,
      description: message(item.observaciones, `Monto estimado: ${item.monto_estimado}`),
      href: `/presupuestos?comision=${item.id_comision}`,
    })),
    ...(notifications.data ?? []).map((item) => ({
      id: `notification-${item.id_notificacion}`,
      module: 'Notificaciones' as const,
      title: item.tipo,
      description: message(item.mensaje, item.leida ? 'Notificación leída' : 'Notificación pendiente'),
      href: `/notificaciones?buscar=${encodeURIComponent(item.mensaje)}`,
    })),
    ...(users.data ?? []).map((item) => ({
      id: `user-${item.id_usuario}`,
      module: 'Usuarios' as const,
      title: item.nombre,
      description: item.correo,
      href: `/usuarios?buscar=${encodeURIComponent(item.nombre)}`,
    })),
  ]
}
