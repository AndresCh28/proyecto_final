import { useEffect, useState } from 'react'

import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { isAdmin } from '../lib/permissions'
import { fetchRoles, fetchUsuarios, updateUsuarioActivo, updateUsuarioRole, type RoleRow } from '../lib/usuarios'
import type { Usuario } from '../types'

export function UsuariosPage() {
  const { profile } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')

  const canManage = isAdmin(profile)

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

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>Cargando usuarios...</td>
                </tr>
              ) : null}
              {!loading && usuarios.length === 0 ? (
                <tr>
                  <td colSpan={4}>No hay usuarios registrados.</td>
                </tr>
              ) : null}
              {usuarios.map((usuario) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  )
}
