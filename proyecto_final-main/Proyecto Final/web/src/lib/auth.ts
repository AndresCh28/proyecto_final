import type { Session, User } from '@supabase/supabase-js'

import { supabase } from './supabase'
import type { RoleName, UserProfile } from '../types'

async function resolveRoleName(idRol: number | null | undefined): Promise<RoleName> {
  if (!idRol) return 'Miembro'

  const { data, error } = await supabase
    .from('roles')
    .select('nombre')
    .eq('id_rol', idRol)
    .limit(1)
    .single()

  if (error) return 'Miembro'
  return (data?.nombre as RoleName) ?? 'Miembro'
}

export async function loadProfileByAuthUser(user: User): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id_usuario, nombre, correo, telefono, avatar_url, activo, id_rol')
    .eq('auth_user_id', user.id)
    .limit(1)
    .single()

  if (error || !data) {
    throw new Error('El usuario autenticado no tiene perfil interno en SIGECOM.')
  }

  const rol = await resolveRoleName(data.id_rol)

  return {
    id: user.id,
    idUsuario: data.id_usuario,
    nombre: data.nombre ?? user.email?.split('@')[0] ?? 'Usuario',
    correo: data.correo ?? user.email ?? '',
    telefono: data.telefono ?? null,
    avatarUrl: data.avatar_url ?? null,
    rol,
    activo: Boolean(data.activo),
  }
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Correo o contraseña incorrectos.')
    }
    throw error
  }

  return data
}

export async function signUpWithPassword(payload: {
  nombre: string
  telefono: string
  email: string
  password: string
  rol: RoleName
}) {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      data: {
        nombre: payload.nombre.trim(),
        full_name: payload.nombre.trim(),
        telefono: payload.telefono.trim() || null,
        rol_solicitado: payload.rol,
      },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      throw new Error('Este correo ya está registrado.')
    }
    throw error
  }

  return data
}

export async function fetchRoles() {
  const { data, error } = await supabase.from('roles').select('id_rol, nombre, descripcion').order('id_rol')

  if (error) throw error
  return (data ?? []) as Array<{ id_rol: number; nombre: RoleName; descripcion: string | null }>
}

export async function updateOwnProfileRole(authUserId: string, idRol: number) {
  const { error } = await supabase.from('usuarios').update({ id_rol: idRol }).eq('auth_user_id', authUserId)

  if (error) throw error
}

export async function updateOwnProfile(
  authUserId: string,
  payload: {
    nombre: string
    telefono: string | null
  },
) {
  const { error } = await supabase
    .from('usuarios')
    .update({
      nombre: payload.nombre.trim(),
      telefono: payload.telefono?.trim() || null,
    })
    .eq('auth_user_id', authUserId)

  if (error) throw error
}

export async function updateOwnAvatar(authUserId: string, avatarUrl: string | null) {
  const { error } = await supabase.from('usuarios').update({ avatar_url: avatarUrl }).eq('auth_user_id', authUserId)
  if (error) throw error
}

export async function signOutSession() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/actualizar-contrasena`,
  })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

export async function restoreProfileFromSession(session: Session | null) {
  if (!session?.user) return null
  return loadProfileByAuthUser(session.user)
}
