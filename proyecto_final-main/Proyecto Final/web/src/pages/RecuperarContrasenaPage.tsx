import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { requestPasswordReset } from '../lib/auth'

export function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSending(true); setError(''); setStatus('')
    try {
      await requestPasswordReset(email)
      setStatus('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible enviar el enlace.')
    } finally { setSending(false) }
  }

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <span className="brand-kicker">SIGECOM</span><h1>Recupera el acceso de forma segura.</h1>
        <p>Te enviaremos un enlace temporal al correo asociado con tu cuenta.</p>
        <div className="hero-orb hero-orb-large" /><div className="hero-orb hero-orb-small" />
      </section>
      <section className="auth-card">
        <span className="eyebrow">Seguridad</span><h2>Recuperar contraseña</h2>
        <p>Ingresa tu correo institucional para continuar.</p>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label><span>Correo</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          {error ? <div className="form-error">{error}</div> : null}{status ? <div className="form-status">{status}</div> : null}
          <button type="submit" className="primary-button" disabled={sending}>{sending ? 'Enviando…' : 'Enviar enlace seguro'}</button>
        </form>
        <p className="auth-switch"><Link to="/login">Volver a iniciar sesión</Link></p>
      </section>
    </div>
  )
}
