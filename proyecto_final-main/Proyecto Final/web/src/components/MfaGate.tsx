import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import sigecomLogo from '../assets/isotipo-sigecom.png'
import { useAuth } from '../auth/AuthContext'
import { recordSecureLogin } from '../lib/security'

type GateMode = 'loading' | 'enroll' | 'challenge' | 'ready'

export function MfaGate() {
  const { profile } = useAuth()
  const initializationStarted = useRef(false)
  const [mode, setMode] = useState<GateMode>('loading')
  const [factorId, setFactorId] = useState(''); const [challengeId, setChallengeId] = useState('')
  const [qrCode, setQrCode] = useState(''); const [secret, setSecret] = useState(''); const [code, setCode] = useState('')
  const [status, setStatus] = useState(''); const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (initializationStarted.current) return
    initializationStarted.current = true
    void initialize()
  }, [])
  async function initialize() {
    setMode('loading'); setStatus('')
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assurance.error) { setStatus(assurance.error.message); return }
    if (assurance.data.currentLevel === 'aal2') { setMode('ready'); return }
    const factors = await supabase.auth.mfa.listFactors()
    if (factors.error) { setStatus(factors.error.message); return }
    const verified = factors.data.totp.find((item) => item.status === 'verified')
    if (verified) {
      setFactorId(verified.id)
      const challenge = await supabase.auth.mfa.challenge({ factorId: verified.id })
      if (challenge.error) { setStatus(challenge.error.message); return }
      setChallengeId(challenge.data.id); setMode('challenge'); return
    }
    const pending = factors.data.totp.filter((item) => item.status !== 'verified')
    const removals = await Promise.all(pending.map((item) => supabase.auth.mfa.unenroll({ factorId: item.id })))
    const removalError = removals.find((result) => result.error)?.error
    if (removalError) { setStatus(removalError.message); return }
    const enrollment = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'SIGECOM' })
    if (enrollment.error) { setStatus(enrollment.error.message); return }
    setFactorId(enrollment.data.id); setQrCode(enrollment.data.totp.qr_code); setSecret(enrollment.data.totp.secret); setMode('enroll')
  }

  async function verify(event: FormEvent) {
    event.preventDefault(); if (!/^\d{6}$/.test(code)) { setStatus('Ingresa el código de 6 dígitos.'); return }
    setVerifying(true); setStatus('')
    try {
      let currentChallenge = challengeId
      if (!currentChallenge) {
        const challenge = await supabase.auth.mfa.challenge({ factorId }); if (challenge.error) throw challenge.error
        currentChallenge = challenge.data.id
      }
      const result = await supabase.auth.mfa.verify({ factorId, challengeId: currentChallenge, code })
      if (result.error) throw result.error
      setCode(''); setMode('ready')
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Código incorrecto o vencido.') }
    finally { setVerifying(false) }
  }

  async function cancel() { await supabase.auth.signOut(); window.location.assign('/login') }
  useEffect(() => { if (mode === 'ready' && profile) void recordSecureLogin(profile.idUsuario, profile.correo).catch(() => undefined) }, [mode, profile])
  if (mode === 'ready') return <Outlet />
  if (mode === 'loading' && !status) return <div className="mfa-page"><div className="mfa-card"><span className="mfa-spinner"/><p>Preparando verificación segura…</p></div></div>
  if (mode === 'loading' && status) return <div className="mfa-page"><section className="mfa-card"><img className="mfa-logo" src={sigecomLogo} alt="SIGECOM"/><span className="eyebrow">Verificación en dos pasos</span><h1>No fue posible iniciar la verificación</h1><div className="form-status">{status}</div><button type="button" className="ghost-button" onClick={() => void cancel()}>Volver al inicio de sesión</button></section></div>
  return <div className="mfa-page"><section className="mfa-card"><img className="mfa-logo" src={sigecomLogo} alt="SIGECOM"/><span className="eyebrow">Verificación en dos pasos</span><h1>{mode === 'enroll' ? 'Protege tu cuenta' : 'Confirma que eres tú'}</h1><p>{mode === 'enroll' ? 'Escanea este QR con una aplicación autenticadora. Este paso se realiza una sola vez.' : 'Escribe el código temporal de tu aplicación autenticadora.'}</p>{mode === 'enroll' ? <div className="mfa-enrollment"><img src={qrCode} alt="Código QR para configurar el autenticador"/><details><summary>No puedo escanear el QR</summary><code>{secret}</code></details></div> : null}<form onSubmit={(event) => void verify(event)}><label><span>Código de 6 dígitos</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000"/></label>{status ? <div className="form-status">{status}</div> : null}<button className="primary-button" disabled={verifying || code.length !== 6}>{verifying ? 'Verificando…' : mode === 'enroll' ? 'Vincular y continuar' : 'Verificar y entrar'}</button><button type="button" className="ghost-button" onClick={() => void cancel()}>Volver al inicio de sesión</button></form></section></div>
}
