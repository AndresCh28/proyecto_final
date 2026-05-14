import { supabase } from './supabase'
import type { RoleName, Usuario } from '../types'

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
  const [roles, { data, error }] = await Promise.all([
    fetchRoles(),
    supabase
      .from('usuarios')
      .select('id_usuario, auth_user_id, nombre, correo, telefono, activo, id_rol')
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
