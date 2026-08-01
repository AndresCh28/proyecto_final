import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { useAuth } from '../auth/AuthContext'
import { AppShell } from '../components/AppShell'

type ThemeMode = 'light' | 'dark'
type LanguageMode = 'es' | 'en'

function readPreference<T extends string>(key: string, fallback: T): T {
  return (localStorage.getItem(key) as T | null) ?? fallback
}

export function ConfiguracionPage() {
  const { profile, updateProfile } = useAuth()
  const [theme, setTheme] = useState<ThemeMode>(() => readPreference('sigecom-theme', 'light'))
  const [language, setLanguage] = useState<LanguageMode>(() => readPreference('sigecom-language', 'es'))
  const [avatar, setAvatar] = useState<string>(() => readPreference(`sigecom-avatar-${profile?.idUsuario ?? 'guest'}`, ''))
  const [profileForm, setProfileForm] = useState({
    nombre: profile?.nombre ?? '',
    telefono: profile?.telefono ?? '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    setProfileForm({
      nombre: profile?.nombre ?? '',
      telefono: profile?.telefono ?? '',
    })
    setAvatar(readPreference(`sigecom-avatar-${profile?.idUsuario ?? 'guest'}`, ''))
  }, [profile])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = language
    localStorage.setItem('sigecom-theme', theme)
    localStorage.setItem('sigecom-language', language)
    window.dispatchEvent(new Event('sigecom-settings-change'))
  }, [theme, language])

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

    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result ?? '')
      localStorage.setItem(`sigecom-avatar-${profile.idUsuario}`, value)
      setAvatar(value)
      setStatus('Foto actualizada correctamente.')
      window.dispatchEvent(new Event('sigecom-settings-change'))
    }
    reader.readAsDataURL(file)
  }

  function removeAvatar() {
    if (!profile) return
    localStorage.removeItem(`sigecom-avatar-${profile.idUsuario}`)
    setAvatar('')
    setStatus('Foto eliminada.')
    window.dispatchEvent(new Event('sigecom-settings-change'))
  }

  return (
    <AppShell title="Configuración" subtitle="Ajusta tu perfil, apariencia y preferencias generales del sistema.">
      <div className="stats-grid">
        <article className="stat-card accent-blue">
          <span>Rol</span>
          <strong className="small-metric">{profile?.rol ?? 'Invitado'}</strong>
        </article>
        <article className="stat-card accent-gold">
          <span>Estado</span>
          <strong className="small-metric">{profile?.activo ? 'Activo' : 'Inactivo'}</strong>
        </article>
        <article className="stat-card accent-violet">
          <span>Tema</span>
          <strong className="small-metric">{theme === 'light' ? 'Claro' : 'Oscuro'}</strong>
        </article>
        <article className="stat-card">
          <span>Idioma</span>
          <strong className="small-metric">{language === 'es' ? 'Español' : 'English'}</strong>
        </article>
      </div>

      <div className="panel-grid">
        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Cuenta</span>
              <h3>Perfil del usuario</h3>
            </div>
          </div>

          <div className="profile-photo-panel">
            <div className="profile-photo-preview">
              {avatar ? <img src={avatar} alt="Foto de perfil" /> : <span>{profile?.nombre?.charAt(0) ?? 'U'}</span>}
            </div>
            <div>
              <strong>Foto de perfil</strong>
              <p>Se muestra en tu sesión y se guarda en este navegador.</p>
              <div className="row-actions">
                <label className="ghost-button file-button">
                  Subir foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
                  />
                </label>
                {avatar ? (
                  <button type="button" className="ghost-button" onClick={removeAvatar}>
                    Quitar
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <form className="settings-form" onSubmit={(event) => void handleSaveProfile(event)}>
            <label>
              <span>Nombre completo</span>
              <input
                value={profileForm.nombre}
                onChange={(event) => setProfileForm((current) => ({ ...current, nombre: event.target.value }))}
              />
            </label>

            <label>
              <span>Teléfono</span>
              <input
                value={profileForm.telefono}
                onChange={(event) => setProfileForm((current) => ({ ...current, telefono: event.target.value }))}
                placeholder="Ej. 8888-8888"
              />
            </label>

            <label>
              <span>Correo</span>
              <input value={profile?.correo ?? ''} disabled />
            </label>

            <button type="submit" className="primary-button" disabled={savingProfile}>
              {savingProfile ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </form>

          {status ? <div className="form-status">{status}</div> : null}
        </section>

        <section className="glass-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Preferencias</span>
              <h3>Apariencia</h3>
            </div>
          </div>

          <div className="settings-form">
            <label>
              <span>Tema</span>
              <select value={theme} onChange={(event) => setTheme(event.target.value as ThemeMode)}>
                <option value="light">Claro</option>
                <option value="dark">Oscuro</option>
              </select>
            </label>

            <label>
              <span>Idioma</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value as LanguageMode)}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Sistema</span>
            <h3>Información de SIGECOM</h3>
          </div>
        </div>
        <div className="selected-summary">
          <strong>Sistema Integral de Gestión de Comisión</strong>
          <span>Aplicación web administrativa conectada a Supabase.</span>
          <span>Preferencias guardadas en este navegador.</span>
          <span>Sesión actual: {profile?.nombre ?? 'Usuario'}</span>
        </div>
      </section>
    </AppShell>
  )
}
