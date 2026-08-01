import { supabase } from './supabase'

function deviceInfo() {
  const ua = navigator.userAgent
  const dispositivo = /Mobi|Android/i.test(ua) ? 'Dispositivo móvil' : 'Computadora'
  const navegador = /Edg\//.test(ua) ? 'Microsoft Edge' : /Chrome\//.test(ua) ? 'Google Chrome' : /Firefox\//.test(ua) ? 'Mozilla Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador web'
  return { dispositivo, navegador }
}

function sessionId(token: string) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))?.session_id as string | undefined } catch { return undefined }
}

export async function recordSecureLogin(idUsuario: number, correo: string) {
  const { data } = await supabase.auth.getSession()
  const id = data.session?.access_token ? sessionId(data.session.access_token) : undefined
  if (!id || sessionStorage.getItem(`sigecom-security-session-${id}`)) return
  const info = deviceInfo()
  const failureKey = `sigecom-login-failures-${correo.trim().toLowerCase()}`
  const attempts = Number(localStorage.getItem(failureKey) ?? 0)
  const sessionResult = await supabase.from('sesiones_seguridad').upsert({ id_usuario: idUsuario, session_id: id, ...info, ultimo_acceso: new Date().toISOString() }, { onConflict: 'id_usuario,session_id' })
  if (sessionResult.error) throw sessionResult.error
  const description = attempts >= 3 ? `Inicio de sesión correcto después de ${attempts} intentos fallidos desde ${info.navegador}.` : `Nuevo inicio de sesión desde ${info.navegador} en ${info.dispositivo}.`
  const event = await supabase.from('eventos_seguridad').insert({ id_usuario: idUsuario, tipo: attempts >= 3 ? 'intentos_fallidos' : 'inicio_sesion', descripcion: description, intentos_fallidos: attempts, ...info })
  if (event.error) throw event.error
  localStorage.removeItem(failureKey); sessionStorage.setItem(`sigecom-security-session-${id}`, 'true')
}

export function countFailedLogin(correo: string) {
  const key = `sigecom-login-failures-${correo.trim().toLowerCase()}`
  localStorage.setItem(key, String(Number(localStorage.getItem(key) ?? 0) + 1))
}

export async function recordSecurityEvent(idUsuario: number, tipo: string, descripcion: string) {
  const { error } = await supabase.from('eventos_seguridad').insert({ id_usuario: idUsuario, tipo, descripcion, ...deviceInfo() })
  if (error) throw error
}

export async function fetchSecurityActivity(idUsuario: number) {
  const [{ data: events, error: eventError }, { data: sessions, error: sessionError }] = await Promise.all([
    supabase.from('eventos_seguridad').select('*').eq('id_usuario', idUsuario).order('fecha', { ascending: false }).limit(20),
    supabase.from('sesiones_seguridad').select('*').eq('id_usuario', idUsuario).order('ultimo_acceso', { ascending: false }).limit(10),
  ])
  if (eventError || sessionError) throw eventError ?? sessionError
  return { events: events ?? [], sessions: sessions ?? [] }
}
