import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { AppShell } from '../components/AppShell'
import { LoadingState } from '../components/LoadingState'
import { Pagination } from '../components/Pagination'
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
  const [voteSearch, setVoteSearch] = useState('')
  const [voteState, setVoteState] = useState('todos')
  const [voteResult, setVoteResult] = useState('todos')
  const [votePage, setVotePage] = useState(1)
  const votePageSize = 6

  const selectedComision = useMemo(
    () => comisiones.find((comision) => comision.id_comision === selectedId) ?? null,
    [comisiones, selectedId],
  )
  const pendingCount = useMemo(() => votaciones.filter((item) => item.estado === 'pendiente').length, [votaciones])
  const closedCount = useMemo(() => votaciones.length - pendingCount, [pendingCount, votaciones.length])
  const filteredVotes = useMemo(() => {
    const normalized = voteSearch.trim().toLocaleLowerCase()
    return votaciones.filter((item) => {
      const matchesText = !normalized || `${item.titulo} ${item.descripcion}`.toLocaleLowerCase().includes(normalized)
      return matchesText && (voteState === 'todos' || item.estado === voteState) && (voteResult === 'todos' || item.resultado_final === voteResult)
    })
  }, [voteResult, voteSearch, voteState, votaciones])
  const paginatedVotes = filteredVotes.slice((votePage - 1) * votePageSize, votePage * votePageSize)

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
    <AppShell title="Votación" subtitle="Consulta las votaciones del espacio y registra tu participación.">
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
        <article className="stat-card legacy-commission-stat">
          <span>Comisiones</span>
          <strong>{loading ? '...' : comisiones.length}</strong>
        </article>
      </div>

      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Comisión</span>
            <h3 className="auto-space-context">Área general preestablecida</h3>
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
            <h3>Votaciones del espacio</h3>
          </div>
          <button type="button" className="ghost-button" onClick={() => void loadVotaciones()}>
            Actualizar
          </button>
        </div>

        <div className="filter-bar">
          <label><span>Buscar</span><input value={voteSearch} placeholder="Título o descripción" onChange={(event) => { setVoteSearch(event.target.value); setVotePage(1) }} /></label>
          <label><span>Estado</span><select value={voteState} onChange={(event) => { setVoteState(event.target.value); setVotePage(1) }}><option value="todos">Todos</option><option value="pendiente">Pendiente</option><option value="finalizada">Finalizada</option></select></label>
          <label><span>Resultado</span><select value={voteResult} onChange={(event) => { setVoteResult(event.target.value); setVotePage(1) }}><option value="todos">Todos</option><option value="aprobada">Aprobada</option><option value="rechazada">Rechazada</option><option value="empate">Empate</option></select></label>
          <button type="button" className="ghost-button" onClick={() => { setVoteSearch(''); setVoteState('todos'); setVoteResult('todos'); setVotePage(1) }}>Limpiar</button>
        </div>

        {status ? <div className="form-status">{status}</div> : null}

        <div className="movement-list">
          {loading ? <LoadingState label="Cargando votaciones…" /> : null}
          {!loading && votaciones.length === 0 ? (
            <div className="empty-state">Todavía no hay votaciones disponibles para este espacio.</div>
          ) : null}

          {paginatedVotes.map((votacion) => (
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
          <Pagination page={votePage} pageSize={votePageSize} total={filteredVotes.length} onPageChange={setVotePage} />
        </div>
      </section>
    </AppShell>
  )
}
