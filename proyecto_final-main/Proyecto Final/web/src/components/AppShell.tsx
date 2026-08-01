import { Link, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'

import { useAuth } from '../auth/AuthContext'
import { useLanguage } from '../i18n/LanguageContext'
import sigecomLogo from '../assets/isotipo-sigecom.png'
import type { RoleName } from '../types'
import { Chatbot } from './Chatbot'
import { GlobalSearch } from './GlobalSearch'
import { supabase } from '../lib/supabase'
import { fetchNotificacionesByUser, markNotificacionAsRead, type Notificacion } from '../lib/notificaciones'
import { shortDate } from '../lib/format'
import { useWorkspace } from '../workspace/WorkspaceContext'
import { fetchUnreadPrivateCount } from '../lib/mensajes'

interface AppShellProps extends PropsWithChildren {
  title: string
  subtitle: string
}

type ThemeMode = 'light' | 'dark'
import type { LanguageMode } from '../i18n/LanguageContext'

const navItems: Array<{ to: string; label: Record<LanguageMode, string>; icon: string; roles: RoleName[] }> = [
  { to: '/dashboard', label: { es: 'Dashboard', en: 'Dashboard' }, icon: 'DB', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/presupuestos', label: { es: 'Presupuestos', en: 'Budgets' }, icon: 'PR', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/propuestas', label: { es: 'Propuestas', en: 'Proposals' }, icon: 'VO', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/votaciones', label: { es: 'Votación', en: 'Voting' }, icon: 'VT', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/chat-comisiones', label: { es: 'Chat', en: 'Chat' }, icon: 'CH', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/reuniones', label: { es: 'Reuniones', en: 'Meetings' }, icon: 'ME', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/documentos', label: { es: 'Documentos', en: 'Documents' }, icon: 'DC', roles: ['Administrador', 'Coordinador', 'Miembro'] },
  { to: '/solicitudes-espacio', label: { es: 'Solicitudes', en: 'Requests' }, icon: 'SO', roles: ['Administrador', 'Coordinador'] },
  { to: '/reportes', label: { es: 'Reportes', en: 'Reports' }, icon: 'RP', roles: ['Administrador', 'Coordinador'] },
  { to: '/bitacora', label: { es: 'Bitácora', en: 'Audit log' }, icon: 'BT', roles: ['Administrador', 'Coordinador'] },
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

const headingTranslations: Record<string, string> = {
  'Configuración': 'Settings',
  'Comisiones': 'Committees',
  'Presupuestos': 'Budgets',
  'Propuestas': 'Proposals',
  'Votación': 'Voting',
  'Votaciones': 'Voting',
  'Notificaciones': 'Notifications',
  'Reportes': 'Reports',
  'Usuarios': 'Users',
  'Usuarios y roles': 'Users and roles',
  'Presupuestos y finanzas': 'Budgets and finances',
  'Bitácora administrativa': 'Administrative audit log',
}

const subtitleTranslations: Record<string, string> = {
  'Ajusta tu perfil, apariencia y preferencias generales del sistema.': 'Manage your profile, appearance and general system preferences.',
  'Consulta las votaciones por comisión y registra tu participación.': 'View votes by committee and record your participation.',
  'Registra votos y consulta el resultado por mayoría simple para cada propuesta.': 'Record votes and view the simple-majority result for each proposal.',
  'Consulta tus avisos internos y marca como leídos los eventos que ya atendiste.': 'View your internal notices and mark completed events as read.',
  'Administra cuentas internas, roles operativos y estado de acceso al sistema.': 'Manage internal accounts, operational roles and system access status.',
  'Consulta indicadores financieros, resultados de propuestas y actividad consolidada desde Supabase.': 'View financial indicators, proposal results and consolidated activity from Supabase.',
  'Resumen operativo de comisiones, votaciones, solicitudes y avisos pendientes.': 'Operational overview of committees, votes, requests and pending notices.',
  'Controla montos estimados, somete presupuestos a votación y registra movimientos financieros.': 'Manage estimated amounts, submit budgets to a vote and record financial transactions.',
  'Crea propuestas por comisión, asigna miembros y prepara el flujo de decisiones para la votación.': 'Create proposals by committee, assign members and prepare the voting decision flow.',
  'Administra el registro, periodo, estado y solicitudes de participación de cada comisión.': 'Manage each committee’s registration, term, status and participation requests.',
  'Consulta las acciones registradas automáticamente en los módulos de SIGECOM.': 'Review actions automatically recorded across SIGECOM modules.',
}

function translateHeading(value: string) {
  if (value.startsWith('Hola, ')) return `Hello, ${value.slice(6)}`
  return headingTranslations[value] ?? value
}

function translateSubtitle(value: string) {
  return subtitleTranslations[value] ?? value
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const { profile, signOut } = useAuth()
  const [theme, setTheme] = useState<ThemeMode>(() => readPreference('sigecom-theme', 'light'))
  const { language } = useLanguage()
  const [avatar, setAvatar] = useState(() => readPreference(`sigecom-avatar-${profile?.idUsuario ?? 'guest'}`, profile?.avatarUrl ?? ''))
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState<Notificacion[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadChats, setUnreadChats] = useState(0)
  const copy = text[language]
  const { workspace } = useWorkspace()

  useEffect(() => {
    setAvatar(readPreference(`sigecom-avatar-${profile?.idUsuario ?? 'guest'}`, profile?.avatarUrl ?? ''))
  }, [profile?.idUsuario, profile?.avatarUrl])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('sigecom-theme', theme)
  }, [theme])

  useEffect(() => {
    function syncSettings() {
      setTheme(readPreference('sigecom-theme', 'light'))
      setAvatar(readPreference(`sigecom-avatar-${profile?.idUsuario ?? 'guest'}`, profile?.avatarUrl ?? ''))
    }

    window.addEventListener('sigecom-settings-change', syncSettings)
    return () => window.removeEventListener('sigecom-settings-change', syncSettings)
  }, [profile?.idUsuario, profile?.avatarUrl])

  useEffect(() => {
    if (!profile || !workspace) return
    let mounted = true

    async function refreshUnreadCount() {
      const rows = await fetchNotificacionesByUser(profile!.idUsuario, workspace!.id_espacio)
      if (mounted) {
        setRecentNotifications(rows.slice(0, 6))
        setUnreadNotifications(rows.filter((item) => !item.leida).length)
      }
    }

    void refreshUnreadCount()
    const channel = supabase
      .channel(`notificaciones-nav-${profile.idUsuario}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notificaciones', filter: `id_usuario=eq.${profile.idUsuario}`,
      }, () => void refreshUnreadCount())
      .subscribe()

    return () => {
      mounted = false
      void supabase.removeChannel(channel)
    }
  }, [profile, workspace?.id_espacio])

  useEffect(() => {
    if (!profile || !workspace) { setUnreadChats(0); return }
    let mounted = true
    const refresh = async () => { try { const count = await fetchUnreadPrivateCount(profile.idUsuario, workspace.id_espacio); if (mounted) setUnreadChats(count) } catch { if (mounted) setUnreadChats(0) } }
    void refresh()
    window.addEventListener('sigecom-chat-read', refresh)
    const notifyMessage = async (payload: { new: Record<string, unknown> }) => {
      void refresh()
      const message = payload.new
      if (Number(message.id_espacio) !== workspace.id_espacio || Number(message.id_destinatario) !== profile.idUsuario) return
      if (localStorage.getItem(`sigecom-browser-notifications-${profile.idUsuario}`) !== 'true' || !('Notification' in window) || Notification.permission !== 'granted') return
      if (!document.hidden && window.location.pathname === '/chat-comisiones') return
      const senderId = Number(message.id_remitente)
      const { data } = await supabase.from('usuarios').select('nombre').eq('id_usuario', senderId).maybeSingle()
      const body = String(message.contenido || (message.archivo_nombre ? `Archivo: ${message.archivo_nombre}` : 'Nuevo mensaje')).slice(0, 120)
      const notification = new Notification(data?.nombre ? `Mensaje de ${data.nombre}` : 'Nuevo mensaje en SIGECOM', { body, icon: sigecomLogo, tag: `sigecom-message-${message.id_mensaje}` })
      notification.onclick = () => { window.focus(); window.location.assign('/chat-comisiones'); notification.close() }
    }
    const channel = supabase.channel(`chat-badge-${profile.idUsuario}-${workspace.id_espacio}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_privados', filter: `id_destinatario=eq.${profile.idUsuario}` }, (payload) => void notifyMessage(payload as { new: Record<string, unknown> }))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensajes_privados', filter: `id_destinatario=eq.${profile.idUsuario}` }, () => void refresh())
      .subscribe()
    return () => { mounted = false; window.removeEventListener('sigecom-chat-read', refresh); void supabase.removeChannel(channel) }
  }, [profile?.idUsuario, workspace?.id_espacio])

  async function readNotification(idNotificacion: number) {
    if (!workspace) return
    await markNotificacionAsRead(idNotificacion, workspace.id_espacio)
    setRecentNotifications((items) => items.map((item) => (
      item.id_notificacion === idNotificacion ? { ...item, leida: true } : item
    )))
    setUnreadNotifications((count) => Math.max(0, count - 1))
  }

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
                <span>{item.label[language]}</span>
                {item.to === '/chat-comisiones' && unreadChats > 0 ? <span className="chat-nav-badge">{unreadChats > 99 ? '99+' : unreadChats}</span> : null}
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
            <h2>{language === 'en' ? translateHeading(title) : title}</h2>
            <p>{language === 'en' ? translateSubtitle(subtitle) : subtitle}</p>
          </div>
          <div className="header-actions">
            {profile && ['Administrador', 'Coordinador'].includes(profile.rol) ? (
              <div className="workspace-switcher">
                <span>{workspace?.nombre ?? 'Espacio actual'}</span>
                <Link className="ghost-button" to="/seleccionar-espacio">Ir al selector de espacios</Link>
              </div>
            ) : null}
            <GlobalSearch />
            <div className="notification-bell-wrap">
              <button
                type="button"
                className="notification-bell"
                aria-label={language === 'es' ? 'Abrir notificaciones' : 'Open notifications'}
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <span aria-hidden="true">♢</span>
                {unreadNotifications > 0 ? (
                  <span className="nav-notification-count">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="notification-popover">
                  <div className="notification-popover-head">
                    <div><strong>{language === 'es' ? 'Notificaciones' : 'Notifications'}</strong><span>{unreadNotifications} {language === 'es' ? 'pendientes' : 'unread'}</span></div>
                    <button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Cerrar">×</button>
                  </div>
                  <div className="notification-popover-list">
                    {recentNotifications.length === 0 ? <p className="notification-popover-empty">{language === 'es' ? 'No tienes avisos nuevos.' : 'You have no new alerts.'}</p> : null}
                    {recentNotifications.map((item) => (
                      <button
                        type="button"
                        key={item.id_notificacion}
                        className={`notification-popover-item notification-${item.tipo}${item.leida ? ' read' : ''}`}
                        onClick={() => { if (!item.leida) void readNotification(item.id_notificacion) }}
                      >
                        <span className="notification-popover-dot" />
                        <span><strong>{item.tipo}</strong><p>{item.mensaje}</p><small>{shortDate(item.fecha_envio)}</small></span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="page-content">{children}</section>
      </main>
      <Chatbot />
    </div>
  )
}
