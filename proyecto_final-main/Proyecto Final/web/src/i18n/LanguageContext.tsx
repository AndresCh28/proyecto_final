/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'

export type LanguageMode = 'es' | 'en'

interface LanguageContextValue {
  language: LanguageMode
  setLanguage: (language: LanguageMode) => void
}

const STORAGE_KEY = 'sigecom-language'

function readLanguage(): LanguageMode {
  return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es'
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<LanguageMode>(readLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    localStorage.setItem(STORAGE_KEY, language)
  }, [language])

  const value = useMemo(() => ({ language, setLanguage }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage debe usarse dentro de LanguageProvider')
  return context
}
