import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { Pagination } from '../components/Pagination'
import { fetchComisionMiembros, fetchComisiones, saveComisionMiembro } from '../lib/comisiones'
import { shortDate } from '../lib/format'
import { isStaff } from '../lib/permissions'
import { createPropuesta, fetchPropuestasByComision, type Propuesta } from '../lib/propuestas'
import { fetchUsuarios } from '../lib/usuarios'
import type { Comision, ComisionMiembro, Usuario } from '../types'
import { useWorkspace } from '../workspace/WorkspaceContext'
import { downloadPropuestasPdf } from '../lib/reportesPdf'

interface PropuestaFormState {
  titulo: string
  descripcion: string
}

const initialForm: PropuestaFormState = {
  titulo: '',
  descripcion: '',
}

export function PropuestasPage() {
  const { profile } = useAuth()
  const { workspace } = useWorkspace()
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [miembros, setMiembros] = useState<ComisionMiembro[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [form, setForm] = useState<PropuestaFormState>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingMember, setSavingMember] = useState(false)
  const [status, setStatus] = useState('')
  const [proposalSearch, setProposalSearch] = useState('')
  const [proposalState, setProposalState] = useState('todos')
  const [proposalResult, setProposalResult] = useState('todos')
  const [proposalPage, setProposalPage] = useState(1)
  const proposalPageSize = 6

  const canEdit = isStaff(profile)
  const selectedComision = useMemo(
    () => comisiones.find((item) => item.id_comision === selectedId) ?? null,
    [comisiones, selectedId],
  )
  const selectedMembership = useMemo(
    () => miembros.find((item) => item.id_usuario === profile?.idUsuario) ?? null,
    [miembros, profile?.idUsuario],
  )
  const canCreateProposal = canEdit || Boolean(selectedMembership?.activo)
  const filteredProposals = useMemo(() => {
    const normalized = proposalSearch.trim().toLocaleLowerCase()
    return propuestas.filter((item) => {
      const matchesText = !normalized || `${item.titulo} ${item.descripcion}`.toLocaleLowerCase().includes(normalized)
      return matchesText && (proposalState === 'todos' || item.estado === proposalState) && (proposalResult === 'todos' || item.resultado_final === proposalResult)
    })
  }, [proposalResult, proposalSearch, proposalState, propuestas])
  const paginatedProposals = filteredProposals.slice((proposalPage - 1) * proposalPageSize, proposalPage * proposalPageSize)

  useEffect(() => {
    void loadInitialData()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    void loadCommissionData(selectedId)
  }, [selectedId])

  async function loadInitialData() {
    setLoading(true)
    try {
      const [nextComisiones, nextUsuarios] = await Promise.all([fetchComisiones(), fetchUsuarios()])
      setComisiones(nextComisiones)
      setUsuarios(nextUsuarios)
      setSelectedUserId((current) => current ?? nextUsuarios[0]?.id_usuario ?? null)
      setSelectedId((current) => current ?? nextComisiones[0]?.id_comision ?? null)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cargar los datos iniciales.')
    } finally {
      setLoading(false)
    }
  }

  async function loadCommissionData(idComision: number) {
    try {
      const [nextPropuestas, nextMiembros] = await Promise.all([
        fetchPropuestasByComision(idComision),
        fetchComisionMiembros(idComision),
      ])
      setPropuestas(nextPropuestas)
      setMiembros(nextMiembros)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cargar las propuestas.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || !selectedId) return
    if (!canCreateProposal) {
      setStatus('Debes ser miembro activo de esta comisión para crear propuestas.')
      return
    }

    if (!form.titulo.trim() || !form.descripcion.trim()) {
      setStatus('Debes completar el título y la descripción.')
      return
    }

    setSaving(true)
    setStatus('')
    try {
      await createPropuesta({
        id_comision: selectedId,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        creada_por: profile.idUsuario,
      })
      setForm(initialForm)
      setStatus('Propuesta creada correctamente.')
      await loadCommissionData(selectedId)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible guardar la propuesta.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedId || !selectedUserId) return
    if (!canEdit) {
      setStatus('Tu rol no tiene permisos para agregar miembros.')
      return
    }

    setSavingMember(true)
    setStatus('')
    try {
      await saveComisionMiembro({
        id_comision: selectedId,
        id_usuario: selectedUserId,
        puede_votar: true,
        es_responsable: false,
        activo: true,
      })
      setStatus('Miembro agregado con permiso para votar.')
      await loadCommissionData(selectedId)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible agregar el miembro.')
    } finally {
      setSavingMember(false)
    }
  }

  async function handleToggleVote(member: ComisionMiembro, puedeVotar: boolean) {
    if (!selectedId || !canEdit) return

    try {
      await saveComisionMiembro({ ...member, id_comision: selectedId, puede_votar: puedeVotar })
      setStatus('Permiso de votación actualizado.')
      await loadCommissionData(selectedId)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible actualizar el permiso.')
    }
  }

  return (
    <AppShell
      title="Propuestas"
      subtitle="Crea propuestas por comisión, asigna miembros y prepara el flujo de decisiones para la votación."
    >
      <div className="panel-grid budgets-layout">
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Contexto</span>
              <h3 className="auto-space-context">Área general preestablecida</h3>
            </div>
            <button type="button" className="ghost-button" onClick={() => void loadInitialData()}>
              Actualizar
            </button>
          </div>

          <label className="select-label">
            <span>Comisión</span>
            <select
              value={selectedId ?? ''}
              onChange={(event) => setSelectedId(event.target.value ? Number(event.target.value) : null)}
            >
              {loading ? <option value="">Cargando...</option> : null}
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
              <span>
                Periodo: {shortDate(selectedComision.fecha_inicio)} - {shortDate(selectedComision.fecha_fin)}
              </span>
              <p>{selectedComision.descripcion || 'Sin descripción registrada.'}</p>
            </div>
          ) : (
            <div className="empty-state">Selecciona una comisión para ver sus propuestas.</div>
          )}

          {!canEdit && selectedComision ? (
            <div className="helper-note">
              {selectedMembership?.puede_votar
                ? 'Estás registrado como miembro votante de esta comisión.'
                : 'Para votar, un coordinador debe agregarte como miembro votante de esta comisión.'}
            </div>
          ) : null}
        </section>

        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Nueva propuesta</span>
              <h3>Formulario</h3>
            </div>
          </div>

          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              <span>Título</span>
              <input
                value={form.titulo}
                onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
                placeholder="Ej. Aprobación de presupuesto extraordinario"
              />
            </label>

            <label>
              <span>Descripción</span>
              <textarea
                rows={6}
                value={form.descripcion}
                onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
                placeholder="Describe la propuesta, el contexto y lo que se espera aprobar."
              />
            </label>

            <button type="submit" className="primary-button" disabled={!canCreateProposal || saving || !selectedId}>
              {saving ? 'Guardando...' : 'Crear propuesta'}
            </button>
          </form>

          {!canCreateProposal ? (
            <p className="helper-note">Para crear propuestas, primero debes pertenecer a la comisión seleccionada.</p>
          ) : null}
          {status ? <div className="form-status">{status}</div> : null}
        </section>
      </div>

      {canEdit ? (
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Miembros</span>
              <h3>Personas habilitadas para votar</h3>
            </div>
          </div>

          <form className="stack-form compact-form" onSubmit={handleAddMember}>
            <label>
              <span>Usuario</span>
              <select
                value={selectedUserId ?? ''}
                onChange={(event) => setSelectedUserId(event.target.value ? Number(event.target.value) : null)}
              >
                {usuarios.map((usuario) => (
                  <option key={usuario.id_usuario} value={usuario.id_usuario}>
                    {usuario.nombre} - {usuario.rol_nombre ?? 'Sin rol'}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="primary-button" disabled={!selectedId || !selectedUserId || savingMember}>
              {savingMember ? 'Agregando...' : 'Agregar como votante'}
            </button>
          </form>

          <div className="member-list">
            {miembros.length === 0 ? (
              <div className="empty-state">Todavía no hay miembros asociados a esta comisión.</div>
            ) : null}
            {miembros.map((member) => (
              <article className="member-row" key={`${member.id_comision}-${member.id_usuario}`}>
                <div>
                  <strong>{member.usuario?.nombre ?? `Usuario #${member.id_usuario}`}</strong>
                  <span>{member.usuario?.correo ?? 'Sin correo registrado'}</span>
                </div>
                <label className="toggle-line">
                  <input
                    type="checkbox"
                    checked={member.puede_votar}
                    onChange={(event) => void handleToggleVote(member, event.target.checked)}
                  />
                  Puede votar
                </label>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Listado</span>
            <h3>Propuestas de la comisión</h3>
          </div>
          <button type="button" className="ghost-button" disabled={!filteredProposals.length} onClick={() => downloadPropuestasPdf(filteredProposals, { workspace: workspace?.nombre ?? 'SIGECOM', members: usuarios.map((item) => item.nombre), generatedBy: profile?.nombre ?? 'Usuario' })}>Descargar PDF</button>
        </div>

          <div className="filter-bar">
            <label><span>Buscar</span><input value={proposalSearch} placeholder="Título o descripción" onChange={(event) => { setProposalSearch(event.target.value); setProposalPage(1) }} /></label>
            <label><span>Estado</span><select value={proposalState} onChange={(event) => { setProposalState(event.target.value); setProposalPage(1) }}><option value="todos">Todos</option><option value="pendiente">Pendiente</option><option value="finalizada">Finalizada</option></select></label>
            <label><span>Resultado</span><select value={proposalResult} onChange={(event) => { setProposalResult(event.target.value); setProposalPage(1) }}><option value="todos">Todos</option><option value="aprobada">Aprobada</option><option value="rechazada">Rechazada</option><option value="pendiente">Pendiente</option></select></label>
            <button type="button" className="ghost-button" onClick={() => { setProposalSearch(''); setProposalState('todos'); setProposalResult('todos'); setProposalPage(1) }}>Limpiar</button>
          </div>

        <div className="proposal-list">
          {selectedId && propuestas.length === 0 ? (
            <div className="empty-state">Todavía no hay propuestas para esta comisión.</div>
          ) : null}

          {paginatedProposals.map((propuesta) => (
            <article className="proposal-card" key={propuesta.id_propuesta}>
              <div className="commission-card-top">
                <div>
                  <span className="status-badge">{propuesta.estado}</span>
                  <h4>{propuesta.titulo}</h4>
                </div>
                <Link className="ghost-button small" to={`/votacion/${propuesta.id_propuesta}`}>
                  Ver votación
                </Link>
              </div>

              <p>{propuesta.descripcion}</p>

              <div className="commission-meta">
                <span>Creada: {shortDate(propuesta.fecha_creacion)}</span>
                <span>Resultado: {propuesta.resultado_final}</span>
              </div>
            </article>
          ))}
          <Pagination page={proposalPage} pageSize={proposalPageSize} total={filteredProposals.length} onPageChange={setProposalPage} />
        </div>
      </section>
    </AppShell>
  )
}
