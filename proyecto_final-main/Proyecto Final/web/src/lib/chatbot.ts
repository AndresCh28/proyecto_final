import { supabase } from './supabase'

export interface ChatMessage {
  id: string
  role: 'user' | 'model'
  text: string
}

export async function askSigecomAssistant(message: string, language: 'es' | 'en', privacyConsent: boolean) {
  const { data, error } = await supabase.functions.invoke<{ answer?: string; error?: string }>('sigecom-chat', {
    body: {
      language,
      message,
      privacyConsent,
    },
  })

  if (error) throw new Error('No fue posible conectar con SIGEbot. Verifica la función y tu sesión.')
  if (!data?.answer) throw new Error(data?.error ?? 'SIGEbot no devolvió una respuesta.')
  return data.answer
}
