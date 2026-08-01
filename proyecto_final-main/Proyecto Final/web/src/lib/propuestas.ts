import { supabase } from './supabase'
import type { Usuario } from '../types'

export interface Propuesta {
  id_propuesta: number
  id_comision: number
  titulo: string
  descripcion: string
  estado: string
  resultado_final: string
  fecha_creacion: string
  creada_por?: number | null
  tipo: 'general' | 'presupuesto'
}

export interface Voto {
  id_voto: number
  id_usuario: number
  voto: 'a_favor' | 'en_contra' | 'abstencion'
  fecha: string
  usuario?: Usuario
}

export interface ResumenVotacion {
  aFavor: number
  enContra: number
  abstenciones: number
  resultado: 'aprobada' | 'rechazada' | 'empate'
}

export async function fetchPropuestasByComision(idComision: number) {
  const { data, error } = await supabase
    .from('propuestas')
    .select('id_propuesta, id_comision, titulo, descripcion, estado, resultado_final, fecha_creacion, creada_por, tipo')
    .eq('id_comision', idComision)
    .order('id_propuesta', { ascending: false })

  if (error) throw error
  return (data as Propuesta[]) ?? []
}

export async function createPropuesta(payload: {
  id_comision: number
  titulo: string
  descripcion: string
  creada_por: number
  tipo?: 'general' | 'presupuesto'
}) {
  const { data, error } = await supabase
    .from('propuestas')
    .insert(payload)
    .select('id_propuesta, id_comision, titulo, descripcion, estado, resultado_final, fecha_creacion, creada_por, tipo')
    .single()

  if (error) throw error
  return data as Propuesta
}

export async function fetchPropuestaById(idPropuesta: number) {
  const { data, error } = await supabase
    .from('propuestas')
    .select('id_propuesta, id_comision, titulo, descripcion, estado, resultado_final, fecha_creacion, creada_por, tipo')
    .eq('id_propuesta', idPropuesta)
    .limit(1)
    .single()

  if (error) throw error
  return data as Propuesta
}

export async function fetchVotosByPropuesta(idPropuesta: number) {
  const { data, error } = await supabase
    .from('votos')
    .select('id_voto, id_usuario, voto, fecha')
    .eq('id_propuesta', idPropuesta)
    .order('fecha', { ascending: false })

  if (error) throw error
  const votos = (data as Voto[]) ?? []
  const userIds = Array.from(new Set(votos.map((item) => item.id_usuario)))

  if (userIds.length === 0) return votos

  const { data: usuarios, error: usuariosError } = await supabase
    .from('usuarios')
    .select('id_usuario, auth_user_id, nombre, correo, telefono, activo, id_rol')
    .in('id_usuario', userIds)

  if (usuariosError) return votos

  const usuariosMap = new Map((usuarios ?? []).map((usuario) => [usuario.id_usuario, usuario as Usuario]))
  return votos.map((voto) => ({
    ...voto,
    usuario: usuariosMap.get(voto.id_usuario),
  }))
}

export function computeResumenVotacion(votos: Voto[]): ResumenVotacion {
  const aFavor = votos.filter((item) => item.voto === 'a_favor').length
  const enContra = votos.filter((item) => item.voto === 'en_contra').length
  const abstenciones = votos.filter((item) => item.voto === 'abstencion').length

  let resultado: ResumenVotacion['resultado'] = 'empate'
  if (aFavor > enContra) resultado = 'aprobada'
  if (enContra > aFavor) resultado = 'rechazada'

  return {
    aFavor,
    enContra,
    abstenciones,
    resultado,
  }
}

export async function emitirVoto(payload: {
  id_propuesta: number
  id_usuario: number
  voto: 'a_favor' | 'en_contra' | 'abstencion'
}) {
  const { data, error } = await supabase
    .from('votos')
    .insert(payload)
    .select('id_voto, id_usuario, voto, fecha')
    .single()

  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('duplicate') || message.includes('unique')) {
      throw new Error('Ya registraste un voto para esta propuesta.')
    }
    throw error
  }

  await supabase.rpc('actualizar_resultado_propuesta', {
    p_id_propuesta: payload.id_propuesta,
  })

  return data as Voto
}
