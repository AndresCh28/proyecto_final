import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { useWorkspace } from '../workspace/WorkspaceContext'

export function ProtectedRoute() {
  const { loading, session, profile } = useAuth()
  const location = useLocation()
  const { workspace, loading: workspaceLoading } = useWorkspace()

  if (loading || workspaceLoading) {
    return <div className="fullscreen-state">Cargando tu sesión...</div>
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!workspace && location.pathname !== '/seleccionar-espacio') return <Navigate to="/seleccionar-espacio" replace />

  return <Outlet />
}
