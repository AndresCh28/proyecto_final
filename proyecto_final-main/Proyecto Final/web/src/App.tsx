import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import type { ComponentType } from 'react'

import { AuthProvider } from './auth/AuthContext'
import { LanguageProvider } from './i18n/LanguageContext'
import { UiTranslator } from './i18n/UiTranslator'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { WorkspaceProvider } from './workspace/WorkspaceContext'
import { MfaGate } from './components/MfaGate'

const page = <T,>(loader: () => Promise<T>, name: keyof T) => lazy(async () => ({ default: (await loader())[name] as ComponentType }))
const LoginPage = page(() => import('./pages/LoginPage'), 'LoginPage')
const RegisterPage = page(() => import('./pages/RegisterPage'), 'RegisterPage')
const RecuperarContrasenaPage = page(() => import('./pages/RecuperarContrasenaPage'), 'RecuperarContrasenaPage')
const ActualizarContrasenaPage = page(() => import('./pages/ActualizarContrasenaPage'), 'ActualizarContrasenaPage')
const DashboardPage = page(() => import('./pages/DashboardPage'), 'DashboardPage')
const SeleccionarEspacioPage = page(() => import('./pages/SeleccionarEspacioPage'), 'SeleccionarEspacioPage')
const SolicitudesEspacioPage = page(() => import('./pages/SolicitudesEspacioPage'), 'SolicitudesEspacioPage')
const PresupuestosPage = page(() => import('./pages/PresupuestosPage'), 'PresupuestosPage')
const PropuestasPage = page(() => import('./pages/PropuestasPage'), 'PropuestasPage')
const VotacionesPage = page(() => import('./pages/VotacionesPage'), 'VotacionesPage')
const VotacionPage = page(() => import('./pages/VotacionPage'), 'VotacionPage')
const NotificacionesPage = page(() => import('./pages/NotificacionesPage'), 'NotificacionesPage')
const ReportesPage = page(() => import('./pages/ReportesPage'), 'ReportesPage')
const BitacoraPage = page(() => import('./pages/BitacoraPage'), 'BitacoraPage')
const ChatComisionesPage = page(() => import('./pages/ChatComisionesPage'), 'ChatComisionesPage')
const ReunionesPage = page(() => import('./pages/ReunionesPage'), 'ReunionesPage')
const DocumentosPage = page(() => import('./pages/DocumentosPage'), 'DocumentosPage')
const UsuariosPage = page(() => import('./pages/UsuariosPage'), 'UsuariosPage')
const ConfiguracionPage = page(() => import('./pages/ConfiguracionPage'), 'ConfiguracionPage')

function App() {
  return (
    <AppErrorBoundary>
    <BrowserRouter>
      <LanguageProvider>
      <UiTranslator />
      <AuthProvider>
      <WorkspaceProvider>
        <Suspense fallback={<div className="fullscreen-state">Cargando módulo…</div>}><Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/recuperar-contrasena" element={<RecuperarContrasenaPage />} />
          <Route path="/actualizar-contrasena" element={<ActualizarContrasenaPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MfaGate />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/seleccionar-espacio" element={<SeleccionarEspacioPage />} />
            <Route path="/solicitudes-espacio" element={<SolicitudesEspacioPage />} />
            <Route path="/presupuestos" element={<PresupuestosPage />} />
            <Route path="/propuestas" element={<PropuestasPage />} />
            <Route path="/votaciones" element={<VotacionesPage />} />
            <Route path="/votacion/:propuestaId" element={<VotacionPage />} />
            <Route path="/notificaciones" element={<NotificacionesPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/bitacora" element={<BitacoraPage />} />
            <Route path="/chat-comisiones" element={<ChatComisionesPage />} />
            <Route path="/reuniones" element={<ReunionesPage />} />
            <Route path="/documentos" element={<DocumentosPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/configuracion" element={<ConfiguracionPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes></Suspense>
      </WorkspaceProvider>
      </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
    </AppErrorBoundary>
  )
}

export default App
