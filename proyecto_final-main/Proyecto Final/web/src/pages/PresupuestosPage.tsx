import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { Pagination } from '../components/Pagination'
import { fetchComisionMiembros, fetchComisiones, saveComisionMiembro } from '../lib/comisiones'
import { money, shortDate } from '../lib/format'
import { isStaff } from '../lib/permissions'
import {
  aprobarPresupuestoDesdeVotacion,
  computeBalance,
  createMovimiento,
  fetchMovimientosByComision,
  fetchPresupuestoByComision,
  savePresupuesto,
} from '../lib/presupuestos'
import { createPropuesta, fetchPropuestasByComision, type Propuesta } from '../lib/propuestas'
import {
  createSolicitudPresupuesto,
  fetchMisSolicitudesPresupuesto,
  fetchSolicitudesPresupuesto,
  updateSolicitudPresupuesto,
} from '../lib/solicitudesPresupuesto'
import type { Comision, ComisionMiembro, MovimientoFinanciero, Presupuesto, SolicitudPresupuesto } from '../types'
import { useWorkspace } from '../workspace/WorkspaceContext'
import { downloadFinanzasPdf } from '../lib/reportesPdf'

interface PresupuestoFormState {
  montoEstimado: string
  observaciones: string
}

interface MovimientoFormState {
  tipo: 'ingreso' | 'gasto'
  monto: string
  descripcion: string
}

interface SolicitudBudgetFormState {
  monto: string
  justificacion: string
}

const initialBudget: PresupuestoFormState = {
  montoEstimado: '',
  observaciones: '',
}

const initialMovimiento: MovimientoFormState = {
  tipo: 'ingreso',
  monto: '',
  descripcion: '',
}

const initialSolicitudBudget: SolicitudBudgetFormState = {
  monto: '',
  justificacion: '',
}

function isBudgetProposal(propuesta: Propuesta) {
  return propuesta.titulo.toLowerCase().startsWith('aprobación de presupuesto')
}

function formatColonInput(value: string) {
  if (!value) return ''
  const [integer = '0', decimals] = value.split('.')
  const formattedInteger = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 0 }).format(Number(integer || 0))
  return decimals === undefined ? formattedInteger : `${formattedInteger},${decimals.slice(0, 2)}`
}

function parseColonInput(value: string) {
  const cleaned = value.replace(/[₡\s]/g, '')
  const commaIndex = cleaned.lastIndexOf(',')
  const integerPart = (commaIndex >= 0 ? cleaned.slice(0, commaIndex) : cleaned).replace(/\D/g, '')
  const decimals = commaIndex >= 0 ? cleaned.slice(commaIndex + 1).replace(/\D/g, '').slice(0, 2) : null
  return `${integerPart || '0'}${decimals === null ? '' : `.${decimals}`}`
}

export function PresupuestosPage() {
  const { profile } = useAuth()
  const { workspace } = useWorkspace()
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [budgetForm, setBudgetForm] = useState<PresupuestoFormState>(initialBudget)
  const [movimientoForm, setMovimientoForm] = useState<MovimientoFormState>(initialMovimiento)
  const [movimientos, setMovimientos] = useState<MovimientoFinanciero[]>([])
  const [miembros, setMiembros] = useState<ComisionMiembro[]>([])
  const [solicitudesPresupuesto, setSolicitudesPresupuesto] = useState<SolicitudPresupuesto[]>([])
  const [solicitudForm, setSolicitudForm] = useState<SolicitudBudgetFormState>(initialSolicitudBudget)
  const [budgetProposals, setBudgetProposals] = useState<Propuesta[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [creatingVote, setCreatingVote] = useState(false)
  const [savingMovimiento, setSavingMovimiento] = useState(false)
  const [savingSolicitud, setSavingSolicitud] = useState(false)
  const [movementSearch, setMovementSearch] = useState('')
  const [movementType, setMovementType] = useState('todos')
  const [movementFrom, setMovementFrom] = useState('')
  const [movementPage, setMovementPage] = useState(1)
  const movementPageSize = 6

  const canEdit = isStaff(profile)
  const selectedComision = useMemo(
    () => comisiones.find((item) => item.id_comision === selectedId) ?? null,
    [comisiones, selectedId],
  )
  const balance = useMemo(() => computeBalance(movimientos), [movimientos])
  const pendingBudgetProposal = useMemo(
    () => budgetProposals.find((item) => item.estado === 'pendiente') ?? null,
    [budgetProposals],
  )
  const approvedBudgetProposal = useMemo(
    () => budgetProposals.find((item) => item.resultado_final === 'aprobada' || item.estado === 'aprobada') ?? null,
    [budgetProposals],
  )
  const selectedMembership = useMemo(
    () => miembros.find((item) => item.id_usuario === profile?.idUsuario) ?? null,
    [miembros, profile?.idUsuario],
  )
  const canRequestBudget = Boolean(selectedMembership?.activo)
  const pendingBudgetRequests = useMemo(
    () =>
      solicitudesPresupuesto.filter(
        (solicitud) => solicitud.estado === 'pendiente' && solicitud.id_comision === selectedId,
      ),
    [selectedId, solicitudesPresupuesto],
  )
  const myCurrentRequest = useMemo(
    () =>
      solicitudesPresupuesto.find(
        (solicitud) =>
          solicitud.id_comision === selectedId &&
          solicitud.id_usuario === profile?.idUsuario &&
          solicitud.estado === 'pendiente',
      ) ?? null,
    [profile?.idUsuario, selectedId, solicitudesPresupuesto],
  )
  const filteredMovements = useMemo(() => {
    const normalized = movementSearch.trim().toLocaleLowerCase()
    return movimientos.filter((item) => {
      const matchesText = !normalized || item.descripcion.toLocaleLowerCase().includes(normalized)
      const matchesType = movementType === 'todos' || item.tipo === movementType
      const matchesDate = !movementFrom || item.fecha.slice(0, 10) >= movementFrom
      return matchesText && matchesType && matchesDate
    })
  }, [movementFrom, movementSearch, movementType, movimientos])
  const paginatedMovements = filteredMovements.slice((movementPage - 1) * movementPageSize, movementPage * movementPageSize)

  useEffect(() => {
    void loadComisiones()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    void loadFinancialData(selectedId)
  }, [selectedId])

  async function loadComisiones() {
    setLoading(true)
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

  async function loadFinancialData(idComision: number) {
    try {
      const [nextPresupuesto, nextMovimientos, nextPropuestas, nextMiembros, nextSolicitudes] = await Promise.all([
        fetchPresupuestoByComision(idComision),
        fetchMovimientosByComision(idComision),
        fetchPropuestasByComision(idComision),
        fetchComisionMiembros(idComision),
        profile
          ? canEdit
            ? fetchSolicitudesPresupuesto()
            : fetchMisSolicitudesPresupuesto(profile.idUsuario)
          : Promise.resolve([]),
      ])

      const nextBudgetProposals = nextPropuestas.filter(isBudgetProposal)
      setPresupuesto(nextPresupuesto)
      setBudgetForm({
        montoEstimado: nextPresupuesto?.monto_estimado?.toString() ?? '',
        observaciones: nextPresupuesto?.observaciones ?? '',
      })
      setMovimientos(nextMovimientos)
      setBudgetProposals(nextBudgetProposals)
      setMiembros(nextMiembros)
      setSolicitudesPresupuesto(nextSolicitudes)

      const approvedProposal = nextBudgetProposals.find(
        (item) => item.resultado_final === 'aprobada' || item.estado === 'aprobada',
      )

      if (
        profile &&
        canEdit &&
        approvedProposal &&
        nextPresupuesto &&
        Number(nextPresupuesto.monto_aprobado ?? 0) <= 0 &&
        Number(nextPresupuesto.monto_estimado ?? 0) > 0
      ) {
        const updated = await aprobarPresupuestoDesdeVotacion({
          id_comision: idComision,
          monto_aprobado: Number(nextPresupuesto.monto_estimado),
          observaciones: nextPresupuesto.observaciones,
          creado_por: profile.idUsuario,
        })
        setPresupuesto(updated)
        setBudgetForm({
          montoEstimado: updated.monto_estimado.toString(),
          observaciones: updated.observaciones ?? '',
        })
        setStatus('Presupuesto aprobado por votación y aplicado correctamente.')
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cargar el bloque financiero.')
    }
  }

  async function handleSaveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || !selectedId) return
    if (!canEdit) {
      setStatus('Tu rol no tiene permisos para editar presupuestos.')
      return
    }

    const montoEstimado = Number(budgetForm.montoEstimado || 0)

    if (Number.isNaN(montoEstimado)) {
      setStatus('El monto estimado debe ser numérico.')
      return
    }

    setSavingBudget(true)
    setStatus('')
    try {
      await savePresupuesto({
        id_comision: selectedId,
        monto_estimado: montoEstimado,
        monto_aprobado: Number(presupuesto?.monto_aprobado ?? 0),
        observaciones: budgetForm.observaciones || null,
        creado_por: profile.idUsuario,
      })
      setStatus('Monto estimado guardado. Ahora puedes enviarlo a votación.')
      await loadFinancialData(selectedId)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible guardar el presupuesto.')
    } finally {
      setSavingBudget(false)
    }
  }

  async function handleCreateBudgetVote() {
    if (!profile || !selectedId || !selectedComision) return
    if (!canEdit) {
      setStatus('Tu rol no tiene permisos para enviar presupuestos a votación.')
      return
    }

    const montoEstimado = Number(budgetForm.montoEstimado || presupuesto?.monto_estimado || 0)
    if (Number.isNaN(montoEstimado) || montoEstimado <= 0) {
      setStatus('Guarda un monto estimado mayor a cero antes de enviarlo a votación.')
      return
    }

    setCreatingVote(true)
    setStatus('')
    try {
      const activeMembers = miembros.filter((miembro) => miembro.activo)
      if (activeMembers.length === 0) {
        setStatus('Agrega miembros activos a la comisión antes de enviar el presupuesto a votación.')
        return
      }

      await Promise.all(
        activeMembers
          .filter((miembro) => !miembro.puede_votar)
          .map((miembro) =>
            saveComisionMiembro({
              ...miembro,
              puede_votar: true,
            }),
          ),
      )

      await savePresupuesto({
        id_comision: selectedId,
        monto_estimado: montoEstimado,
        monto_aprobado: Number(presupuesto?.monto_aprobado ?? 0),
        observaciones: budgetForm.observaciones || null,
        creado_por: profile.idUsuario,
      })

      await createPropuesta({
        id_comision: selectedId,
        titulo: `Aprobación de presupuesto - ${selectedComision.titulo}`,
        descripcion: `Se somete a votación la aprobación del presupuesto estimado por ${money(montoEstimado)}. ${
          budgetForm.observaciones ? `Observaciones: ${budgetForm.observaciones}` : ''
        }`,
        creada_por: profile.idUsuario,
        tipo: 'presupuesto',
      })

      setStatus(`Presupuesto enviado a votación con ${activeMembers.length} miembro(s) activo(s).`)
      await loadFinancialData(selectedId)
      setBudgetForm(initialBudget)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible crear la votación del presupuesto.')
    } finally {
      setCreatingVote(false)
    }
  }

  async function handleSaveMovimiento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || !selectedId) return
    if (!canEdit) {
      setStatus('Tu rol no tiene permisos para registrar movimientos.')
      return
    }

    const monto = Number(movimientoForm.monto || 0)
    if (Number.isNaN(monto) || monto <= 0) {
      setStatus('El monto del movimiento debe ser mayor a cero.')
      return
    }
    if (!movimientoForm.descripcion.trim()) {
      setStatus('Debes indicar una descripción para el movimiento.')
      return
    }

    setSavingMovimiento(true)
    setStatus('')
    try {
      await createMovimiento({
        id_comision: selectedId,
        tipo: movimientoForm.tipo,
        monto,
        descripcion: movimientoForm.descripcion.trim(),
        creado_por: profile.idUsuario,
      })
      setMovimientoForm(initialMovimiento)
      setStatus('Movimiento guardado correctamente.')
      await loadFinancialData(selectedId)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible guardar el movimiento.')
    } finally {
      setSavingMovimiento(false)
    }
  }

  async function handleCreateBudgetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || !selectedId) return
    if (!canRequestBudget) {
      setStatus('Debes pertenecer a esta comisión para solicitar presupuesto.')
      return
    }

    const monto = Number(solicitudForm.monto || 0)
    if (Number.isNaN(monto) || monto <= 0) {
      setStatus('El monto solicitado debe ser mayor a cero.')
      return
    }
    if (!solicitudForm.justificacion.trim()) {
      setStatus('Debes escribir una justificación para solicitar presupuesto.')
      return
    }

    setSavingSolicitud(true)
    setStatus('')
    try {
      await createSolicitudPresupuesto({
        id_comision: selectedId,
        id_usuario: profile.idUsuario,
        monto_solicitado: monto,
        justificacion: solicitudForm.justificacion.trim(),
      })
      setSolicitudForm(initialSolicitudBudget)
      setStatus('Solicitud de presupuesto enviada.')
      await loadFinancialData(selectedId)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible enviar la solicitud de presupuesto.')
    } finally {
      setSavingSolicitud(false)
    }
  }

  async function handleApproveBudgetRequest(solicitud: SolicitudPresupuesto) {
    if (!profile || !selectedId) return

    try {
      await savePresupuesto({
        id_comision: solicitud.id_comision,
        monto_estimado: Number(solicitud.monto_solicitado),
        monto_aprobado: Number(presupuesto?.monto_aprobado ?? 0),
        observaciones: solicitud.justificacion,
        creado_por: profile.idUsuario,
      })
      await updateSolicitudPresupuesto(solicitud.id_solicitud_presupuesto, {
        estado: 'aprobada',
        revisado_por: profile.idUsuario,
      })
      setStatus('Solicitud aprobada y cargada como monto estimado.')
      await loadFinancialData(selectedId)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible aprobar la solicitud.')
    }
  }

  async function handleRejectBudgetRequest(solicitud: SolicitudPresupuesto) {
    if (!profile || !selectedId) return

    try {
      await updateSolicitudPresupuesto(solicitud.id_solicitud_presupuesto, {
        estado: 'rechazada',
        revisado_por: profile.idUsuario,
      })
      setStatus('Solicitud rechazada.')
      await loadFinancialData(selectedId)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible rechazar la solicitud.')
    }
  }

  return (
    <AppShell
      title="Presupuestos y finanzas"
      subtitle="Controla montos estimados, somete presupuestos a votación y registra movimientos financieros."
    >
      <div className="stats-grid">
        <article className="stat-card">
          <span>Espacio activo</span>
          <strong className="small-metric">{selectedComision?.titulo ?? 'Sin selección'}</strong>
        </article>
        <article className="stat-card accent-blue">
          <span>Estimado</span>
          <strong>{money(Number(presupuesto?.monto_estimado ?? 0))}</strong>
        </article>
        <article className="stat-card accent-gold">
          <span>Aprobado</span>
          <strong>{money(Number(presupuesto?.monto_aprobado ?? 0))}</strong>
        </article>
        <article className="stat-card accent-violet">
          <span>Balance</span>
          <strong>{money(balance.balance)}</strong>
        </article>
      </div>

      <div className="panel-grid budgets-layout">
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Contexto</span>
              <h3 className="auto-space-context">Área general preestablecida</h3>
            </div>
            <button type="button" className="ghost-button" onClick={() => void loadComisiones()}>
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
            <div className="empty-state">Selecciona una comisión para cargar su bloque financiero.</div>
          )}
        </section>

        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Presupuesto</span>
              <h3>Estimación y aprobación</h3>
            </div>
          </div>

          <form className="stack-form" onSubmit={canEdit ? handleSaveBudget : handleCreateBudgetRequest}>
            <label>
              <span>{canEdit ? 'Monto estimado' : 'Monto solicitado'}</span>
              <div className="currency-input"><span aria-hidden="true">₡</span><input
                  type="text"
                  inputMode="decimal"
                  value={formatColonInput(canEdit ? budgetForm.montoEstimado : solicitudForm.monto)}
                  onChange={(event) =>
                    canEdit
                      ? setBudgetForm((current) => ({ ...current, montoEstimado: parseColonInput(event.target.value) }))
                      : setSolicitudForm((current) => ({ ...current, monto: parseColonInput(event.target.value) }))
                  }
                /></div>
            </label>

            <div className="selected-summary">
              <strong>Monto aprobado: {money(Number(presupuesto?.monto_aprobado ?? 0))}</strong>
              <span>
                {presupuesto?.fecha_aprobacion
                  ? `Aprobado el ${shortDate(presupuesto.fecha_aprobacion)}`
                  : 'Pendiente de aprobación por votación'}
              </span>
            </div>

            <label>
              <span>{canEdit ? 'Observaciones' : 'Justificación'}</span>
              <textarea
                rows={5}
                value={canEdit ? budgetForm.observaciones : solicitudForm.justificacion}
                onChange={(event) =>
                  canEdit
                    ? setBudgetForm((current) => ({ ...current, observaciones: event.target.value }))
                    : setSolicitudForm((current) => ({ ...current, justificacion: event.target.value }))
                }
                placeholder={
                  canEdit
                    ? 'Notas, acuerdos o contexto de aprobación.'
                    : 'Explica para qué se necesita este presupuesto.'
                }
              />
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={
                canEdit
                  ? !canEdit || savingBudget || !selectedId
                  : !canRequestBudget || savingSolicitud || Boolean(myCurrentRequest)
              }
            >
              {canEdit
                ? savingBudget
                  ? 'Guardando...'
                  : 'Guardar estimado'
                : myCurrentRequest
                  ? 'Solicitud pendiente'
                  : savingSolicitud
                    ? 'Enviando...'
                    : 'Solicitar presupuesto'}
            </button>
          </form>

          {!canEdit && !canRequestBudget ? (
            <p className="helper-note">Debes ser miembro activo de esta comisión para pedir presupuesto.</p>
          ) : null}

          {canEdit ? (
            <div className="vote-actions">
            <button
              type="button"
              className="ghost-button"
              disabled={!canEdit || creatingVote || !selectedId || Boolean(pendingBudgetProposal)}
              onClick={() => void handleCreateBudgetVote()}
            >
              {pendingBudgetProposal ? 'Votación pendiente' : creatingVote ? 'Creando...' : 'Enviar a votación'}
            </button>
            {pendingBudgetProposal ? (
              <Link className="primary-button" to={`/votacion/${pendingBudgetProposal.id_propuesta}`}>
                Abrir votación
              </Link>
            ) : null}
            {approvedBudgetProposal ? (
              <Link className="ghost-button" to={`/votacion/${approvedBudgetProposal.id_propuesta}`}>
                Ver aprobación
              </Link>
            ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {canEdit ? (
        <div className="panel-grid budgets-layout">
          <section className="glass-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Revisión</span>
                <h3>Solicitudes pendientes</h3>
              </div>
            </div>

            <div className="member-list">
              {pendingBudgetRequests.length === 0 ? (
                <div className="empty-state">No hay solicitudes de presupuesto pendientes.</div>
              ) : null}
              {pendingBudgetRequests.map((solicitud) => (
                <article className="member-row" key={solicitud.id_solicitud_presupuesto}>
                  <div>
                    <strong>{money(Number(solicitud.monto_solicitado))}</strong>
                    <span>
                      Usuario #{solicitud.id_usuario} · {shortDate(solicitud.fecha_solicitud)}
                    </span>
                    <span>{solicitud.justificacion}</span>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleApproveBudgetRequest(solicitud)}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void handleRejectBudgetRequest(solicitud)}
                    >
                      Rechazar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <div className="panel-grid budgets-layout">
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Movimientos</span>
              <h3>Registrar ingreso o gasto</h3>
            </div>
          </div>

          <form className="stack-form" onSubmit={handleSaveMovimiento}>
            <div className="two-col">
              <label>
                <span>Tipo</span>
                <select
                  value={movimientoForm.tipo}
                  onChange={(event) =>
                    setMovimientoForm((current) => ({
                      ...current,
                      tipo: event.target.value as 'ingreso' | 'gasto',
                    }))
                  }
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="gasto">Gasto</option>
                </select>
              </label>

              <label>
                <span>Monto</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={movimientoForm.monto}
                  onChange={(event) => setMovimientoForm((current) => ({ ...current, monto: event.target.value }))}
                />
              </label>
            </div>

            <label>
              <span>Descripción</span>
              <input
                value={movimientoForm.descripcion}
                onChange={(event) =>
                  setMovimientoForm((current) => ({ ...current, descripcion: event.target.value }))
                }
                placeholder="Ej. Compra de materiales, aporte institucional."
              />
            </label>

            <button type="submit" className="primary-button" disabled={!canEdit || savingMovimiento || !selectedId}>
              {savingMovimiento ? 'Guardando...' : 'Registrar movimiento'}
            </button>
          </form>

          {!canEdit ? <p className="helper-note">Tu rol actual solo puede consultar este módulo.</p> : null}
          {status ? <div className="form-status">{status}</div> : null}
        </section>

        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Historial</span>
              <h3>Actividad financiera</h3>
            </div>
            <button type="button" className="ghost-button" disabled={!filteredMovements.length} onClick={() => downloadFinanzasPdf(filteredMovements, { workspace: workspace?.nombre ?? 'SIGECOM', members: miembros.map((item) => item.usuario?.nombre ?? `Usuario #${item.id_usuario}`), generatedBy: profile?.nombre ?? 'Usuario' })}>Descargar PDF</button>
          </div>

          <div className="filter-bar">
            <label><span>Buscar</span><input value={movementSearch} placeholder="Descripción del movimiento" onChange={(event) => { setMovementSearch(event.target.value); setMovementPage(1) }} /></label>
            <label><span>Tipo</span><select value={movementType} onChange={(event) => { setMovementType(event.target.value); setMovementPage(1) }}><option value="todos">Todos</option><option value="ingreso">Ingresos</option><option value="gasto">Gastos</option></select></label>
            <label><span>Desde</span><input type="date" value={movementFrom} onChange={(event) => { setMovementFrom(event.target.value); setMovementPage(1) }} /></label>
            <button type="button" className="ghost-button" onClick={() => { setMovementSearch(''); setMovementType('todos'); setMovementFrom(''); setMovementPage(1) }}>Limpiar</button>
          </div>

          <div className="movement-list">
            {selectedId && movimientos.length === 0 ? (
              <div className="empty-state">Todavía no hay movimientos financieros para esta comisión.</div>
            ) : null}

            {paginatedMovements.map((item) => (
              <article className="movement-card" key={item.id_movimiento}>
                <div className="movement-card-top">
                  <span className={`status-badge ${item.tipo === 'gasto' ? 'danger-badge' : item.tipo === 'presupuesto_aprobado' ? '' : 'success-badge'}`}>
                    {item.tipo === 'presupuesto_aprobado' ? 'presupuesto aprobado' : item.tipo}
                  </span>
                  <strong>{money(Number(item.monto))}</strong>
                </div>
                <p>{item.descripcion}</p>
                <span className="movement-date">{shortDate(item.fecha)}</span>
              </article>
            ))}
          </div>
          <Pagination page={movementPage} pageSize={movementPageSize} total={filteredMovements.length} onPageChange={setMovementPage} />
        </section>
      </div>
    </AppShell>
  )
}
