import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { Pagination } from '../components/Pagination'
import { isAdmin } from '../lib/permissions'
import { fetchRoles, fetchUsuarios, resetUsuarioMfa, updateUsuarioActivo, updateUsuarioRole, type RoleRow } from '../lib/usuarios'
import type { Usuario } from '../types'

export function UsuariosPage() {
  const { profile } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('buscar') ?? '')
  const [roleFilter, setRoleFilter] = useState('todos')
  const [activeFilter, setActiveFilter] = useState('todos')
  const [page, setPage] = useState(1)
  const [resettingMfa, setResettingMfa] = useState<number | null>(null)
  const pageSize = 8

  const canManage = isAdmin(profile)
  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase()
    return usuarios.filter((usuario) => {
      const matchesSearch = !normalized || `${usuario.nombre} ${usuario.correo}`.toLocaleLowerCase().includes(normalized)
      const matchesRole = roleFilter === 'todos' || usuario.rol_nombre === roleFilter
      const matchesActive = activeFilter === 'todos' || usuario.activo === (activeFilter === 'activo')
      return matchesSearch && matchesRole && matchesActive
    })
  }, [activeFilter, roleFilter, search, usuarios])
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setStatus('')
    try {
      const [nextUsuarios, nextRoles] = await Promise.all([fetchUsuarios(), fetchRoles()])
      setUsuarios(nextUsuarios)
      setRoles(nextRoles)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible cargar usuarios.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(idUsuario: number, idRol: number) {
    if (!canManage) {
      setStatus('Solo el rol Administrador puede cambiar roles.')
      return
    }

    try {
      await updateUsuarioRole(idUsuario, idRol)
      setStatus('Rol actualizado correctamente.')
      await loadData()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible actualizar el rol.')
    }
  }

  async function handleActiveChange(idUsuario: number, activo: boolean) {
    if (!canManage) {
      setStatus('Solo el rol Administrador puede cambiar el estado de usuarios.')
      return
    }

    try {
      await updateUsuarioActivo(idUsuario, activo)
      setStatus('Estado del usuario actualizado.')
      await loadData()
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible actualizar el usuario.')
    }
  }

  async function handleMfaReset(usuario: Usuario) {
    if (!canManage) return
    if (!window.confirm(`¿Restablecer el OTP de ${usuario.nombre}? Se cerrarán sus sesiones y deberá vincular un autenticador al volver a ingresar.`)) return
    setResettingMfa(usuario.id_usuario); setStatus('')
    try {
      const result = await resetUsuarioMfa(usuario.id_usuario)
      setStatus(`OTP restablecido. Se eliminaron ${result.removedFactors} factores de autenticación.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible restablecer el OTP.')
    } finally { setResettingMfa(null) }
  }

  return (
    <AppShell
      title="Usuarios y roles"
      subtitle="Administra cuentas internas, roles operativos y estado de acceso al sistema."
    >
      <div className="stats-grid">
        <article className="stat-card accent-blue">
          <span>Usuarios</span>
          <strong>{loading ? '...' : usuarios.length}</strong>
        </article>
        <article className="stat-card accent-gold">
          <span>Activos</span>
          <strong>{loading ? '...' : usuarios.filter((usuario) => usuario.activo).length}</strong>
        </article>
        <article className="stat-card accent-violet">
          <span>Administradores</span>
          <strong>{loading ? '...' : usuarios.filter((usuario) => usuario.rol_nombre === 'Administrador').length}</strong>
        </article>
      </div>

      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Control de acceso</span>
            <h3>Cuentas registradas</h3>
          </div>
          <button type="button" className="ghost-button" onClick={() => void loadData()}>
            Actualizar
          </button>
        </div>

        {!canManage ? (
          <p className="helper-note">Puedes consultar usuarios, pero solo Administrador puede cambiar roles o estado.</p>
        ) : null}
        {status ? <div className="form-status">{status}</div> : null}

        <div className="filter-bar">
          <label>
            <span>Buscar</span>
            <input value={search} placeholder="Nombre o correo" onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
          </label>
          <label>
            <span>Rol</span>
            <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1) }}>
              <option value="todos">Todos los roles</option>
              {roles.map((role) => <option key={role.id_rol} value={role.nombre}>{role.nombre}</option>)}
            </select>
          </label>
          <label>
            <span>Estado</span>
            <select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1) }}>
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </label>
          <button type="button" className="ghost-button" onClick={() => { setSearch(''); setRoleFilter('todos'); setActiveFilter('todos'); setPage(1) }}>Limpiar</button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Seguridad</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>Cargando usuarios...</td>
                </tr>
              ) : null}
              {!loading && filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5}>No hay usuarios registrados.</td>
                </tr>
              ) : null}
              {paginatedUsers.map((usuario) => (
                <tr key={usuario.id_usuario}>
                  <td>
                    <strong>{usuario.nombre}</strong>
                    <span>#{usuario.id_usuario}</span>
                  </td>
                  <td>{usuario.correo}</td>
                  <td>
                    <select
                      value={usuario.id_rol}
                      disabled={!canManage}
                      onChange={(event) => void handleRoleChange(usuario.id_usuario, Number(event.target.value))}
                    >
                      {roles.map((role) => (
                        <option key={role.id_rol} value={role.id_rol}>
                          {role.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={usuario.activo ? 'activo' : 'inactivo'}
                      disabled={!canManage}
                      onChange={(event) =>
                        void handleActiveChange(usuario.id_usuario, event.target.value === 'activo')
                      }
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </td>
                  <td><button type="button" className="ghost-button" disabled={!canManage || resettingMfa !== null} onClick={() => void handleMfaReset(usuario)}>{resettingMfa === usuario.id_usuario ? 'Restableciendo…' : 'Restablecer OTP'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={filteredUsers.length} onPageChange={setPage} />
      </section>
    </AppShell>
  )
}
