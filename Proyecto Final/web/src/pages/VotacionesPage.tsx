import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { AppShell } from '../components/AppShell'
import { fetchComisiones } from '../lib/comisiones'
import { shortDate } from '../lib/format'
import { fetchPropuestasByComision, type Propuesta } from '../lib/propuestas'
import type { Comision } from '../types'

type VotingItem = Propuesta & {
  comisionTitulo: string
}

export function VotacionesPage() {
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [votaciones, setVotaciones] = useState<VotingItem[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const selectedComision = useMemo(
    () => comisiones.find((comision) => comision.id_comision === selectedId) ?? null,
    [comisiones, selectedId],
  )
  const pendingCount = useMemo(() => votaciones.filter((item) => item.estado === 'pendiente').length, [votaciones])
  const closedCount = useMemo(() => votaciones.length - pendingCount, [pendingCount, votaciones.length])

  useEffect(() => {
    void loadComisiones()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    void loadVotaciones(selectedId)
  }, [selectedId])

  async function loadComisiones() {
    setLoading(true)
    setStatus('')
    try {
      const nextComisiones = await fetchComisiones()
      setComisiones(nextComisiones)
      setSelectedId((current) => current ?? nextComisiones[0]?.id_comision ?? null)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cargar las comisiones.')
    } finally {
      setLoading(false)
    }
  }

  async function loadVotaciones(idComision = selectedId) {
    if (!idComision) return

    setLoading(true)
    setStatus('')
    try {
      const comision = comisiones.find((item) => item.id_comision === idComision)
      const propuestas = await fetchPropuestasByComision(idComision)
      setVotaciones(
        propuestas
          .map((propuesta) => ({
            ...propuesta,
            comisionTitulo: comision?.titulo ?? 'Comisión seleccionada',
          }))
          .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()),
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cargar las votaciones.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="Votación" subtitle="Consulta las votaciones por comisión y registra tu participación.">
      <div className="stats-grid">
        <article className="stat-card accent-blue">
          <span>Votaciones</span>
          <strong>{loading ? '...' : votaciones.length}</strong>
        </article>
        <article className="stat-card accent-gold">
          <span>Pendientes</span>
          <strong>{loading ? '...' : pendingCount}</strong>
        </article>
        <article className="stat-card accent-violet">
          <span>Cerradas</span>
          <strong>{loading ? '...' : closedCount}</strong>
        </article>
        <article className="stat-card">
          <span>Comisiones</span>
          <strong>{loading ? '...' : comisiones.length}</strong>
        </article>
      </div>

      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Comisión</span>
            <h3>Selecciona la comisión</h3>
          </div>
          <button type="button" className="ghost-button" onClick={() => void loadComisiones()}>
            Actualizar
          </button>
        </div>

        <label>
          <span>Comisión</span>
          <select
            value={selectedId ?? ''}
            onChange={(event) => setSelectedId(event.target.value ? Number(event.target.value) : null)}
          >
            {!loading && comisiones.length === 0 ? <option value="">Sin comisiones</option> : null}
            {comisiones.map((comision) => (
              <option key={comision.id_comision} value={comision.id_comision}>
                {comision.titulo} - {comision.estado_nombre}
              </option>
            ))}
          </select>
        </label>

        {selectedComision ? (
          <div className="selected-summary">
            <strong>{selectedComision.titulo}</strong>
            <span>{selectedComision.descripcion ?? 'Sin descripción registrada.'}</span>
          </div>
        ) : null}
      </section>

      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Listado</span>
            <h3>Votaciones de la comisión</h3>
          </div>
          <button type="button" className="ghost-button" onClick={() => void loadVotaciones()}>
            Actualizar
          </button>
        </div>

        {status ? <div className="form-status">{status}</div> : null}

        <div className="movement-list">
          {!loading && votaciones.length === 0 ? (
            <div className="empty-state">Todavía no hay votaciones disponibles para esta comisión.</div>
          ) : null}

          {votaciones.map((votacion) => (
            <article className="movement-card" key={votacion.id_propuesta}>
              <div className="movement-card-top">
                <span className="status-badge">{votacion.estado}</span>
                <strong>{votacion.titulo}</strong>
              </div>
              <span>{votacion.comisionTitulo}</span>
              <span>Creada: {shortDate(votacion.fecha_creacion)}</span>
              <span>Resultado: {votacion.resultado_final}</span>
              <p>{votacion.descripcion}</p>
              <div className="row-actions">
                <Link className="primary-button" to={`/votacion/${votacion.id_propuesta}`}>
                  Abrir votación
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
