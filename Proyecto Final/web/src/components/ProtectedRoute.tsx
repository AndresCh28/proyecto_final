import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'

export function ProtectedRoute() {
  const { loading, session, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="fullscreen-state">Cargando tu sesión...</div>
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
