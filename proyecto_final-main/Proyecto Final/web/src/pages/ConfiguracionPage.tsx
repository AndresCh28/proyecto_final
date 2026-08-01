import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'
import { useLanguage } from '../i18n/LanguageContext'
import type { LanguageMode } from '../i18n/LanguageContext'
import { updateOwnAvatar } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { fetchSecurityActivity, recordSecurityEvent } from '../lib/security'

type ThemeMode = 'light' | 'dark'

function readPreference<T extends string>(key: string, fallback: T): T {
  return (localStorage.getItem(key) as T | null) ?? fallback
}

export function ConfiguracionPage() {
  const { profile, updateProfile } = useAuth()
  const { language, setLanguage } = useLanguage()
  const [theme, setTheme] = useState<ThemeMode>(() => readPreference('sigecom-theme', 'light'))
  const [avatar, setAvatar] = useState<string>(() => readPreference(`sigecom-avatar-${profile?.idUsuario ?? 'guest'}`, profile?.avatarUrl ?? ''))
  const [profileForm, setProfileForm] = useState({
    nombre: profile?.nombre ?? '',
    telefono: profile?.telefono ?? '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [status, setStatus] = useState('')
  const [browserNotifications, setBrowserNotifications] = useState(() => localStorage.getItem(`sigecom-browser-notifications-${profile?.idUsuario ?? 'guest'}`) === 'true')
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaLevel, setMfaLevel] = useState('aal1')
  const [mfaQr, setMfaQr] = useState('')
  const [mfaSecret, setMfaSecret] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)
  const [securityStatus, setSecurityStatus] = useState('')
  const [securityActivity, setSecurityActivity] = useState<{ events: Array<Record<string, unknown>>; sessions: Array<Record<string, unknown>> }>({ events: [], sessions: [] })
  const t = (spanish: string, english: string) => (language === 'es' ? spanish : english)

  useEffect(() => {
    setProfileForm({
      nombre: profile?.nombre ?? '',
      telefono: profile?.telefono ?? '',
    })
    setAvatar(readPreference(`sigecom-avatar-${profile?.idUsuario ?? 'guest'}`, profile?.avatarUrl ?? ''))
  }, [profile])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('sigecom-theme', theme)
    window.dispatchEvent(new Event('sigecom-settings-change'))
  }, [theme])

  useEffect(() => { void loadSecurityStatus(); if (profile) void fetchSecurityActivity(profile.idUsuario).then(setSecurityActivity).catch(() => undefined) }, [profile?.idUsuario])

  async function loadSecurityStatus() {
    const [assurance, factors] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ])
    if (assurance.error || factors.error) {
      setSecurityStatus(assurance.error?.message ?? factors.error?.message ?? 'No fue posible consultar la seguridad de la cuenta.')
      return
    }
    setMfaLevel(assurance.data.currentLevel ?? 'aal1')
    setMfaFactorId(factors.data.totp.find((factor) => factor.status === 'verified')?.id ?? '')
  }

  async function replaceAuthenticator() {
    if (!window.confirm('Se desvinculará el autenticador actual. Mantén esta página abierta hasta verificar el nuevo código.')) return
    setMfaBusy(true); setSecurityStatus('')
    try {
      if (mfaFactorId) {
        const removal = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId })
        if (removal.error) throw removal.error
        const refreshed = await supabase.auth.refreshSession()
        if (refreshed.error) throw refreshed.error
      }
      const factors = await supabase.auth.mfa.listFactors()
      if (factors.error) throw factors.error
      for (const pending of factors.data.totp.filter((factor) => factor.status !== 'verified')) {
        const removal = await supabase.auth.mfa.unenroll({ factorId: pending.id })
        if (removal.error) throw removal.error
      }
      const enrollment = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'SIGECOM' })
      if (enrollment.error) throw enrollment.error
      setMfaFactorId(enrollment.data.id)
      setMfaQr(enrollment.data.totp.qr_code)
      setMfaSecret(enrollment.data.totp.secret)
      setSecurityStatus('Escanea el nuevo QR y confirma el código para terminar el cambio.')
    } catch (error) {
      setSecurityStatus(error instanceof Error ? error.message : 'No fue posible reemplazar el autenticador.')
    } finally { setMfaBusy(false) }
  }

  async function verifyReplacement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!/^\d{6}$/.test(mfaCode)) { setSecurityStatus('Ingresa un código válido de 6 dígitos.'); return }
    setMfaBusy(true); setSecurityStatus('')
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (challenge.error) throw challenge.error
      const verification = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.data.id, code: mfaCode })
      if (verification.error) throw verification.error
      setMfaQr(''); setMfaSecret(''); setMfaCode(''); setMfaLevel('aal2')
      setSecurityStatus('Autenticador reemplazado correctamente.')
      if (profile) await recordSecurityEvent(profile.idUsuario, 'cambio_otp', 'Tu aplicación autenticadora OTP fue reemplazada correctamente.')
      await loadSecurityStatus()
    } catch (error) {
      setSecurityStatus(error instanceof Error ? error.message : 'El código es incorrecto o venció.')
    } finally { setMfaBusy(false) }
  }

  async function closeOtherSessions() {
    setMfaBusy(true); setSecurityStatus('')
    const result = await supabase.auth.signOut({ scope: 'others' })
    setSecurityStatus(result.error ? result.error.message : 'Las demás sesiones fueron cerradas correctamente.')
    if (!result.error && profile) await recordSecurityEvent(profile.idUsuario, 'cierre_sesiones', 'Se cerraron todas las demás sesiones activas de tu cuenta.')
    setMfaBusy(false)
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profileForm.nombre.trim()) {
      setStatus('El nombre no puede quedar vacío.')
      return
    }

    setSavingProfile(true)
    setStatus('')
    try {
      await updateProfile({
        nombre: profileForm.nombre,
        telefono: profileForm.telefono || null,
      })
      setStatus('Perfil actualizado correctamente.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No fue posible actualizar el perfil.')
    } finally {
      setSavingProfile(false)
    }
  }

  function handleAvatarChange(file: File | null) {
    if (!file || !profile) return
    if (!file.type.startsWith('image/')) {
      setStatus('Selecciona una imagen válida.')
      return
    }
    if (file.size > 500_000) {
      setStatus('La foto debe pesar menos de 500 KB.')
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const value = String(reader.result ?? '')
      try {
        await updateOwnAvatar(profile.id, value)
        localStorage.setItem(`sigecom-avatar-${profile.idUsuario}`, value)
        setAvatar(value)
        setStatus('Foto actualizada correctamente.')
        window.dispatchEvent(new Event('sigecom-settings-change'))
      } catch (error) { setStatus(error instanceof Error ? error.message : 'No fue posible guardar la foto.') }
    }
    reader.readAsDataURL(file)
  }

  async function removeAvatar() {
    if (!profile) return
    try {
      await updateOwnAvatar(profile.id, null)
      localStorage.removeItem(`sigecom-avatar-${profile.idUsuario}`)
      setAvatar('')
      setStatus('Foto eliminada.')
      window.dispatchEvent(new Event('sigecom-settings-change'))
    } catch (error) { setStatus(error instanceof Error ? error.message : 'No fue posible eliminar la foto.') }
  }

  async function toggleBrowserNotifications() {
    if (!profile) return
    if (!('Notification' in window)) { setStatus('Este navegador no admite notificaciones.'); return }
    if (browserNotifications) {
      localStorage.setItem(`sigecom-browser-notifications-${profile.idUsuario}`, 'false')
      setBrowserNotifications(false); setStatus('Notificaciones del navegador desactivadas.'); return
    }
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { setStatus('El navegador no concedió permiso para mostrar notificaciones.'); return }
    localStorage.setItem(`sigecom-browser-notifications-${profile.idUsuario}`, 'true')
    setBrowserNotifications(true); setStatus('Notificaciones del navegador activadas.')
  }

  return (
    <AppShell title="Configuración" subtitle="Ajusta tu perfil, apariencia y preferencias generales del sistema.">
      <div className="stats-grid">
        <article className="stat-card accent-blue">
          <span>{t('Rol', 'Role')}</span>
          <strong className="small-metric">{profile?.rol ?? 'Invitado'}</strong>
        </article>
        <article className="stat-card accent-gold">
          <span>{t('Estado', 'Status')}</span>
          <strong className="small-metric">{profile?.activo ? t('Activo', 'Active') : t('Inactivo', 'Inactive')}</strong>
        </article>
        <article className="stat-card accent-violet">
          <span>{t('Tema', 'Theme')}</span>
          <strong className="small-metric">{theme === 'light' ? t('Claro', 'Light') : t('Oscuro', 'Dark')}</strong>
        </article>
        <article className="stat-card">
          <span>{t('Idioma', 'Language')}</span>
          <strong className="small-metric">{language === 'es' ? 'Español' : 'English'}</strong>
        </article>
      </div>

      <div className="panel-grid">
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t('Cuenta', 'Account')}</span>
              <h3>{t('Perfil del usuario', 'User profile')}</h3>
            </div>
          </div>

          <div className="profile-photo-panel">
            <div className="profile-photo-preview">
              {avatar ? <img src={avatar} alt="Foto de perfil" /> : <span>{profile?.nombre?.charAt(0) ?? 'U'}</span>}
            </div>
            <div>
              <strong>{t('Foto de perfil', 'Profile photo')}</strong>
              <p>{t('Se muestra en tu sesión y se guarda en este navegador.', 'It is shown in your session and stored in this browser.')}</p>
              <div className="row-actions">
                <label className="ghost-button file-button">
                  {t('Subir foto', 'Upload photo')}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
                  />
                </label>
                {avatar ? (
                  <button type="button" className="ghost-button" onClick={() => void removeAvatar()}>
                    {t('Quitar', 'Remove')}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <form className="settings-form" onSubmit={(event) => void handleSaveProfile(event)}>
            <label>
              <span>{t('Nombre completo', 'Full name')}</span>
              <input
                value={profileForm.nombre}
                onChange={(event) => setProfileForm((current) => ({ ...current, nombre: event.target.value }))}
              />
            </label>

            <label>
              <span>{t('Teléfono', 'Phone')}</span>
              <input
                value={profileForm.telefono}
                onChange={(event) => setProfileForm((current) => ({ ...current, telefono: event.target.value }))}
                placeholder="Ej. 8888-8888"
              />
            </label>

            <label>
              <span>{t('Correo', 'Email')}</span>
              <input value={profile?.correo ?? ''} disabled />
            </label>

            <button type="submit" className="primary-button" disabled={savingProfile}>
              {savingProfile ? t('Guardando...', 'Saving...') : t('Guardar perfil', 'Save profile')}
            </button>
          </form>

          {status ? <div className="form-status">{status}</div> : null}
        </section>

        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t('Preferencias', 'Preferences')}</span>
              <h3>{t('Apariencia', 'Appearance')}</h3>
            </div>
          </div>

          <div className="settings-form">
            <label>
              <span>{t('Tema', 'Theme')}</span>
              <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)}>
                <option value="light">{t('Claro', 'Light')}</option>
                <option value="dark">{t('Oscuro', 'Dark')}</option>
              </select>
            </label>

            <label>
              <span>{t('Idioma', 'Language')}</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value as LanguageMode)}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>
            <div className="browser-notification-setting">
              <div><strong>{t('Mensajes nuevos', 'New messages')}</strong><span>{t('Recibe avisos aunque estés en otra pestaña.', 'Receive alerts while using another tab.')}</span></div>
              <button type="button" className={browserNotifications ? 'notification-toggle active' : 'notification-toggle'} aria-pressed={browserNotifications} onClick={() => void toggleBrowserNotifications()}><i />{browserNotifications ? t('Activadas', 'Enabled') : t('Activar', 'Enable')}</button>
            </div>
          </div>
        </section>
      </div>

      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">{t('Seguridad', 'Security')}</span>
            <h3>{t('Verificación en dos pasos', 'Two-step verification')}</h3>
          </div>
          <span className={mfaLevel === 'aal2' ? 'status-pill approved' : 'status-pill pending'}>
            {mfaLevel === 'aal2' ? t('Protección activa', 'Protection active') : t('Verificación pendiente', 'Verification pending')}
          </span>
        </div>
        <div className="selected-summary">
          <strong>{t('Aplicación autenticadora', 'Authenticator app')}</strong>
          <span>{t('Tu cuenta exige un código temporal después de ingresar la contraseña.', 'Your account requires a temporary code after entering the password.')}</span>
        </div>
        {mfaQr ? (
          <form className="mfa-settings-enrollment" onSubmit={(event) => void verifyReplacement(event)}>
            <img src={mfaQr} alt="Código QR del nuevo autenticador" />
            <div>
              <strong>{t('Vincula el nuevo dispositivo', 'Link the new device')}</strong>
              <p>{t('Escanea el QR e ingresa el código de seis dígitos.', 'Scan the QR and enter the six-digit code.')}</p>
              <details><summary>{t('No puedo escanear el QR', 'I cannot scan the QR')}</summary><code>{mfaSecret}</code></details>
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
              <button className="primary-button" disabled={mfaBusy || mfaCode.length !== 6}>{t('Confirmar nuevo autenticador', 'Confirm new authenticator')}</button>
            </div>
          </form>
        ) : (
          <div className="row-actions">
            <button type="button" className="ghost-button" disabled={mfaBusy} onClick={() => void replaceAuthenticator()}>{t('Cambiar autenticador', 'Change authenticator')}</button>
            <button type="button" className="ghost-button" disabled={mfaBusy} onClick={() => void closeOtherSessions()}>{t('Cerrar otras sesiones', 'Close other sessions')}</button>
          </div>
        )}
        {securityStatus ? <div className="form-status">{securityStatus}</div> : null}
        <div className="security-activity-grid">
          <div><strong>{t('Dispositivos recientes', 'Recent devices')}</strong>{securityActivity.sessions.length === 0 ? <p>{t('Sin sesiones registradas.', 'No recorded sessions.')}</p> : securityActivity.sessions.slice(0, 5).map((item) => <div className="security-activity-item" key={String(item.id_sesion)}><span>{String(item.dispositivo ?? 'Dispositivo')}</span><small>{String(item.navegador ?? '')} · {new Date(String(item.ultimo_acceso)).toLocaleString()}</small></div>)}</div>
          <div><strong>{t('Actividad de seguridad', 'Security activity')}</strong>{securityActivity.events.length === 0 ? <p>{t('Sin eventos registrados.', 'No recorded events.')}</p> : securityActivity.events.slice(0, 5).map((item) => <div className="security-activity-item" key={String(item.id_evento)}><span>{String(item.descripcion)}</span><small>{new Date(String(item.fecha)).toLocaleString()}</small></div>)}</div>
        </div>
      </section>

      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">{t('Sistema', 'System')}</span>
            <h3>{t('Información de SIGECOM', 'SIGECOM information')}</h3>
          </div>
        </div>
        <div className="selected-summary">
          <strong>{t('Sistema Integral de Gestión de Comisión', 'Integrated Committee Management System')}</strong>
          <span>{t('Aplicación web administrativa conectada a Supabase.', 'Administrative web application connected to Supabase.')}</span>
          <span>{t('Preferencias guardadas en este navegador.', 'Preferences saved in this browser.')}</span>
          <span>{t('Sesión actual', 'Current session')}: {profile?.nombre ?? t('Usuario', 'User')}</span>
        </div>
      </section>
    </AppShell>
  )
}
