import { describe, expect, it } from 'vitest'
import { canVote, isAdmin, isStaff } from './permissions'
import type { UserProfile } from '../types'

function profile(rol: UserProfile['rol'], activo = true) {
  return { rol, activo } as UserProfile
}

describe('matriz de permisos por rol', () => {
  it('reserva la administración exclusivamente al Administrador', () => {
    expect(isAdmin(profile('Administrador'))).toBe(true)
    expect(isAdmin(profile('Coordinador'))).toBe(false)
    expect(isAdmin(profile('Miembro'))).toBe(false)
  })

  it('considera personal operativo a Administrador y Coordinador', () => {
    expect(isStaff(profile('Administrador'))).toBe(true)
    expect(isStaff(profile('Coordinador'))).toBe(true)
    expect(isStaff(profile('Miembro'))).toBe(false)
  })

  it('permite votar a los tres roles autenticados y rechaza invitados', () => {
    expect(canVote(profile('Administrador'))).toBe(true)
    expect(canVote(profile('Coordinador'))).toBe(true)
    expect(canVote(profile('Miembro'))).toBe(true)
    expect(canVote(null)).toBe(false)
  })
})
