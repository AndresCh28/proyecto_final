interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null

  return (
    <nav className="pagination" aria-label="Paginación">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
      <span>Página <strong>{page}</strong> de {pages}</span>
      <button type="button" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>Siguiente</button>
    </nav>
  )
}
