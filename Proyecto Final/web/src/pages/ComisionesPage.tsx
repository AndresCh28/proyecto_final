import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { AppShell } from '../components/AppShell'
import { useAuth } from '../auth/AuthContext'
import { createComision, fetchComisiones, fetchEstados, updateComision, updateComisionEstado } from '../lib/comisiones'
import { isStaff } from '../lib/permissions'
import { shortDate } from '../lib/format'
import {
  aprobarSolicitudComision,
  createSolicitudComision,
  fetchMisSolicitudesComision,
  fetchSolicitudesComision,
  rechazarSolicitudComision,
} from '../lib/solicitudes'
import type { Comision, Estado, SolicitudComision } from '../types'

interface FormState {
  titulo: string
  descripcion: string
  fecha_inicio: string
  fecha_fin: string
}

const initialForm: FormState = {
  titulo: '',
  descripcion: '',
  fecha_inicio: '',
  fecha_fin: '',
}

export function ComisionesPage() {
  const { profile } = useAuth()
  const [comisiones, setComisiones] = useState<Comision[]>([])
  const [estados, setEstados] = useState<Estado[]>([])
  const [solicitudes, setSolicitudes] = useState<SolicitudComision[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [editing, setEditing] = useState<Comision | null>(null)
  const [requestComisionId, setRequestComisionId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [requestingId, setRequestingId] = useState<number | null>(null)
  const [status, setStatus] = useState('')

  const canEdit = isStaff(profile)
  const pendingSolicitudes = useMemo(
    () => solicitudes.filter((solicitud) => solicitud.estado === 'pendiente'),
    [solicitudes],
  )
  const solicitudesByComision = useMemo(() => {
    const map = new Map<number, SolicitudComision>()
    solicitudes.forEach((solicitud) => {
      if (solicitud.id_usuario === profile?.idUsuario) {
        map.set(solicitud.id_comision, solicitud)
      }
    })
    return map
  }, [profile?.idUsuario, solicitudes])

  useEffect(() => {
    void loadData()
  }, [])

  const metrics = useMemo(
    () => ({
      pendientes: comisiones.filter((item) => item.id_estado === 1).length,
      proceso: comisiones.filter((item) => item.id_estado === 2).length,
      finalizadas: comisiones.filter((item) => item.id_estado === 3).length,
    }),
    [comisiones],
  )

  async function loadData() {
    setLoading(true)
    try {
      const [nextComisiones, nextEstados] = await Promise.all([fetchComisiones(), fetchEstados()])
      setComisiones(nextComisiones)
      setEstados(nextEstados)
      setRequestComisionId((current) => current ?? nextComisiones[0]?.id_comision ?? null)

      if (profile) {
        try {
          const nextSolicitudes = canEdit
            ? await fetchSolicitudesComision()
            : await fetchMisSolicitudesComision(profile.idUsuario)
          setSolicitudes(nextSolicitudes)
        } catch (error) {
          setSolicitudes([])
          setStatus(
            error instanceof Error
              ? error.message
              : 'No fue posible cargar solicitudes de comisión.',
          )
        }
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cargar las comisiones.')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(comision: Comision) {
    setEditing(comision)
    setForm({
      titulo: comision.titulo,
      descripcion: comision.descripcion ?? '',
      fecha_inicio: comision.fecha_inicio,
      fecha_fin: comision.fecha_fin ?? '',
    })
    setStatus(`Editando la comisión "${comision.titulo}".`)
  }

  function resetForm() {
    setEditing(null)
    setForm(initialForm)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    if (!canEdit) {
      setStatus('Tu rol no tiene permisos para crear o editar comisiones.')
      return
    }

    setSaving(true)
    setStatus('')

    try {
      if (editing) {
        await updateComision(editing.id_comision, {
          titulo: form.titulo,
          descripcion: form.descripcion || null,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin || null,
        })
        setStatus('Comisión actualizada correctamente.')
      } else {
        await createComision({
          titulo: form.titulo,
          descripcion: form.descripcion || null,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin || null,
          creado_por: profile.idUsuario,
        })
        setStatus('Comisión creada correctamente.')
      }

      resetForm()
      await loadData()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible guardar la comisión.')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangeEstado(comision: Comision, idEstado: number) {
    if (!canEdit) {
      setStatus('Tu rol no tiene permisos para cambiar estados.')
      return
    }

    try {
      await updateComisionEstado(comision.id_comision, idEstado)
      setStatus(`Estado actualizado para "${comision.titulo}".`)
      await loadData()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cambiar el estado.')
    }
  }

  async function handleRequestJoin(comision: Comision) {
    if (!profile) return

    setRequestingId(comision.id_comision)
    setStatus('')
    try {
      await createSolicitudComision({
        id_comision: comision.id_comision,
        id_usuario: profile.idUsuario,
        mensaje: `Solicitud para unirse a la comisión "${comision.titulo}".`,
      })
      setStatus('Solicitud enviada. Un coordinador o administrador debe aprobarla.')
      await loadData()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible enviar la solicitud.')
    } finally {
      setRequestingId(null)
    }
  }

  async function handleRequestJoinFromForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const targetComision = comisiones.find((item) => item.id_comision === requestComisionId)
    if (!targetComision) {
      setStatus('Selecciona una comisión para enviar la solicitud.')
      return
    }

    await handleRequestJoin(targetComision)
  }

  async function handleApprove(solicitud: SolicitudComision) {
    if (!profile) return

    try {
      await aprobarSolicitudComision(solicitud, profile.idUsuario)
      setStatus('Solicitud aprobada. El usuario ya puede votar en esa comisión.')
      await loadData()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible aprobar la solicitud.')
    }
  }

  async function handleReject(solicitud: SolicitudComision) {
    if (!profile) return

    try {
      await rechazarSolicitudComision(solicitud.id_solicitud, profile.idUsuario)
      setStatus('Solicitud rechazada.')
      await loadData()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible rechazar la solicitud.')
    }
  }

  return (
    <AppShell
      title="Comisiones"
      subtitle="Administra el registro, periodo, estado y solicitudes de participación de cada comisión."
    >
      <div className="stats-grid">
        <article className="stat-card accent-gold">
          <span>Pendientes</span>
          <strong>{loading ? '...' : metrics.pendientes}</strong>
        </article>
        <article className="stat-card accent-blue">
          <span>En proceso</span>
          <strong>{loading ? '...' : metrics.proceso}</strong>
        </article>
        <article className="stat-card accent-violet">
          <span>Finalizadas</span>
          <strong>{loading ? '...' : metrics.finalizadas}</strong>
        </article>
        <article className="stat-card">
          <span>Solicitudes</span>
          <strong>{loading ? '...' : pendingSolicitudes.length}</strong>
        </article>
      </div>

      {!canEdit ? (
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Participación</span>
              <h3>Solicitar unirse a una comisión</h3>
            </div>
          </div>

          <form className="stack-form compact-form" onSubmit={handleRequestJoinFromForm}>
            <label>
              <span>Comisión</span>
              <select
                value={requestComisionId ?? ''}
                onChange={(event) => setRequestComisionId(event.target.value ? Number(event.target.value) : null)}
              >
                {comisiones.map((comision) => {
                  const solicitud = solicitudesByComision.get(comision.id_comision)
                  return (
                    <option key={comision.id_comision} value={comision.id_comision}>
                      {comision.titulo}
                      {solicitud ? ` - solicitud ${solicitud.estado}` : ''}
                    </option>
                  )
                })}
              </select>
            </label>
            <button
              type="submit"
              className="primary-button"
              disabled={
                !requestComisionId ||
                requestingId === requestComisionId ||
                solicitudesByComision.get(requestComisionId)?.estado === 'pendiente'
              }
            >
              {solicitudesByComision.get(requestComisionId ?? 0)?.estado === 'pendiente'
                ? 'Solicitud enviada'
                : requestingId === requestComisionId
                  ? 'Enviando...'
                  : 'Solicitar unirme'}
            </button>
          </form>
          <p className="helper-note">
            Cuando la solicitud sea aprobada, quedarás como miembro votante de esa comisión.
          </p>
        </section>
      ) : null}

      <div className="panel-grid commissions-layout">
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Formulario</span>
              <h3>{editing ? 'Editar comisión' : 'Nueva comisión'}</h3>
            </div>
            {editing ? (
              <button type="button" className="ghost-button" onClick={resetForm}>
                Cancelar edición
              </button>
            ) : null}
          </div>

          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              <span>Título</span>
              <input
                value={form.titulo}
                onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
                placeholder="Ej. Comisión de feria tecnológica"
                required
              />
            </label>

            <label>
              <span>Descripción</span>
              <textarea
                value={form.descripcion}
                onChange={(event) => setForm((current) => ({ ...current, descripcion: event.target.value }))}
                rows={4}
                placeholder="Describe el objetivo, alcance y contexto."
              />
            </label>

            <div className="two-col">
              <label>
                <span>Fecha inicio</span>
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(event) => setForm((current) => ({ ...current, fecha_inicio: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Fecha fin</span>
                <input
                  type="date"
                  value={form.fecha_fin}
                  onChange={(event) => setForm((current) => ({ ...current, fecha_fin: event.target.value }))}
                />
              </label>
            </div>

            <button type="submit" className="primary-button" disabled={saving || !canEdit}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear comisión'}
            </button>
          </form>

          {canEdit ? null : (
            <p className="helper-note">Puedes consultar comisiones y solicitar unirte para participar.</p>
          )}
          {status ? <div className="form-status">{status}</div> : null}
        </section>

        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Listado</span>
              <h3>Comisiones registradas</h3>
            </div>
            <button type="button" className="ghost-button" onClick={() => void loadData()}>
              Actualizar
            </button>
          </div>

          <div className="commission-list">
            {loading ? <div className="empty-state">Cargando comisiones...</div> : null}

            {!loading && comisiones.length === 0 ? (
              <div className="empty-state">Todavía no hay comisiones registradas.</div>
            ) : null}

            {comisiones.map((comision) => {
              const solicitud = solicitudesByComision.get(comision.id_comision)

              return (
                <article className="commission-card" key={comision.id_comision}>
                  <div className="commission-card-top">
                    <div>
                      <span className="status-badge">{comision.estado_nombre}</span>
                      <h4>{comision.titulo}</h4>
                    </div>
                    {canEdit ? (
                      <button
                        type="button"
                        className="ghost-button small"
                        onClick={() => startEdit(comision)}
                        disabled={!canEdit}
                      >
                        Editar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ghost-button small"
                        onClick={() => void handleRequestJoin(comision)}
                        disabled={requestingId === comision.id_comision || solicitud?.estado === 'pendiente'}
                      >
                        {solicitud?.estado === 'pendiente'
                          ? 'Solicitud enviada'
                          : requestingId === comision.id_comision
                            ? 'Enviando...'
                            : 'Solicitar unirme'}
                      </button>
                    )}
                  </div>

                  <p>{comision.descripcion || 'Sin descripción registrada.'}</p>

                  <div className="commission-meta">
                    <span>Inicio: {shortDate(comision.fecha_inicio)}</span>
                    <span>Cierre: {shortDate(comision.fecha_fin)}</span>
                    {solicitud ? <span>Solicitud: {solicitud.estado}</span> : null}
                  </div>

                  {canEdit ? (
                    <div className="state-actions">
                      {estados.map((estado) => (
                        <button
                          key={estado.id_estado}
                          type="button"
                          className={`state-pill${comision.id_estado === estado.id_estado ? ' active' : ''}`}
                          onClick={() => void handleChangeEstado(comision, estado.id_estado)}
                        >
                          {estado.nombre}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>
      </div>

      {canEdit ? (
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Solicitudes</span>
              <h3>Solicitudes pendientes para unirse</h3>
            </div>
          </div>

          <div className="member-list">
            {pendingSolicitudes.length === 0 ? (
              <div className="empty-state">No hay solicitudes pendientes.</div>
            ) : null}
            {pendingSolicitudes.map((solicitud) => (
              <article className="member-row" key={solicitud.id_solicitud}>
                <div>
                  <strong>{solicitud.usuario?.nombre ?? `Usuario #${solicitud.id_usuario}`}</strong>
                  <span>
                    {comisiones.find((comision) => comision.id_comision === solicitud.id_comision)?.titulo ??
                      `Comisión #${solicitud.id_comision}`}{' '}
                    ·{' '}
                    {shortDate(solicitud.fecha_solicitud)}
                  </span>
                </div>
                <div className="row-actions">
                  <button type="button" className="primary-button" onClick={() => void handleApprove(solicitud)}>
                    Aprobar
                  </button>
                  <button type="button" className="ghost-button" onClick={() => void handleReject(solicitud)}>
                    Rechazar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  )
}
