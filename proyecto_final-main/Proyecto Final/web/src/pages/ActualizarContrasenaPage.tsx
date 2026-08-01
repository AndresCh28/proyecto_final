import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { updatePassword } from '../lib/auth'

export function ActualizarContrasenaPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setStatus('')
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (password !== confirmation) return setError('Las contraseñas no coinciden.')
    setSaving(true)
    try {
      await updatePassword(password)
      setStatus('Contraseña actualizada correctamente. Ya puedes iniciar sesión.')
      setPassword(''); setConfirmation('')
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'El enlace es inválido o venció.')
    } finally { setSaving(false) }
  }

  return (
    <div className="auth-layout">
      <section className="auth-hero">
        <span className="brand-kicker">SIGECOM</span><h1>Protege tu cuenta con una nueva contraseña.</h1>
        <p>El enlace de recuperación inicia una sesión temporal y segura para realizar el cambio.</p>
        <div className="hero-orb hero-orb-large" /><div className="hero-orb hero-orb-small" />
      </section>
      <section className="auth-card">
        <span className="eyebrow">Seguridad</span><h2>Nueva contraseña</h2>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label><span>Contraseña nueva</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /></label>
          <label><span>Confirmar contraseña</span><input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required /></label>
          {error ? <div className="form-error">{error}</div> : null}{status ? <div className="form-status">{status}</div> : null}
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Actualizando…' : 'Actualizar contraseña'}</button>
        </form>
        <p className="auth-switch"><Link to="/login">Ir a iniciar sesión</Link></p>
      </section>
    </div>
  )
}
