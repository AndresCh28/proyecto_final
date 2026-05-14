import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ComisionesPage } from './pages/ComisionesPage'
import { ConfiguracionPage } from './pages/ConfiguracionPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NotificacionesPage } from './pages/NotificacionesPage'
import { PresupuestosPage } from './pages/PresupuestosPage'
import { PropuestasPage } from './pages/PropuestasPage'
import { RegisterPage } from './pages/RegisterPage'
import { ReportesPage } from './pages/ReportesPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { VotacionPage } from './pages/VotacionPage'
import { VotacionesPage } from './pages/VotacionesPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/comisiones" element={<ComisionesPage />} />
            <Route path="/presupuestos" element={<PresupuestosPage />} />
            <Route path="/propuestas" element={<PropuestasPage />} />
            <Route path="/votaciones" element={<VotacionesPage />} />
            <Route path="/votacion/:propuestaId" element={<VotacionPage />} />
            <Route path="/notificaciones" element={<NotificacionesPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/configuracion" element={<ConfiguracionPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
