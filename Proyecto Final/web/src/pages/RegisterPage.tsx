import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import type { RoleName } from '../types'

const roleOptions: Array<{
  value: RoleName
  title: string
  description: string
}> = [
  {
    value: 'Coordinador',
    title: 'Coordinador',
    description: 'Gestiona comisiones, presupuestos, propuestas y reportes.',
  },
  {
    value: 'Miembro',
    title: 'Miembro',
    description: 'Consulta información, participa en comisiones y puede votar.',
  },
]

export function RegisterPage() {
  const { signUp, session, profile } = useAuth()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<RoleName>('Miembro')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (session && profile) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setStatus('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      const result = await signUp({
        nombre,
        telefono,
        email,
        password,
        rol,
      })

      if (result.needsEmailConfirmation) {
        setStatus('Cuenta creada. Revisa tu correo para confirmar el acceso y luego inicia sesión.')
        return
      }

      navigate('/dashboard', { replace: true })
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'No fue posible crear la cuenta.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <span className="brand-kicker">SIGECOM WEB</span>
        <h1>Crea tu acceso al panel de gestión.</h1>
        <p>
          Elige el rol con el que trabajarás en SIGECOM. El rol Administrador queda reservado para asignación interna
          del proyecto.
        </p>
      </section>

      <section className="auth-card">
        <span className="eyebrow">Nueva cuenta</span>
        <h2>Registro</h2>
        <p>Completa tus datos para crear una cuenta conectada a Supabase Auth.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Nombre completo</span>
            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ej. Ana Rodríguez"
              autoComplete="name"
              required
            />
          </label>

          <label>
            <span>Teléfono</span>
            <input
              value={telefono}
              onChange={(event) => setTelefono(event.target.value)}
              placeholder="Ej. 8888-8888"
              autoComplete="tel"
            />
          </label>

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
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
            />
          </label>

          <fieldset className="role-picker">
            <legend>Rol solicitado</legend>
            {roleOptions.map((option) => (
              <label className="role-option" key={option.value}>
                <input
                  type="radio"
                  name="rol"
                  value={option.value}
                  checked={rol === option.value}
                  onChange={() => setRol(option.value)}
                />
                <span>
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </fieldset>

          {error ? <div className="form-error">{error}</div> : null}
          {status ? <div className="form-status">{status}</div> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-switch">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </section>
    </div>
  )
}
