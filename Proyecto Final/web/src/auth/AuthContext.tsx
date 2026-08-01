import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import type { Session } from '@supabase/supabase-js'

import {
  fetchRoles,
  restoreProfileFromSession,
  signInWithPassword,
  signOutSession,
  signUpWithPassword,
  updateOwnProfile,
  updateOwnProfileRole,
} from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { RoleName, UserProfile } from '../types'

interface AuthContextValue {
  loading: boolean
  session: Session | null
  profile: UserProfile | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (payload: {
    nombre: string
    telefono: string
    email: string
    password: string
    rol: RoleName
  }) => Promise<{ needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  updateProfile: (payload: { nombre: string; telefono: string | null }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const selfAssignableRoles: RoleName[] = ['Coordinador', 'Miembro']

async function applyRequestedRole(session: Session, currentProfile: UserProfile | null) {
  const requestedRole = session.user.user_metadata?.rol_solicitado as RoleName | undefined
  if (!requestedRole || !selfAssignableRoles.includes(requestedRole) || currentProfile?.rol === requestedRole) {
    return currentProfile
  }

  const roles = await fetchRoles()
  const selectedRole = roles.find((role) => role.nombre === requestedRole)
  if (!selectedRole) return currentProfile

  await updateOwnProfileRole(session.user.id, selectedRole.id_rol)
  return restoreProfileFromSession(session)
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      const nextSession = data.session
      setSession(nextSession)
      if (nextSession) {
        try {
          const nextProfile = await restoreProfileFromSession(nextSession)
          if (active) setProfile(nextProfile)
        } catch {
          if (active) setProfile(null)
        }
      }
      if (active) setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        setLoading(false)
        return
      }

      restoreProfileFromSession(nextSession)
        .then((nextProfile) => {
          setProfile(nextProfile)
        })
        .finally(() => {
          setLoading(false)
        })
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      profile,
      async signIn(email: string, password: string) {
        const response = await signInWithPassword(email, password)
        setSession(response.session)
        if (!response.session?.user) {
          throw new Error('Supabase no devolvió una sesión válida.')
        }
        const restoredProfile = await restoreProfileFromSession(response.session)
        const nextProfile = await applyRequestedRole(response.session, restoredProfile)
        if (!nextProfile?.activo) {
          throw new Error('Tu cuenta está inactiva. Contacta al administrador.')
        }
        setProfile(nextProfile)
      },
      async signUp(payload) {
        const response = await signUpWithPassword({
          nombre: payload.nombre,
          telefono: payload.telefono,
          email: payload.email,
          password: payload.password,
          rol: payload.rol,
        })

        if (!response.session?.user) {
          return { needsEmailConfirmation: true }
        }

        setSession(response.session)
        const restoredProfile = await restoreProfileFromSession(response.session)
        const nextProfile = await applyRequestedRole(response.session, restoredProfile)
        setProfile(nextProfile)
        return { needsEmailConfirmation: false }
      },
      async signOut() {
        await signOutSession()
        setSession(null)
        setProfile(null)
      },
      async updateProfile(payload) {
        if (!session?.user) return
        await updateOwnProfile(session.user.id, payload)
        const nextProfile = await restoreProfileFromSession(session)
        setProfile(nextProfile)
      },
    }),
    [loading, profile, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider.')
  }
  return context
}
