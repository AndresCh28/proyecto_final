import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'

import { useLanguage } from '../i18n/LanguageContext'
import { askSigecomAssistant } from '../lib/chatbot'
import type { ChatMessage } from '../lib/chatbot'
import sigecomIcon from '../assets/isotipo-sigecom.png'

const welcome = {
  // El asistente explica el uso de la plataforma; nunca consulta registros reales.
  es: 'Hola, soy SIGEbot. Puedo consultar comisiones, propuestas, presupuestos, votaciones y notificaciones de SIGECOM. ¿En qué te ayudo?',
  en: 'Hi, I am SIGEbot. I can explain how to use SIGECOM, but I cannot access records or personal data. How can I help?',
}

function newMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return { id: crypto.randomUUID(), role, text }
}

export function Chatbot() {
  const { language } = useLanguage()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [privacyConsent, setPrivacyConsent] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>(() => [newMessage('model', language === 'es' ? 'Hola, soy SIGEbot. Puedo orientarte sobre cómo usar SIGECOM, pero no consulto registros ni datos personales. ¿En qué te ayudo?' : welcome.en)])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const nextMessages = [...messages, newMessage('user', text)]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    try {
      const answer = await askSigecomAssistant(text, language, privacyConsent)
      setMessages((current) => [...current, newMessage('model', answer)])
    } catch (error) {
      setMessages((current) => [
        ...current,
        newMessage('model', error instanceof Error ? error.message : 'No fue posible obtener una respuesta.'),
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`chatbot${open ? ' open' : ''}${location.pathname === '/chat-comisiones' ? ' chat-page' : ''}`}>
      {open ? (
        <section className="chatbot-panel" aria-label={language === 'es' ? 'Asistente SIGEbot' : 'SIGEbot assistant'}>
          <header className="chatbot-header">
            <div className="chatbot-avatar" aria-hidden="true">
              <img src={sigecomIcon} alt="" />
            </div>
            <div><strong>SIGEbot</strong><span>{language === 'es' ? 'Conectado con Gemini' : 'Powered by Gemini'}</span></div>
            <button type="button" className="chatbot-close" onClick={() => setOpen(false)} aria-label={language === 'es' ? 'Cerrar chat' : 'Close chat'}>×</button>
          </header>

          <div className="chatbot-messages" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`chat-message ${message.role}`}>
                <span>{message.role === 'model' ? 'SIGEbot' : language === 'es' ? 'Tú' : 'You'}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {loading ? <div className="chatbot-thinking"><i /><i /><i /><span>{language === 'es' ? 'Analizando SIGECOM…' : 'Analyzing SIGECOM…'}</span></div> : null}
            <div ref={bottomRef} />
          </div>

          <form className="chatbot-form" onSubmit={(event) => void submit(event)}>
            <label className="chatbot-privacy-consent"><input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} /><span>{language === 'es' ? 'Acepto enviar únicamente esta pregunta a Gemini. No incluiré datos personales, financieros ni credenciales.' : 'I agree to send only this question to Gemini. I will not include personal, financial or credential data.'}</span></label>
            <textarea
              rows={2}
              value={input}
              maxLength={2000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder={language === 'es' ? 'Pregunta sobre SIGECOM…' : 'Ask about SIGECOM…'}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim() || !privacyConsent}>{language === 'es' ? 'Enviar' : 'Send'}</button>
          </form>
          <small>{language === 'es' ? 'SIGEbot no recibe datos de Supabase. Gemini puede equivocarse.' : 'SIGEbot receives no Supabase data. Gemini can make mistakes.'}</small>
        </section>
      ) : null}

      <button type="button" className="chatbot-launcher" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? 'Cerrar SIGEbot' : 'Abrir SIGEbot'}>
        <span aria-hidden="true">{open ? '×' : '✦'}</span>
        <strong>{open ? (language === 'es' ? 'Cerrar' : 'Close') : 'SIGEbot'}</strong>
      </button>
    </div>
  )
}
