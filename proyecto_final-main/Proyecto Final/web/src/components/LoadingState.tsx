interface LoadingStateProps {
  rows?: number
  label?: string
}

export function LoadingState({ rows = 3, label = 'Cargando información…' }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status" aria-live="polite" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-card" key={index} aria-hidden="true">
          <span className="skeleton-line skeleton-title" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-short" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
