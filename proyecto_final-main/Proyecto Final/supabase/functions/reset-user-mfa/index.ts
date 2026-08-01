import { createClient } from 'npm:@supabase/supabase-js@2.105.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } })
}

function readAal(token: string) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(part))?.aal as string | undefined
  } catch { return undefined }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization') ?? ''
  const token = authorization.replace(/^Bearer\s+/i, '')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Servicio no configurado.' }, 503)
  if (!token || readAal(token) !== 'aal2') return json({ error: 'Debes confirmar tu OTP antes de realizar esta acción.' }, 403)

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authenticated, error: authError } = await admin.auth.getUser(token)
  if (authError || !authenticated.user) return json({ error: 'Sesión inválida o vencida.' }, 401)

  const { data: actor } = await admin.from('usuarios').select('id_usuario,activo,rol:roles(nombre)').eq('auth_user_id', authenticated.user.id).maybeSingle()
  const actorRole = Array.isArray(actor?.rol) ? actor.rol[0]?.nombre : (actor?.rol as { nombre?: string } | null)?.nombre
  if (!actor?.activo || actorRole !== 'Administrador') return json({ error: 'Solo un Administrador puede restablecer el OTP.' }, 403)

  let payload: { idUsuario?: number }
  try { payload = await request.json() } catch { return json({ error: 'Solicitud inválida.' }, 400) }
  if (!Number.isInteger(payload.idUsuario) || Number(payload.idUsuario) <= 0) return json({ error: 'Usuario inválido.' }, 400)

  const { data: target, error: targetError } = await admin.from('usuarios').select('id_usuario,auth_user_id,nombre').eq('id_usuario', payload.idUsuario).maybeSingle()
  if (targetError || !target?.auth_user_id) return json({ error: 'No se encontró la cuenta de autenticación del usuario.' }, 404)

  const factors = await admin.auth.admin.mfa.listFactors({ userId: target.auth_user_id })
  if (factors.error) return json({ error: factors.error.message }, 400)
  for (const factor of factors.data.factors) {
    const deletion = await admin.auth.admin.mfa.deleteFactor({ userId: target.auth_user_id, id: factor.id })
    if (deletion.error) return json({ error: deletion.error.message }, 400)
  }

  await admin.from('historial_cambios').insert({
    tabla_afectada: 'auth.mfa_factors', id_registro: target.id_usuario, accion: 'UPDATE', realizado_por: actor.id_usuario,
    descripcion: `OTP restablecido administrativamente para ${target.nombre}. Se eliminaron ${factors.data.factors.length} factores y se cerraron sus sesiones.`,
  })
  const memberships = await admin.from('espacio_miembros').select('id_espacio').eq('id_usuario', target.id_usuario).eq('activo', true)
  if (memberships.data?.length) await admin.from('notificaciones').insert(memberships.data.map((item) => ({
    id_usuario: target.id_usuario, id_espacio: item.id_espacio, tipo: 'seguridad',
    mensaje: 'Un administrador restableció tu OTP. Deberás vincular un autenticador al iniciar sesión.',
    clave_unica: `otp-reset-${target.id_usuario}-${Date.now()}-${item.id_espacio}`,
  })))
  return json({ reset: true, removedFactors: factors.data.factors.length })
})
