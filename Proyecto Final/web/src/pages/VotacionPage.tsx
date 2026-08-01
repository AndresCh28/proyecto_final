import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { fetchComisionMiembros } from '../lib/comisiones'
import { shortDate, voteLabel } from '../lib/format'
import { canVote, isStaff } from '../lib/permissions'
import {
  computeResumenVotacion,
  emitirVoto,
  fetchPropuestaById,
  fetchVotosByPropuesta,
  type Propuesta,
  type Voto,
} from '../lib/propuestas'
import type { ComisionMiembro } from '../types'

export function VotacionPage() {
  const { profile } = useAuth()
  const { propuestaId } = useParams()
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null)
  const [votos, setVotos] = useState<Voto[]>([])
  const [miembros, setMiembros] = useState<ComisionMiembro[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingVote, setSubmittingVote] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  const resumen = useMemo(() => computeResumenVotacion(votos), [votos])
  const idPropuesta = Number(propuestaId)
  const userVote = useMemo(
    () => votos.find((item) => item.id_usuario === profile?.idUsuario) ?? null,
    [profile?.idUsuario, votos],
  )
  const membership = useMemo(
    () => miembros.find((item) => item.id_usuario === profile?.idUsuario) ?? null,
    [miembros, profile?.idUsuario],
  )
  const proposalIsOpen = propuesta?.estado === 'pendiente'
  const staffCanVote = isStaff(profile)
  const memberCanVote = Boolean(membership?.activo && membership?.puede_votar)
  const allowedToVote = canVote(profile) && proposalIsOpen && (staffCanVote || memberCanVote)
  const votingDisabled = !propuesta || Boolean(submittingVote) || !allowedToVote || Boolean(userVote)

  useEffect(() => {
    if (!idPropuesta) return
    void loadData(idPropuesta)
  }, [idPropuesta])

  async function loadData(targetId: number) {
    setLoading(true)
    try {
      const nextPropuesta = await fetchPropuestaById(targetId)
      const [nextVotos, nextMiembros] = await Promise.all([
        fetchVotosByPropuesta(targetId),
        fetchComisionMiembros(nextPropuesta.id_comision),
      ])
      setPropuesta(nextPropuesta)
      setVotos(nextVotos)
      setMiembros(nextMiembros)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cargar la votación.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVote(voto: 'a_favor' | 'en_contra' | 'abstencion') {
    if (!profile || !propuesta) return
    if (!allowedToVote) {
      setStatus('Tu usuario no está habilitado para votar en esta propuesta.')
      return
    }

    setSubmittingVote(voto)
    setStatus('')
    try {
      await emitirVoto({
        id_propuesta: propuesta.id_propuesta,
        id_usuario: profile.idUsuario,
        voto,
      })
      setStatus('Voto registrado correctamente.')
      await loadData(propuesta.id_propuesta)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible registrar el voto.')
    } finally {
      setSubmittingVote(null)
    }
  }

  return (
    <AppShell
      title="Votación"
      subtitle="Registra votos y consulta el resultado por mayoría simple para cada propuesta."
    >
      <div className="stats-grid">
        <article className="stat-card accent-blue">
          <span>A favor</span>
          <strong>{loading ? '...' : resumen.aFavor}</strong>
        </article>
        <article className="stat-card accent-gold">
          <span>En contra</span>
          <strong>{loading ? '...' : resumen.enContra}</strong>
        </article>
        <article className="stat-card accent-violet">
          <span>Abstenciones</span>
          <strong>{loading ? '...' : resumen.abstenciones}</strong>
        </article>
        <article className="stat-card">
          <span>Resultado</span>
          <strong className="small-metric">{loading ? '...' : resumen.resultado}</strong>
        </article>
      </div>

      <div className="panel-grid budgets-layout">
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Propuesta activa</span>
              <h3>{propuesta?.titulo ?? 'Sin propuesta seleccionada'}</h3>
            </div>
            <Link className="ghost-button" to="/propuestas">
              Volver a propuestas
            </Link>
          </div>

          {propuesta ? (
            <div className="selected-summary">
              <strong>{propuesta.titulo}</strong>
              <span>Creada: {shortDate(propuesta.fecha_creacion)}</span>
              <span>Estado: {propuesta.estado}</span>
              <span>Resultado: {propuesta.resultado_final}</span>
              <p>{propuesta.descripcion}</p>
            </div>
          ) : (
            <div className="empty-state">Selecciona una propuesta desde el módulo correspondiente.</div>
          )}

          <div className="vote-actions">
            <button
              type="button"
              className="primary-button"
              disabled={votingDisabled}
              onClick={() => void handleVote('a_favor')}
            >
              {submittingVote === 'a_favor' ? 'Guardando...' : 'Votar a favor'}
            </button>
            <button
              type="button"
              className="ghost-button vote-negative"
              disabled={votingDisabled}
              onClick={() => void handleVote('en_contra')}
            >
              {submittingVote === 'en_contra' ? 'Guardando...' : 'Votar en contra'}
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={votingDisabled}
              onClick={() => void handleVote('abstencion')}
            >
              {submittingVote === 'abstencion' ? 'Guardando...' : 'Abstenerme'}
            </button>
          </div>

          {!proposalIsOpen && propuesta ? <div className="helper-note">Esta propuesta no está pendiente.</div> : null}
          {!staffCanVote && !memberCanVote && propuesta ? (
            <div className="helper-note">
              Tu usuario debe estar agregado como miembro votante de esta comisión para votar.
            </div>
          ) : null}
          {userVote ? <div className="form-status">Ya registraste tu voto: {voteLabel(userVote.voto)}.</div> : null}
          {status ? <div className="form-status">{status}</div> : null}
        </section>

        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Historial</span>
              <h3>Votos registrados</h3>
            </div>
          </div>

          <div className="movement-list">
            {propuesta && votos.length === 0 ? (
              <div className="empty-state">Todavía no hay votos registrados para esta propuesta.</div>
            ) : null}

            {votos.map((item) => (
              <article className="movement-card" key={item.id_voto}>
                <div className="movement-card-top">
                  <span className="status-badge">{voteLabel(item.voto)}</span>
                  <strong>{item.usuario?.nombre ?? `Usuario #${item.id_usuario}`}</strong>
                </div>
                {item.usuario?.correo ? <span className="movement-date">{item.usuario.correo}</span> : null}
                <span className="movement-date">{shortDate(item.fecha)}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  )
}
