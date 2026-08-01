import { useEffect, useMemo, useState } from 'react'

import { AppShell } from '../components/AppShell'
import { Pagination } from '../components/Pagination'
import { fetchAuditLog } from '../lib/bitacora'
import type { AuditEntry } from '../lib/bitacora'
import { shortDate } from '../lib/format'
import { useAuth } from '../auth/AuthContext'
import { useWorkspace } from '../workspace/WorkspaceContext'
import { fetchUsuarios } from '../lib/usuarios'
import { downloadBitacoraPdf } from '../lib/reportesPdf'

export function BitacoraPage() {
  const { profile } = useAuth()
  const { workspace } = useWorkspace()
  const [members, setMembers] = useState<string[]>([])
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('todos')
  const [actionFilter, setActionFilter] = useState('todas')
  const [page, setPage] = useState(1)
  const pageSize = 12

  const modules = useMemo(() => [...new Set(entries.map((entry) => entry.tabla_afectada))], [entries])
  const actions = useMemo(() => [...new Set(entries.map((entry) => entry.accion))], [entries])
  const filtered = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase()
    return entries.filter((entry) => {
      const matchesSearch = !normalized || `${entry.descripcion ?? ''} ${entry.id_registro}`.toLocaleLowerCase().includes(normalized)
      return matchesSearch && (moduleFilter === 'todos' || entry.tabla_afectada === moduleFilter) && (actionFilter === 'todas' || entry.accion === actionFilter)
    })
  }, [actionFilter, entries, moduleFilter, search])
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true); setStatus('')
    try { const [nextEntries, users] = await Promise.all([fetchAuditLog(), fetchUsuarios()]); setEntries(nextEntries); setMembers(users.map((item) => item.nombre)) }
    catch (error) { setStatus(error instanceof Error ? error.message : 'No fue posible cargar la bitácora.') }
    finally { setLoading(false) }
  }

  return (
    <AppShell title="Bitácora administrativa" subtitle="Consulta las acciones registradas automáticamente en los módulos de SIGECOM.">
      <div className="stats-grid">
        <article className="stat-card accent-blue"><span>Eventos</span><strong>{loading ? '…' : entries.length}</strong></article>
        <article className="stat-card accent-gold"><span>Módulos</span><strong>{loading ? '…' : modules.length}</strong></article>
        <article className="stat-card accent-violet"><span>Resultados filtrados</span><strong>{loading ? '…' : filtered.length}</strong></article>
      </div>
      <section className="glass-card">
        <div className="section-head"><div><span className="eyebrow">Auditoría</span><h3>Historial de acciones</h3></div><div className="row-actions"><button type="button" className="ghost-button" disabled={!filtered.length} onClick={() => downloadBitacoraPdf(filtered, { workspace: workspace?.nombre ?? 'SIGECOM', members, generatedBy: profile?.nombre ?? 'Usuario' })}>Descargar PDF</button><button type="button" className="ghost-button" onClick={() => void load()}>Actualizar</button></div></div>
        <div className="filter-bar">
          <label><span>Buscar</span><input value={search} placeholder="Descripción o registro" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></label>
          <label><span>Módulo</span><select value={moduleFilter} onChange={(event) => { setModuleFilter(event.target.value); setPage(1) }}><option value="todos">Todos</option>{modules.map((module) => <option key={module}>{module}</option>)}</select></label>
          <label><span>Acción</span><select value={actionFilter} onChange={(event) => { setActionFilter(event.target.value); setPage(1) }}><option value="todas">Todas</option>{actions.map((action) => <option key={action}>{action}</option>)}</select></label>
          <button type="button" className="ghost-button" onClick={() => { setSearch(''); setModuleFilter('todos'); setActionFilter('todas'); setPage(1) }}>Limpiar</button>
        </div>
        {status ? <div className="form-status">{status}</div> : null}
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Fecha</th><th>Módulo</th><th>Acción</th><th>Registro</th><th>Responsable</th><th>Detalle</th></tr></thead><tbody>
          {loading ? <tr><td colSpan={6}>Cargando bitácora…</td></tr> : null}
          {!loading && filtered.length === 0 ? <tr><td colSpan={6}>No hay acciones que coincidan con los filtros.</td></tr> : null}
          {paginated.map((entry) => <tr key={entry.id_historial}><td>{shortDate(entry.fecha)}</td><td><strong>{entry.tabla_afectada}</strong></td><td><span className="status-badge">{entry.accion}</span></td><td>#{entry.id_registro}</td><td>{entry.responsable?.[0]?.nombre ?? (entry.realizado_por ? `Usuario #${entry.realizado_por}` : 'Sistema')}</td><td>{entry.descripcion ?? 'Sin detalle'}</td></tr>)}
        </tbody></table></div>
        <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
      </section>
    </AppShell>
  )
}
