import { supabase } from './supabase'
import type { SolicitudPresupuesto } from '../types'

const solicitudPresupuestoSelect =
  'id_solicitud_presupuesto, id_comision, id_usuario, monto_solicitado, justificacion, estado, fecha_solicitud, fecha_revision, revisado_por'

function throwSolicitudPresupuestoError(error: { message?: string; code?: string }) {
  const message = error.message ?? 'Error desconocido.'
  const normalized = message.toLowerCase()

  if (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    normalized.includes('could not find the table') ||
    (normalized.includes('relation') && normalized.includes('solicitudes_presupuesto'))
  ) {
    throw new Error(
      'Supabase todavía no reconoce la tabla de solicitudes de presupuesto. Ejecuta database/004_solicitudes_presupuesto.sql en SQL Editor.',
    )
  }

  if (normalized.includes('permission denied') || normalized.includes('row-level security')) {
    throw new Error('Supabase bloqueó la solicitud por permisos. Debes pertenecer a la comisión seleccionada.')
  }

  if (normalized.includes('duplicate') || normalized.includes('unique')) {
    throw new Error('Ya tienes una solicitud de presupuesto pendiente para esta comisión.')
  }

  throw new Error(message)
}

export async function fetchSolicitudesPresupuesto() {
  const { data, error } = await supabase
    .from('solicitudes_presupuesto')
    .select(solicitudPresupuestoSelect)
    .order('fecha_solicitud', { ascending: false })

  if (error) throwSolicitudPresupuestoError(error)
  return (data ?? []) as SolicitudPresupuesto[]
}

export async function fetchMisSolicitudesPresupuesto(idUsuario: number) {
  const { data, error } = await supabase
    .from('solicitudes_presupuesto')
    .select(solicitudPresupuestoSelect)
    .eq('id_usuario', idUsuario)
    .order('fecha_solicitud', { ascending: false })

  if (error) throwSolicitudPresupuestoError(error)
  return (data ?? []) as SolicitudPresupuesto[]
}

export async function createSolicitudPresupuesto(payload: {
  id_comision: number
  id_usuario: number
  monto_solicitado: number
  justificacion: string
}) {
  const { data, error } = await supabase
    .from('solicitudes_presupuesto')
    .insert({
      id_comision: payload.id_comision,
      id_usuario: payload.id_usuario,
      monto_solicitado: payload.monto_solicitado,
      justificacion: payload.justificacion,
      estado: 'pendiente',
    })
    .select(solicitudPresupuestoSelect)
    .single()

  if (error) throwSolicitudPresupuestoError(error)
  return data as SolicitudPresupuesto
}

export async function updateSolicitudPresupuesto(
  idSolicitudPresupuesto: number,
  payload: { estado: 'aprobada' | 'rechazada'; revisado_por: number },
) {
  const { error } = await supabase
    .from('solicitudes_presupuesto')
    .update({
      estado: payload.estado,
      revisado_por: payload.revisado_por,
      fecha_revision: new Date().toISOString(),
    })
    .eq('id_solicitud_presupuesto', idSolicitudPresupuesto)

  if (error) throwSolicitudPresupuestoError(error)
}
