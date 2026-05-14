import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { signIn, session, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (session && profile) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await signIn(email, password)
      const nextPath = (location.state as { from?: string } | null)?.from ?? '/dashboard'
      navigate(nextPath, { replace: true })
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'No fue posible iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <span className="brand-kicker">SIGECOM</span>
        <h1>Administración clara para comisiones institucionales.</h1>
        <p>
          Controla comisiones, presupuestos, propuestas, votaciones y reportes desde una interfaz web profesional
          conectada a Supabase.
        </p>
        <div className="hero-orb hero-orb-large" />
        <div className="hero-orb hero-orb-small" />
      </section>

      <section className="auth-card">
        <span className="eyebrow">Acceso seguro</span>
        <h2>Iniciar sesión</h2>
        <p>Usa tu cuenta registrada para entrar al panel administrativo de SIGECOM.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Correo</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu_correo@ejemplo.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Entrando...' : 'Entrar a SIGECOM'}
          </button>
        </form>

        <p className="auth-switch">
          ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
        </p>
      </section>
    </div>
  )
}
