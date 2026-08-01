import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useLanguage } from '../i18n/LanguageContext'
import { globalSearch } from '../lib/globalSearch'
import type { GlobalSearchResult } from '../lib/globalSearch'

export function GlobalSearch() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    function outside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', keyboard)
    window.addEventListener('mousedown', outside)
    return () => {
      window.removeEventListener('keydown', keyboard)
      window.removeEventListener('mousedown', outside)
    }
  }, [])

  useEffect(() => {
    const query = term.trim()
    if (query.length < 2) {
      setResults([])
      setLoading(false)
      setError('')
      return
    }

    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      void globalSearch(query)
        .then((data) => {
          if (active) setResults(data)
        })
        .catch((searchError) => {
          if (active) setError(searchError instanceof Error ? searchError.message : 'No fue posible buscar.')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 300)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [term])

  const showResults = open && term.trim().length >= 2

  return (
    <div className="global-search" ref={rootRef}>
      <div className="global-search-input">
        <span aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          type="search"
          value={term}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setTerm(event.target.value)
            setOpen(true)
          }}
          placeholder={language === 'es' ? 'Buscar en todo SIGECOM' : 'Search all SIGECOM'}
          aria-label={language === 'es' ? 'Búsqueda global' : 'Global search'}
        />
        <kbd>Ctrl K</kbd>
      </div>

      {showResults ? (
        <div className="global-search-results">
          <div className="global-search-summary">
            <strong>{language === 'es' ? 'Resultados globales' : 'Global results'}</strong>
            {!loading ? <span>{results.length}</span> : null}
          </div>
          {loading ? <div className="search-loading"><i />{language === 'es' ? 'Buscando…' : 'Searching…'}</div> : null}
          {error ? <div className="search-empty error">{error}</div> : null}
          {!loading && !error && results.length === 0 ? (
            <div className="search-empty">{language === 'es' ? 'No se encontraron coincidencias.' : 'No matches found.'}</div>
          ) : null}
          {!loading ? results.map((result) => (
            <button
              type="button"
              className="global-search-result"
              key={result.id}
              onClick={() => {
                setOpen(false)
                setTerm('')
                navigate(result.href)
              }}
            >
              <span className="search-module">{result.module}</span>
              <strong>{result.title}</strong>
              <small>{result.description}</small>
            </button>
          )) : null}
        </div>
      ) : null}
    </div>
  )
}
