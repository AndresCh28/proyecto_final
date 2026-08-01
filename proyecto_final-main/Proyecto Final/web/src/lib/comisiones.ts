import { supabase } from './supabase'
import type { Comision, ComisionMiembro, Estado } from '../types'
import { getActiveWorkspaceId } from './espacios'

export async function fetchEstados(): Promise<Estado[]> {
  const { data, error } = await supabase
    .from('estados')
    .select('id_estado, nombre')
    .order('id_estado', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function fetchComisiones(): Promise<Comision[]> {
  const idEspacio = getActiveWorkspaceId()
  if (!idEspacio) return []
  const [{ data: comisiones, error: comisionesError }, estados] = await Promise.all([
    supabase
      .from('comisiones')
      .select('id_comision, titulo, descripcion, fecha_inicio, fecha_fin, id_estado, creado_por, fecha_creacion')
      .eq('id_espacio', idEspacio)
      .eq('es_general', true)
      .order('id_comision', { ascending: true }),
    fetchEstados(),
  ])

  if (comisionesError) throw comisionesError

  const estadoMap = new Map(estados.map((item) => [item.id_estado, item.nombre]))
  return (comisiones ?? [])
    .map((item) => ({
      ...item,
      estado_nombre: estadoMap.get(item.id_estado) ?? 'Sin estado',
    }))
    .filter((item) => !['Finalizada', 'Cancelada'].includes(item.estado_nombre))
}

export async function createComision(payload: {
  titulo: string
  descripcion: string | null
  fecha_inicio: string
  fecha_fin: string | null
  creado_por: number
}) {
  const idEspacio = getActiveWorkspaceId()
  if (!idEspacio) throw new Error('Selecciona un espacio de trabajo antes de crear una comisión.')
  const { data, error } = await supabase
    .from('comisiones')
    .insert({
      ...payload,
      id_estado: 1,
      id_espacio: idEspacio,
      es_general: false,
    })
    .select('id_comision, titulo, descripcion, fecha_inicio, fecha_fin, id_estado, creado_por, fecha_creacion')
    .single()

  if (error) throw error
  await ensureComisionMember(data.id_comision, payload.creado_por)
  return data
}

export async function updateComision(idComision: number, payload: Partial<Comision>) {
  const { data, error } = await supabase
    .from('comisiones')
    .update(payload)
    .eq('id_comision', idComision)
    .select('id_comision, titulo, descripcion, fecha_inicio, fecha_fin, id_estado, creado_por, fecha_creacion')
    .single()

  if (error) throw error
  return data
}

export async function updateComisionEstado(idComision: number, idEstado: number) {
  return updateComision(idComision, { id_estado: idEstado })
}

async function ensureComisionMember(idComision: number, idUsuario: number) {
  const { data, error } = await supabase
    .from('comision_miembros')
    .select('id_comision, id_usuario')
    .eq('id_comision', idComision)
    .eq('id_usuario', idUsuario)
    .maybeSingle()

  if (error) throw error
  if (data) return data

  const { error: insertError } = await supabase.from('comision_miembros').insert({
    id_comision: idComision,
    id_usuario: idUsuario,
    puede_votar: true,
    es_responsable: true,
    activo: true,
  })

  if (insertError) throw insertError
}

export async function fetchComisionMiembros(idComision: number): Promise<ComisionMiembro[]> {
  const { data, error } = await supabase
    .from('comision_miembros')
    .select(
      'id_comision, id_usuario, puede_votar, es_responsable, activo, usuarios(id_usuario, auth_user_id, nombre, correo, telefono, activo, id_rol)',
    )
    .eq('id_comision', idComision)
    .order('id_usuario', { ascending: true })

  if (error) throw error

  return (data ?? []).map((item) => ({
    id_comision: item.id_comision,
    id_usuario: item.id_usuario,
    puede_votar: Boolean(item.puede_votar),
    es_responsable: Boolean(item.es_responsable),
    activo: Boolean(item.activo),
    usuario: Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios,
  })) as ComisionMiembro[]
}

export async function saveComisionMiembro(payload: ComisionMiembro) {
  const { error } = await supabase.from('comision_miembros').upsert(
    {
      id_comision: payload.id_comision,
      id_usuario: payload.id_usuario,
      puede_votar: payload.puede_votar,
      es_responsable: payload.es_responsable,
      activo: payload.activo,
    },
    { onConflict: 'id_comision,id_usuario' },
  )

  if (error) throw error
}
