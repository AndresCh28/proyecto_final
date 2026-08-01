import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { Pagination } from '../components/Pagination'
import { LoadingState } from '../components/LoadingState'
import { shortDate } from '../lib/format'
import { fetchNotificacionesByUser, markNotificacionAsRead, type Notificacion } from '../lib/notificaciones'
import { supabase } from '../lib/supabase'
import { useWorkspace } from '../workspace/WorkspaceContext'

export function NotificacionesPage() {
  const { profile } = useAuth()
  const { workspace } = useWorkspace()
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('buscar') ?? '')
  const [readFilter, setReadFilter] = useState('todas')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [page, setPage] = useState(1)
  const pageSize = 6

  const unreadCount = useMemo(() => notificaciones.filter((item) => !item.leida).length, [notificaciones])
  const notificationTypes = useMemo(() => [...new Set(notificaciones.map((item) => item.tipo))], [notificaciones])
  const filteredNotifications = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase()
    return notificaciones.filter((item) => {
      const matchesSearch = !normalized || `${item.tipo} ${item.mensaje}`.toLocaleLowerCase().includes(normalized)
      const matchesRead = readFilter === 'todas' || item.leida === (readFilter === 'leidas')
      const matchesType = typeFilter === 'todos' || item.tipo === typeFilter
      return matchesSearch && matchesRead && matchesType
    })
  }, [notificaciones, readFilter, search, typeFilter])
  const paginatedNotifications = filteredNotifications.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    if (!profile || !workspace) return
    void loadNotificaciones(profile.idUsuario, workspace.id_espacio)
    const channel = supabase
      .channel(`notificaciones-page-${profile.idUsuario}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notificaciones', filter: `id_usuario=eq.${profile.idUsuario}`,
      }, () => void loadNotificaciones(profile.idUsuario, workspace.id_espacio, false))
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [profile, workspace?.id_espacio])

  async function loadNotificaciones(idUsuario: number, idEspacio: number, showLoading = true) {
    if (showLoading) setLoading(true)
    try {
      const nextNotificaciones = await fetchNotificacionesByUser(idUsuario, idEspacio)
      setNotificaciones(nextNotificaciones)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cargar las notificaciones.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  async function handleMarkAsRead(idNotificacion: number) {
    try {
      if (!workspace) return
      await markNotificacionAsRead(idNotificacion, workspace.id_espacio)
      if (profile) await loadNotificaciones(profile.idUsuario, workspace.id_espacio)
      setStatus('Notificación actualizada.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible actualizar la notificación.')
    }
  }

  return (
    <AppShell
      title="Notificaciones"
      subtitle="Consulta tus avisos internos y marca como leídos los eventos que ya atendiste."
    >
      <div className="stats-grid">
        <article className="stat-card accent-blue">
          <span>Pendientes</span>
          <strong>{loading ? '...' : unreadCount}</strong>
        </article>
        <article className="stat-card">
          <span>Total</span>
          <strong>{loading ? '...' : notificaciones.length}</strong>
        </article>
      </div>

      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Centro de mensajes</span>
            <h3>Actividad reciente</h3>
          </div>
        </div>

        {status ? <div className="form-status">{status}</div> : null}

        <div className="filter-bar">
          <label><span>Buscar</span><input value={search} placeholder="Mensaje o tipo" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label>
          <label><span>Lectura</span><select value={readFilter} onChange={(event) => { setReadFilter(event.target.value); setPage(1) }}><option value="todas">Todas</option><option value="pendientes">Pendientes</option><option value="leidas">Leídas</option></select></label>
          <label><span>Tipo</span><select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1) }}><option value="todos">Todos</option>{notificationTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <button type="button" className="ghost-button" onClick={() => { setSearch(''); setReadFilter('todas'); setTypeFilter('todos'); setPage(1) }}>Limpiar</button>
        </div>

        <div className="notification-list">
          {loading ? <LoadingState rows={3} label="Cargando notificaciones…" /> : null}

          {!loading && filteredNotifications.length === 0 ? (
            <div className="empty-state">No tienes notificaciones registradas por ahora.</div>
          ) : null}

          {paginatedNotifications.map((item) => (
            <article className={`notification-card notification-${item.tipo}${item.leida ? ' read' : ''}`} key={item.id_notificacion}>
              <div className="movement-card-top">
                <span className="status-badge">{item.tipo}</span>
                <strong>{item.leida ? 'Leída' : 'Pendiente'}</strong>
              </div>
              <p>{item.mensaje}</p>
              <div className="notification-footer">
                <span className="movement-date">{shortDate(item.fecha_envio)}</span>
                {!item.leida ? (
                  <button
                    type="button"
                    className="ghost-button small"
                    onClick={() => void handleMarkAsRead(item.id_notificacion)}
                  >
                    Marcar como leída
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        <Pagination page={page} pageSize={pageSize} total={filteredNotifications.length} onPageChange={setPage} />
      </section>
    </AppShell>
  )
}
