import { saveComisionMiembro } from './comisiones'
import { supabase } from './supabase'
import type { SolicitudComision } from '../types'

const solicitudSelect = `
  id_solicitud,
  id_comision,
  id_usuario,
  mensaje,
  estado,
  fecha_solicitud,
  fecha_revision,
  revisado_por
`

function mapSolicitud(item: any): SolicitudComision {
  return {
    id_solicitud: item.id_solicitud,
    id_comision: item.id_comision,
    id_usuario: item.id_usuario,
    mensaje: item.mensaje,
    estado: item.estado,
    fecha_solicitud: item.fecha_solicitud,
    fecha_revision: item.fecha_revision,
    revisado_por: item.revisado_por,
  }
}

function throwSolicitudError(error: { message?: string; code?: string }) {
  const message = error.message ?? 'Error desconocido.'
  const normalized = message.toLowerCase()

  if (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    normalized.includes('could not find the table') ||
    (normalized.includes('relation') && normalized.includes('solicitudes_comision'))
  ) {
    throw new Error('Supabase todavía no reconoce la tabla de solicitudes. Ejecuta notify pgrst, reload schema en SQL Editor y refresca la app.')
  }

  if (normalized.includes('permission denied') || normalized.includes('row-level security')) {
    throw new Error('Supabase bloqueó la solicitud por permisos. Revisa las políticas RLS de solicitudes_comision.')
  }

  if (normalized.includes('duplicate') || normalized.includes('unique')) {
    throw new Error('Ya tienes una solicitud pendiente para esta comisión.')
  }

  throw new Error(message)
}

export async function fetchSolicitudesComision() {
  const { data, error } = await supabase
    .from('solicitudes_comision')
    .select(solicitudSelect)
    .order('fecha_solicitud', { ascending: false })

  if (error) throwSolicitudError(error)
  return (data ?? []).map(mapSolicitud)
}

export async function fetchMisSolicitudesComision(idUsuario: number) {
  const { data, error } = await supabase
    .from('solicitudes_comision')
    .select(solicitudSelect)
    .eq('id_usuario', idUsuario)
    .order('fecha_solicitud', { ascending: false })

  if (error) throwSolicitudError(error)
  return (data ?? []).map(mapSolicitud)
}

export async function createSolicitudComision(payload: {
  id_comision: number
  id_usuario: number
  mensaje: string | null
}) {
  const { data, error } = await supabase
    .from('solicitudes_comision')
    .insert({
      id_comision: payload.id_comision,
      id_usuario: payload.id_usuario,
      mensaje: payload.mensaje,
      estado: 'pendiente',
    })
    .select(solicitudSelect)
    .single()

  if (error) throwSolicitudError(error)
  return mapSolicitud(data)
}

export async function aprobarSolicitudComision(solicitud: SolicitudComision, revisadoPor: number) {
  await saveComisionMiembro({
    id_comision: solicitud.id_comision,
    id_usuario: solicitud.id_usuario,
    puede_votar: true,
    es_responsable: false,
    activo: true,
  })

  const { error } = await supabase
    .from('solicitudes_comision')
    .update({
      estado: 'aprobada',
      fecha_revision: new Date().toISOString(),
      revisado_por: revisadoPor,
    })
    .eq('id_solicitud', solicitud.id_solicitud)

  if (error) throwSolicitudError(error)
}

export async function rechazarSolicitudComision(idSolicitud: number, revisadoPor: number) {
  const { error } = await supabase
    .from('solicitudes_comision')
    .update({
      estado: 'rechazada',
      fecha_revision: new Date().toISOString(),
      revisado_por: revisadoPor,
    })
    .eq('id_solicitud', idSolicitud)

  if (error) throwSolicitudError(error)
}
