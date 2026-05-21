import { differenceInDays, parseISO } from 'date-fns'

export type StatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

export function getDocumentStatus(
  fechaVencimiento: string | null,
  sinVencimiento: boolean
): StatusColor {
  if (sinVencimiento) return 'blue'
  if (!fechaVencimiento) return 'gray'

  const days = differenceInDays(parseISO(fechaVencimiento), new Date())

  if (days < 0) return 'red'
  if (days < 7) return 'red'
  if (days < 30) return 'yellow'
  return 'green'
}

export function getStatusLabel(color: StatusColor): string {
  const labels: Record<StatusColor, string> = {
    green: 'Vigente',
    yellow: 'Por vencer',
    red: 'Vencido',
    blue: 'Sin vencimiento',
    gray: 'Sin fecha',
  }
  return labels[color]
}

export const STATUS_CLASSES: Record<StatusColor, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
}
