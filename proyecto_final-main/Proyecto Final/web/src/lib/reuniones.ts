import { supabase } from './supabase'

export interface Reunion {
  id_reunion: number
  id_espacio: number
  titulo: string
  descripcion: string | null
  fecha_inicio: string
  enlace_meet: string
  creado_por: number
  creador: { nombre: string } | null
}

export async function fetchReuniones(idEspacio: number): Promise<Reunion[]> {
  const { data, error } = await supabase
    .from('reuniones')
    .select('id_reunion,id_espacio,titulo,descripcion,fecha_inicio,enlace_meet,creado_por,creador:usuarios!reuniones_creado_por_fkey(nombre)')
    .eq('id_espacio', idEspacio)
    .order('fecha_inicio', { ascending: true })
  if (error) throw error
  return (data ?? []).map((item) => ({
    ...item,
    creador: Array.isArray(item.creador) ? item.creador[0] ?? null : item.creador,
  })) as Reunion[]
}

export async function crearReunion(payload: Omit<Reunion, 'id_reunion' | 'creador'>) {
  const { error } = await supabase.from('reuniones').insert(payload)
  if (error) throw error
}

export async function eliminarReunion(idReunion: number) {
  const { error } = await supabase.from('reuniones').delete().eq('id_reunion', idReunion)
  if (error) throw error
}
