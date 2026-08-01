export function money(value: number) {
  const formatted = new Intl.NumberFormat('es-CR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

  return `₡${formatted}`
}

export function shortDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function voteLabel(value: string) {
  const labels: Record<string, string> = {
    a_favor: 'A favor',
    en_contra: 'En contra',
    abstencion: 'Abstención',
  }

  return labels[value] ?? value.replaceAll('_', ' ')
}
