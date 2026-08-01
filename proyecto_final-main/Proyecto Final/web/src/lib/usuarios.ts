import { supabase } from './supabase'
import type { RoleName, Usuario } from '../types'
import { getActiveWorkspaceId } from './espacios'

export interface RoleRow {
  id_rol: number
  nombre: RoleName
  descripcion: string | null
}

export async function fetchRoles(): Promise<RoleRow[]> {
  const { data, error } = await supabase.from('roles').select('id_rol, nombre, descripcion').order('id_rol')

  if (error) throw error
  return (data ?? []) as RoleRow[]
}

export async function fetchUsuarios(): Promise<Usuario[]> {
  const idEspacio = getActiveWorkspaceId()
  if (!idEspacio) return []
  const { data: memberships, error: membershipError } = await supabase
    .from('espacio_miembros').select('id_usuario').eq('id_espacio', idEspacio).eq('activo', true)
  if (membershipError) throw membershipError
  const memberIds = (memberships ?? []).map((item) => item.id_usuario)
  if (!memberIds.length) return []
  const [roles, { data, error }] = await Promise.all([
    fetchRoles(),
    supabase
      .from('usuarios')
      .select('id_usuario, auth_user_id, nombre, correo, telefono, activo, id_rol')
      .in('id_usuario', memberIds)
      .order('nombre', { ascending: true }),
  ])

  if (error) throw error

  const roleMap = new Map(roles.map((role) => [role.id_rol, role.nombre]))
  return ((data ?? []) as Usuario[]).map((usuario) => ({
    ...usuario,
    rol_nombre: roleMap.get(usuario.id_rol),
  }))
}

export async function updateUsuarioRole(idUsuario: number, idRol: number) {
  const { error } = await supabase.from('usuarios').update({ id_rol: idRol }).eq('id_usuario', idUsuario)
  if (error) throw error
}

export async function updateUsuarioActivo(idUsuario: number, activo: boolean) {
  const { error } = await supabase.from('usuarios').update({ activo }).eq('id_usuario', idUsuario)
  if (error) throw error
}

export async function resetUsuarioMfa(idUsuario: number) {
  const { data, error } = await supabase.functions.invoke('reset-user-mfa', { body: { idUsuario } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as { reset: boolean; removedFactors: number }
}
