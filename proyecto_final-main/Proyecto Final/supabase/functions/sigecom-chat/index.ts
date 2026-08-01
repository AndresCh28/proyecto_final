const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } })

function containsSensitiveData(text: string) {
  const patterns = [
    /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
    /(?:\+?\d[\s-]*){8,}/,
    /\b(?:password|contrase(?:n|ñ)a|token|api[_ -]?key|secret|cedula|cédula|pasaporte|tarjeta|cuenta bancaria|iban)\b/i,
    /[₡$€]\s*\d/,
  ]
  return patterns.some((pattern) => pattern.test(text))
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_ANON_KEY'), gemini = Deno.env.get('GEMINI_API_KEY')
  if (!url || !key || !gemini) return json({ error: 'Servicio no configurado.' }, 503)
  const auth = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: request.headers.get('Authorization') ?? '' } })
  if (!auth.ok) return json({ error: 'Sesión inválida o vencida.' }, 401)
  let payload: { message?: string; language?: 'es' | 'en'; privacyConsent?: boolean }
  try { payload = await request.json() } catch { return json({ error: 'Solicitud inválida.' }, 400) }
  if (payload.privacyConsent !== true) return json({ error: 'Debes aceptar el aviso de privacidad.' }, 400)
  const message = String(payload.message ?? '').trim().slice(0, 1000)
  if (!message) return json({ error: 'Escribe una consulta.' }, 400)
  if (containsSensitiveData(message)) return json({ error: 'Elimina datos personales, credenciales y montos antes de enviar la pregunta.' }, 422)
  const instruction = `Eres SIGEbot, asistente de uso de SIGECOM. Explica solamente navegación y procesos generales. No tienes acceso a Supabase ni a registros reales. No solicites datos personales, financieros, credenciales o identificadores. No inventes datos concretos. Responde brevemente en ${payload.language === 'en' ? 'inglés' : 'español'}.`
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gemini }, body: JSON.stringify({ systemInstruction: { parts: [{ text: instruction }] }, contents: [{ role: 'user', parts: [{ text: message }] }], generationConfig: { maxOutputTokens: 600 } }) })
  const data = await response.json()
  if (!response.ok) return json({ error: 'Gemini no pudo responder.' }, 502)
  const answer = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('').trim()
  return answer ? json({ answer }) : json({ error: 'Respuesta vacía.' }, 502)
})
