import type { UserProfile } from '../types'

export function isStaff(profile: UserProfile | null) {
  return profile?.rol === 'Administrador' || profile?.rol === 'Coordinador'
}

export function isAdmin(profile: UserProfile | null) {
  return profile?.rol === 'Administrador'
}

export function canVote(profile: UserProfile | null) {
  return Boolean(profile && ['Administrador', 'Coordinador', 'Miembro'].includes(profile.rol))
}
