import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { AppShell } from '../components/AppShell'
import { useAuth } from '../auth/AuthContext'
import { useWorkspace } from '../workspace/WorkspaceContext'
import { crearReunion, eliminarReunion, fetchReuniones, type Reunion } from '../lib/reuniones'

function formatMeetingDate(value: string) {
  return new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function ReunionesPage() {
  const { profile } = useAuth()
  const { workspace } = useWorkspace()
  const [meetings, setMeetings] = useState<Reunion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({ titulo: '', descripcion: '', fecha_inicio: '', enlace_meet: '' })
  const canManage = profile?.rol === 'Administrador' || profile?.rol === 'Coordinador'

  async function load() {
    if (!workspace) return
    setLoading(true)
    try { setMeetings(await fetchReuniones(workspace.id_espacio)); setStatus('') }
    catch (error) { setStatus(error instanceof Error ? error.message : 'No fue posible cargar las reuniones.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [workspace?.id_espacio])
  const upcoming = useMemo(() => meetings.filter((meeting) => new Date(meeting.fecha_inicio).getTime() >= Date.now() - 3_600_000), [meetings])
  const past = useMemo(() => meetings.filter((meeting) => !upcoming.includes(meeting)).reverse(), [meetings, upcoming])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!workspace || !profile) return
    setSaving(true); setStatus('')
    try {
      await crearReunion({ id_espacio: workspace.id_espacio, creado_por: profile.idUsuario, titulo: form.titulo.trim(), descripcion: form.descripcion.trim() || null, fecha_inicio: new Date(form.fecha_inicio).toISOString(), enlace_meet: form.enlace_meet.trim() })
      setForm({ titulo: '', descripcion: '', fecha_inicio: '', enlace_meet: '' }); setShowForm(false); await load()
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No fue posible programar la reunión.') }
    finally { setSaving(false) }
  }

  async function remove(id: number) {
    if (!window.confirm('¿Eliminar esta reunión del espacio?')) return
    try { await eliminarReunion(id); await load() }
    catch (error) { setStatus(error instanceof Error ? error.message : 'No fue posible eliminar la reunión.') }
  }

  const card = (meeting: Reunion, ended = false) => <article className={`meeting-card${ended ? ' ended' : ''}`} key={meeting.id_reunion}>
    <div className="meeting-date"><span>{new Date(meeting.fecha_inicio).toLocaleDateString('es-CR', { day: '2-digit' })}</span><small>{new Date(meeting.fecha_inicio).toLocaleDateString('es-CR', { month: 'short' })}</small></div>
    <div className="meeting-info"><span className="eyebrow">Google Meet · {formatMeetingDate(meeting.fecha_inicio)}</span><h3>{meeting.titulo}</h3>{meeting.descripcion ? <p>{meeting.descripcion}</p> : null}<small>Programada por {meeting.creador?.nombre ?? 'SIGECOM'}</small></div>
    <div className="meeting-actions">{!ended ? <a className="primary-button" href={meeting.enlace_meet} target="_blank" rel="noreferrer">Entrar a Meet</a> : <span className="meeting-ended">Finalizada</span>}{canManage ? <button className="ghost-button danger" type="button" onClick={() => void remove(meeting.id_reunion)}>Eliminar</button> : null}</div>
  </article>

  return <AppShell title="Reuniones" subtitle={`Organiza videollamadas de Google Meet para ${workspace?.nombre ?? 'este espacio'}.`}>
    <section className="meeting-hero glass-card"><div><span className="eyebrow">Videollamadas del espacio</span><h2>Reuniones sin salir de la organización</h2><p>Crea el enlace en Google Meet, prográmalo aquí y todos los miembros podrán encontrarlo.</p></div>{canManage ? <div className="meeting-hero-actions"><a className="ghost-button" href="https://meet.google.com/new" target="_blank" rel="noreferrer">Crear enlace en Meet ↗</a><button className="primary-button" onClick={() => setShowForm((value) => !value)}>{showForm ? 'Cancelar' : '+ Programar reunión'}</button></div> : null}</section>
    {showForm ? <form className="meeting-form glass-card" onSubmit={(event) => void submit(event)}><label><span>Título</span><input required minLength={3} maxLength={140} value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} placeholder="Ej. Revisión de presupuesto" /></label><label><span>Fecha y hora</span><input required type="datetime-local" value={form.fecha_inicio} onChange={(event) => setForm({ ...form, fecha_inicio: event.target.value })} /></label><label className="wide"><span>Enlace de Google Meet</span><input required type="url" pattern="https://meet\.google\.com/.*" value={form.enlace_meet} onChange={(event) => setForm({ ...form, enlace_meet: event.target.value })} placeholder="https://meet.google.com/xxx-xxxx-xxx" /></label><label className="wide"><span>Descripción opcional</span><textarea maxLength={1000} rows={3} value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} /></label><button className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Publicar reunión'}</button></form> : null}
    {status ? <div className="form-status">{status}</div> : null}
    <section className="glass-card"><div className="section-head"><div><span className="eyebrow">Próximas</span><h3>Agenda del espacio</h3></div><button className="ghost-button" onClick={() => void load()}>Actualizar</button></div>{loading ? <div className="empty-state">Cargando reuniones…</div> : upcoming.length ? <div className="meeting-list">{upcoming.map((item) => card(item))}</div> : <div className="empty-state">No hay reuniones próximas.</div>}</section>
    {past.length ? <section className="glass-card"><div className="section-head"><div><span className="eyebrow">Historial</span><h3>Reuniones anteriores</h3></div></div><div className="meeting-list">{past.map((item) => card(item, true))}</div></section> : null}
  </AppShell>
}
