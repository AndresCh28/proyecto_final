import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { shortDate } from '../lib/format'
import { fetchNotificacionesByUser, markNotificacionAsRead, type Notificacion } from '../lib/notificaciones'

export function NotificacionesPage() {
  const { profile } = useAuth()
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  const unreadCount = useMemo(() => notificaciones.filter((item) => !item.leida).length, [notificaciones])

  useEffect(() => {
    if (!profile) return
    void loadNotificaciones(profile.idUsuario)
  }, [profile])

  async function loadNotificaciones(idUsuario: number) {
    setLoading(true)
    try {
      const nextNotificaciones = await fetchNotificacionesByUser(idUsuario)
      setNotificaciones(nextNotificaciones)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cargar las notificaciones.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAsRead(idNotificacion: number) {
    try {
      await markNotificacionAsRead(idNotificacion)
      if (profile) await loadNotificaciones(profile.idUsuario)
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

        <div className="notification-list">
          {loading ? <div className="empty-state">Cargando notificaciones...</div> : null}

          {!loading && notificaciones.length === 0 ? (
            <div className="empty-state">No tienes notificaciones registradas por ahora.</div>
          ) : null}

          {notificaciones.map((item) => (
            <article className={`notification-card${item.leida ? ' read' : ''}`} key={item.id_notificacion}>
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
      </section>
    </AppShell>
  )
}
