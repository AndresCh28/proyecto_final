import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { fetchComisiones } from '../lib/comisiones'
import { fetchDashboardSummary, type DashboardSummary } from '../lib/dashboard'
import { shortDate } from '../lib/format'
import { isStaff } from '../lib/permissions'
import { fetchPropuestasByComision, type Propuesta } from '../lib/propuestas'
import { fetchSolicitudesComision } from '../lib/solicitudes'
import { fetchSolicitudesPresupuesto } from '../lib/solicitudesPresupuesto'
import type { Comision, SolicitudComision, SolicitudPresupuesto } from '../types'

const emptySummary: DashboardSummary = {
  totalComisiones: 0,
  pendientes: 0,
  enProceso: 0,
  finalizadas: 0,
  notificacionesPendientes: 0,
}

type DashboardVote = Propuesta & {
  comisionTitulo: string
}

export function DashboardPage() {
  const { profile } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary)
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [pendingVotes, setPendingVotes] = useState<DashboardVote[]>([])
  const [solicitudesComision, setSolicitudesComision] = useState<SolicitudComision[]>([])
  const [solicitudesPresupuesto, setSolicitudesPresupuesto] = useState<SolicitudPresupuesto[]>([])
  const [loading, setLoading] = useState(true)

  const staff = isStaff(profile)
  const activeComisiones = useMemo(() => comisiones.slice(0, 4), [comisiones])
  const pendingCommissionRequests = useMemo(
    () => solicitudesComision.filter((item) => item.estado === 'pendiente').length,
    [solicitudesComision],
  )
  const pendingBudgetRequests = useMemo(
    () => solicitudesPresupuesto.filter((item) => item.estado === 'pendiente').length,
    [solicitudesPresupuesto],
  )

  useEffect(() => {
    if (!profile) return
    void loadDashboard()
  }, [profile])

  async function loadDashboard() {
    if (!profile) return

    setLoading(true)
    try {
      const [nextSummary, nextComisiones] = await Promise.all([
        fetchDashboardSummary(profile.idUsuario),
        fetchComisiones(),
      ])

      const propuestasPorComision = await Promise.all(
        nextComisiones.map(async (comision) => {
          const propuestas = await fetchPropuestasByComision(comision.id_comision)
          return propuestas
            .filter((propuesta) => propuesta.estado === 'pendiente')
            .map((propuesta) => ({
              ...propuesta,
              comisionTitulo: comision.titulo,
            }))
        }),
      )

      setSummary(nextSummary)
      setComisiones(nextComisiones)
      setPendingVotes(
        propuestasPorComision
          .flat()
          .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
          .slice(0, 5),
      )

      if (staff) {
        const [nextSolicitudesComision, nextSolicitudesPresupuesto] = await Promise.all([
          fetchSolicitudesComision().catch(() => []),
          fetchSolicitudesPresupuesto().catch(() => []),
        ])
        setSolicitudesComision(nextSolicitudesComision)
        setSolicitudesPresupuesto(nextSolicitudesPresupuesto)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell
      title={`Hola, ${profile?.nombre?.split(' ')[0] ?? 'equipo'}`}
      subtitle="Resumen operativo de votaciones, solicitudes, presupuestos y avisos pendientes."
    >
      <div className="stats-grid">
        <article className="stat-card dashboard-commission-stat">
          <span>Comisiones</span>
          <strong>{loading ? '...' : summary.totalComisiones}</strong>
        </article>
        <article className="stat-card accent-blue">
          <span>Votaciones pendientes</span>
          <strong>{loading ? '...' : pendingVotes.length}</strong>
        </article>
        <article className="stat-card accent-gold">
          <span>Solicitudes</span>
          <strong>{loading ? '...' : staff ? pendingCommissionRequests + pendingBudgetRequests : 0}</strong>
        </article>
        <article className="stat-card accent-violet">
          <span>Notificaciones</span>
          <strong>{loading ? '...' : summary.notificacionesPendientes}</strong>
        </article>
      </div>

      <div className="panel-grid">
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Pendiente</span>
              <h3>Votaciones abiertas</h3>
            </div>
            <Link className="ghost-button" to="/votaciones">
              Ver todas
            </Link>
          </div>

          <div className="movement-list">
            {!loading && pendingVotes.length === 0 ? (
              <div className="empty-state">No hay votaciones pendientes por ahora.</div>
            ) : null}

            {pendingVotes.map((propuesta) => (
              <article className="movement-card" key={propuesta.id_propuesta}>
                <div className="movement-card-top">
                  <span className="status-badge">Pendiente</span>
                  <strong>{propuesta.titulo}</strong>
                </div>
                <span>{propuesta.comisionTitulo}</span>
                <span>Creada: {shortDate(propuesta.fecha_creacion)}</span>
                <div className="row-actions">
                  <Link className="primary-button" to={`/votacion/${propuesta.id_propuesta}`}>
                    Abrir votación
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-card side-panel">
          <span className="eyebrow">Acciones rápidas</span>
          <h3>Trabajo frecuente</h3>
          <div className="quick-actions">
            <Link className="ghost-button" to="/presupuestos">
              Presupuestos
            </Link>
            <Link className="ghost-button" to="/propuestas">
              Propuestas
            </Link>
            <Link className="ghost-button" to="/notificaciones">
              Notificaciones
            </Link>
          </div>
        </section>
      </div>

      <div className="panel-grid">
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow dashboard-legacy-commissions-label">Comisiones</span>
              <h3>Comisiones activas</h3>
            </div>
            <Link className="ghost-button" to="/comisiones">
              Gestionar
            </Link>
          </div>

          <div className="movement-list">
            {!loading && activeComisiones.length === 0 ? (
              <div className="empty-state">No hay comisiones activas registradas.</div>
            ) : null}

            {activeComisiones.map((comision) => (
              <article className="movement-card" key={comision.id_comision}>
                <div className="movement-card-top">
                  <span className="status-badge">{comision.estado_nombre ?? 'Sin estado'}</span>
                  <strong>{comision.titulo}</strong>
                </div>
                <span>Inicio: {shortDate(comision.fecha_inicio)}</span>
                <span>Cierre: {comision.fecha_fin ? shortDate(comision.fecha_fin) : 'Sin cierre'}</span>
                <p>{comision.descripcion ?? 'Sin descripción registrada.'}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="glass-card side-panel">
          <span className="eyebrow">Seguimiento</span>
          <h3>Solicitudes pendientes</h3>
          <strong className="metric-highlight">{loading ? '...' : staff ? pendingCommissionRequests + pendingBudgetRequests : 0}</strong>
          <p>
            {staff
              ? `${pendingCommissionRequests} de ingreso a comisión y ${pendingBudgetRequests} de presupuesto.`
              : 'Tus solicitudes se gestionan desde comisiones y presupuestos.'}
          </p>
          <Link className="ghost-button inline-button" to={staff ? '/comisiones' : '/presupuestos'}>
            Revisar solicitudes
          </Link>
        </section>
      </div>
    </AppShell>
  )
}
