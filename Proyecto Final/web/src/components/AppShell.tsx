import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'

import { useAuth } from '../auth/AuthContext'
import sigecomLogo from '../assets/isotipo-sigecom.png'
import type { RoleName } from '../types'

interface AppShellProps extends PropsWithChildren {
  title: string
  subtitle: string
}

type ThemeMode = 'light' | 'dark'
type LanguageMode = 'es' | 'en'

const navItems: Array<{ to: string; label: Record<LanguageMode, string>; icon: string; roles: RoleName[] }> = [
  { to: '/dashboard', label: { es: 'Dashboard', en: 'Dashboard' }, icon: 'DB', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/comisiones', label: { es: 'Comisiones', en: 'Committees' }, icon: 'CO', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/presupuestos', label: { es: 'Presupuestos', en: 'Budgets' }, icon: 'PR', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/propuestas', label: { es: 'Propuestas', en: 'Proposals' }, icon: 'VO', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/votaciones', label: { es: 'Votación', en: 'Voting' }, icon: 'VT', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/notificaciones', label: { es: 'Notificaciones', en: 'Notifications' }, icon: 'NT', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/reportes', label: { es: 'Reportes', en: 'Reports' }, icon: 'RP', roles: ['Administrador', 'Coordinador'] },
  { to: '/usuarios', label: { es: 'Usuarios', en: 'Users' }, icon: 'US', roles: ['Administrador'] },
  { to: '/configuracion', label: { es: 'Configuración', en: 'Settings' }, icon: 'CF', roles: ['Administrador', 'Coordinador', 'Miembro'] },
]

const text = {
  es: {
    brand: 'Gestión integral de comisión',
    description: 'Panel administrativo para comisiones, finanzas, propuestas y reportes.',
    system: 'Sistema Integral de Gestión de Comisión',
    rolePermissions: 'Permisos del rol',
    signOut: 'Cerrar sesión',
    theme: 'Tema',
    light: 'Claro',
    dark: 'Oscuro',
    language: 'Idioma',
    spanish: 'Español',
    english: 'English',
  },
  en: {
    brand: 'Committee management system',
    description: 'Administrative panel for committees, finances, proposals and reports.',
    system: 'Integrated Committee Management System',
    rolePermissions: 'Role permissions',
    signOut: 'Sign out',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    language: 'Language',
    spanish: 'Español',
    english: 'English',
  },
}

function getRoleScope(role: string | undefined, language: LanguageMode) {
  if (language === 'en') {
    if (role === 'Administrador') return 'Full access, settings and complete system control.'
    if (role === 'Coordinador') return 'Manages committees, budgets, proposals, files and reports.'
    if (role === 'Miembro') return 'Reviews committees, requests access and participates in voting.'
    return 'Limited read-only access.'
  }

  if (role === 'Administrador') return 'Acceso total, configuración y control completo del sistema.'
  if (role === 'Coordinador') return 'Gestiona comisiones, presupuestos, propuestas, archivos y reportes.'
  if (role === 'Miembro') return 'Consulta comisiones, solicita acceso y participa en votaciones.'
  return 'Acceso de consulta limitado.'
}

function readPreference<T extends string>(key: string, fallback: T): T {
  return (localStorage.getItem(key) as T | null) ?? fallback
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const { profile, signOut } = useAuth()
  const [theme, setTheme] = useState<ThemeMode>(() => readPreference('sigecom-theme', 'light'))
  const [language, setLanguage] = useState<LanguageMode>(() => readPreference('sigecom-language', 'es'))
  const [avatar, setAvatar] = useState(() => readPreference(`sigecom-avatar-${profile?.idUsuario ?? 'guest'}`, ''))
  const copy = text[language]

  useEffect(() => {
    setAvatar(readPreference(`sigecom-avatar-${profile?.idUsuario ?? 'guest'}`, ''))
  }, [profile?.idUsuario])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('sigecom-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem('sigecom-language', language)
  }, [language])

  useEffect(() => {
    function syncSettings() {
      setTheme(readPreference('sigecom-theme', 'light'))
      setLanguage(readPreference('sigecom-language', 'es'))
      setAvatar(readPreference(`sigecom-avatar-${profile?.idUsuario ?? 'guest'}`, ''))
    }

    window.addEventListener('sigecom-settings-change', syncSettings)
    return () => window.removeEventListener('sigecom-settings-change', syncSettings)
  }, [])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <div className="brand-mark">
            <img src={sigecomLogo} alt="SIGECOM" />
          </div>
          <div>
            <span className="brand-kicker">SIGECOM</span>
            <h1>{language === 'es' ? 'Gestión de comisiones' : copy.brand}</h1>
          </div>
          <p>{language === 'es' ? 'Comisiones, finanzas, propuestas y reportes.' : copy.description}</p>
        </div>

        <nav className="sidebar-nav">
          {navItems
            .filter((item) => item.roles.includes(profile?.rol ?? 'Miembro'))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-pill${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label[language]}
              </NavLink>
            ))}
        </nav>

        <div className="role-scope">
          <strong>{copy.rolePermissions}</strong>
          <span>{getRoleScope(profile?.rol, language)}</span>
        </div>

        <div className="sidebar-footer">
          <div className="profile-avatar" aria-hidden="true">
            {avatar ? <img src={avatar} alt="" /> : <span>{profile?.nombre?.charAt(0) ?? 'U'}</span>}
          </div>
          <div>
            <strong>{profile?.nombre ?? 'Usuario'}</strong>
            <span>{profile?.rol ?? 'Invitado'}</span>
          </div>
          <button type="button" className="ghost-button" onClick={() => void signOut()}>
            {copy.signOut}
          </button>
        </div>
      </aside>

      <main className="content-area">
        <header className="page-header">
          <div>
            <span className="page-kicker">{copy.system}</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </header>

        <section className="page-content">{children}</section>
      </main>
    </div>
  )
}
